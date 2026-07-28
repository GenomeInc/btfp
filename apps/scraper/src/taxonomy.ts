import { ScanCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CONTENT_TABLE_NAME } from './dynamo.js';
import type { Taxonomy } from './extract/types.js';

async function scanIds(db: DynamoDBDocumentClient, prefix: string): Promise<string[]> {
  const result = await db.send(
    new ScanCommand({
      TableName: CONTENT_TABLE_NAME,
      FilterExpression: 'SK = :meta AND begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':meta': 'META', ':prefix': prefix },
    }),
  );
  return (result.Items ?? [])
    .map((item) => (typeof item.id === 'string' ? item.id : undefined))
    .filter((id): id is string => Boolean(id));
}

/**
 * Pet/thing types are runtime DB rows in this schema, not a fixed enum, so
 * the Bedrock tool's enum has to come from a live scan rather than being
 * hardcoded. Degrades to a single 'unknown' fallback if a scan comes back
 * empty (shouldn't happen against a seeded table, but shouldn't crash the
 * run either).
 */
export async function loadTaxonomy(db: DynamoDBDocumentClient): Promise<Taxonomy> {
  const [thingTypeIds, petTypeIds] = await Promise.all([
    scanIds(db, 'THINGTYPE#'),
    scanIds(db, 'PETTYPE#'),
  ]);

  return {
    thingTypeIds: thingTypeIds.length > 0 ? thingTypeIds : ['unknown'],
    petTypeIds: petTypeIds.length > 0 ? petTypeIds : ['unknown'],
  };
}
