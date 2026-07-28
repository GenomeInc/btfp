import { describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { classifyPost } from './classify.js';
import type { RedditPost } from '../reddit/types.js';
import type { Taxonomy } from './types.js';

const post: RedditPost = {
  id: 'abc123',
  title: 'My dog ate a sock',
  selftext: 'He seems fine but I am worried',
  permalink: '/r/dogs/comments/abc123/',
  created_utc: 1700000000,
  stickied: false,
};

const taxonomy: Taxonomy = {
  thingTypeIds: ['plant', 'food', 'medication', 'unknown'],
  petTypeIds: ['dog', 'cat'],
};

describe('classifyPost', () => {
  it('sends a forced tool-use request scoped to the live taxonomy enums', async () => {
    const bedrock = mockClient(BedrockRuntimeClient);
    bedrock.on(ConverseCommand).resolves({
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              toolUse: {
                toolUseId: 't1',
                name: 'extract_pet_hazard',
                input: { isPetHazardReport: true, thingName: 'sock', severity: 'moderate' },
              },
            },
          ],
        },
      },
    });

    const client = new BedrockRuntimeClient({});
    const result = await classifyPost(client, 'model-id', post, taxonomy);

    expect(result).toEqual({ isPetHazardReport: true, thingName: 'sock', severity: 'moderate' });

    const call = bedrock.commandCalls(ConverseCommand)[0];
    const sent = call?.args[0].input;
    expect(sent?.modelId).toBe('model-id');
    expect(sent?.toolConfig?.toolChoice).toEqual({ tool: { name: 'extract_pet_hazard' } });
    const tool = sent?.toolConfig?.tools?.[0]?.toolSpec;
    const schema = tool?.inputSchema?.json as { properties: Record<string, { enum?: string[] }> };
    expect(schema.properties.thingTypeId?.enum).toEqual(taxonomy.thingTypeIds);
    expect(schema.properties.petTypeId?.enum).toEqual(taxonomy.petTypeIds);
  });

  it('returns null when the response has no tool-use block', async () => {
    const bedrock = mockClient(BedrockRuntimeClient);
    bedrock.on(ConverseCommand).resolves({ output: { message: { role: 'assistant', content: [] } } });

    const client = new BedrockRuntimeClient({});
    const result = await classifyPost(client, 'model-id', post, taxonomy);

    expect(result).toBeNull();
  });

  it('returns null instead of throwing when the Bedrock call fails', async () => {
    const bedrock = mockClient(BedrockRuntimeClient);
    bedrock.on(ConverseCommand).rejects(new Error('throttled'));

    const client = new BedrockRuntimeClient({});
    const result = await classifyPost(client, 'model-id', post, taxonomy);

    expect(result).toBeNull();
  });
});
