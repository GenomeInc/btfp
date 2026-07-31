#!/usr/bin/env bash
# Pull the latest real @bubltec/mycota-* release (`latest` dist-tag) into
# every app that depends on it. Replaces the old submodule-SHA-bump
# workflow now that mycota is a real npm package: there's no separate
# "pointer" to commit, just an ordinary dependency-version bump — commit
# the resulting package.json/pnpm-lock.yaml diff like any other dependency
# update.
#
# mycota's CI publishes two dist-tags: `latest` (only on a
# #major/#minor/#patch-marked merge, a real release — what this script
# tracks) and `next` (every other merge, a rolling prerelease). If you want
# the bleeding edge instead of the latest real release, run
# `pnpm add @bubltec/mycota-x@next` for the packages you need.
#
# Resolves the real version via `npm view` first, then pins that exact
# version — deliberately NOT `pnpm add pkg@latest`. pnpm's
# minimumReleaseAge supply-chain check (see pnpm-workspace.yaml's
# minimumReleaseAgeExclude) only reliably auto-allowlists an *exact*
# version pin; tag-resolved installs (`@latest`/`@next`) silently no-op
# against a freshly-published version regardless of the exclude config —
# confirmed empirically, not a documented pnpm behavior to rely on.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

resolve() {
  npm view "$1" dist-tags.latest
}

AUTH_VERSION="$(resolve @bubltec/mycota-auth)"
DYNAMO_VERSION="$(resolve @bubltec/mycota-dynamo)"
CONFIG_VERSION="$(resolve @bubltec/mycota-config)"
PROF_VERIFICATION_VERSION="$(resolve @bubltec/mycota-professional-verification)"
CDK_VERSION="$(resolve @bubltec/mycota-cdk)"

echo "Pulling @bubltec/mycota-* $AUTH_VERSION into apps/bff, apps/scraper, infra/cdk..."

pnpm add \
  "@bubltec/mycota-auth@$AUTH_VERSION" \
  "@bubltec/mycota-dynamo@$DYNAMO_VERSION" \
  "@bubltec/mycota-professional-verification@$PROF_VERIFICATION_VERSION" \
  --filter @btfp/bff

pnpm add \
  "@bubltec/mycota-config@$CONFIG_VERSION" \
  "@bubltec/mycota-dynamo@$DYNAMO_VERSION" \
  --filter @btfp/scraper

pnpm add "@bubltec/mycota-cdk@$CDK_VERSION" --filter @btfp/infra

echo ""
echo "Done. Review the package.json/pnpm-lock.yaml diff and commit it as a normal dependency bump:"
echo "  git status"
echo "  git add … && git commit -m \"Bump @bubltec/mycota-* to latest release\""
