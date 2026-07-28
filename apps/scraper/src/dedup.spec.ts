import { describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { getWatermark, isAlreadyProcessed, markProcessed, putWatermark } from './dedup.js';

function client() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

describe('watermark', () => {
  it('reads the watermark by exact key', async () => {
    const db = mockClient(DynamoDBDocumentClient);
    db.on(GetCommand).resolves({ Item: { lastSeenCreatedUtc: 100, lastSeenPostId: 'abc' } });

    const result = await getWatermark(client(), 'dogs');

    expect(result).toEqual({ lastSeenCreatedUtc: 100, lastSeenPostId: 'abc' });
    expect(db.commandCalls(GetCommand)[0]?.args[0].input.Key).toEqual({
      PK: 'SCRAPERWATERMARK#dogs',
      SK: 'META',
    });
  });

  it('returns null when no watermark exists yet', async () => {
    const db = mockClient(DynamoDBDocumentClient);
    db.on(GetCommand).resolves({});

    const result = await getWatermark(client(), 'dogs');
    expect(result).toBeNull();
  });

  it('writes the watermark under the expected key shape', async () => {
    const db = mockClient(DynamoDBDocumentClient);
    db.on(PutCommand).resolves({});

    await putWatermark(client(), 'dogs', 500, 'xyz');

    const item = db.commandCalls(PutCommand)[0]?.args[0].input.Item;
    expect(item).toMatchObject({
      PK: 'SCRAPERWATERMARK#dogs',
      SK: 'META',
      lastSeenCreatedUtc: 500,
      lastSeenPostId: 'xyz',
    });
  });
});

describe('processed marker', () => {
  it('reports processed when the marker item exists', async () => {
    const db = mockClient(DynamoDBDocumentClient);
    db.on(GetCommand).resolves({ Item: { PK: 'REDDITPOST#abc', SK: 'META' } });

    expect(await isAlreadyProcessed(client(), 'abc')).toBe(true);
  });

  it('reports not processed when no marker exists', async () => {
    const db = mockClient(DynamoDBDocumentClient);
    db.on(GetCommand).resolves({});

    expect(await isAlreadyProcessed(client(), 'abc')).toBe(false);
  });

  it('writes a conditional marker on the expected key', async () => {
    const db = mockClient(DynamoDBDocumentClient);
    db.on(PutCommand).resolves({});

    await markProcessed(client(), 'abc', 'dogs');

    const input = db.commandCalls(PutCommand)[0]?.args[0].input;
    expect(input?.Item).toMatchObject({ PK: 'REDDITPOST#abc', SK: 'META', subreddit: 'dogs' });
    expect(input?.ConditionExpression).toBe('attribute_not_exists(PK)');
  });

  it('swallows a ConditionalCheckFailedException (already marked by a concurrent run)', async () => {
    const db = mockClient(DynamoDBDocumentClient);
    const err = new Error('conditional failed');
    err.name = 'ConditionalCheckFailedException';
    db.on(PutCommand).rejects(err);

    await expect(markProcessed(client(), 'abc', 'dogs')).resolves.toBeUndefined();
  });

  it('re-throws any other error', async () => {
    const db = mockClient(DynamoDBDocumentClient);
    db.on(PutCommand).rejects(new Error('network blip'));

    await expect(markProcessed(client(), 'abc', 'dogs')).rejects.toThrow('network blip');
  });
});
