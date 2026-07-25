#!/usr/bin/env bash
# Commit (if needed) and push mycota, then record the submodule SHA in btfp and push btfp.
#
# The btfp commit updates ONLY vendor/mycota (the gitlink). App/infra changes in btfp must be
# committed separately — the script warns if other btfp changes exist and refuses if other paths
# are already staged.
#
# Usage:
#   pnpm mycota:ship -- "mycota commit message"
#   pnpm mycota:ship -- "mycota commit message" "btfp bump message"
#
# Flags:
#   --no-push     commit locally only, do not push either repo
#   --mycota-only only commit/push inside vendor/mycota
#   --btfp-only   only stage/commit/push the submodule pointer in btfp (mycota already pushed)
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
MYCOTA="${ROOT}/vendor/mycota"
NO_PUSH=false
MYCOTA_ONLY=false
BTFP_ONLY=false
ARGS=()

for arg in "$@"; do
  case "$arg" in
    --no-push) NO_PUSH=true ;;
    --mycota-only) MYCOTA_ONLY=true ;;
    --btfp-only) BTFP_ONLY=true ;;
    *) ARGS+=("$arg") ;;
  esac
done

MYCOTA_MSG="${ARGS[0]:-}"
BTFP_MSG="${ARGS[1]:-}"

warn_btfp_other_changes() {
  local lines
  lines="$(git -C "$ROOT" status --porcelain | awk '$2 != "vendor/mycota" { print }')"
  if [[ -n "$lines" ]]; then
    echo ""
    echo "note: btfp still has other uncommitted changes (apps/, infra/, docs/, etc.)."
    echo "      This script only commits the vendor/mycota pointer — commit the rest separately:"
    echo "        git status"
    echo "        git add … && git commit -m \"…\""
    echo ""
  fi
}

abort_if_staged_outside_submodule() {
  local staged
  staged="$(git -C "$ROOT" diff --cached --name-only | awk '$0 != "vendor/mycota" { print }')"
  if [[ -n "$staged" ]]; then
    echo "error: other paths are already staged in btfp; unstage them before bumping mycota:" >&2
    echo "$staged" | sed 's/^/  /' >&2
    echo "  git restore --staged -- <paths>" >&2
    echo "  (mycota:ship commits only vendor/mycota — app/infra changes need their own commit)" >&2
    exit 1
  fi
}

if [[ "$BTFP_ONLY" != true ]]; then
  if [[ -z "$MYCOTA_MSG" ]]; then
    echo "Usage: pnpm mycota:ship -- \"<mycota commit message>\" [\"<btfp bump message>\"]" >&2
    echo "       pnpm mycota:ship -- --btfp-only \"<btfp bump message>\"" >&2
    exit 1
  fi

  if [[ ! -d "$MYCOTA/.git" ]]; then
    echo "vendor/mycota is not a git checkout (run: git submodule update --init)" >&2
    exit 1
  fi

  cd "$MYCOTA"
  BRANCH="$(git branch --show-current || true)"
  if [[ -z "$BRANCH" ]]; then
    echo "mycota is on a detached HEAD — check out a branch before shipping (e.g. feat/improvements-for-btfp)" >&2
    exit 1
  fi

  if [[ -n "$(git status --porcelain)" ]]; then
    git add -A
    git commit -m "$MYCOTA_MSG"
  else
    echo "mycota: working tree clean, skipping commit"
  fi

  SHA="$(git rev-parse --short HEAD)"
  FULL_SHA="$(git rev-parse HEAD)"

  if [[ "$NO_PUSH" == false ]]; then
    git push -u origin HEAD
  fi

  cd "$ROOT"
else
  SHA="$(git -C "$MYCOTA" rev-parse --short HEAD)"
  FULL_SHA="$(git -C "$MYCOTA" rev-parse HEAD)"
fi

if [[ "$MYCOTA_ONLY" == true ]]; then
  echo "mycota at ${SHA} ($( [[ "$NO_PUSH" == true ]] && echo 'local only' || echo 'pushed' ))"
  warn_btfp_other_changes
  exit 0
fi

if [[ -z "$BTFP_MSG" ]]; then
  BTFP_MSG="Bump mycota to ${SHA}"
fi

cd "$ROOT"
abort_if_staged_outside_submodule

git add vendor/mycota

if git diff --cached --quiet vendor/mycota; then
  echo "btfp: vendor/mycota pointer already at ${SHA}, nothing to commit"
  warn_btfp_other_changes
  exit 0
fi

git commit -m "$BTFP_MSG" -- vendor/mycota

if [[ "$NO_PUSH" == false ]]; then
  git push
fi

echo "Done: mycota ${FULL_SHA} pinned in btfp ($( [[ "$NO_PUSH" == true ]] && echo 'local only' || echo 'pushed' ))"
warn_btfp_other_changes
