#!/usr/bin/env bash
# Pull the latest @bubltec/mycota-* rolling prerelease (`next` dist-tag)
# into every app that depends on it. Replaces the old submodule-SHA-bump
# workflow now that mycota is a real npm package: there's no separate
# "pointer" to commit, just an ordinary dependency-version bump — commit
# the resulting package.json/pnpm-lock.yaml diff like any other dependency
# update.
#
# mycota's CI publishes two dist-tags: `next` (every merge, ephemeral) and
# `latest` (only on a #major/#minor/#patch-marked merge, a real release).
# This script tracks `next` — if you want to pin to a real release instead,
# run `pnpm add @bubltec/mycota-x` (no tag) for the packages you need.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "Pulling latest @bubltec/mycota-* @next into apps/bff, apps/scraper, infra/cdk..."

pnpm add \
  "@bubltec/mycota-auth@next" \
  "@bubltec/mycota-dynamo@next" \
  "@bubltec/mycota-professional-verification@next" \
  --filter @btfp/bff

pnpm add \
  "@bubltec/mycota-config@next" \
  "@bubltec/mycota-dynamo@next" \
  --filter @btfp/scraper

pnpm add "@bubltec/mycota-cdk@next" --filter @btfp/infra

echo ""
echo "Done. Review the package.json/pnpm-lock.yaml diff and commit it as a normal dependency bump:"
echo "  git status"
echo "  git add … && git commit -m \"Bump @bubltec/mycota-* to latest next\""
