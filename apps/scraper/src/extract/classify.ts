import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { RedditPost } from '../reddit/types.js';
import type { ExtractionResult, Taxonomy } from './types.js';

const SEVERITIES = ['mild', 'moderate', 'severe', 'unknown'] as const;

function buildPrompt(post: RedditPost): string {
  return (
    `A Reddit post, possibly describing a pet getting into something dangerous:\n\n` +
    `Title: ${post.title}\n\nBody: ${post.selftext || '(no body text)'}`
  );
}

/**
 * A signal for the human moderator, not a gate — every extraction lands as
 * an unverified Contribution regardless of confidence; nothing here ever
 * writes a verified Thing directly. If Bedrock is unavailable or the
 * response is malformed, returns null so the caller just skips the post
 * rather than blocking the whole run.
 */
export async function classifyPost(
  client: BedrockRuntimeClient,
  modelId: string,
  post: RedditPost,
  taxonomy: Taxonomy,
): Promise<ExtractionResult | null> {
  try {
    const response = await client.send(
      new ConverseCommand({
        modelId,
        messages: [{ role: 'user', content: [{ text: buildPrompt(post) }] }],
        toolConfig: {
          tools: [
            {
              toolSpec: {
                name: 'extract_pet_hazard',
                description:
                  'Determine whether a Reddit post describes a real pet-hazard incident and extract structured details if so.',
                inputSchema: {
                  json: {
                    type: 'object',
                    properties: {
                      isPetHazardReport: { type: 'boolean' },
                      thingName: { type: 'string' },
                      thingTypeId: { type: 'string', enum: taxonomy.thingTypeIds },
                      petTypeId: { type: 'string', enum: taxonomy.petTypeIds },
                      severity: { type: 'string', enum: [...SEVERITIES] },
                      summary: { type: 'string' },
                    },
                    required: ['isPetHazardReport'],
                  },
                },
              },
            },
          ],
          toolChoice: { tool: { name: 'extract_pet_hazard' } },
        },
      }),
    );

    const toolUse = response.output?.message?.content?.find((block) => block.toolUse)?.toolUse;
    const input = toolUse?.input as ExtractionResult | undefined;
    if (!input || typeof input.isPetHazardReport !== 'boolean') return null;

    return input;
  } catch {
    return null;
  }
}
