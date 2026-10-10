# PRD Fakturin v3: Faktur Pajak Terverifikasi, Didanai Bersama di Arbitrum

Oct 10, 2026 · @sdsd

_Fakturin: faktur terverifikasi, cair hari ini._

> **v3 (10 Okt 2026)** melanjutkan v2. Perubahan utama: identitas lewat **Chainlink ACE** (Cross-Chain Identity, kontrak inti open-source di-deploy sendiri): penjual wajib KYB dan memegang kredensial PKP berisi hash NPWP, pemberi dana wajib KYC; verifikasi faktur mencocokkan NPWP penjual di faktur dengan kredensial wallet (`SELLER_MISMATCH`); harga per hari tenor (1,5% per 30 hari, all-in) dengan **fee platform 10% dari biaya itu, diambil hanya saat lunas**; NFT faktur punya gambar SVG on-chain dengan cap status dan tetap di-burn saat klaim berakhir; vault lewat batas waktu ditutup otomatis oleh keeper (cron Chainlink CRE).
>
> **v2 (9 Okt 2026)** menggantikan v1: pembeli tidak memakai aplikasi; verifikasi Faktur Pajak lewat Chainlink CRE dan PJAP; vault ERC-4626 per faktur.

## 1. Ringkasan

Fakturin adalah **pembiayaan faktur (invoice financing)** untuk pemasok UMKM. Faktur Pajak milik penjual diverifikasi ke sistem pajak lewat Chainlink CRE, dikunci sebagai NFT di vault ERC-4626 khusus faktur itu, lalu didanai bersama oleh pemberi dana terverifikasi. Penjual menerima 80% nilai faktur begitu vault penuh dan melunasi saat pembelinya membayar. Polanya mengikuti [tokenisasi faktur](https://chain.link/article/invoice-tokenization-trade-finance) dan [onchain factoring](https://chain.link/article/onchain-factoring) dari Chainlink. Dokumen ini mendefinisikan MVP untuk Ethereum Jakarta Hackathon 2026 (track RWA) di Arbitrum Sepolia dengan dana uji MockIDRX, tiruan stablecoin rupiah IDRX (1 token = Rp1, 2 desimal) yang belum tersedia di Arbitrum.

**Masalah.** Pemasok kecil menunggu 30–90 hari untuk dibayar pembeli. Pemberi dana ragu membiayai faktur karena (a) faktur yang sama bisa diajukan ke beberapa pemberi dana yang tidak saling melihat, dan (b) siapa pun yang tahu nomor faktur bisa mengaku sebagai penjualnya. Kasus pembiayaan ganda terdokumentasi secara global (Hin Leong, Agritrade); kasus di Indonesia belum terkonfirmasi.

**Bukti utilitas.** Survei Atradius 2025 untuk Indonesia (N=240 perusahaan, Q2 2025): 54% penjualan B2B secara kredit, tempo rata-rata 50 hari, 49% faktur telat, sengketa faktur 26% penyebab telat, dan 52% responden memakai pembiayaan faktur dalam 12 bulan terakhir ([Atradius](https://atradius.de/dam/jcr:a5138c1e-7aa7-48b4-82d7-64a3d938d31d/payment-practices-barometer-asia-2025-indonesia-en.pdf)). Sampelnya perusahaan, belum tentu UMKM mikro, dan belum ada validasi langsung dari pengguna.

**Kenapa Faktur Pajak.** Sejak Coretax (1 Jan 2025) setiap Faktur Pajak punya nomor unik nasional dan tercatat di DJP, dengan data NPWP penjual dan pembeli, nilai, dan status (normal, pengganti, batal). Nomor itu menjadi kunci registry (satu nomor hanya bisa didanai sekali), dan NPWP penjual di faktur menjadi kunci kepemilikan (hanya bisnis dengan NPWP itu yang bisa membiayainya).

**Tujuan MVP.**

1. Penjual memverifikasi bisnisnya sekali (KYB), lalu cukup memasukkan nomor Faktur Pajak dan menandatangani satu transaksi; verifikasi, pencetakan NFT, dan pembukaan pendanaan berjalan otomatis.
2. Satu nomor Faktur Pajak tidak pernah bisa didanai dua kali, dan hanya bisa diajukan oleh bisnis yang NPWP-nya tertera di faktur.
3. Banyak pemberi dana terverifikasi (KYC) bisa mendanai satu faktur sesuai pilihan masing-masing; dana cair ke penjual begitu target terpenuhi.
4. Pelunasan, gagal bayar, dan pendanaan yang gagal ditutup dan dibagi otomatis secara proporsional, tanpa tombol manual.

**Bukan tujuan.**

- Membuktikan barang benar-benar dikirim, atau mencegah kongkalikong penjual dan pembeli.
- Memindahkan rupiah nyata, menjadi penyelenggara berlisensi, atau melakukan KYC/KYB sungguhan (penyedia verifikasi disimulasikan).
- Pool pendanaan otomatis: dilarang untuk penyelenggara LPBBTI (POJK 40/2024 Pasal 158).
- Pasar sekunder: share vault tidak bisa dipindahtangankan.
- Penilaian kredit atau penagihan ke pembeli.
- Penjual non-PKP (tanpa Faktur Pajak); lihat bagian 9.

## 2. Pengguna dan peran

Dua peran manusia memakai produk; verifikasi dan penutupan berjalan otomatis; pembeli tidak menyentuh aplikasi.

| Peran | Contoh ilustrasi | Tujuan | Tindakan di sistem |
| --- | --- | --- | --- |
| Penjual (PKP) | Bu Rina, pemasok bahan kemasan, faktur Rp100 juta tempo 60 hari | Kas lebih cepat | KYB sekali, memasukkan nomor Faktur Pajak, menerima dana, melunasi saat jatuh tempo |
| Pemberi dana | Individu atau institusi | Imbal hasil | KYC sekali, memilih faktur, menyetor sebagian atau seluruh target, menarik dana setelah lunas |
| Verifier (otomatis) | Workflow Chainlink CRE, atau relayer server di demo | Mengecek Faktur Pajak ke PJAP | Menulis hasil verifikasi (termasuk hash NPWP penjual) ke registry |
| Keeper (otomatis) | Workflow cron Chainlink CRE, atau relayer demo | Menutup vault tepat waktu | Membatalkan pendanaan yang tidak penuh; menandai gagal bayar |
| Penerbit kredensial (disimulasikan) | Penyedia e-KYC/KYB berizin | Memastikan identitas | Menulis CCID dan kredensial ke Chainlink ACE; satu-satunya yang diizinkan PolicyEngine |
| Pembeli (debitur) | Pabrik pembeli kemasan | Tidak berubah | Tidak memakai aplikasi; membayar penjual seperti biasa |
| Admin | Tim produk | Parameter | Mengatur tarif, fee, tingkat pencairan, tenor maksimum, limit, verifier, alamat identitas |

**Model pembayaran: silent factoring dengan recourse.** Pembeli tidak diberi tahu dan membayar ke penjual seperti biasa. Penjual tetap wajib melunasi ke vault saat jatuh tempo (recourse). Penahanan harga melindungi pemberi dana bila penjual tidak melunasi.

**Siapa yang membayar produk (model A).** Penjual membayar biaya pembiayaan 1,5% per 30 hari tenor, all-in. Fakturin mengambil 10% dari biaya itu sebagai fee, **hanya saat faktur lunas**; saat gagal bayar platform tidak mendapat apa-apa. Insentif platform sejalan dengan pemberi dana.

**Tes tetangga.** "Sebelum saya danai, saya bisa cek bahwa Faktur Pajak ini asli di DJP, diajukan oleh bisnis yang menerbitkannya, dan belum didanai orang lain."

## 3. Ruang lingkup MVP

| Kemampuan | Status di MVP | Catatan |
| --- | --- | --- |
| Registry nomor Faktur Pajak dan status | Nyata | ID = keccak256 nomor ternormalisasi; nomor pengganti (akhiran A) dipetakan ke nomor dasar |
| Identitas: Chainlink ACE Cross-Chain Identity | Nyata (kontrak) | PolicyEngine, IdentityRegistry, CredentialRegistry, dua CredentialRegistryIdentityValidator; kontrak inti ACE open-source (BUSL-1.1, pemakaian non-produksi) di-deploy sendiri |
| Penerbit KYC/KYB | Disimulasikan | Route server sebagai penyedia; pengguna membuktikan kontrol wallet dengan tanda tangan gratis; akun PJAP (NPWP, PKP) disimulasikan per wallet |
| Verifikasi Faktur Pajak | Nyata di kontrak, data disimulasikan | Workflow CRE dan relayer memanggil **mock API PJAP**; akses mesin resmi hanya lewat PJAP host-to-host (PER-03/PJ/2022) |
| Pencocokan NPWP penjual | Nyata | Registry membandingkan hash NPWP di hasil PJAP dengan kredensial PKP wallet |
| NFT faktur ERC-721 + gambar SVG on-chain | Nyata | Dicetak ke vault, tidak bisa dipindahkan, di-burn saat klaim berakhir; gambar bercap status tetap bisa dirender dari registry |
| Vault ERC-4626 per faktur | Nyata | Satu vault per faktur, aset MockIDRX, share tidak bisa dipindahkan |
| Pendanaan semua-atau-tidak | Nyata | Bila tidak penuh sampai batas waktu, dana kembali 1:1 |
| Harga per tenor dan fee platform | Nyata | 1,5% per 30 hari (dihitung per detik), fee 10% dari biaya ke treasury saat lunas |
| Pelunasan, gagal bayar, pembatalan | Nyata | Penutupan otomatis oleh FakturKeeper; fungsi vault tetap permissionless sebagai cadangan |
| Limit per penjual dan per pembeli (NPWP) | Nyata | Dari pendanaan berjalan |
| Rupiah | Disimulasikan | MockIDRX: tiruan IDRX (2 desimal); di produksi vault memakai IDRX atau stablecoin rupiah lain saat tersedia di Arbitrum. Bukan IDRX resmi |
| CRE di jaringan Chainlink (deploy terus-menerus) | Menunggu akses | `cre workflow simulate --broadcast` memakai kontrak yang sama; relayer demo menjalankan pengecekan yang sama |
| ACE Platform (UI, Coordinator/Reporting API) | Tidak dipakai | Private beta; model data sama sehingga bisa dipindah nanti |
| Penjual non-PKP, integrasi ERP | Tidak dikerjakan | Roadmap |

## 4. User stories dan kriteria penerimaan

| ID | Sebagai | Saya ingin | Kriteria penerimaan |
| --- | --- | --- | --- |
| US-00 | Penjual | Memverifikasi bisnis (KYB) | Tanda tangan gratis membuktikan kontrol wallet; penerbit menulis CCID dan kredensial `common.kyb` + `id.fakturin.pkp` (data = hash NPWP) ke Chainlink ACE; tanpa kredensial ini pengajuan ditolak |
| US-01 | Penjual | Mengajukan nomor Faktur Pajak | Satu transaksi; status Menunggu verifikasi; nomor yang pernah didanai, sedang didanai, atau menunggu ditolak |
| US-02 | Sistem | Memverifikasi ke PJAP | Hanya verifier terdaftar yang bisa menulis hasil; valid dan NPWP penjual cocok: data tersimpan, NFT dicetak ke vault baru, status Pendanaan; selain itu Ditolak dengan kode alasan |
| US-03 | Pemberi dana | Memverifikasi identitas (KYC) | Penerbit menulis kredensial `common.kyc` ke Chainlink ACE; hanya wallet dengan kredensial sah bisa menyetor; pencabutan kredensial langsung menghentikan setoran |
| US-04 | Pemberi dana | Menyetor ke vault faktur pilihan | Setoran dibatasi sisa target; share sebanding setoran |
| US-05 | Sistem | Mencairkan saat penuh | Setoran terakhir yang memenuhi target mencairkan tingkat pencairan dikali nominal ke penjual dalam transaksi yang sama; status Didanai |
| US-06 | Pemberi dana | Mendapat dana kembali bila target gagal | Setelah batas waktu pendanaan, keeper menutup vault otomatis; share ditukar 1:1; faktur boleh diajukan ulang |
| US-07 | Penjual | Melunasi | Menyetor nominal ke vault; penahanan kembali ke penjual; fee platform ke treasury; NFT dibakar; status Lunas |
| US-08 | Pemberi dana | Menarik hasil | Setelah lunas atau gagal bayar, share ditukar secara proporsional |
| US-09 | Sistem | Memproses gagal bayar | Setelah jatuh tempo + masa tenggang, keeper menandai gagal bayar otomatis; penahanan tetap di vault untuk pemberi dana; tanpa fee; penjual ditandai dan tidak bisa mengajukan lagi |
| US-10 | Siapa saja | Mengecek nomor Faktur Pajak | Status, vault, progres, gambar NFT bercap status, dan riwayat penjual terlihat tanpa dompet |
| US-11 | Admin | Mengatur parameter, verifier, dan identitas | Hanya admin; parameter yang membuat pencairan melebihi target ditolak; perubahan memancarkan event |

## 5. Status faktur

Status hanya maju: Menunggu verifikasi → Pendanaan → Didanai → Lunas atau Gagal bayar. Cabang: Menunggu verifikasi → Ditolak; Pendanaan → Pendanaan gagal. Faktur berstatus Ditolak atau Pendanaan gagal boleh diajukan ulang; faktur yang pernah Didanai tidak pernah bisa diajukan lagi.

## 6. Requirements fungsional dan aturan bisnis

| Parameter | Nilai demo | Keterangan |
| --- | --- | --- |
| Tarif penjual | 1,5% per 30 hari | Dihitung dari saat verifikasi sampai jatuh tempo, per detik; all-in (batas OJK pendanaan produktif 2026: 0,067% per hari ≈ 2% per 30 hari) |
| Fee platform | 10% dari biaya penjual | Ke treasury, hanya saat lunas |
| Tingkat pencairan (r) | 80% dari nominal | Cair ke penjual saat target penuh |
| Tenor maksimum | 180 hari | Lebih dari itu ditolak; menjamin pencairan selalu di bawah target |
| Batas waktu pendanaan | 3 hari | Setelah itu keeper membatalkan |
| Masa tenggang gagal bayar | 60 detik (demo) | Setelah jatuh tempo; produksi beberapa hari |
| Limit per penjual | Rp200 juta | Pendanaan berjalan |
| Limit per pembeli (NPWP) | Rp500 juta | Pendanaan berjalan |

Untuk N = Rp100 juta, tenor 60 hari: biaya penjual Rp3 juta, target Rp97 juta dari banyak pemberi dana; penjual menerima Rp80 juta saat penuh; Rp17 juta ditahan di vault. Lunas: penjual menyetor Rp100 juta dan menerima kembali Rp17 juta (biaya bersih Rp3 juta); Rp0,3 juta fee ke treasury; vault berisi Rp99,7 juta untuk pemegang share (pemberi dana +2,78%, sekitar 16% per tahun). Gagal bayar: vault berisi Rp17 juta untuk pemegang share, tanpa fee; penjual ditandai.

| ID | Aturan |
| --- | --- |
| FR-01 | ID faktur = keccak256("FP:" ‖ nomor ternormalisasi); normalisasi membuang spasi dan tanda baca, huruf besar, dan akhiran pengganti/pembatalan |
| FR-02 | Pengajuan ditolak bila ID sedang menunggu, sedang didanai, pernah didanai, atau penjual ditandai gagal bayar |
| FR-03 | Hanya alamat ber-role VERIFIER (receiver CRE atau relayer) yang bisa menulis hasil verifikasi |
| FR-04 | Verifikasi valid membuat vault baru dan mencetak satu NFT ERC-721 ke vault; NFT tidak bisa dipindahkan |
| FR-05 | Setoran hanya dari wallet yang lolos validator pemberi dana ACE (`common.kyc`), saat Pendanaan, sebelum batas waktu, maksimal sisa target |
| FR-06 | Setoran yang memenuhi target mencairkan r dikali N ke penjual secara atomik |
| FR-07 | Penarikan share hanya saat Pendanaan gagal, Lunas, atau Gagal bayar |
| FR-08 | Pelunasan oleh siapa saja yang menyetor N; penahanan ke penjual, fee ke treasury, N dikurangi fee untuk pemegang share |
| FR-09 | Gagal bayar oleh siapa saja setelah jatuh tempo + masa tenggang |
| FR-10 | Share vault tidak bisa dipindahkan antar alamat |
| FR-11 | Setiap transisi memancarkan event berisi ID, status, dan pelaku |
| FR-12 | Vault yang lewat batas waktu ditutup otomatis oleh `FakturKeeper`: workflow cron Chainlink CRE membaca `closable()` dan mengirim report; relayer demo memanggil `closeDue()`; gas per vault dipesan agar estimasi tidak menelan kegagalan |
| FR-13 | Pengajuan hanya dari penjual yang lolos validator penjual ACE (`common.kyb` dan `id.fakturin.pkp`); hasil verifikasi membawa hash NPWP penjual di faktur, dan bila berbeda dari kredensial PKP wallet, faktur Ditolak dengan kode `SELLER_MISMATCH` |
| FR-14 | Biaya = N × tarif × tenor / 30 hari; target = N − biaya; fee = 10% biaya; tenor > maksimum ditolak dengan kode `TENOR`; admin tidak bisa memasang parameter yang membuat pencairan melebihi target |
| FR-15 | NFT punya `tokenURI` on-chain (JSON + SVG) dengan nomor, nilai, tanggal, hash NPWP pembeli, dan cap status; NFT di-burn saat klaim berakhir, gambar bercap (LUNAS/DEFAULT) tetap tersedia lewat `FakturRenderer.svg` |
| FR-16 | Tulis ke IdentityRegistry dan CredentialRegistry hanya lewat penerbit yang diizinkan `OnlyAuthorizedSenderPolicy` di PolicyEngine ACE; di chain hanya CCID dan hash NPWP, tanpa data pribadi |

## 7. Non-fungsional, keamanan, data, dan privasi

| Area | Persyaratan |
| --- | --- |
| Platform | Solidity 0.8.28 + Foundry (via_ir) + OpenZeppelin 5.1 + Chainlink ACE core contracts di Arbitrum Sepolia |
| Privasi | Di chain hanya hash ID, hash NPWP penjual dan pembeli, CCID, nominal, tanggal; nama hanya ditampilkan dari API PJAP |
| Keamanan | ReentrancyGuard di vault; checks-effects-interactions; kontrak Fakturin tanpa upgrade; kontrak ACE di balik proxy UUPS yang dikendalikan admin |
| Kunci | Relayer demo memegang satu kunci (verifier, keeper, penerbit kredensial); produksi memakai CRE (DON) dan penyedia KYC/KYB berizin |
| Lisensi | Kontrak ACE BUSL-1.1: pemakaian non-produksi diizinkan; produksi butuh lisensi komersial dari Chainlink |
| Label | Komponen simulasi diberi label di UI: PJAP, penerbit KYC/KYB, MockIDRX |
| Transparansi | Kontrak diverifikasi; setiap transaksi ditinjau di dialog berbahasa awam dengan call data mentah |
| Pengujian | Tes Foundry untuk setiap US dan FR, termasuk jalur penolakan; E2E Playwright di anvil |

## 8. Layar dan alur demo

| Layar | Isi |
| --- | --- |
| Landing | Cerita produk (pembiayaan faktur), angka, guard (satu faktur satu pembiayaan, verifikasi sumber, NPWP, fee), kontrak termasuk ACE |
| Borrow (penjual) | Langkah 1 verifikasi bisnis (akun PJAP simulasi, KYB lewat ACE) → langkah 2 pilih Faktur Pajak dari Coretax (simulasi) → rincian biaya per tenor → status, progres, NFT, tombol Lunasi |
| Lend (pemberi dana) | Checklist (wallet, KYC lewat ACE, saldo) → daftar faktur dengan imbal hasil setelah fee → setor → pinjaman saya dan tarik |
| Cek faktur | Cari nomor Faktur Pajak; status, NFT bercap, data PJAP |

**Urutan demo (3 menit).**

1. Penjual memverifikasi bisnis (tanda tangan gratis, kredensial ACE terbit).
2. Penjual memilih Faktur Pajak miliknya; CRE/relayer memverifikasi ke PJAP; NPWP cocok; vault terbuka dengan NFT bercap VERIFIED.
3. Penjual mencoba faktur milik bisnis lain; ditolak karena NPWP tidak cocok.
4. Pemberi dana A dan B lolos KYC lalu menyetor; target penuh, 80% cair ke penjual.
5. Penjual melunasi; fee ke treasury; A dan B menarik dana dengan imbal hasil; NFT di-burn, gambar bercap LUNAS di halaman Cek.
6. Faktur demo "jatuh tempo 2 menit" tidak dilunasi; keeper menutupnya sebagai gagal bayar tanpa tombol; pemberi dana menarik penahanan; penjual ditandai.

## 9. Metrik, risiko, dan pertanyaan terbuka

| Risiko | Mitigasi |
| --- | --- |
| Data PJAP disimulasikan | Bentuk data meniru respons PJAP; ganti satu URL saat akses staging tersedia |
| Penerbit KYC/KYB disimulasikan | Kontrak ACE nyata; penerbit tinggal diganti penyedia berizin yang diotorisasi PolicyEngine |
| Penjual tidak melunasi (silent factoring) | Penahanan sekitar 17%, penanda gagal bayar, limit; perjanjian recourse di luar chain |
| Batas manfaat ekonomi OJK | 1,5% per 30 hari all-in di bawah 0,067% per hari (2026); cek ulang angka terbaru sebelum produksi |
| Lisensi ACE untuk produksi | BUSL-1.1 non-produksi; lisensi komersial atau ACE Platform saat produksi |
| Pendanaan bersama dianggap sekuritas | Share tidak bisa dipindahkan, tanpa pasar sekunder, hanya pemegang KYC; perlu kajian hukum |
| Pendanaan otomatis dilarang (POJK 40/2024) | Vault per faktur, setiap pemberi dana memilih sendiri |
| Penjual non-PKP tidak terlayani | Roadmap: verifikasi lewat software akuntansi via CRE |
| Kongkalikong penjual dan pembeli | Diterima di MVP; Faktur Pajak meninggalkan jejak PPN |

**Pertanyaan terbuka.** Akses staging PJAP (mis. Sipajak); persetujuan deploy CRE; akses ACE Platform; perlakuan hukum share vault.
