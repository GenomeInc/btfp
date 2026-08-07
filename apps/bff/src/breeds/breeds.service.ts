import { Inject, Injectable } from '@nestjs/common';
import { GetCommand, ScanCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { Breed } from '@btfp/shared-types';
import { DYNAMO_DOC_CLIENT, stripDynamoKeys } from '@bubltec/mycota-dynamo';
import { CONTENT_TABLE_NAME } from '../dynamo/dynamo.constants.js';

const CACHE_TTL_MS = 60_000;

/**
 * Reference data (~200 rows), not user-contributed — cached in memory like
 * SearchService's Things cache, no create/edit endpoints.
 */
@Injectable()
export class BreedsService {
  private cache: { breeds: Breed[]; loadedAt: number } | null = null;

  constructor(@Inject(DYNAMO_DOC_CLIENT) private readonly db: DynamoDBDocumentClient) {}

  async list(petTypeId?: string): Promise<Breed[]> {
    const breeds = await this.loadBreeds();
    const filtered = petTypeId ? breeds.filter((b) => b.petTypeId === petTypeId) : breeds;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(id: string): Promise<Breed | null> {
    const result = await this.db.send(
      new GetCommand({ TableName: CONTENT_TABLE_NAME, Key: { PK: `BREED#${id}`, SK: 'META' } }),
    );
    return result.Item ? (stripDynamoKeys(result.Item) as Breed) : null;
  }

  private async loadBreeds(): Promise<Breed[]> {
    if (this.cache && Date.now() - this.cache.loadedAt < CACHE_TTL_MS) {
      return this.cache.breeds;
    }

    const items: Breed[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await this.db.send(
        new ScanCommand({
          TableName: CONTENT_TABLE_NAME,
          FilterExpression: 'SK = :meta AND begins_with(PK, :prefix)',
          ExpressionAttributeValues: { ':meta': 'META', ':prefix': 'BREED#' },
          ExclusiveStartKey: lastKey,
        }),
      );
      items.push(...(result.Items ?? []).map((item) => stripDynamoKeys(item) as Breed));
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    this.cache = { breeds: items, loadedAt: Date.now() };
    return items;
  }
}
