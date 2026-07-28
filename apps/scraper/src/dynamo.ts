import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const CONTENT_TABLE_NAME = process.env.CONTENT_TABLE_NAME ?? 'btfp-dev-content';

/** Points at DynamoDB Local when DYNAMODB_ENDPOINT is set (local dev/smoke-test), or real DynamoDB via the task role otherwise. */
export function createDynamoClient(): DynamoDBDocumentClient {
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
    ...(endpoint
      ? { endpoint, credentials: { accessKeyId: 'local', secretAccessKey: 'local' } }
      : {}),
  });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}
