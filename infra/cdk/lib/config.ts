export const ROOT_DOMAIN = 'badthingsforpets.com';

// Everything lives in us-east-1: required for CloudFront's ACM cert and its
// CLOUDFRONT-scope WAF WebACL, and simplest for a single-region MVP.
export const AWS_REGION = 'us-east-1';
export const AWS_ACCOUNT = process.env.CDK_DEFAULT_ACCOUNT;

// Set after `cdk deploy BtfpDns` once, from its HostedZoneId output.
export const HOSTED_ZONE_ID = process.env.BTFP_HOSTED_ZONE_ID ?? 'REPLACE_AFTER_DNS_STACK_DEPLOY';

// WAF-level Basic Auth for the dev stage only — dev isn't meant to be public
// or bot-crawlable. Set both at deploy time; never commit real values.
export const DEV_BASIC_AUTH_USER = process.env.BTFP_DEV_BASIC_AUTH_USER ?? 'dev';
export const DEV_BASIC_AUTH_PASSWORD =
  process.env.BTFP_DEV_BASIC_AUTH_PASSWORD ?? 'REPLACE_BEFORE_DEPLOYING_DEV';

// Shared by dev + prod; the EmailStack SES identity is for the whole domain.
export const SES_FROM_ADDRESS = process.env.BTFP_SES_FROM_ADDRESS ?? `noreply@${ROOT_DOMAIN}`;

// Session JWT signing secret. Deliberately separate per environment — never
// commit real values. Was previously missing entirely, silently falling
// back to a hardcoded (and public, since this repo is public) default.
export const DEV_JWT_SECRET = process.env.BTFP_DEV_JWT_SECRET ?? 'REPLACE_BEFORE_DEPLOYING_DEV';
export const PROD_JWT_SECRET = process.env.BTFP_PROD_JWT_SECRET ?? 'REPLACE_BEFORE_DEPLOYING_PROD';

// Claude Haiku 4.5 needs the inference profile, not the bare model id — see docs/infra.md.
export const BEDROCK_INFERENCE_PROFILE_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

export interface EnvConfig {
  envName: 'dev' | 'prod';
  domainName: string;
  aliasDomainNames: string[];
}

export const environments: Record<'dev' | 'prod', EnvConfig> = {
  dev: {
    envName: 'dev',
    domainName: `dev.${ROOT_DOMAIN}`,
    aliasDomainNames: [],
  },
  prod: {
    envName: 'prod',
    domainName: ROOT_DOMAIN,
    aliasDomainNames: [`www.${ROOT_DOMAIN}`],
  },
};
