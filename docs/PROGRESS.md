# PROGRESS

## Ringkasan Phase
| Phase | Nama | Status |
|-------|------|--------|
| 0 | Audit kebutuhan | Selesai (dokumen draft; menunggu jawaban keputusan) |
| 1 | Fondasi proyek | Selesai sebagian (kerangka & dokumentasi; pengujian browser tertunda) |
| 2 | Autentikasi & akun | Selesai sebagian — implementasi + uji lokal lulus; integrasi runtime Apps Script & pengujian browser belum |
| 3 | Mesin absensi | Belum dimulai |
| 4 | Panel admin | Belum dimulai |
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
