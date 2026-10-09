# PRD Fakturin v2: Faktur Pajak Terverifikasi, Didanai Bersama di Arbitrum

Oct 9, 2026 · @sdsd

_Fakturin: faktur terverifikasi, cair hari ini._

> **v2 (9 Okt 2026)** menggantikan v1. Perubahan utama: pembeli tidak lagi memakai aplikasi; verifikasi memakai Faktur Pajak (Coretax DJP) lewat Chainlink CRE dan PJAP; pendanaan memakai vault ERC-4626 per faktur sehingga banyak pemberi dana bisa ikut; skema recourse dengan penahanan harga; peran mitra dan masa sanggah dihapus.

## 1. Ringkasan

Fakturin mengubah Faktur Pajak milik pemasok UMKM menjadi token di Arbitrum, membuka pendanaan bersama untuk faktur itu lewat vault ERC-4626, lalu membayar pemberi dana otomatis saat penjual melunasi. Polanya mengikuti [tokenisasi faktur](https://chain.link/article/invoice-tokenization-trade-finance) dan [onchain factoring](https://chain.link/article/onchain-factoring) dari Chainlink: data faktur diverifikasi dari sistem sumber lewat CRE sebelum token dicetak, token dikunci di kontrak sehingga tidak bisa dibiayai di tempat lain, dan dana dibagikan kontrak. Dokumen ini mendefinisikan MVP untuk Ethereum Jakarta Hackathon 2026 (track RWA) di Arbitrum Sepolia dengan dana uji MockIDR.

**Masalah.** Pemasok kecil menunggu 30–90 hari untuk dibayar pembeli. Pemberi dana ragu membiayai faktur karena faktur yang sama bisa diajukan ke beberapa pemberi dana yang tidak saling melihat. Kasus pembiayaan ganda terdokumentasi secara global (Hin Leong, Agritrade); kasus di Indonesia belum terkonfirmasi.

**Bukti utilitas.** Survei Atradius 2025 untuk Indonesia (N=240 perusahaan, Q2 2025): 54% penjualan B2B secara kredit, tempo rata-rata 50 hari, 49% faktur telat, sengketa faktur 26% penyebab telat, dan 52% responden memakai pembiayaan faktur dalam 12 bulan terakhir ([Atradius](https://atradius.de/dam/jcr:a5138c1e-7aa7-48b4-82d7-64a3d938d31d/payment-practices-barometer-asia-2025-indonesia-en.pdf)). Sampelnya perusahaan, belum tentu UMKM mikro, dan belum ada validasi langsung dari pengguna.

**Kenapa Faktur Pajak.** Sejak Coretax (1 Jan 2025) setiap Faktur Pajak punya nomor unik nasional dan tercatat di DJP, dengan data NPWP penjual dan pembeli, nilai, dan status (normal, pengganti, batal). Nomor itu menjadi kunci registry: satu nomor Faktur Pajak hanya bisa didanai sekali, lintas platform mana pun yang membaca registry.

**Tujuan MVP.**

1. Penjual cukup memasukkan nomor Faktur Pajak dan menandatangani satu transaksi; verifikasi, pencetakan token, dan pembukaan pendanaan berjalan otomatis.
2. Satu nomor Faktur Pajak tidak pernah bisa didanai dua kali.
3. Banyak pemberi dana bisa mendanai satu faktur sesuai pilihan masing-masing; dana cair ke penjual begitu target terpenuhi.
4. Pelunasan dan gagal bayar membagi dana otomatis secara proporsional.

**Bukan tujuan.**

- Membuktikan barang benar-benar dikirim, atau mencegah kongkalikong penjual dan pembeli.
- Memindahkan rupiah nyata, atau menjadi penyelenggara pendanaan berlisensi.
- Pool pendanaan otomatis: dilarang untuk penyelenggara LPBBTI (POJK 40/2024 Pasal 158).
- Pasar sekunder: share vault tidak bisa dipindahtangankan.
- Penilaian kredit atau penagihan ke pembeli.
- Penjual non-PKP (tanpa Faktur Pajak); lihat bagian 9.

## 2. Pengguna dan peran

Dua peran manusia memakai produk; verifikasi berjalan otomatis; pembeli tidak menyentuh aplikasi.

| Peran | Contoh ilustrasi | Tujuan | Tindakan di sistem |
| --- | --- | --- | --- |
| Penjual (PKP) | Bu Rina, pemasok bahan kemasan, faktur Rp100 juta tempo 60 hari | Kas lebih cepat | Memasukkan nomor Faktur Pajak, menerima dana, melunasi saat jatuh tempo |
| Pemberi dana | Individu atau institusi | Imbal hasil dari diskon | Mendaftar (KYC disimulasikan), memilih faktur, menyetor sebagian atau seluruh target, menarik dana setelah lunas |
| Verifier (otomatis) | Workflow Chainlink CRE, atau relayer server di demo | Mengecek Faktur Pajak ke PJAP | Menulis hasil verifikasi ke registry |
| Pembeli (debitur) | Pabrik pembeli kemasan | Tidak berubah | Tidak memakai aplikasi; membayar penjual seperti biasa |
| Admin | Tim produk | Parameter | Mengatur diskon, tingkat pencairan, limit, verifier |

**Model pembayaran: silent factoring dengan recourse.** Pembeli tidak diberi tahu dan membayar ke penjual seperti biasa. Penjual tetap wajib melunasi ke vault saat jatuh tempo (recourse). Penahanan harga melindungi pemberi dana bila penjual tidak melunasi.

**Siapa yang membayar produk.** Penjual, lewat diskon pembiayaan; biaya layanan belum dihitung di MVP.

**Tes tetangga.** "Sebelum saya danai, saya bisa cek bahwa Faktur Pajak ini asli di DJP dan belum didanai orang lain."

## 3. Ruang lingkup MVP

| Kemampuan | Status di MVP | Catatan |
| --- | --- | --- |
| Registry nomor Faktur Pajak dan status | Nyata | ID = keccak256 nomor ternormalisasi; nomor pengganti (akhiran A) dipetakan ke nomor dasar |
| Verifikasi Faktur Pajak | Nyata di kontrak, data disimulasikan | Workflow CRE dan relayer memanggil **mock API PJAP**; API Coretax publik memakai CAPTCHA, akses mesin resmi hanya lewat PJAP host-to-host (PER-03/PJ/2022) |
| Token faktur ERC-721 | Nyata | Dicetak ke vault, tidak bisa dipindahkan |
| Vault ERC-4626 per faktur | Nyata | Satu vault per faktur, aset MockIDR, share tidak bisa dipindahkan |
| Pendanaan semua-atau-tidak | Nyata | Target = harga; bila tidak penuh sampai batas waktu, dana kembali 1:1 |
| Pencairan dan penahanan harga | Nyata | Begitu penuh: tingkat pencairan dikali nominal ke penjual, sisanya ditahan |
| Pelunasan oleh penjual | Nyata | Penjual menyetor nominal ke vault; penahanan kembali ke penjual |
| Gagal bayar | Nyata | Siapa saja bisa memicu setelah jatuh tempo + masa tenggang; penahanan untuk pemberi dana; penjual ditandai |
| KYC pemberi dana | Disimulasikan | Satu klik "daftar sebagai pemberi dana"; bukan KYC nyata |
| Limit per penjual dan per pembeli (NPWP) | Nyata | Dari pendanaan berjalan |
| Rupiah | Disimulasikan | MockIDR |
| CRE di jaringan Chainlink (deploy terus-menerus) | Menunggu akses | `cre workflow simulate --broadcast` sudah memakai kontrak yang sama |
| Penjual non-PKP, integrasi ERP | Tidak dikerjakan | Roadmap |

## 4. User stories dan kriteria penerimaan

| ID | Sebagai | Saya ingin | Kriteria penerimaan |
| --- | --- | --- | --- |
| US-01 | Penjual | Mengajukan nomor Faktur Pajak | Satu transaksi; status Menunggu verifikasi; nomor yang pernah didanai, sedang didanai, atau menunggu ditolak |
| US-02 | Sistem | Memverifikasi ke PJAP | Hanya verifier terdaftar yang bisa menulis hasil; valid: data nominal, jatuh tempo, hash NPWP pembeli tersimpan, token dicetak ke vault baru, status Pendanaan; tidak valid: status Ditolak dengan kode alasan |
| US-03 | Pemberi dana | Mendaftar | Satu transaksi KYC simulasi; hanya pemberi dana terdaftar yang bisa menyetor |
| US-04 | Pemberi dana | Menyetor ke vault faktur pilihan | Setoran dibatasi sisa target; share sebanding setoran |
| US-05 | Sistem | Mencairkan saat penuh | Setoran terakhir yang memenuhi target memicu pencairan tingkat pencairan dikali nominal ke penjual dalam transaksi yang sama; status Didanai |
| US-06 | Pemberi dana | Mendapat dana kembali bila target gagal | Setelah batas waktu pendanaan, keeper menutup vault otomatis (tanpa tombol); share ditukar 1:1; faktur boleh diajukan ulang |
| US-07 | Penjual | Melunasi | Menyetor nominal ke vault; penahanan kembali ke penjual; token dibakar; status Lunas |
| US-08 | Pemberi dana | Menarik hasil | Setelah lunas atau gagal bayar, share ditukar secara proporsional |
| US-09 | Sistem | Memproses gagal bayar | Hanya setelah jatuh tempo + masa tenggang, keeper menandai default otomatis (tanpa tombol); penahanan tetap di vault untuk pemberi dana; penjual ditandai dan tidak bisa mengajukan lagi |
| US-10 | Siapa saja | Mengecek nomor Faktur Pajak | Status, vault, progres pendanaan, dan riwayat penjual terlihat tanpa dompet |
| US-11 | Admin | Mengatur parameter dan verifier | Hanya admin; perubahan memancarkan event |

## 5. Status faktur

Status hanya maju: Menunggu verifikasi → Pendanaan → Didanai → Lunas atau Gagal bayar. Cabang: Menunggu verifikasi → Ditolak; Pendanaan → Pendanaan gagal. Faktur berstatus Ditolak atau Pendanaan gagal boleh diajukan ulang; faktur yang pernah Didanai tidak pernah bisa diajukan lagi.

## 6. Requirements fungsional dan aturan bisnis

| Parameter | Nilai demo | Keterangan |
| --- | --- | --- |
| Diskon (d) | 3% dari nominal | Target pendanaan = (1 − d) dikali nominal |
| Tingkat pencairan (r) | 80% dari nominal | Cair ke penjual saat target penuh |
| Batas waktu pendanaan | 3 hari | Setelah itu pendanaan bisa dibatalkan |
| Masa tenggang gagal bayar | 60 detik | Setelah jatuh tempo |
| Limit per penjual | Rp200 juta | Pendanaan berjalan |
| Limit per pembeli (NPWP) | Rp500 juta | Pendanaan berjalan |

Untuk N = Rp100 juta: target Rp97 juta dari banyak pemberi dana; penjual menerima Rp80 juta saat penuh; Rp17 juta ditahan di vault. Lunas: penjual menyetor Rp100 juta, menerima kembali Rp17 juta (biaya bersih 3%); vault berisi Rp100 juta untuk pemegang share (imbal hasil sekitar 3,09%). Gagal bayar: vault berisi Rp17 juta untuk pemegang share; penjual ditandai.

| ID | Aturan |
| --- | --- |
| FR-01 | ID faktur = keccak256("FP:" ‖ nomor ternormalisasi); normalisasi membuang spasi dan tanda baca, huruf besar, dan akhiran pengganti/pembatalan |
| FR-02 | Pengajuan ditolak bila ID sedang menunggu, sedang didanai, pernah didanai, atau penjual ditandai gagal bayar |
| FR-03 | Hanya alamat ber-role VERIFIER (receiver CRE atau relayer) yang bisa menulis hasil verifikasi |
| FR-04 | Verifikasi valid membuat vault baru dan mencetak satu token ERC-721 ke vault; token tidak bisa dipindahkan |
| FR-05 | Setoran hanya dari pemberi dana terdaftar, saat status Pendanaan, sebelum batas waktu, maksimal sisa target |
| FR-06 | Setoran yang memenuhi target mencairkan r dikali N ke penjual secara atomik; limit diperiksa saat itu |
| FR-07 | Penarikan share hanya saat Pendanaan gagal, Lunas, atau Gagal bayar |
| FR-08 | Pelunasan oleh siapa saja yang menyetor N (biasanya penjual); penahanan dikirim ke penjual |
| FR-09 | Gagal bayar oleh siapa saja setelah jatuh tempo + masa tenggang |
| FR-10 | Share vault tidak bisa dipindahkan antar alamat |
| FR-11 | Setiap transisi memancarkan event berisi ID, status, dan pelaku |
| FR-12 | Vault yang lewat batas waktu ditutup otomatis oleh `FakturKeeper`: workflow cron Chainlink CRE membaca `closable()` dan mengirim report; relayer demo memanggil `closeDue()`. Fungsi tutup di vault tetap permissionless sebagai cadangan |

## 7. Non-fungsional, keamanan, data, dan privasi

| Area | Persyaratan |
| --- | --- |
| Platform | Solidity + Foundry + OpenZeppelin 5 di Arbitrum Sepolia |
| Privasi | Di chain hanya hash ID, hash NPWP pembeli, nominal, tanggal; nama pembeli hanya ditampilkan dari API PJAP |
| Keamanan | ReentrancyGuard di vault; checks-effects-interactions; tanpa upgrade |
| Kunci verifier | Relayer demo memegang satu kunci; produksi memakai CRE (DON) |
| Label | Komponen simulasi diberi label di UI: PJAP, KYC, MockIDR |
| Transparansi | Kontrak diverifikasi; README memisahkan nyata dan simulasi |
| Pengujian | Tes Foundry untuk setiap US dan FR, termasuk jalur penolakan |

## 8. Layar dan alur demo

| Layar | Isi |
| --- | --- |
| Landing | Cerita produk, angka, kontrak |
| Penjual | Masukkan nomor Faktur Pajak → status verifikasi → progres pendanaan → tombol Lunasi |
| Pasar | Daftar vault Pendanaan dengan progres; setor; portofolio dan tarik |
| Cek faktur | Cari nomor Faktur Pajak |

**Urutan demo (2 menit).**

1. Penjual memasukkan nomor Faktur Pajak; CRE/relayer memverifikasi ke PJAP; vault terbuka.
2. Pemberi dana A menyetor Rp50 juta, pemberi dana B Rp47 juta; target penuh, Rp80 juta cair ke penjual.
3. Penjual lain mencoba mengajukan nomor yang sama dan ditolak.
4. Penjual melunasi Rp100 juta; A dan B menarik dana dengan imbal hasil.
5. Faktur demo "jatuh tempo 2 menit" tidak dilunasi; gagal bayar dipicu; pemberi dana menarik penahanan; penjual ditandai.

## 9. Metrik, risiko, dan pertanyaan terbuka

| Risiko | Mitigasi |
| --- | --- |
| Data PJAP disimulasikan | Bentuk data meniru respons PJAP; ganti satu URL saat akses staging tersedia |
| Penjual tidak melunasi (silent factoring) | Penahanan 17%, penanda gagal bayar, limit; perjanjian recourse di luar chain |
| Pendanaan bersama dianggap sekuritas | Share tidak bisa dipindahkan, tanpa pasar sekunder; perlu kajian hukum |
| Pendanaan otomatis dilarang (POJK 40/2024) | Vault per faktur, setiap pemberi dana memilih sendiri |
| Penjual non-PKP tidak terlayani | Roadmap: verifikasi lewat software akuntansi via CRE |
| Kongkalikong penjual dan pembeli | Diterima di MVP; Faktur Pajak meninggalkan jejak PPN |

**Pertanyaan terbuka.** Akses staging PJAP (mis. Sipajak); persetujuan deploy CRE; perlakuan hukum share vault.
