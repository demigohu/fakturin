# Chainlink CRE — strategi hackathon

Pelunasan **demo utama** tetap lewat `ORACLE_ROLE` + halaman `/mitra` (dompet oracle + MockIDR). CRE dipakai sebagai **jalur paralel**: simulasi dulu, workflow deployed di jaringan Chainlink hanya setelah [deploy access](https://docs.chain.link/cre/account/deploy-access) disetujui.

## Butuh deploy access?

| Yang mau dilakukan | Butuh deploy access? |
| ------------------ | -------------------- |
| Deploy kontrak Fakturin ke Arbitrum Sepolia | **Tidak** |
| `cre workflow simulate` (lokal, mock forwarder) | **Tidak** (butuh akun + `cre login` untuk beberapa fitur) |
| `cre workflow simulate --broadcast` ke Arbitrum Sepolia | **Tidak** deploy access (butuh `CRE_ETH_PRIVATE_KEY` / dompet + ETH testnet Arbitrum) |
| Workflow **terus-menerus** di jaringan CRE (`cre workflow deploy`) | **Ya** |

Selama permintaan deploy access ditinjau, lu tetap bisa develop + simulasi ([Deploy Access](https://docs.chain.link/cre/account/deploy-access)).

**Sikap aman:**

- Permintaan access biarkan jalan; kalau disetujui = bonus.
- Demo dirancang **jalan penuh tanpa CRE deployed**.
- Jangan klaim workflow sudah “live di jaringan Chainlink” kecuali sudah deploy dan pernah diuji.
- **Uji sendiri** `simulate --broadcast` ke **Arbitrum Sepolia** (banyak contoh docs masih Ethereum Sepolia).

## Arbitrum Sepolia (CRE)

| Item | Nilai |
| ---- | ----- |
| **Chain name** (`project.yaml`) | `ethereum-testnet-sepolia-arbitrum-1` |
| **Production forwarder** (`KeystoneForwarder`) | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |
| **Simulation forwarder** (`MockKeystoneForwarder`) | `0xd41263567ddfead91504199b8c6c87371e83ca5d` |
| **Dukungan jaringan** | [Supported Networks](https://docs.chain.link/cre/supported-networks-ts) |
| **Direktori forwarder** | [Forwarder Directory](https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts) |

Setelah `cre login`: `cre workflow supported-chains --output json` (daftar bisa **per tenant**).

## Fase kerja

### Fase 1 — sekarang (tanpa deploy access)

1. Kontrak + frontend Fakturin di Arbitrum Sepolia (Foundry + `apps/web`).
2. Demo pitch: alur penjual → pembeli → pasar → **mitra simulasi** (`settle` / `markDefault`).
3. (Opsional) Inisialisasi proyek CRE di mesin lu: `cre init` dengan RPC Arbitrum Sepolia ([Project Configuration](https://docs.chain.link/cre/reference/project-configuration-ts)).
4. (Opsional) `cre workflow simulate <workflow> --target staging-settings --broadcast` — verifikasi tx ke Sepolia; consumer pakai **mock forwarder** di constructor saat dev.

**Catatan simulasi:** Tanpa `--broadcast`, mock forwarder **tidak** memanggil `onReport()` di kontrak consumer ([Onchain Write overview](https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/overview-ts)). Untuk end-to-end consumer, pakai `--broadcast` atau nanti deploy workflow.

### Fase 2 — setelah deploy access

1. Consumer production dengan forwarder `0x76c9…E62`; `market.setOracle(consumer)`.
2. `cre workflow deploy` + trigger (cron/HTTP/log) untuk pelunasan mitra.
3. Pitch: “Oracle mitra dijalankan lewat CRE; aturan pembagian tetap di kontrak Fakturin.”

## Nyambung ke kontrak Fakturin

Alur CRE onchain write: workflow → `runtime.report()` → `evmClient.writeReport()` → forwarder → consumer `onReport()` ([overview](https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/overview-ts)).

Belum ada consumer `ReceiverTemplate` di repo — sengaja ditunda sampai simulasi/broadcast diuji. Rencana:

1. Deploy consumer (forwarder sim/prod) → decode payload → `InvoiceMarketplace.settle(bytes32)` / `markDefault(bytes32)`.
2. Grant **`ORACLE_ROLE`** ke consumer (bukan EOA mitra).
3. MockIDR: sama seperti `/mitra` — approve + transfer nominal sebelum settle.

Tanpa CRE, cukup `setOracle(deployer)` seperti `script/Deploy.s.sol` hari ini.

## Kalimat pitch (jujur)

> “Pelunasan mitra di demo kami simulasikan lewat oracle onchain. Kami siapkan integrasi Chainlink CRE: workflow dijalankan lewat **simulasi** dengan mock forwarder Arbitrum Sepolia; saat deploy access tersedia, consumer yang sama dialihkan ke Keystone forwarder testnet dan workflow bisa di-deploy terus-menerus.”

## Env CRE (contoh)

Buat `.env` di root proyek CRE (jangan commit):

```bash
CRE_ETH_PRIVATE_KEY=0x...          # dompet dengan ETH Arbitrum Sepolia
CRE_TARGET=staging-settings
# RPC bisa di project.yaml: ethereum-testnet-sepolia-arbitrum-1
```

Forwarder & alamat kontrak Fakturin (setelah deploy) masuk `config.staging.json` workflow.
