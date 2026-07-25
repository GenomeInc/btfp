import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GetCommand, PutCommand, ScanCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { PetType } from '@btfp/shared-types';
import { DYNAMO_DOC_CLIENT, stripDynamoKeys } from '@mycota/dynamo';
import { CONTENT_TABLE_NAME } from '../dynamo/dynamo.constants.js';
import type { CreatePetTypeDto } from './dto/create-pet-type.dto.js';

@Injectable()
export class PetTypesService {
  constructor(@Inject(DYNAMO_DOC_CLIENT) private readonly db: DynamoDBDocumentClient) {}

  async list(): Promise<PetType[]> {
    const result = await this.db.send(
      new ScanCommand({
        TableName: CONTENT_TABLE_NAME,
        FilterExpression: 'SK = :meta AND begins_with(PK, :prefix)',
        ExpressionAttributeValues: { ':meta': 'META', ':prefix': 'PETTYPE#' },
      }),
    );
    return (result.Items ?? []).map((item) => stripDynamoKeys(item) as PetType);
  }

  async getById(id: string): Promise<PetType | null> {
    const result = await this.db.send(
      new GetCommand({ TableName: CONTENT_TABLE_NAME, Key: { PK: `PETTYPE#${id}`, SK: 'META' } }),
    );
    return result.Item ? (stripDynamoKeys(result.Item) as PetType) : null;
  }

  async create(dto: CreatePetTypeDto): Promise<PetType> {
    const now = new Date().toISOString();
    const petType: PetType = {
      id: randomUUID(),
      name: dto.name,
      aliases: dto.aliases ?? [],
      details: dto.details ?? {},
      createdAt: now,
      updatedAt: now,
    };
    await this.put(petType);
    return petType;
  }

  async put(petType: PetType): Promise<void> {
    await this.db.send(
      new PutCommand({
        TableName: CONTENT_TABLE_NAME,
        Item: { ...petType, PK: `PETTYPE#${petType.id}`, SK: 'META' },
      }),
    );
  }
}
