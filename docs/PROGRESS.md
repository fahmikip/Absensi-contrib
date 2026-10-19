# PROGRESS

## Ringkasan Phase
| Phase | Nama | Status |
|-------|------|--------|
| 0 | Audit kebutuhan | Selesai (dokumen draft; menunggu jawaban keputusan) |
| 1 | Fondasi proyek | Selesai sebagian (kerangka & dokumentasi; pengujian browser tertunda) |
| 2 | Autentikasi & akun | Selesai sebagian — implementasi + uji lokal lulus; integrasi runtime Apps Script & pengujian browser belum |
| 3 | Mesin absensi | Selesai — implementasi, validasi & uji lokal (112 cek) |
| 4 | Panel admin | Selesai (lokal) — endpoint admin, panel UI, uji lokal (156 cek); integrasi runtime & browser belum |
| 5 | Laporan | Belum dimulai |
| 6 | Pengujian & rilis | Belum dimulai |

## PHASE 0 — Audit Kebutuhan (2026-10-15)
- Pemeriksaan workspace → kosong (proyek baru, bukan repo git).
- `docs/REQUIREMENTS.md`, `docs/AMBIGUITIES.md` (30 item), `docs/DECISIONS.md`,
  `docs/SECURITY.md`, `docs/TEST_PLAN.md`, `docs/ARCHITECTURE.md`,
  `docs/DATA_DICTIONARY.md`, `docs/DEPLOYMENT.md`, `README.md`, `AGENTS.md`.

## PHASE 1 — Fondasi Proyek (2026-10-15)
Dibuat:
- `index.html` — halaman awal: status aplikasi, jaringan, backend, versi.
- `manifest.webmanifest`, `service-worker.js` (cache aset statis; tanpa data privat).
- `assets/css/styles.css`, `assets/js/config.js`, `assets/js/app.js`.
- `assets/icons/icon-192.png`, `assets/icons/icon-512.png` (placeholder netral).
- `tools/generate-icons.mjs` — generator ikon placeholder.
- `tests/check-foundation.mjs` — pemeriksaan fondasi otomatis (30 cek).
- `gas/Code.gs`, `gas/Config.gs`, `gas/appsscript.json`, `gas/README.md` (kerangka backend).
- `.gitignore`.
Diubah (dokumentasi):
- `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`,
  `docs/SECURITY.md`, `docs/TEST_PLAN.md`, `docs/PROGRESS.md`.

Pengujian dijalankan (hasil apa adanya):
- `node tests/check-foundation.mjs` → **30 lulus, 0 gagal** (struktur, sintaks JS/GS,
  JSON, ikon PNG, path, tanpa rahasia/dummy).
- Server statis lokal (`py -m http.server 8765`) → seluruh berkas & aset merespons HTTP 200.
Belum dijalankan:
- Pengujian service worker online/offline di browser nyata.
- Uji responsivitas visual, integrasi backend, dan instalabilitas PWA.
- Deploy nyata ke GitHub Pages & Apps Script (menunggu AMB-21 & AMB-23).

Catatan:
- Tidak ada kredensial, ID resource, atau data pegawai. `API_BASE_URL` sengaja kosong.
- Blok `webapp` pada `appsscript.json` sengaja dikosongkan (AMB-21).
- Skema sheet belum dikarang; menunggu persetujuan `DATA_DICTIONARY.md` (AMB-15).

## Blocker yang Masih Aktif
Lihat `docs/AMBIGUITIES.md`. Kritis: AMB-07 (koordinat), AMB-21 (akses Web App/CORS),
AMB-03/04/05 (PIN/lockout/sesi), AMB-15/16/17 (skema data & format waktu).

## PHASE 2 — Autentikasi & Akun (2026-10-15) — TERBLOKIR
Dilakukan:
- Baca ulang seluruh dokumen & implementasi PHASE 1.
- Verifikasi keterbatasan teknis: Apps Script tanpa cookie (TC-02/03) & tanpa KDF
  bawaan (TC-01); token hanya via body POST; tidak ada IP klien andal (TC-04).
- Audit keputusan autentikasi → `docs/PHASE2_AUDIT.md` (keputusan D1–D8).
- Perbarui `docs/SECURITY.md`, `docs/ARCHITECTURE.md`, `docs/DATA_DICTIONARY.md`
  (usulan sheet `Sesi`), `docs/TEST_PLAN.md`, `docs/DECISIONS.md`.

Tidak dikerjakan (sengaja):
- Tidak ada kode login/PIN/sesi/manajemen akun. Menebak keputusan keamanan
  dilarang oleh `AGENTS.md` & PHASE 2 §7/§14.
- Tidak ada PIN default, admin default, atau data pegawai.

Status saat audit: **TERBLOKIR** menunggu jawaban D1–D8 (lihat laporan PHASE 2).
Pengujian: tidak ada yang dijalankan (tidak ada kode); dinyatakan apa adanya.

## PHASE 2 — Implementasi Autentikasi & Akun (2026-10-15)
Keputusan pengguna diterima (D0–D8, lihat `docs/DECISIONS.md` DEC-P09..P13 & pasal
PHASE 2). Implementasi dilakukan:

Dibuat:
- `gas/Auth.gs` — PBKDF2-HMAC-SHA256 (RFC 2898), PIN make/verify, token, lockout,
  validitas sesi. Primitif byte murni agar dapat diuji.
- `gas/Repo.gs` — akses Sheets (header `Pegawai`/`Akun`/`Sesi`/`LogAktivitas`),
  `LockService`, ID internal, log append-only tanpa data rahasia.
- `gas/AuthService.gs` — login/logout/session.check, otorisasi peran, manajemen akun
  admin; reset PIN ditolak (NOT_AVAILABLE, keputusan D5).
- `gas/Bootstrap.gs` — `initializeSheets()`, `seedAdmin()` (dari Script Properties;
  tanpa PIN default di kode).
- `assets/js/api.js` — klien POST `text/plain`; token HANYA di memori (D1).
- `assets/js/auth.js` — UI login/keluar (NIP/NIPK + PIN).
- `tests/harness.mjs`, `tests/auth.test.mjs` — 42 cek otomatis.

Diubah:
- `gas/Code.gs` — router aksi auth + `AppError_` (pesan aman vs. disamarkan).
- `gas/Config.gs` — kunci properti PHASE 2 & kebijakan (iterasi, TTL sesi, lockout).
- `gas/appsscript.json` — blok `webapp` (executeAs USER_DEPLOYING, access
  ANYONE_ANONYMOUS — keputusan D8) + `oauthScopes`.
- `index.html`, `assets/css/styles.css` — panel masuk/sesi; `assets/js/config.js`
  (versi 0.2.0); `service-worker.js` (cache `app-v0.2.0`, + `api.js`/`auth.js`).
- `tests/check-foundation.mjs` — mencakup berkas baru (44 cek).
- `gas/README.md`, `docs/SECURITY.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`,
  `docs/TEST_PLAN.md`, `docs/DATA_DICTIONARY.md`, `docs/PHASE2_AUDIT.md`.

Pengujian dijalankan (hasil apa adanya):
- `node tests/check-foundation.mjs` → **44 lulus, 0 gagal**.
- `node tests/auth.test.mjs` → **42 lulus, 0 gagal** (termasuk vektor
  PBKDF2-HMAC-SHA256 RFC 7914 §11 c=1 & c=80000, lockout 5×, isolasi peran,
  pesan login seragam, dan ketiadaan PIN/token di log).
Belum dijalankan / belum terverifikasi:
- **Jumlah iterasi PBKDF2 belum di-benchmark di runtime Apps Script nyata** (D2);
  nilai 10000 masih sementara.
- Integrasi runtime Apps Script: butuh `SPREADSHEET_ID` (DEC-P08) — belum ada.
- Uji browser: form masuk, sesi hanya di memori, offline (FD-12/13/14/15).
- Konkurensi nyata di bawah `LockService` (AU-13) & kegagalan penyimpanan (AU-14).

Catatan:
- Tidak ada PIN/token/ID resource di repositori frontend.
- `API_BASE_URL` tetap kosong; tidak ada klaim backend terhubung.
- Pengujian kriptografi di Node memakai stub; ini **bukan** jaminan perilaku
  identik di runtime Apps Script.

Status: implementasi & uji lokal **selesai sebagian**. Jangan mulai PHASE 3 tanpa
instruksi. Blocker integrasi: `SPREADSHEET_ID` (DEC-P08). Blocker benchmark: runtime
Apps Script.


## PHASE 3 — Mesin Absensi (2026-10-19)

Dibuat:
- `gas/TimeRule.gs` — validasi jendela masuk (07:00–08:30) & pulang (16:00–23:59) WIB per hari (DEC-003, DEC-P18), ekstraksi civil dari waktu server Asia/Jakarta, primitif waktu.
- `gas/Geo.gs` — Haversine, batas lintang/bujur, ambil lokasi kantor (`getOfficeLocation_`), evaluasi masuk WFO (radius inklusif ≤50 m, `GPS_BOUNDARY_EPSILON_M=0.01`, GP-01/02/03, OFFICE_NOT_CONFIGURED).
- `gas/Drive.gs` — decode base64 + magic JPEG FF D8 FF, resize/opsional tidak dikerjakan (konversi canvas di klien), simpan ke `ABSENSI_KPU/YYYY/MM/Foto_Masuk|Foto_Pulang/` dengan nama unik, setSharing defensif, penanganan gagal & tryDelete.
- `gas/Attendance.gs` — `handleAttendanceSubmit_` dengan lock, cek duplikat bisnis, cek prasyarat pulang, kompensasi parsial (hapus baris Bukti, file Drive TIDAK dihapus, log orphan `attendance_storage_partial`), `attendanceSuccessResponse_`.

Diubah:
- `gas/Repo.gs` — header `Absensi`/BuktiAbsensi lengkap, indeks pembantu, `ALL_SHEET_NAMES`, `findAbsensiById_`, `findAbsensiByUniq_`.
- `gas/Config.gs` — `PHASE3_PHOTO_MAX_BYTES` (default 1.000.000 byte), fungsi `photoMaxBytes_` (DEC-P17).
- `gas/Code.gs` — route `attendance.submit`, health phase `attendance`, `officeLocationConfigured`.
- `gas/Bootstrap.gs` — log `ALL_SHEET_NAMES`.
- Frontend: `assets/js/camera.js` (getUserMedia, canvas JPEG q0.85, maks 1280px, batas 1.000.000 byte, mapping error), `assets/js/attendance.js` (alur lengkap, state, idempoten retry, event auth), `index.html` (section absensi), `assets/css/styles.css`, `assets/js/config.js` (0.3.0), `service-worker.js` (app-v0.3.0 + aset baru), `assets/js/auth.js` (dispatch event).
- Tes: `tests/harness.mjs` (Drive stub, Utilities.newBlob/formatDate/base64Decode, deleteRow), `tests/check-foundation.mjs` (daftar file baru, perbaikan FD-09), `tests/auth.test.mjs` (phase attendance).

Pengujian (lokal Node):
- `node tests/attendance.test.mjs` → **112 lulus, 0 gagal** (waktu, mode WFO/WFH_WFA, GPS inklusif 50m, duplikat/idempotensi, prasyarat, otorisasi/input, foto, kompensasi parsial, Drive/private, lintas hari Minggu tetap diterima).
- `node tests/auth.test.mjs` → 42/0, `node tests/check-foundation.mjs` → 50/0.

Catatan penting:
- AMB-07 koordinat kantor masih kosong (OFFICE_LATITUDE/LONGITUDE) → `officeLocationConfigured=false` dan WFO masuk akan `OFFICE_NOT_CONFIGURED` di produksi; pengujian GPS menggunakan koordinat sintetis terisolasi.
- `backendConfigured` belum true sampai `SPREADSHEET_ID` & `DRIVE_FOLDER_ID` terisi (DEC-P08).
- `admin.account.resetPin` tetap `NOT_AVAILABLE` (D5).
- Waktu diambil 100% dari server; timestamp klien diabaikan. Transfer JSON POST `text/plain` dengan base64 foto.
- Tes phase auth telah disesuaikan ke `phase:'attendance'`.

Status: **SELESAI (lokal)** — siap Phase 4 (panel admin).

## PHASE 4 — Panel Admin (2026-10-19)

Audit awal:
- Membaca ulang `AGENTS.md`, `README.md`, seluruh `docs/` (10 berkas), kode
  Phase 1–3, dan menjalankan baseline tes (hasil: attendance 112/0, auth 42/0,
  foundation 49/1 — lihat "Temuan" di bawah).
- AMB terkait Phase 4 yang masih OPEN → sengaja TIDAK diimplementasikan:
  AMB-11 (batas susulan), AMB-12 (bukti susulan), AMB-14 (impor CSV),
  AMB-18 (retensi), AMB-20 (akses foto admin), AMB-25 (notifikasi).

Dibuat:
- `gas/AdminService.gs` — 11 endpoint admin (semua POST + `requireAdmin_`):
  `admin.pegawai.list/detail/create/update/setActive`,
  `admin.absensi.list/detail`, `admin.susulan.list/detail/decide`,
  `admin.log.list`. Tulis di bawah `LockService`; log audit tiap aksi.
- `assets/js/admin.js` — panel UI (tab Pegawai/Absensi/Susulan/Log audit),
  render via `textContent` (anti-XSS), tampil hanya untuk peran admin.
- `tests/admin.test.mjs` — 156 cek otomatis.

Diubah:
- `gas/Repo.gs` — sheet `PengajuanSusulan` (kolom DATA_DICTIONARY §8, disetujui
  DEC-P15) + `findPengajuanById_`.
- `gas/Code.gs` — router 11 aksi admin; `health.phase` → `'admin'`.
- `index.html` — section `admin-view` + skrip `admin.js`; teks notice/subtitle.
- `assets/css/styles.css` — gaya panel admin (tabel, tab, form, detail).
- `assets/js/config.js` — versi 0.4.0; `service-worker.js` — cache
  `app-v0.4.0` + `admin.js`.
- `tests/harness.mjs` — memuat `gas/AdminService.gs`.
- `tests/check-foundation.mjs` — mencakup berkas baru (54 cek).
- `tests/auth.test.mjs`, `tests/attendance.test.mjs` — asersi `phase:'admin'`.
- Dokumentasi: `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`,
  `docs/SECURITY.md`, `docs/TEST_PLAN.md`, `docs/DATA_DICTIONARY.md`,
  `gas/README.md`.

Perilaku keputusan (interpretasi ruang lingkup, bukan aturan baru):
- Keputusan susulan HANYA mengubah status pengajuan (`diterima`/`ditolak`) +
  `id_admin` (id_akun pemutus) + `waktu_keputusan` (server) +
  `catatan_keputusan` + log. **TIDAK** menulis baris Absensi — konversi ke
  absensi memerlukan keputusan aturan (duplikat/prasyarat/sumber) → laporan.
- Respons absensi/susulan TIDAK memuat `drive_file_id`/URL foto; hanya
  metadata bukti (ada, mime, ukuran, path folder) — akses foto menunggu AMB-20.
- Nonaktifkan pegawai: ubah `Pegawai.status_aktif` + cabut sesi akun terkait;
  riwayat absensi tidak dihapus (REQUIREMENTS §9). Kolom mengikuti
  DATA_DICTIONARY §1.

Pengujian dijalankan (hasil apa adanya):
- `node tests/admin.test.mjs` → **156 lulus, 0 gagal** (otorisasi 11 endpoint:
  UNAUTHORIZED/FORBIDDEN/METHOD_NOT_ALLOWED; pegawai CRUD + status; absensi
  list/detail tanpa bocor referensi foto; susulan putuskan + CONFLICT; log
  tanpa token/PIN; router/doPost; header `PengajuanSusulan`).
- `node tests/auth.test.mjs` → **42 lulus, 0 gagal**.
- `node tests/attendance.test.mjs` → **112 lulus, 0 gagal**.
- `node tests/check-foundation.mjs` → **54 lulus, 1 GAGAL** (FD-09, lihat Temuan).
- Server statis lokal → `index.html`, `admin.js`, `styles.css`, `config.js`,
  `service-worker.js` merespons HTTP 200.

Temuan:
- **FD-09 gagal (pre-existing, di luar perubahan phase ini):** `API_BASE_URL`
  di `assets/js/config.js` kini terisi URL deployment Apps Script, sedangkan
  tes mensyaratkan kosong ("backend belum dikonfigurasi") dan baseline phase ini
  (sebelum perubahan apa pun) juga sudah 49/1. Nilai TIDAK diubah — keputusan
  pengguna dibutuhkan (apakah ini disengaja; jika ya, FD-09 perlu disesuaikan).
  Catatan: `PROGRESS.md` Phase 3 mencatat 50/0 — waktu itu URL masih kosong.

Belum dijalankan / belum terverifikasi:
- Integrasi runtime Apps Script (butuh `SPREADSHEET_ID` — DEC-P08) & pengujian
  browser panel admin (form, tab, otorisasi UI).
- Konkurensi LockService nyata; kuota Apps Script.
- Pengujian penetrasi / review independen.

Status: **SELESAI (lokal)** — jangan mulai PHASE 5 tanpa instruksi.