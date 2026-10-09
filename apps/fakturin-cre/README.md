# Fakturin CRE (simulasi)

Deploy access: **Not enabled** — pakai `cre workflow simulate` (+ `--broadcast` bila perlu tx testnet).

## Prasyarat

- `cre login`
- `cp .env.example .env` lalu isi `CRE_ETH_PRIVATE_KEY` (bukan kunci Anvil kosong)
- **Saldo ETH Arbitrum Sepolia** (~0.002 ETH untuk deploy + broadcast)

Cek alamat & saldo:

```bash
cd apps/fakturin-cre
source .env
cast wallet address --private-key "$CRE_ETH_PRIVATE_KEY"
cast balance $(cast wallet address --private-key "$CRE_ETH_PRIVATE_KEY") \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

## 1. Deploy kontrak + consumer (Foundry)

Forwarder sim CRE: `0xD41263567DdfeAd91504199b8c6c87371e83ca5d`

```bash
cd apps/contracts-solidity
cp .env.example .env   # PRIVATE_KEY + ARBISCAN_API_KEY

# Opsional: samakan key dengan CRE
# grep CRE_ETH_PRIVATE_KEY ../fakturin-cre/.env >> .env  # jangan duplikasi variabel

chmod +x scripts/deploy-and-verify.sh
set -a && source .env && set +a
./scripts/deploy-and-verify.sh cre
```

Tanpa verify (hanya broadcast):

```bash
forge script script/DeployCre.s.sol:DeployCre \
  --rpc-url "${ARBITRUM_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc}" \
  --broadcast
```

Salin alamat dari log ke `settlement/config.json` (`consumerAddress`) dan `apps/web/.env.local`.

## 2. Simulasi workflow (tanpa tx)

```bash
cd apps/fakturin-cre
cp .env.example .env   # jika belum
./scripts/run-simulate.sh
```

Isi `invoiceId` di `settlement/config.json` setelah ada faktur status **Dibiayai** (dan fund receiver dengan MockIDR nominal).

## 3. Simulasi + broadcast ke Arbitrum Sepolia

```bash
cd apps/fakturin-cre
./scripts/run-simulate.sh --broadcast
```

## Forwarder

| Env | Alamat |
| --- | ------ |
| Simulation (`--broadcast` dev) | `0xD41263567DdfeAd91504199b8c6c87371e83ca5d` |
| Production (deploy workflow nanti) | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |

Chain name: `ethereum-testnet-sepolia-arbitrum-1`
