import { Inject, Injectable } from '@nestjs/common';
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import type { Thing } from '@btfp/shared-types';
import { DYNAMO_DOC_CLIENT, stripDynamoKeys } from '@mycota/dynamo';
import { CONTENT_TABLE_NAME } from '../dynamo/dynamo.constants.js';
import { SearchService } from '../search/search.service.js';

@Injectable()
export class ThingsService {
  constructor(
    @Inject(DYNAMO_DOC_CLIENT) private readonly db: DynamoDBDocumentClient,
    private readonly search: SearchService,
  ) {}

  async getById(id: string): Promise<Thing | null> {
    const result = await this.db.send(
      new GetCommand({ TableName: CONTENT_TABLE_NAME, Key: { PK: `THING#${id}`, SK: 'META' } }),
    );
    return result.Item ? (stripDynamoKeys(result.Item) as Thing) : null;
  }

  async listByThingType(thingTypeId: string, limit = 50): Promise<Thing[]> {
    const result = await this.db.send(
      new QueryCommand({
        TableName: CONTENT_TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': `THINGTYPE#${thingTypeId}` },
        Limit: limit,
      }),
    );
    return (result.Items ?? []).map((item) => stripDynamoKeys(item) as Thing);
  }

  /** Writes an already-built Thing (used by the seed loader and by contribution approval). */
  async putThing(thing: Thing): Promise<void> {
    await this.db.send(
      new PutCommand({
        TableName: CONTENT_TABLE_NAME,
        Item: {
          ...thing,
          PK: `THING#${thing.id}`,
          SK: 'META',
          GSI1PK: `THINGTYPE#${thing.thingTypeId}`,
          GSI1SK: `THING#${thing.name}`,
        },
      }),
    );
    this.search.invalidate();
  }
}
