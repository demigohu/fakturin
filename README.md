# Fakturin

Pembiayaan Faktur Pajak terverifikasi di **Arbitrum Sepolia** (ETH Jakarta 2026, RWA). UMKM (PKP) mengajukan
nomor Faktur Pajak, Chainlink CRE memverifikasinya ke PJAP, lalu satu vault ERC-4626 terbuka untuk faktur itu.
Banyak pemberi dana patungan (all-or-nothing); begitu penuh, penjual langsung menerima 80%. Pembeli tidak memakai
app (silent factoring, recourse ke penjual). Monorepo Turborepo: kontrak Foundry, workflow CRE, frontend Next.js.

## Yang nyata vs simulasi

| Nyata (onchain) | Simulasi |
| --- | --- |
| Registry Faktur Pajak, anti pembiayaan ganda, limit | Data PJAP / DJP (`/api/pjap`) |
| Vault ERC-4626 per faktur, repay, default, withdraw | Penyedia KYC/KYB yang menerbitkan kredensial |
| Identitas Chainlink ACE (CCID, kredensial KYC/KYB/PKP), pencocokan NPWP penjual | Akun pajak (NPWP, PKP) per wallet |
| Harga per tenor (1,5%/30 hari), fee platform 10% saat lunas, NFT dengan SVG on-chain | |
| Verifikasi via Chainlink CRE (`FakturVerifierReceiver`) | MockIDRX, bukan rupiah |
| Tutup otomatis vault lewat waktu (`FakturKeeper`) | Relayer demo menggantikan CRE yang belum di-deploy permanen |

**MockIDRX bukan uang nyata.** Ini tiruan testnet dari IDRX (stablecoin rupiah, 1 token = Rp1, 2 desimal), bukan diterbitkan oleh IDRX.

## Struktur

- `apps/contracts-solidity` — Solidity 0.8.28 + Foundry + OpenZeppelin
- `apps/fakturin-cre/verify` — workflow CRE: `VerificationRequested` → PJAP → `fulfillVerification`
- `apps/fakturin-cre/keeper` — workflow CRE cron: tutup vault yang lewat deadline / jatuh tempo
- `apps/web` — Next.js + wagmi + viem + Reown AppKit
- `packages/abis` — ABI kontrak
- `apps/contracts-solidity/lib/chainlink-ace` — kontrak inti Chainlink ACE (open-source, BUSL-1.1, non-produksi)
- `docs/PRD.md` — spesifikasi, `docs/TESTING.md` — panduan testing end-to-end

## Development

```bash
npm install

# Tes kontrak
cd apps/contracts-solidity && forge test

# Frontend (isi apps/web/.env dulu: cp apps/web/.env.example apps/web/.env)
npm run dev -- --filter=web
```

## Deploy Arbitrum Sepolia

```bash
cd apps/contracts-solidity
cp .env.example .env   # PRIVATE_KEY, ARBITRUM_SEPOLIA_RPC_URL, ARBISCAN_API_KEY
./scripts/deploy-and-verify.sh
```

Salin alamat dari log ke `apps/web/.env` dan ke `apps/fakturin-cre/verify/config.json` /
`apps/fakturin-cre/keeper/config.json`. Detail: `apps/contracts-solidity/README.md`.

## Parameter demo (admin, `FakturRegistry.setParameters`)

- Biaya penjual 1,5% per 30 hari tenor (all-in): target vault = nominal − biaya; fee Fakturin 10% dari biaya, saat lunas
- Tenor maksimum 180 hari
- Pencairan ke penjual 80% nominal saat vault penuh; sisanya ditahan sampai repay
- Jendela pendanaan 3 hari, masa tenggang setelah jatuh tempo 60 detik
- Limit outstanding penjual Rp200 juta, pembeli Rp500 juta
