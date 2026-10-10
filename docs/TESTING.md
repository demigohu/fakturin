# Testing end-to-end Fakturin v3

Panduan ini untuk deploy v3 di **Arbitrum Sepolia** (10 Okt 2026). Semua kontrak terverifikasi di
[Arbiscan Sepolia](https://sepolia.arbiscan.io/).

| Kontrak | Alamat |
| --- | --- |
| MockIDRX (tiruan IDRX, 2 desimal) | `0x11fdaa711602C6b5cE4DeF19028a56b2f07Be22E` |
| FakturRegistry | `0xB0f57cbe61bB207Bcd9778f241280c28A74f2030` |
| FakturVaultFactory | `0x1e95cbab178772A8d7fE2Cb7a62760A479Dfbc53` |
| FakturNFT | `0x97fe1401dA1e167C964284344f8D8C00F60c7e66` |
| FakturRenderer | `0x713afe0eB8B09C2dEA3f0A360D9ac74348Ece8DD` |
| FakturVerifierReceiver (CRE) | `0xDaE568EA803859DE11fe43a385a219174A7f7975` |
| FakturKeeper (CRE cron) | `0xdd2785e1AB472838bD196837Dd5716372fef10a3` |
| ACE IdentityRegistry | `0x9A1149837d01e6Afe66463531768F5FE96D38435` |
| ACE CredentialRegistry | `0x3DFBb1B4f66b718Add7a1292ACaaa6bb69DBF777` |
| ACE PolicyEngine | `0xA159ab1D85482c51ad0856Ab73CF52C6f9006213` |
| Relayer = penerbit ACE = treasury | `0x6c54435C36d3A83A07b264dE8b81ee04E5Ade11d` |

## Cara kerja dialog transaksi

Setiap aksi membuka dialog review dulu: ringkasan bahasa awam, langkah bernomor, dan **What exactly gets
signed** (kontrak, fungsi, argumen, raw data). Klik **Start and open wallet**, konfirmasi tiap langkah di
wallet, lalu **Close**.

- **wallet signature**: transaksi, butuh sedikit ETH Sepolia untuk gas.
- **free signature, no transaction**: hanya tanda tangan pesan (verifikasi identitas), gratis.
- **automatic, no signature**: dikerjakan server/Chainlink, tidak ada popup wallet.

Wallet seperti OKX sering tidak bisa membaca token test: approve tampil tanpa jumlah, deposit disebut
"Farm", repay disebut "Unknown transaction". Itu normal. Bandingkan **Raw data** di dialog dengan
*Advanced → Data* di wallet; isinya harus sama persis. Agar saldo terlihat di wallet, tambahkan token
custom: alamat MockIDRX di atas, desimal **2**.

## Siapa yang menjalankan langkah otomatis

Dua langkah berjalan tanpa klik: **mengecek faktur ke PJAP** dan **menutup vault yang lewat waktu**.
Pilih penjalannya dengan `NEXT_PUBLIC_VERIFIER` di `apps/web/.env` (restart web setelah diubah):

| Mode | Yang menjalankan | Kapan dipakai |
| --- | --- | --- |
| `cre` | Workflow **Chainlink CRE** (`apps/fakturin-cre`) lewat `cre workflow simulate --broadcast`, dijalankan pm2 di VPS: listener `verify` (selalu menyala) dan loop `keeper` (tiap 60 detik) | Mode utama: yang memverifikasi faktur benar-benar workflow Chainlink |
| `relayer` | Route server web (`/api/verify`, `/api/keeper`) dengan `VERIFIER_PRIVATE_KEY`, logika sama persis | Cadangan bila pm2/VPS mati; instan |

Penerbit KYC/KYB (`/api/identity`) bukan bagian CRE dan selalu berjalan di server web, jadi
`VERIFIER_PRIVATE_KEY` tetap wajib di kedua mode. Cara menyalakan CRE ada di `apps/fakturin-cre/README.md`.

## Persiapan

1. Wallet di MetaMask/OKX, masing-masing dengan sedikit ETH Arbitrum Sepolia untuk gas:
   - **Penjual** (skenario lunas)
   - **Penjual cadangan** (skenario gagal bayar; wallet yang pernah default diblokir permanen)
   - **Funder A** dan **Funder B**
   - opsional **Penjual lain** (untuk mencoba nomor yang sudah dipakai)
2. `apps/web/.env` berisi alamat di atas dan `VERIFIER_PRIVATE_KEY` (lihat `apps/web/.env.example`).
3. Jalankan web lalu buka `http://localhost:3000`:

   ```bash
   npm run dev -- --filter=web
   ```

### Akun pajak dan Faktur Pajak demo (PJAP simulasi)

Setiap wallet otomatis punya satu akun PJAP simulasi: nama usaha, NPWP, dan kode penjual. Setelah
verifikasi bisnis, halaman Borrow menampilkan Faktur Pajak "dari Coretax" atas NPWP itu:

| Tombol | Hasil |
| --- | --- |
| **Invoice A / B / C** | Valid. Nilai acak Rp25–150 juta, jatuh tempo 30–90 hari |
| **Due in 2 minutes** (akhiran `7777`) | Valid, jatuh tempo 2 menit setelah dicek. Biayanya hampir nol |
| **Cancelled invoice** (akhiran `9999`) | Dibatalkan; tombol submit tidak aktif |
| **Another business's invoice** | Valid, tapi diterbitkan NPWP bisnis lain: ditolak `SELLER_MISMATCH` |

Nomor yang diakhiri `8888` = diganti, `0000` = tidak ditemukan. Nomornya acak setiap kali halaman dibuka.

Biaya penjual = 1,5% per 30 hari tenor (dihitung per hari, all-in). Dari biaya itu 90% untuk funder, 10%
fee Fakturin. Contoh 60 hari, Rp100 juta: funder meminjamkan Rp97 juta, menerima Rp99,7 juta.

## A. Skenario uji

### Skenario 1: lunas

1. **Penjual**, halaman **Borrow** (`/borrow`)
   1. Connect wallet. Panel **First, verify your business** menampilkan akun pajak simulasi
      (nama usaha, NPWP tersamar, PKP aktif).
   2. Klik **Review and verify business** → 1 tanda tangan gratis → penerbit menulis CCID dan kredensial
      `common.kyb` + `id.fakturin.pkp` (berisi hash NPWP) ke Chainlink ACE. Sidebar **Your wallet**
      menampilkan nama usaha sebagai **Verified business**.
   3. Klik **Get test MockIDRX** (1 transaksi, Rp1 miliar) untuk repay nanti.
   4. Klik **Invoice A**. Muncul kartu PJAP (Simulated) dan rincian: *To your wallet when funded*,
      *Held back*, *Your total cost* beserta bagian funder dan fee.
   5. Klik **Review and submit** → 1 transaksi (`requestVerification`), lalu langkah otomatis Chainlink.
      Dialog berakhir **"Verified. Your funding vault is open…"**. Di **Your invoices**: status
      **Funding**, kartu **Invoice NFT** dengan gambar faktur bercap **VERIFIED**.
   6. Klik **Another business's invoice** → muncul info bahwa faktur ini milik bisnis lain →
      **Review and submit**. Dialog berhenti dengan **"Not verified: … another business's NPWP …"**,
      hanya tombol **Close**. Faktur itu tampil **Rejected** di daftar.
2. **Funder A**, halaman **Lend** (`/lend`)
   1. Checklist **Before you lend**: klik **Verify identity** → 1 tanda tangan gratis → kredensial
      `common.kyc` terbit di Chainlink ACE.
   2. **Get test MockIDRX**.
   3. Di kartu faktur (nama usaha penjual, **+x% return in N days**, rincian *Seller's cost*), isi
      `5000000` lalu **Review: lend Rp5M** → 2 transaksi: approve persis Rp5,000,000
      (`500000000` raw units, 2 desimal), lalu deposit. Pinjaman muncul di **My loans**.
3. **Funder B**, halaman **Lend**
   1. **Verify identity**, **Get test MockIDRX**.
   2. Kosongkan kolom nominal (= sisa target) → **Review: lend …**. Dialog menyebut deposit ini memenuhi
      vault. Status **Financed**; 80% nilai faktur langsung masuk ke wallet penjual di transaksi yang sama.
4. **Penjual**, halaman **Borrow**: notice hijau **"…was sent to your wallet automatically… Nothing to
   withdraw"** dengan link **See the payment**; gambar NFT bercap **FINANCED**.
5. **Cek** (`/check`): masukkan nomor faktur. Status **Financed**, gambar NFT, data PJAP.
   Opsional: wallet **Penjual lain** (sudah verifikasi bisnis) mengetik nomor yang sama di Borrow →
   **"already registered"**, tombol submit mati.
6. **Penjual**: **Repay Rp…** → tabel aliran uang di dialog (bayar nominal, penahanan dilepas ke penjual,
   fee Fakturin, sisa untuk funder) → 2 transaksi (approve, repay). Status **Repaid**.
7. **Funder A dan B**: **My loans → Withdraw** (1 transaksi). Jumlahnya = setoran × (nominal − fee) / target.
   Di `/check`, NFT sudah di-burn dan gambarnya tetap tampil bercap **LUNAS**. Treasury menerima fee.

### Skenario 2: gagal bayar, ditutup otomatis

1. **Penjual cadangan**: verifikasi bisnis, lalu **Due in 2 minutes** → **Review and submit** (segera,
   sebelum 2 menit berlalu).
2. **Funder** (sudah KYC): danai sampai penuh (kolom kosong → **Review: lend …**).
3. **Jangan klik apa pun.** Setelah jatuh tempo + masa tenggang 60 detik (±3 menit), status berubah
   sendiri menjadi **Defaulted**: di mode `cre` oleh keeper CRE (maksimal ~1 menit kemudian), di mode
   `relayer` oleh halaman Lend/Borrow yang sedang terbuka.
4. **Funder**: **Withdraw** bagian yang ditahan (sekitar 20% nilai faktur, dibagi pro rata).
5. **Penjual cadangan**: notice oranye; wallet ini tidak bisa mengajukan faktur lagi. Di `/check`: status
   **Defaulted**, gambar NFT bercap **DEFAULT**, treasury tidak menerima fee.

### Skenario 3: pendanaan tidak penuh

Jendela pendanaan 3 hari, jadi tidak praktis untuk demo live. Perilakunya diuji di kontrak
(`test_US06_unfilledVaultRefundsOneToOneAndCanRelist`, `test_FR12_keeperCancelsExpiredFundingSoFundersGetRefund`):
setelah deadline, keeper membatalkan vault, funder withdraw 1:1, dan nomor faktur boleh diajukan ulang.

## B. Menjalankan dengan Chainlink CRE (mode `cre`)

1. Di VPS, jalankan workflow dengan pm2 (detail di `apps/fakturin-cre/README.md`):

   ```bash
   cd apps/fakturin-cre && pm2 start ecosystem.config.cjs
   ```

   Pastikan `verify/config.json` → `pjapBaseUrl` mengarah ke URL publik web app.
2. Di `apps/web/.env` set `NEXT_PUBLIC_VERIFIER=cre`, lalu restart/rebuild web.
3. Ulangi **Skenario 1** dan **2** di atas. Bedanya:
   - Setelah **Review and submit**, langkah kedua bertuliskan *Chainlink CRE sees your request… (10–60
     seconds)*; dialog menunggu sampai hasil CRE masuk ke chain. Di `pm2 logs fakturin-cre-verify`:
     `VerificationRequested …` → `PJAP result valid=true code=0` → `Verification written: 0x…`.
   - Faktur yang lewat jatuh tempo bertuliskan *The Chainlink CRE keeper checks every minute and closes
     it*. Di `pm2 logs fakturin-cre-keeper`: `Closing 1 vault(s): 0x…` → `Keeper report written: 0x…`.
4. Faktur yang diajukan saat listener mati tidak diproses otomatis. Proses manual dengan hash transaksi
   pengajuan:

   ```bash
   cre workflow simulate verify --broadcast --non-interactive --trigger-index 0 \
     --evm-tx-hash 0x<hash_pengajuan> --evm-event-index 0
   ```

## Kalau ada error

| Gejala | Penyebab / solusi |
| --- | --- |
| Tombol verifikasi identitas gagal "Identity issuer not configured" | `VERIFIER_PRIVATE_KEY` atau alamat ACE kosong di `.env`; restart dev server |
| "Not enough MockIDRX" | Klik **Get test MockIDRX** |
| "Verify your identity first" di kartu Lend | Funder belum KYC |
| Daftar faktur/vault kosong padahal ada transaksi | `NEXT_PUBLIC_DEPLOY_BLOCK` harus blok L2 deploy (`317643441`), bukan blok L1 |
| Mode `cre`: dialog submit lama lalu "Still waiting for Chainlink CRE" | Listener `fakturin-cre-verify` mati atau `pjapBaseUrl` tidak bisa diakses dari VPS; cek `pm2 logs` |
| Penjual tidak bisa submit sama sekali | Wallet itu pernah default (diblokir), atau belum verifikasi bisnis |

## Tes kontrak

```bash
cd apps/contracts-solidity && forge test
```

37 test di `test/Faktur.t.sol`, satu per user story / functional rule di `docs/PRD.md`, termasuk identitas
ACE, pencocokan NPWP, harga per tenor, fee, keeper, dan gambar NFT.
