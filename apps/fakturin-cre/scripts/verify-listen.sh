#!/usr/bin/env bash
# Chainlink CRE verification workflow, always on: listens for FakturRegistry.VerificationRequested
# on Arbitrum Sepolia, checks the Faktur Pajak with PJAP, and writes the report to
# FakturVerifierReceiver through Chainlink's forwarder (`simulate --broadcast` = real transactions).
#
# Env (from the environment or ./.env): CRE_ETH_PRIVATE_KEY (pays gas), CRE_TARGET (default
# staging-settings). CRE_ENV_FILE overrides the env file path.
set -euo pipefail
# pm2 does not load a login shell: make bun (used by cre to compile TypeScript workflows) findable.
export PATH="${HOME}/.bun/bin:${PATH}"
cd "$(dirname "$0")/.."
ENV_FILE="${CRE_ENV_FILE:-.env}"
TARGET_ARGS=()
[[ -n "${CRE_TARGET:-}" ]] && TARGET_ARGS=(-T "$CRE_TARGET")

echo "[$(date -u +%FT%TZ)] fakturin-verify: listening (env ${ENV_FILE}${CRE_TARGET:+, target $CRE_TARGET})"
exec cre workflow simulate verify --listen --broadcast --non-interactive --trigger-index 0 \
  -e "$ENV_FILE" ${TARGET_ARGS[@]+"${TARGET_ARGS[@]}"}
