import { Injectable, Logger } from '@nestjs/common';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const CLASSIFICATIONS = [
  'veterinary_clinic',
  'animal_hospital',
  'university_or_research',
  'government_or_public_health',
  'other_organization',
  'likely_personal_or_unclear',
] as const;

export interface DomainClassification {
  classification: (typeof CLASSIFICATIONS)[number];
  reasoning: string;
}

const MODEL_ID = process.env.BEDROCK_INFERENCE_PROFILE_ID ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

/**
 * A signal for the human reviewer, not a gate — an LLM guessing from a
 * domain name can't actually prove an organization is real. If Bedrock is
 * unavailable or errors, verification still proceeds without a label.
 */
@Injectable()
export class BedrockClassifierService {
  private readonly logger = new Logger(BedrockClassifierService.name);
  private readonly client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

  async classifyDomain(domain: string): Promise<DomainClassification | null> {
    try {
      const response = await this.client.send(
        new ConverseCommand({
          modelId: MODEL_ID,
          messages: [
            {
              role: 'user',
              content: [
                {
                  text:
                    `Classify the email domain "${domain}" for someone claiming to be a veterinarian or ` +
                    'scientist contributing to a pet-safety database. Use only the domain name itself ' +
                    "(you don't have web access) to make your best guess.",
                },
              ],
            },
          ],
          toolConfig: {
            tools: [
              {
                toolSpec: {
                  name: 'classify_domain',
                  description: 'Classify what kind of organization an email domain likely belongs to.',
                  inputSchema: {
                    json: {
                      type: 'object',
                      properties: {
                        classification: { type: 'string', enum: [...CLASSIFICATIONS] },
                        reasoning: { type: 'string', description: 'One sentence explaining the guess.' },
                      },
                      required: ['classification', 'reasoning'],
                    },
                  },
                },
              },
            ],
            toolChoice: { tool: { name: 'classify_domain' } },
          },
        }),
      );

      const toolUse = response.output?.message?.content?.find((block) => block.toolUse)?.toolUse;
      const input = toolUse?.input as { classification?: string; reasoning?: string } | undefined;
      if (!input?.classification || !input.reasoning) return null;

      return {
        classification: input.classification as DomainClassification['classification'],
        reasoning: input.reasoning,
      };
    } catch (err) {
      this.logger.warn(
        `Bedrock domain classification failed for ${domain}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
