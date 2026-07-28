import { loadSsmConfig } from '@mycota/config';
import { DEFAULT_SUBREDDITS } from './subreddits.js';

export interface ScraperConfig {
  env: string;
  redditClientId: string;
  redditClientSecret: string;
  bedrockInferenceProfileId: string;
  subreddits: string[];
}

const DEFAULT_MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

/**
 * Non-secret config (STAGE, BEDROCK_INFERENCE_PROFILE_ID, SCRAPER_SUBREDDITS)
 * comes in as plain env vars baked into the Fargate task definition, same
 * split as the rest of this repo. Reddit credentials come from SSM at
 * runtime — the task role is granted read access via grantSsmConfigRead,
 * not baked in at synth time.
 */
export async function loadConfig(): Promise<ScraperConfig> {
  const env = process.env.STAGE ?? 'dev';
  const ssm = await loadSsmConfig({ namespace: 'btfp', env });
  const subredditsEnv = process.env.SCRAPER_SUBREDDITS;

  return {
    env,
    redditClientId: ssm['reddit-client-id'] ?? '',
    redditClientSecret: ssm['reddit-client-secret'] ?? '',
    bedrockInferenceProfileId: process.env.BEDROCK_INFERENCE_PROFILE_ID ?? DEFAULT_MODEL_ID,
    subreddits: subredditsEnv
      ? subredditsEnv.split(',').map((s) => s.trim()).filter(Boolean)
      : DEFAULT_SUBREDDITS,
  };
}
