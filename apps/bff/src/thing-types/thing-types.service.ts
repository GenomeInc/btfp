import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GetCommand, PutCommand, ScanCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { ThingType } from '@btfp/shared-types';
import { DYNAMO_DOC_CLIENT, stripDynamoKeys } from '@mycota/dynamo';
import { CONTENT_TABLE_NAME } from '../dynamo/dynamo.constants.js';
import type { CreateThingTypeDto } from './dto/create-thing-type.dto.js';

@Injectable()
export class ThingTypesService {
  constructor(@Inject(DYNAMO_DOC_CLIENT) private readonly db: DynamoDBDocumentClient) {}

  async list(): Promise<ThingType[]> {
    const result = await this.db.send(
      new ScanCommand({
        TableName: CONTENT_TABLE_NAME,
        FilterExpression: 'SK = :meta AND begins_with(PK, :prefix)',
        ExpressionAttributeValues: { ':meta': 'META', ':prefix': 'THINGTYPE#' },
      }),
    );
    return (result.Items ?? []).map((item) => stripDynamoKeys(item) as ThingType);
  }

  async getById(id: string): Promise<ThingType | null> {
    const result = await this.db.send(
      new GetCommand({ TableName: CONTENT_TABLE_NAME, Key: { PK: `THINGTYPE#${id}`, SK: 'META' } }),
    );
    return result.Item ? (stripDynamoKeys(result.Item) as ThingType) : null;
  }

  async create(dto: CreateThingTypeDto): Promise<ThingType> {
    const now = new Date().toISOString();
    const thingType: ThingType = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
      details: dto.details ?? {},
      createdAt: now,
      updatedAt: now,
    };
    await this.put(thingType);
    return thingType;
  }

  async put(thingType: ThingType): Promise<void> {
    await this.db.send(
      new PutCommand({
        TableName: CONTENT_TABLE_NAME,
        Item: { ...thingType, PK: `THINGTYPE#${thingType.id}`, SK: 'META' },
      }),
    );
  }
}
