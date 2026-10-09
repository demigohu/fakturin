# Fakturin

Pembiayaan faktur terkonfirmasi di **Arbitrum Sepolia** (ETH Jakarta 2026 — RWA). Monorepo Turborepo: kontrak Foundry + frontend Next.js.

## Yang nyata vs simulasi

| Nyata (onchain) | Simulasi (UI / peran admin) |
| ---------------- | --------------------------- |
| Registry ID faktur & status | Rekening penampung rupiah |
| Konfirmasi pembeli (attestation) | Cek e-Faktur / QR DJP |
| ERC-721 token faktur | — |
| Pasar & anti pembiayaan ganda | Whitelist lender = admin demo |
| Pelunasan / gagal bayar (MockIDR) | Mitra = tombol oracle |

**MockIDR bukan uang nyata.**

## Struktur

- `apps/contracts-solidity` — Solidity 0.8 + Foundry + OpenZeppelin
- `apps/web` — Next.js + viem + wagmi
- `packages/abis` — ABI hasil `forge inspect`
- `docs/PRD.md`, `docs/Spec&Pitch.md`

## Development

```bash
npm install

# Tes kontrak
cd apps/contracts-solidity && forge test

# Frontend (set .env.local dulu)
npm run dev -- --filter=web
```

## Deploy Arbitrum Sepolia

1. Isi `PRIVATE_KEY` dan RPC di environment (lihat `.env.example`).
2. `forge script script/Deploy.s.sol:Deploy --rpc-url $ARBITRUM_SEPOLIA_RPC_URL --broadcast`
3. Verifikasi kontrak di [Arbiscan Sepolia](https://sepolia.arbiscan.io/) bila perlu.
4. Salin alamat ke `apps/web/.env.local`:
   - `NEXT_PUBLIC_MOCK_IDR_ADDRESS`
   - `NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS`
   - `NEXT_PUBLIC_INVOICE_MARKETPLACE_ADDRESS`
   - `NEXT_PUBLIC_INVOICE_NFT_ADDRESS`

Setelah deploy, deployer otomatis di-whitelist sebagai lender dan oracle demo. Tambah lender: `InvoiceMarketplace.setLender`.

## Chainlink CRE (opsional, setelah simulasi)

Demo hackathon **tidak bergantung** pada CRE deployed. Oracle pelunasan = `/mitra` + `ORACLE_ROLE`.  
Rencana: `cre workflow simulate --broadcast` di Arbitrum Sepolia dulu; `cre workflow deploy` hanya setelah deploy access.  
Detail: [docs/chainlink-cre.md](docs/chainlink-cre.md).

## Parameter demo (konfigurasi admin)

- Diskon 3% — harga token = 97% nominal
- Pencairan ke penjual 80% nominal saat beli
- Masa sanggah 60 detik
- Limit penjual 200 juta MockIDR, pembeli 500 juta (outstanding belum lunas)
