import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import type { Contribution, Thing } from '@btfp/shared-types';
import { DYNAMO_DOC_CLIENT, CONTENT_TABLE_NAME } from '../dynamo/dynamo.constants.js';
import { ThingsService } from '../things/things.service.js';
import { UsersService } from '../auth/users.service.js';
import type { CreateContributionDto } from './dto/create-contribution.dto.js';

@Injectable()
export class ContributionsService {
  constructor(
    @Inject(DYNAMO_DOC_CLIENT) private readonly db: DynamoDBDocumentClient,
    private readonly things: ThingsService,
    private readonly users: UsersService,
  ) {}

  async propose(dto: CreateContributionDto, contributorId: string): Promise<Contribution> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const contribution: Contribution = {
      id,
      thingId: dto.thingId,
      contributorId,
      status: 'pending',
      payload: dto.payload,
      createdAt: now,
    };

    const targetThingId = dto.thingId ?? id;
    await this.db.send(
      new PutCommand({
        TableName: CONTENT_TABLE_NAME,
        Item: {
          ...contribution,
          PK: `THING#${targetThingId}`,
          SK: `CONTRIB#${now}#${contributorId}`,
          GSI2PK: 'STATUS#pending',
          GSI2SK: `CONTRIB#${now}`,
        },
      }),
    );

    return contribution;
  }

  async listPending(limit = 50): Promise<Contribution[]> {
    const result = await this.db.send(
      new QueryCommand({
        TableName: CONTENT_TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: { ':pk': 'STATUS#pending' },
        Limit: limit,
      }),
    );
    return (result.Items ?? []) as Contribution[];
  }

  async approve(thingId: string, sk: string, reviewerId: string): Promise<Thing> {
    const existing = await this.db.send(
      new GetCommand({ TableName: CONTENT_TABLE_NAME, Key: { PK: `THING#${thingId}`, SK: sk } }),
    );
    const contribution = existing.Item as (Contribution & { PK: string; SK: string }) | undefined;
    if (!contribution) throw new NotFoundException('Contribution not found');

    const now = new Date().toISOString();
    const contributor = await this.users.getById(contribution.contributorId);
    const details = { ...(contribution.payload.details ?? {}) };
    if (contributor?.professional?.status === 'verified') {
      details.verifiedOrgDomain = contributor.professional.domain;
    }

    const thing: Thing = {
      id: contribution.thingId ?? thingId,
      name: contribution.payload.name ?? 'Unnamed',
      otherNames: contribution.payload.otherNames ?? [],
      thingTypeId: contribution.payload.thingTypeId ?? 'unknown',
      petTypes: contribution.payload.petTypes ?? [],
      details,
      source: contribution.payload.source ?? `contributor:${contribution.contributorId}`,
      sourceUrl: contribution.payload.sourceUrl,
      verified: true,
      contributorId: contribution.contributorId,
      createdAt: contribution.payload.createdAt ?? now,
      updatedAt: now,
    };
    await this.things.putThing(thing);

    await this.db.send(
      new UpdateCommand({
        TableName: CONTENT_TABLE_NAME,
        Key: { PK: `THING#${thingId}`, SK: sk },
        UpdateExpression:
          'SET #status = :approved, reviewedAt = :now, reviewerId = :reviewer REMOVE GSI2PK, GSI2SK',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':approved': 'approved', ':now': now, ':reviewer': reviewerId },
      }),
    );

    return thing;
  }
}
