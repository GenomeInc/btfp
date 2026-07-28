import { GetCommand, PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CONTENT_TABLE_NAME } from './dynamo.js';

export interface Watermark {
  lastSeenCreatedUtc: number;
  lastSeenPostId: string;
  updatedAt: string;
}

/** PK: SCRAPERWATERMARK#{subreddit}, SK: META — exact key get/put only, no GSI needed. */
export async function getWatermark(
  db: DynamoDBDocumentClient,
  subreddit: string,
): Promise<Watermark | null> {
  const result = await db.send(
    new GetCommand({
      TableName: CONTENT_TABLE_NAME,
      Key: { PK: `SCRAPERWATERMARK#${subreddit}`, SK: 'META' },
    }),
  );
  return (result.Item as Watermark | undefined) ?? null;
}

export async function putWatermark(
  db: DynamoDBDocumentClient,
  subreddit: string,
  lastSeenCreatedUtc: number,
  lastSeenPostId: string,
): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: CONTENT_TABLE_NAME,
      Item: {
        PK: `SCRAPERWATERMARK#${subreddit}`,
        SK: 'META',
        lastSeenCreatedUtc,
        lastSeenPostId,
        updatedAt: new Date().toISOString(),
      },
    }),
  );
}

/** PK: REDDITPOST#{postId}, SK: META — marks a post seen so it's never re-classified. */
export async function isAlreadyProcessed(
  db: DynamoDBDocumentClient,
  postId: string,
): Promise<boolean> {
  const result = await db.send(
    new GetCommand({ TableName: CONTENT_TABLE_NAME, Key: { PK: `REDDITPOST#${postId}`, SK: 'META' } }),
  );
  return Boolean(result.Item);
}

/**
 * Conditional put guards against a concurrent/retried run double-marking
 * the same post — a ConditionalCheckFailedException here just means
 * someone else already marked it, not a real error.
 */
export async function markProcessed(
  db: DynamoDBDocumentClient,
  postId: string,
  subreddit: string,
): Promise<void> {
  try {
    await db.send(
      new PutCommand({
        TableName: CONTENT_TABLE_NAME,
        Item: { PK: `REDDITPOST#${postId}`, SK: 'META', subreddit, processedAt: new Date().toISOString() },
        ConditionExpression: 'attribute_not_exists(PK)',
      }),
    );
  } catch (err) {
    if (!(err instanceof Error) || err.name !== 'ConditionalCheckFailedException') throw err;
  }
}
