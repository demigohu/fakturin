#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.bun/bin:${PATH}"
# Skip cron "Press Enter" wait
printf '\n' | cre workflow simulate settlement --target "${CRE_TARGET:-staging-settings}" -e .env "$@"
