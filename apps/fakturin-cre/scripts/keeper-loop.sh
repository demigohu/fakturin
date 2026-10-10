#!/usr/bin/env bash
# Chainlink CRE keeper workflow on a loop: every KEEPER_INTERVAL seconds (default 60) it asks
# FakturKeeper which vaults are overdue and, if any, writes a report that closes them.
# Cron triggers cannot use `simulate --listen`, so the cron tick is driven from here.
#
# Env (from the environment or ./.env): CRE_ETH_PRIVATE_KEY, CRE_TARGET, KEEPER_INTERVAL,
# CRE_ENV_FILE (env file path, default ./.env).
set -uo pipefail
# pm2 does not load a login shell: make bun (used by cre to compile TypeScript workflows) findable.
export PATH="${HOME}/.bun/bin:${PATH}"
cd "$(dirname "$0")/.."
ENV_FILE="${CRE_ENV_FILE:-.env}"
INTERVAL="${KEEPER_INTERVAL:-60}"
TARGET_ARGS=()
[[ -n "${CRE_TARGET:-}" ]] && TARGET_ARGS=(-T "$CRE_TARGET")

# Compile once; every tick then reuses the WASM binary instead of rebuilding.
cre workflow build keeper -e "$ENV_FILE" ${TARGET_ARGS[@]+"${TARGET_ARGS[@]}"} || exit 1

echo "[$(date -u +%FT%TZ)] fakturin-keeper: running every ${INTERVAL}s"
while true; do
  cre workflow simulate keeper --broadcast --non-interactive --trigger-index 0 \
    --wasm "$PWD/keeper/binary.wasm" -e "$ENV_FILE" ${TARGET_ARGS[@]+"${TARGET_ARGS[@]}"} 2>&1 \
    | grep -E "USER LOG|Closing|written|No overdue|rror|failed" \
    || echo "[$(date -u +%FT%TZ)] keeper tick produced no log lines"
  sleep "$INTERVAL"
done
