import { Inject, Injectable } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { User } from '@btfp/shared-types';
import { DYNAMO_DOC_CLIENT, USERS_TABLE_NAME } from '../dynamo/dynamo.constants.js';
import type { OAuthProfile } from './auth.types.js';

const INTERNAL_FIELDS = [
  'PK',
  'GSI1PK',
  'professionalEmail',
  'professionalCodeHash',
  'professionalCodeExpiresAt',
] as const;

function stripInternalUserFields(item: Record<string, unknown>): User {
  const clean = { ...item };
  for (const key of INTERNAL_FIELDS) delete clean[key];
  return clean as unknown as User;
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

@Injectable()
export class UsersService {
  constructor(@Inject(DYNAMO_DOC_CLIENT) private readonly db: DynamoDBDocumentClient) {}

  private pk(provider: string, providerAccountId: string): string {
    return `USER#${provider}#${providerAccountId}`;
  }

  async getByProviderAccount(provider: string, providerAccountId: string): Promise<User | null> {
    const result = await this.db.send(
      new GetCommand({ TableName: USERS_TABLE_NAME, Key: { PK: this.pk(provider, providerAccountId) } }),
    );
    return result.Item ? stripInternalUserFields(result.Item) : null;
  }

  async getById(id: string): Promise<User | null> {
    const result = await this.db.send(
      new QueryCommand({
        TableName: USERS_TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': `USERID#${id}` },
        Limit: 1,
      }),
    );
    const item = result.Items?.[0];
    return item ? stripInternalUserFields(item) : null;
  }

  async upsertFromOAuth(profile: OAuthProfile): Promise<User> {
    const existing = await this.getByProviderAccount(profile.provider, profile.providerAccountId);
    const now = new Date().toISOString();

    const user: User = {
      id: existing?.id ?? randomUUID(),
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      email: profile.email,
      providerAccountCreatedAt: profile.providerAccountCreatedAt ?? existing?.providerAccountCreatedAt,
      verifiedContributor: existing?.verifiedContributor ?? false,
      verifiedAt: existing?.verifiedAt,
      professional: existing?.professional,
      createdAt: existing?.createdAt ?? now,
    };

    await this.db.send(
      new PutCommand({
        TableName: USERS_TABLE_NAME,
        Item: {
          ...user,
          PK: this.pk(user.provider, user.providerAccountId),
          GSI1PK: `USERID#${user.id}`,
        },
      }),
    );

    return user;
  }

  async markVerified(provider: string, providerAccountId: string): Promise<void> {
    await this.db.send(
      new UpdateCommand({
        TableName: USERS_TABLE_NAME,
        Key: { PK: this.pk(provider, providerAccountId) },
        UpdateExpression: 'SET verifiedContributor = :true, verifiedAt = :now',
        ExpressionAttributeValues: { ':true': true, ':now': new Date().toISOString() },
      }),
    );
  }

  async setProfessionalPending(params: {
    provider: string;
    providerAccountId: string;
    email: string;
    domain: string;
    code: string;
    codeExpiresAt: string;
    orgClassification?: string;
    orgClassificationReasoning?: string;
  }): Promise<void> {
    await this.db.send(
      new UpdateCommand({
        TableName: USERS_TABLE_NAME,
        Key: { PK: this.pk(params.provider, params.providerAccountId) },
        UpdateExpression:
          'SET professional = :professional, professionalEmail = :email, ' +
          'professionalCodeHash = :codeHash, professionalCodeExpiresAt = :codeExpiresAt',
        ExpressionAttributeValues: {
          ':professional': {
            status: 'pending_email_confirmation',
            domain: params.domain,
            orgClassification: params.orgClassification,
            orgClassificationReasoning: params.orgClassificationReasoning,
            requestedAt: new Date().toISOString(),
          },
          ':email': params.email,
          ':codeHash': hashCode(params.code),
          ':codeExpiresAt': params.codeExpiresAt,
        },
      }),
    );
  }

  /** Hashes and compares `code`; on success moves status to awaiting_review and clears the code. */
  async confirmProfessionalCode(provider: string, providerAccountId: string, code: string): Promise<boolean> {
    const result = await this.db.send(
      new GetCommand({ TableName: USERS_TABLE_NAME, Key: { PK: this.pk(provider, providerAccountId) } }),
    );
    const item = result.Item;
    if (!item?.professionalCodeHash || !item.professionalCodeExpiresAt) return false;
    if (new Date(item.professionalCodeExpiresAt as string).getTime() < Date.now()) return false;
    if (item.professionalCodeHash !== hashCode(code)) return false;

    await this.db.send(
      new UpdateCommand({
        TableName: USERS_TABLE_NAME,
        Key: { PK: this.pk(provider, providerAccountId) },
        UpdateExpression:
          'SET professional.#status = :status ' +
          'REMOVE professionalCodeHash, professionalCodeExpiresAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'awaiting_review' },
      }),
    );
    return true;
  }

  /** Small user base; a filtered scan is fine at this scale (see docs/data-model.md). */
  async listAwaitingReview(): Promise<User[]> {
    const result = await this.db.send(
      new ScanCommand({
        TableName: USERS_TABLE_NAME,
        FilterExpression: 'professional.#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'awaiting_review' },
      }),
    );
    return (result.Items ?? []).map((item) => stripInternalUserFields(item));
  }

  async reviewProfessional(id: string, approve: boolean, reviewerId: string, reason?: string): Promise<User> {
    const user = await this.getById(id);
    if (!user) throw new Error(`No user with id ${id}`);

    const now = new Date().toISOString();
    const updateExpressions = [
      'SET professional.#status = :status',
      'professional.reviewedAt = :now',
      'professional.reviewedBy = :reviewerId',
    ];
    const values: Record<string, unknown> = {
      ':status': approve ? 'verified' : 'rejected',
      ':now': now,
      ':reviewerId': reviewerId,
    };

    if (approve) {
      updateExpressions.push('verifiedContributor = :true', 'verifiedAt = :now');
      values[':true'] = true;
    } else if (reason) {
      updateExpressions.push('professional.rejectionReason = :reason');
      values[':reason'] = reason;
    }

    await this.db.send(
      new UpdateCommand({
        TableName: USERS_TABLE_NAME,
        Key: { PK: this.pk(user.provider, user.providerAccountId) },
        UpdateExpression: updateExpressions.join(', '),
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: values,
      }),
    );

    return { ...user, verifiedContributor: approve || user.verifiedContributor };
  }
}
