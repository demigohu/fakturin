#!/usr/bin/env bash
# Deploy + verify Fakturin v3 di Arbitrum Sepolia (chain 421614):
# MockIDRX (kecuali MOCK_IDRX di-set), FakturNFT, FakturRenderer, FakturVaultFactory, FakturRegistry,
# FakturVerifierReceiver, FakturKeeper, dan stack identitas Chainlink ACE.
#
# Usage:
#   ./scripts/deploy-and-verify.sh            # deploy baru + verify
#   ./scripts/deploy-and-verify.sh --resume   # lanjutkan deploy yang terputus
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Buat .env dulu: cp .env.example .env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${PRIVATE_KEY:?Set PRIVATE_KEY in .env}"
: "${ARBISCAN_API_KEY:?Set ARBISCAN_API_KEY in .env (Etherscan V2 key)}"

RPC="${ARBITRUM_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc}"
export ARBITRUM_SEPOLIA_RPC_URL="$RPC"

echo "→ Deploy + verify DeployFaktur on arbitrum-sepolia"

forge script script/DeployFaktur.s.sol:DeployFaktur \
  --rpc-url "$RPC" \
  --broadcast \
  --verify \
  --chain arbitrum-sepolia \
  --etherscan-api-key "$ARBISCAN_API_KEY" \
  --verifier etherscan \
  --verifier-url "https://api.etherscan.io/v2/api?chainid=421614" \
  --slow \
  --retries 5 \
  "$@"

echo ""
echo "Alamat ada di log di atas dan di broadcast/DeployFaktur.s.sol/421614/run-latest.json"
echo "Explorer: https://sepolia.arbiscan.io/"
