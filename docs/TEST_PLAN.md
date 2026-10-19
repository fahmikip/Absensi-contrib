# TEST PLAN — Rencana Pengujian

> Status: **PHASE 1 & pengujian otomatis PHASE 2 sebagian dieksekusi.** Rencana +
> hasil apa adanya (lulus/gagal/tidak dijalankan). Pengujian otomatis berjalan di
> Node dengan stub; integrasi runtime Apps Script & browser BELUM dijalankan.

## Strategi
- Unit test logika murni (perhitungan jarak, evaluasi jam, validasi input) bila memungkinkan di JS.
- Test integrasi manual terhadap Apps Script Web App (endpoint backend).
- Test end-to-end manual di browser desktop & seluler.
- Test batas (boundary) untuk semua aturan waktu & radius.

## 0. Fondasi (PHASE 1) — otomatis
Dijalankan dengan `node tests/check-foundation.mjs`.

| ID | Kasus | Hasil |
|----|-------|-------|
| FD-01 | Struktur berkas lengkap | LULUS |
| FD-02 | Sintaks JS frontend (`config.js`, `api.js`, `app.js`, `auth.js`, `admin.js`, `report.js`, `service-worker.js`) | LULUS |
| FD-03 | Sintaks Apps Script (`Code.gs`, `Config.gs`, `Auth.gs`, `Repo.gs`, `AuthService.gs`, `AdminService.gs`, `ReportService.gs`, `Bootstrap.gs`) | LULUS |
| FD-04 | Validitas JSON (`manifest.webmanifest`, `appsscript.json`) | LULUS |
| FD-05 | Ikon PNG valid & berdimensi 192/512 | LULUS |
| FD-06 | Ikon manifest ada di disk; `start_url`/`scope` relatif | LULUS |
| FD-07 | Semua referensi aset lokal `index.html` ada | LULUS |
| FD-08 | Tidak ada rahasia di berkas frontend | LULUS |
| FD-09 | `API_BASE_URL` = URL Web App Apps Script yang valid (dikonfirmasi pengguna) | LULUS (2026-10-19: pengguna mengonfirmasi URL deployment; sebelumnya gagal karena tes mensyaratkan kosong) |
| FD-10 | Tidak ada data mirip NIP/pegawai di frontend | LULUS |
| FD-11 | Halaman & seluruh aset termuat via HTTP lokal (200) | LULUS |
| FD-12 | Perilaku service worker online/offline di browser | BELUM DIJALANKAN |
| FD-13 | Responsivitas visual di berbagai ukuran layar | BELUM DIJALANKAN |
| FD-14 | Integrasi backend (`action=health`) | BELUM DIJALANKAN |
| FD-15 | Instalabilitas PWA | BELUM DIJALANKAN |
| FD-16 | Pengujian autentikasi otomatis (`tests/auth.test.mjs`, 42 cek) | LULUS |
| FD-17 | Vektor PBKDF2-HMAC-SHA256 RFC 7914 §11 (c=1, c=80000) | LULUS |
| FD-18 | Benchmark iterasi PBKDF2 di runtime Apps Script nyata | BELUM DIJALANKAN |
| FD-19 | Pengujian mesin absensi (`tests/attendance.test.mjs`, 112 cek) | LULUS |
| FD-20 | Pengujian panel admin (`tests/admin.test.mjs`, 156 cek) | LULUS |
| FD-21 | Pengujian laporan (`tests/report.test.mjs`, 162 cek) | LULUS |

## 1. Aturan Waktu (zona `Asia/Jakarta`)
| ID | Kasus | Ekspektasi |
|----|-------|------------|
| WT-01 | Masuk 07:00:00 | Diterima |
| WT-02 | Masuk 08:29:59 | Diterima |
| WT-03 | Masuk 08:30:00 | Ditolak |
| WT-04 | Masuk 06:59:59 | Ditolak |
| WT-05 | Pulang 16:00:00 | Diterima |
| WT-06 | Pulang 23:59:59 | Diterima |
| WT-07 | Pulang 00:00:01 hari berikutnya (untuk tanggal sebelumnya) | Ditolak sebagai reguler |
| WT-08 | Waktu server dijadikan acuan (jam perangkat dimanipulasi) | Keputusan tetap sesuai server |

## 2. Radius & GPS (WFO masuk)
| ID | Kasus | Ekspektasi |
|----|-------|------------|
| GP-01 | Jarak 49,9 m | Diterima |
| GP-02 | Jarak 50,0 m | Sesuai keputusan batas (≤ 50) — perlu ketegasan inklusif/eksklusif |
| GP-03 | Jarak 50,1 m | Ditolak |
| GP-04 | Koordinat tidak valid (NaN/out-of-range) | Ditolak eksplisit |
| GP-05 | Izin GPS ditolak | Absensi reguler tidak dicatat berhasil |
| GP-06 | Akurasi GPS buruk | Perlu keputusan (AMB-08) |

## 3. Foto & Kamera
| ID | Kasus | Ekspektasi |
|----|-------|------------|
| PH-01 | Unggah dari galeri | Ditolak untuk alur reguler |
| PH-02 | Izin kamera ditolak | Absensi reguler tidak berhasil |
| PH-03 | Foto berhasil, simpan Drive gagal | Status bukan "berhasil" |
| PH-04 | Foto disimpan, metadata gagal | Status "perlu ditindaklanjuti" + tidak ada tautan publik |

## 4. Autentikasi & Otorisasi (PHASE 2)
Kode autentikasi tersedia (`gas/Auth.gs`, `gs/AuthService.gs`, dll.). Kasus di bawah
diuji otomatis di Node dengan stub (`tests/auth.test.mjs`) — BUKAN runtime Apps Script.
| ID | Kasus | Ekspektasi | Hasil |
|----|-------|------------|-------|
| AU-01 | Login PIN valid | Token diterbitkan | LULUS (otomatis) |
| AU-02 | PIN salah berulang | Lockout sesuai D3 | LULUS (otomatis; 5×) |
| AU-03 | Login akun nonaktif | Ditolak | LULUS (otomatis) |
| AU-04 | Login tanpa NIP/PIN | Ditolak | LULUS (otomatis) |
| AU-05 | Sesi kedaluwarsa / dicabut | Ditolak | LULUS sebagian (dicabut; kedaluwarsa via unit `isSessionValid_`) |
| AU-06 | Logout | Sesi dicabut di server | LULUS (otomatis) |
| AU-07 | Pegawai akses endpoint admin | Ditolak | LULUS (otomatis, FORBIDDEN) |
| AU-08 | Pemalsuan `role` di body | Diabaikan; peran dari server | LULUS (otomatis) |
| AU-09 | Manipulasi `id_pegawai` | Ditolak | LULUS (otomatis, NOT_FOUND) |
| AU-10 | Buat akun duplikat | Ditolak | LULUS (otomatis, DUPLICATE) |
| AU-11 | Reset PIN tanpa otorisasi | Ditolak | LULUS (otomatis, NOT_AVAILABLE) |
| AU-12 | PIN/token mentah di log | Tidak ada | LULUS (otomatis) |
| AU-13 | Permintaan bersamaan (lockout/status) | Konsisten (`LockService`) | BELUM DIJALANKAN (butuh runtime) |
| AU-14 | Kegagalan penyimpanan | Respons gagal, bukan sukses | BELUM DIJALANKAN |
| AU-15 | Pesan login seragam (akun tak ada vs PIN salah) | Identik | LULUS (otomatis) |
| AU-16 | Token hanya diterima dari body POST (bukan query) | Query diabaikan | LULUS sebagian (desain; belum uji runtime HTTP) |

## 5. Transaksi & Konkurensi
| ID | Kasus | Ekspektasi |
|----|-------|------------|
| TX-01 | Dua absen masuk pada tanggal sama | Yang kedua ditolak |
| TX-02 | Absen pulang tanpa masuk valid | Ditolak |
| TX-03 | Dua request masuk bersamaan | Hanya satu tercatat |
| TX-04 | Klik ganda | Tidak menghasilkan duplikat |

## 6. PWA & Privasi
| ID | Kasus | Ekspektasi |
|----|-------|------------|
| PW-01 | Offline | Tampilkan absensi tidak dapat dikirim; tidak ada antrean diam-diam |
| PW-02 | Cache service worker | Tidak memuat data privat/sesi/foto |
| PW-03 | Tautan file Drive diakses tanpa izin | Gagal (privat) |

## 7. Panel Admin (PHASE 4) — otomatis
Dijalankan dengan `node tests/admin.test.mjs` (156 cek) — Node + stub,
BUKAN runtime Apps Script. Data uji sintetis berlabel `TEST`.
| ID | Kasus | Hasil |
|----|-------|-------|
| AD-01 | 11 endpoint admin tanpa token → `UNAUTHORIZED` | LULUS (otomatis) |
| AD-02 | 11 endpoint admin dengan token pegawai → `FORBIDDEN` | LULUS (otomatis) |
| AD-03 | Peran palsu di body diabaikan (peran dari sesi server) | LULUS (otomatis) |
| AD-04 | Metode GET endpoint admin → `METHOD_NOT_ALLOWED` | LULUS (otomatis) |
| AD-05 | Daftar pegawai: filter status/q/limit; tanpa `pin_hash`/`pin_salt`/URL | LULUS (otomatis) |
| AD-06 | Detail pegawai: kolom DATA_DICTIONARY §1 + info akun tanpa rahasia | LULUS (otomatis) |
| AD-07 | Tambah pegawai: validasi, NIP duplikat → `DUPLICATE`, metadata admin, log | LULUS (otomatis) |
| AD-08 | Edit pegawai: nama/NIP/jabatan/unit; NIP bentrok → `DUPLICATE`; log | LULUS (otomatis) |
| AD-09 | Aktif/nonaktif pegawai: sesi dicabut, login ditolak, riwayat absensi tetap | LULUS (otomatis) |
| AD-10 | Daftar absensi: filter tanggal/jenis/pegawai; join nama; **tanpa `drive_file_id`/URL** | LULUS (otomatis) |
| AD-11 | Detail absensi: metadata bukti (ada/mime/ukuran/path) tanpa referensi foto | LULUS (otomatis) |
| AD-12 | Daftar/detail pengajuan susulan + filter status | LULUS (otomatis) |
| AD-13 | Setujui/tolak: status, `id_admin`, `waktu_keputusan` server, log | LULUS (otomatis) |
| AD-14 | Keputusan ganda → `CONFLICT` | LULUS (otomatis) |
| AD-15 | Keputusan susulan TIDAK menulis baris Absensi (belum ada aturan) | LULUS (otomatis) |
| AD-16 | Log audit: filter, limit, tanpa token/PIN mentah | LULUS (otomatis) |
| AD-17 | Router/doPost JSON endpoint admin; `health.phase='admin'`; header `PengajuanSusulan` | LULUS (otomatis) |
| AD-18 | UI panel admin di browser (form, tab, visibilitas peran) | BELUM DIJALANKAN |
| AD-19 | Otorisasi admin terhadap Web App nyata (runtime Apps Script) | BELUM DIJALANKAN |

## 8. Laporan & Ekspor (PHASE 5) — otomatis
Dijalankan dengan `node tests/report.test.mjs` (162 cek) — Node + stub,
BUKAN runtime Apps Script. Data uji sintetis berlabel `TEST`.
| ID | Kasus | Hasil |
|----|-------|-------|
| RP-01 | 3 endpoint `report.*` tanpa token → `UNAUTHORIZED` | LULUS (otomatis) |
| RP-02 | Endpoint `report.*` dengan token pegawai → `FORBIDDEN` | LULUS (otomatis) |
| RP-03 | Peran palsu di body diabaikan (peran dari sesi server) | LULUS (otomatis) |
| RP-04 | Metode GET endpoint laporan → `METHOD_NOT_ALLOWED` | LULUS (otomatis) |
| RP-05 | Rentang wajib & valid; format tanggal; dari > sampai; >92 hari → `INVALID_INPUT` | LULUS (otomatis) |
| RP-06 | `id_pegawai` tidak ada → `NOT_FOUND`; enum filter divalidasi backend | LULUS (otomatis) |
| RP-07 | Daftar: filter gabungan + join nama/NIP + paginasi; **tanpa `drive_file_id`/URL** | LULUS (otomatis) |
| RP-08 | Pemilihan tanggal memakai kolom `tanggal` (Asia/Jakarta), bukan timestamp UTC | LULUS (otomatis) |
| RP-09 | Rekap: fakta terhitung per filter; susulan per status (`menunggu`/`diterima`/`ditolak`); TANPA indikator kebijakan (terlambat/persen) | LULUS (otomatis) |
| RP-10 | CSV: BOM UTF-8, quote RFC 4180, round-trip utuh, kolom tetap, tanpa rahasia/foto | LULUS (otomatis) |
| RP-11 | Guard formula-injection (`=` `+` `-` `@`) hanya di berkas ekspor; data sumber tak diubah | LULUS (otomatis) |
| RP-12 | Ekspor >5000 baris → `EXPORT_TOO_LARGE` (bukan potong diam-diam); log `report_exported` tanpa token/PIN | LULUS (otomatis) |
| RP-13 | Sheet Absensi belum ada → `NOT_CONFIGURED` (bukan ok/kosong) | LULUS (otomatis) |
| RP-14 | Router `doPost`: ekspor → JSON `ok` + `csv`/`filename`/`rows` | LULUS (otomatis) |
| RP-15 | UI tab Laporan di browser (filter, rekap, paginasi, visibilitas peran) | BELUM DIJALANKAN |
| RP-16 | Unduhan Blob CSV di browser (nama berkas, isi) | BELUM DIJALANKAN |
| RP-17 | Otorisasi & data laporan pada Web App nyata (runtime Apps Script) | BELUM DIJALANKAN |

## 9. Yang BELUM Diuji
- Kasus laporan RP-15/RP-16/RP-17 (browser & runtime) — baru otomatis Node.
- Kasus panel admin AD-18/AD-19 (browser & runtime) — baru otomatis Node.
- Kasus fungsional absensi (WT/GP/PH/TX) dijalankan otomatis via
  `tests/attendance.test.mjs` (112 cek) tetapi **belum** diuji di runtime &
  browser nyata; kasus AU-13/AU-14 dan integrasi runtime (FD-14, FD-18) belum.
- Pengujian autentikasi E2E di browser (form masuk, sesi di memori, offline).
- Kasus PWA (PW-01..03).
- Perilaku service worker online/offline di browser nyata (FD-12).
- Responsivitas visual (FD-13), integrasi backend (FD-14), instalabilitas PWA (FD-15).
- Pengujian beban/kuota Apps Script (AMB-24).
- Pengujian pemulihan bencana (AMB-30).
- Pengujian keamanan/penetrasi independen.
