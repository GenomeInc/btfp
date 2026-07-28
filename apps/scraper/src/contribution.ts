import { randomUUID } from 'node:crypto';
import { PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { Contribution } from '@btfp/shared-types';
import { CONTENT_TABLE_NAME } from './dynamo.js';
import type { RedditPost } from './reddit/types.js';
import type { ExtractionResult } from './extract/types.js';

/** Sentinel contributorId — never resolves to a real user. Verified safe
 * against contributions.service.ts's approve()'s `contributor?.professional`
 * optional chain, which degrades gracefully for an unresolvable id. */
export const SCRAPER_CONTRIBUTOR_ID = 'system:reddit-scraper';

/**
 * Exact replica of contributions.service.ts propose()'s item shape — the
 * scraper always proposes a brand-new Thing (never an edit), so `thingId`
 * is always omitted. Reusing this shape means ModerationPage.tsx and the
 * approve() flow need zero changes to handle scraper-sourced candidates.
 */
export async function writeContribution(
  db: DynamoDBDocumentClient,
  post: RedditPost,
  extraction: ExtractionResult,
): Promise<Contribution> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const contribution: Contribution = {
    id,
    contributorId: SCRAPER_CONTRIBUTOR_ID,
    status: 'pending',
    payload: {
      name: extraction.thingName,
      thingTypeId: extraction.thingTypeId,
      petTypes: extraction.petTypeId
        ? [{ petTypeId: extraction.petTypeId, severity: extraction.severity ?? 'unknown' }]
        : [],
      details: { summary: extraction.summary, redditPostId: post.id },
      source: 'reddit',
      sourceUrl: `https://reddit.com${post.permalink}`,
    },
    createdAt: now,
  };

  await db.send(
    new PutCommand({
      TableName: CONTENT_TABLE_NAME,
      Item: {
        ...contribution,
        PK: `THING#${id}`,
        SK: `CONTRIB#${now}#${SCRAPER_CONTRIBUTOR_ID}`,
        GSI2PK: 'STATUS#pending',
        GSI2SK: `CONTRIB#${now}`,
      },
    }),
  );

  return contribution;
}
