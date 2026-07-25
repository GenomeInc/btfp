# Contributing (code)

```bash
git clone --recurse-submodules git@github.com:GenomeInc/btfp.git
# already cloned without it? `git submodule update --init`
pnpm install
docker compose up -d          # DynamoDB Local
pnpm seed:local                 # load seed data
pnpm dev                        # bff on :3001, web on :5173 (proxies /api to bff)
```

Clone with `--recurse-submodules` (see above) so `vendor/mycota` is populated. Framework work
happens in that submodule; see [Working on mycota](#working-on-mycota-submodule-dependency)
below.

Copy `apps/bff/.env.example` to `apps/bff/.env` for OAuth/JWT config; the app boots fine
without it, but sign-in won't work until GitHub OAuth credentials are set (see
[verification-flow.md](verification-flow.md)). If you have AWS access, `pnpm secrets:sync dev`
fills in the real `JWT_SECRET`/`GITHUB_CLIENT_SECRET` values instead of leaving placeholders
(see [Secrets](./infra.md#secrets)).

Recommended: install [direnv](https://direnv.net) (`brew install direnv`, then add
`eval "$(direnv hook zsh)"` — or the equivalent for your shell — to your shell rc file) and run
`direnv allow` once in `apps/bff` and `infra/cdk`. Both already have an `.envrc` checked in, so
`cd`-ing into either then just loads its `.env`/`.env.deploy.local` automatically — no more
remembering to `source` anything by hand.

## Git hooks (Lefthook)

**Oxlint** and **oxfmt** run **on commit**, not in CI — full-tree lint/format in GitHub Actions
duplicated what hooks already enforce on every commit.

After `pnpm install`, the root `prepare` script runs `lefthook install` and registers a
**pre-commit** hook (`lefthook.yml` at the repo root). On each commit it:

- runs **oxlint** with `--fix` on staged `*.{js,jsx,ts,tsx,mjs,cjs}` files (`.oxlintrc.json`)
- runs **oxfmt** with `--write` on those same files (`.oxfmtrc.json`)
- re-stages any fixes (`stage_fixed: true`)

Only staged files in the commit are touched, so hooks stay fast. **mycota** uses the same hook
shape and the same oxlint/oxfmt settings in its own repo (`vendor/mycota/lefthook.yml`,
`.oxlintrc.json`, `.oxfmtrc.json`). Commits inside `vendor/mycota` use mycota’s hooks; commits
at the btfp root use btfp’s.

If hooks are missing (new clone, skipped `pnpm install`), run `pnpm exec lefthook install` from
that repo’s root. To bypass once: `git commit --no-verify` (use sparingly — CI still runs
typecheck/build on the whole tree).

Manual full-tree checks when you need them: `pnpm run lint`, `pnpm run format` (each repo root —
not turbo tasks). Day-to-day lint/format happen in **Lefthook** on commit.

## Working on mycota (submodule dependency)

[mycota](https://github.com/GenomeInc/mycota) is its **own project** — NestJS/Dynamo/auth/config/CDK
packages (`@mycota/*`), its own git history and CI. btfp **depends on it** and we actively develop
both in parallel, but btfp never “owns” mycota source; it only records **which mycota commit** it
was built against.

| Where | Role |
| --- | --- |
| **mycota repo** | Source of truth for framework code. Push here when a change is ready to share or publish. |
| **`vendor/mycota` in btfp** | Git submodule = pinned commit of mycota. |
| **btfp `pnpm-workspace.yaml`** | Links `vendor/mycota/packages/*` so `apps/bff` can use `workspace:*` on `@mycota/auth` without npm publish while iterating. |

**npm publish** is optional and later; until then, submodule + workspace link is the integration path.

### Typical loop

1. **Edit framework code** — work inside `vendor/mycota` (a separate repo; `git status` there is
   independent of btfp).
2. **Validate in btfp** — from the btfp root, run `pnpm turbo run typecheck build` (and manual
   smoke if you touched auth/config). Lint/format on changed lines should already be clean from
   Lefthook when you committed.
3. **Push mycota** — when you’re satisfied, commit and push **from `vendor/mycota`** to
   [GenomeInc/mycota](https://github.com/GenomeInc/mycota) (feature branch or `main`, per team
   practice). mycota’s CI runs `pnpm turbo run typecheck build test` (lint/format are hook-only).
4. **Pin the commit in btfp** — the parent repo does not track files inside the submodule; it
   records **one gitlink** (a commit SHA). After mycota has a commit at `HEAD`:

   ```bash
   cd vendor/mycota && git rev-parse HEAD   # the SHA you’re pinning
   cd ../..
   git add vendor/mycota                    # stages that SHA — not individual files under vendor/
   git commit -m "Bump mycota to <short-sha> (<what changed>)"
   ```

   `git status` at the btfp root may show `modified: vendor/mycota (new commits)` when you’ve
   committed inside the submodule but haven’t updated the pointer yet — that’s the signal to
   `git add vendor/mycota`.

   **One command** (commit dirty mycota if needed, push mycota, bump pointer, push btfp):

   ```bash
   pnpm mycota:ship -- "feat(cdk): ephemeral config construct" "Bump mycota (ephemeral config)"
   ```

   Omit the second message to default to `Bump mycota to <short-sha>`. Flags: `--no-push`
   (local commits only), `--mycota-only`, `--btfp-only` (pointer bump when mycota is already
   pushed). Script: `scripts/ship-mycota.sh`.

   **Separate commits:** `mycota:ship` only creates a btfp commit for `vendor/mycota` (the
   submodule SHA). Changes under `apps/`, `infra/`, `packages/`, etc. stay uncommitted — commit
   those in a follow-up (or beforehand). If other paths are already staged in btfp, the script
   exits with an error so they are not accidentally bundled into the bump commit.

5. **Open a btfp PR** — includes the pointer bump plus app/infra changes. btfp CI checks out
   submodules and runs turbo typecheck/build over the **pinned tree**, so integration breaks
   show up here even though mycota already passed its own CI.

You can pin a **WIP mycota commit** on a btfp feature branch before mycota `main` moves — the
submodule SHA is the contract for “what btfp expects.”

### What not to do

- Don’t treat mycota changes as “just part of a btfp commit” without pushing mycota and updating the
  submodule pointer — other clones only get mycota via the submodule SHA.
- Don’t add btfp-only concepts (`@btfp/shared-types`, app routes, etc.) into mycota; keep shared
  **domain** types in btfp’s `packages/shared-types` and **framework** types in `@mycota/auth`.

## Before opening a PR

```bash
pnpm turbo run typecheck build   # tsc + build — same as CI
```

Lint and format should already be correct from the Lefthook pre-commit hook. For a full-tree
pass manually: `pnpm run lint` and/or `pnpm run format`.

Linting is [oxlint](https://oxc.rs), formatting is [oxfmt](https://oxc.rs) — both Rust-based
replacements for ESLint/Prettier, configured at `.oxlintrc.json`/`.oxfmtrc.json` in each repo
root and applied on commit via Lefthook (see above). `oxfmt` is still alpha software; if it ever
produces something clearly wrong, that's worth a GitHub issue upstream rather than working
around it silently here.

For end-to-end coverage of a real user flow, see [e2e-testing.md](e2e-testing.md) — generate
a Playwright test from a plain-English description rather than writing one by hand.

## Conventions

- TypeScript everywhere, `workspace:*` for internal package references.
- Shared types (`Thing`, `PetType`, etc.) live in `packages/shared-types` — add there first
  if a change touches both `apps/bff` and `apps/web`.
- No inline comments beyond a line or two, and only where the *why* isn't obvious from the
  code. See `.claude/skills/` for guided patterns when adding a new thing type, API
  endpoint, or infra resource.
