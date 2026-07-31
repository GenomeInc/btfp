# Reddit-scraping pipeline

`apps/scraper` is a scheduled ECS Fargate task (not a long-running service —
it wakes up, does one batch of work, exits) that ingests candidate
pet-hazard reports from Reddit into the existing moderation queue. It
**never writes a verified `Thing` directly** — every candidate lands as a
`pending`, unverified `Contribution` (same shape `apps/bff`'s own
`propose()` writes), so a human moderator always has to approve it through
the normal `ModerationPage` flow before it becomes real data. No frontend
work was needed for this — `ModerationPage.tsx` already renders anything
under `GSI2PK = STATUS#pending` generically.

## Reddit access — this is currently gated, not self-serve

Reddit's [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy)
requires explicit approval before API access, and separate **written**
approval for commercial use — creating a script app at
[reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) is no longer
enough on its own. Submitting that request is a manual, one-time step on
your side (same category as the Bedrock use-case-details form below) — the
pipeline is built and ready regardless of where that request stands; it
just no-ops with a clear log line until real credentials exist.

Once approved: register a **script**-type app (a dedicated bot Reddit
account, not your personal one, is recommended given rate limits and the
`User-Agent` attribution below), then push its `client_id`/`client_secret`:

```
/btfp/dev/reddit-client-id
/btfp/dev/reddit-client-secret
/btfp/prod/reddit-client-id
/btfp/prod/reddit-client-secret
```

via `pnpm secrets:push dev` / `pnpm secrets:push prod` (see
[docs/infra.md#secrets](./infra.md#secrets)) after setting the real values
in `infra/cdk/.env.deploy.local`. Per-env, not shared — separate dev/prod
Reddit apps so dev testing doesn't burn prod's rate-limit budget. The task
reads them at runtime via `@bubltec/mycota-config`'s `loadSsmConfig`, IAM-granted
via `grantSsmConfigRead` — CDK synth never needs these values directly.

## How it works

For each configured subreddit: fetch posts newer than a stored watermark
(Reddit's `client_credentials` OAuth flow, no per-user login needed), skip
already-processed posts (a dedup marker), run non-trivial posts through
Bedrock (`us.anthropic.claude-haiku-4-5-20251001-v1:0`, same model and same
forced-tool-use pattern as `BedrockClassifierService`) to extract
`{ isPetHazardReport, thingName, thingTypeId, petTypeId, severity, summary }`,
and write a `Contribution` for anything classified as a real report. Then
advance the watermark to the newest post actually seen, whether or not it
became a candidate.

`thingTypeId`/`petTypeId` are constrained to whatever actually exists in the
Content table at run time (a live `Scan`, not a hardcoded enum) — these are
runtime DB rows in this schema, not a fixed set.

## Configuration

- **Subreddits**: `SCRAPER_SUBREDDITS` env var on the Fargate task
  definition (`infra/cdk/lib/scraper-stack.ts`), comma-separated. Defaults
  to `apps/scraper/src/subreddits.ts`'s `DEFAULT_SUBREDDITS`
  (`dogs`, `cats`, `AskVet`, `DogAdvice`, `CatAdvice`, `Pets`).
- **Schedule**: `events.Schedule.rate(...)` in `scraper-stack.ts`, currently
  every 6 hours. Tune based on observed post volume / Bedrock cost.

## Dedup / watermarking, and how to force a re-scan

Both live as small items in the existing Content DynamoDB table (no
separate table):

- `PK: SCRAPERWATERMARK#{subreddit}, SK: META` — the last-seen post's
  timestamp/id per subreddit. Delete this item (AWS console or CLI) to make
  the next run re-fetch that subreddit's full recent history instead of
  just what's new.
- `PK: REDDITPOST#{postId}, SK: META` — a marker so a given post is never
  reclassified, whether or not it became a candidate. Delete a specific
  one to force that single post to be re-evaluated.

## Manually triggering a run

Outside the 6h schedule, use the cluster/task-definition ARNs from the
`Scraper` stack's `CfnOutput`s (`ClusterArn`, `TaskDefinitionArn`):

```bash
aws ecs run-task \
  --cluster <ClusterArn> \
  --task-definition <TaskDefinitionArn> \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<public-subnet-id>],assignPublicIp=ENABLED}"
```

Watch progress via CloudWatch Logs (`/aws/ecs/...`, log group from the
stack).

## Testing

Unit tests (`pnpm --filter @btfp/scraper test`) mock all external calls —
Reddit's `fetch`, Bedrock via `aws-sdk-client-mock`, DynamoDB via
`aws-sdk-client-mock` — and cover the Reddit pagination/watermark logic,
the Bedrock forced-tool-use request shape and graceful-failure behavior,
and (most importantly) that the written `Contribution` item exactly
matches `contributions.service.ts`'s key shape, since a mismatch there
means candidates silently vanish from the moderation queue with no visible
error anywhere.

Before a first deploy to `BtfpDev`, run the pipeline once manually (see
above) against a single test subreddit and confirm a real candidate shows
up correctly in the (Basic-Auth-walled) dev site's `ModerationPage`, with a
working `sourceUrl` link back to the real Reddit post. Only deploy to
`BtfpProd` after that's confirmed and at least one real moderator review of
a scraper-produced candidate has happened in dev.
