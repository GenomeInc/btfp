# Infra

AWS CDK (TypeScript), everything in `us-east-1` (required for CloudFront's ACM cert and its
CLOUDFRONT-scope WAF WebACL; also simplest for a single-region MVP). No VPC, no NAT gateway
— Lambda talks to DynamoDB directly over the AWS SDK, which is both cheaper and simpler.

## Stacks

- **`BtfpDns`** — one Route53 public hosted zone for `badthingsforpets.com`. Deployed once,
  standalone, before anything else.
- **`BtfpEmail`** — one SES domain identity for `badthingsforpets.com`, shared by dev and
  prod. Deployed once, standalone, alongside `BtfpDns` — auto-creates its DKIM DNS records
  against the same hosted zone. Used for the professional-verification code emails (see
  `docs/verification-flow.md`).
- **`BtfpDev`** / **`BtfpProd`** — CDK Stages, each composing:
  - **Data** — DynamoDB `Content` + `Users` tables, on-demand billing.
  - **Api** — one Lambda running the NestJS BFF, behind an API Gateway HTTP API.
  - **Web** — S3 (private, OAC) + CloudFront + WAFv2 + ACM cert + Route53 alias record(s).

`BtfpDev` serves `dev.badthingsforpets.com`; `BtfpProd` serves `badthingsforpets.com` and
`www.badthingsforpets.com`.

## Budget (rough, at low/unknown traffic)

| Item | Cost |
|---|---|
| Route53 hosted zone | ~$0.50/mo |
| ACM certificate | free |
| Lambda + API Gateway | ~free under ~1M requests/mo |
| DynamoDB (on-demand) | pennies at this scale |
| CloudFront | pennies at this scale |
| WAF (2 rule groups) | ~$6-8/mo |
| SES | ~free — $0.10/1,000 emails, and this only sends verification codes |
| Bedrock (Claude Haiku, domain classification) | ~free — a few cents per 1,000 calls |

Dev + prod together should land well under $50/mo unless traffic spikes hard. The two
biggest levers if it doesn't: drop WAF's rate-limit rule, or merge dev+prod's WAF into a
single shared WebACL.

## SES sandbox

New SES accounts start in sandbox mode: can only send to individually-verified recipient
addresses, and at a low rate. Moving to production access is an AWS Support request
submitted via the SES console (Account dashboard → Request production access) — not
something CDK or the API can do; AWS reviews it, typically same-day. Until that's done,
`/verification/professional/request` will fail to deliver to any address you haven't
manually verified with `aws sesv2 create-email-identity --email-identity <address>`
(AWS emails a confirmation link to that address).

## Dev is not public

Dev isn't meant to be indexed, crawled, or generally reachable — it's a working environment,
not the product. `WebStack` adds a dev-only WAF rule requiring HTTP Basic Auth on every
request (site and API alike), returns `Disallow: /` from `robots.txt`, and sends
`X-Robots-Tag: noindex, nofollow` on every response. Prod has none of this — see
[LLM ingestibility](#llm-ingestibility) below for why prod deliberately goes the other way.

Real credentials live in `infra/cdk/.env.deploy.local` (gitignored — never commit real
values). Load them before running any `cdk` command against dev:

```bash
cd infra/cdk
set -a && source .env.deploy.local && set +a
npx cdk deploy BtfpDev/Web
```

`config.ts` falls back to an obviously-fake placeholder password if the env var isn't set,
so `cdk synth` still works credential-free — but don't deploy dev with the placeholder in
place, it's not a real barrier.

## LLM ingestibility

Prod deliberately does the opposite of dev: `robots.txt` allows known AI crawlers by name
(GPTBot, ClaudeBot, PerplexityBot, etc.), `/sitemap.xml` lists every thing page, `/llms.txt`
summarizes the site and API for agentic consumption, and `/api/openapi.json` exposes the
full API contract. None of this makes the actual HTML crawlable, though — the frontend is a
client-side-only SPA, so a crawler that doesn't execute JavaScript still sees an empty shell
for `/` and `/things/:id`. Fixing that needs build-time prerendering or SSR, which hasn't
been done yet.

## Deploy order

1. `aws sso login --profile <your-profile>`
2. `pnpm --filter @btfp/infra cdk bootstrap` (once per account/region)
3. `pnpm --filter @btfp/infra cdk deploy BtfpDns` — copy the `HostedZoneId` output
4. Set `BTFP_HOSTED_ZONE_ID` (env var, see `infra/cdk/lib/config.ts`) to that value
5. Set the NS records from `BtfpDns`'s `NameServers` output at your domain registrar
6. `pnpm --filter @btfp/infra cdk deploy BtfpEmail` — SES domain identity, needs
   `BTFP_HOSTED_ZONE_ID` set same as above. DKIM verification takes a few minutes to
   propagate; check with `aws sesv2 get-email-identity --email-identity badthingsforpets.com`.
7. `pnpm --filter @btfp/bff build` — the Api stack deploys the Lambda from
   `apps/bff/dist`, so it must exist first
8. `pnpm --filter @btfp/web build` — the Web stack's `BucketDeployment` uploads
   `apps/web/dist` to S3 and invalidates CloudFront as part of `cdk deploy`, so this must
   exist first too
9. For dev: load `infra/cdk/.env.deploy.local` (see above) before deploying — the Basic
   Auth password comes from there. For prod, no extra env vars needed.
10. `pnpm --filter @btfp/infra cdk deploy BtfpDev/* BtfpProd/*`

The Bedrock inference profile id (`BEDROCK_INFERENCE_PROFILE_ID` in `config.ts`) is
hardcoded to Claude Haiku 4.5's current profile — Anthropic model ids on Bedrock are
versioned and do change over time; if `bedrock:InvokeModel` starts failing with a
model-not-found error, check `aws bedrock list-inference-profiles` for the current id.
