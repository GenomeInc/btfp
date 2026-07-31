#!/usr/bin/env bash
# Pull the latest published @bubltec/mycota-* dev build into every app that
# depends on it. Replaces the old submodule-SHA-bump workflow now that
# mycota is a real npm package: there's no separate "pointer" to commit,
# just an ordinary dependency-version bump — commit the resulting
# package.json/pnpm-lock.yaml diff like any other dependency update.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "Pulling latest @bubltec/mycota-* @dev into apps/bff, apps/scraper, infra/cdk..."

pnpm add \
  "@bubltec/mycota-auth@dev" \
  "@bubltec/mycota-dynamo@dev" \
  "@bubltec/mycota-professional-verification@dev" \
  --filter @btfp/bff

pnpm add \
  "@bubltec/mycota-config@dev" \
  "@bubltec/mycota-dynamo@dev" \
  --filter @btfp/scraper

pnpm add "@bubltec/mycota-cdk@dev" --filter @btfp/infra

echo ""
echo "Done. Review the package.json/pnpm-lock.yaml diff and commit it as a normal dependency bump:"
echo "  git status"
echo "  git add … && git commit -m \"Bump @bubltec/mycota-* to latest dev\""
