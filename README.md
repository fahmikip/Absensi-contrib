# Sistem Absensi KPU Kabupaten Aceh Selatan (PWA)

Aplikasi absensi pegawai berbasis Progressive Web App (PWA).

- **Frontend:** HTML, CSS, JavaScript — dihosting di GitHub Pages.
- **Backend:** Google Apps Script Web App.
- **Database:** Google Sheets.
- **Penyimpanan foto:** Google Drive privat.
- **Zona waktu:** `Asia/Jakarta`.
- **Versi aplikasi:** `0.2.0` (sumber: `assets/js/config.js`).

## Status Proyek
**PHASE 2 — Autentikasi & Akun: selesai sebagian.** Login (NIP/NIPK + PIN), sesi,
logout, dan manajemen akun admin telah diimplementasikan & diuji lokal di Node.
Integrasi runtime Apps Script (butuh `SPREADSHEET_ID`) dan pengujian browser
**belum** dijalankan. Fitur absensi, kamera, GPS, susulan, dan panel admin lengkap
**belum** dibuat. Lihat `docs/PHASE2_AUDIT.md` dan `docs/PROGRESS.md`.

## Struktur Proyek
```
index.html                  Halaman awal (status aplikasi/jaringan/backend/versi)
manifest.webmanifest        Manifest PWA
service-worker.js           Cache aset statis (tanpa data privat)
assets/
  css/styles.css            Gaya dasar, responsif, mode gelap + form auth
  js/config.js              Konfigurasi PUBLIK (nama, versi, URL API)
  js/api.js                 Klien POST (token sesi hanya di memori)
  js/app.js                 Logika antarmuka (status jaringan/backend)
  js/auth.js                UI login/logout (NIP/NIPK + PIN)
  icons/icon-192.png        Ikon placeholder (bukan logo resmi)
  icons/icon-512.png
gas/
  Code.gs                   Titik masuk doGet/doPost + router aksi + respons JSON
  Config.gs                 Konfigurasi server (Script Properties) + kebijakan
  Auth.gs                   Primitif PBKDF2/PIN/token/lockout
  Repo.gs                   Akses Sheets, LockService, log aktivitas
  AuthService.gs            Alur login/sesi/otorisasi/manajemen akun
  Bootstrap.gs              initializeSheets() & seedAdmin() (manual)
  appsscript.json           Manifest Apps Script (timezone + webapp D8)
  README.md                 Dokumentasi backend & deploy
tools/generate-icons.mjs    Generator ikon placeholder
tests/check-foundation.mjs  Pemeriksaan fondasi otomatis (44 cek)
tests/harness.mjs           Stub runtime Apps Script untuk pengujian Node
tests/auth.test.mjs         Pengujian autentikasi otomatis (42 cek)
docs/                       Dokumentasi proyek
```

## Menjalankan Secara Lokal
Jalankan server statis dari root repositori, misalnya:
```
py -m http.server 8765
```
Lalu buka `http://127.0.0.1:8765/`.

## Pengujian
```
node tests/check-foundation.mjs   # struktur, sintaks, JSON, ikon, tanpa rahasia (44 cek)
node tests/auth.test.mjs          # autentikasi & kripto (42 cek, termasuk RFC 7914 §11)
```
Pengujian autentikasi berjalan di Node dengan stub runtime Apps Script; ini
**bukan** pengganti pengujian di runtime Apps Script nyata (lihat `docs/TEST_PLAN.md`).

## Dokumentasi
| Dokumen | Isi |
|---------|-----|
| `docs/REQUIREMENTS.md` | Persyaratan yang disetujui |
| `docs/AMBIGUITIES.md` | Hal-hal yang belum ditetapkan |
| `docs/DECISIONS.md` | Catatan keputusan |
| `docs/ARCHITECTURE.md` | Arsitektur sistem |
| `docs/DATA_DICTIONARY.md` | Kamus data (draft) |
| `docs/SECURITY.md` | Model ancaman & mitigasi |
| `docs/TEST_PLAN.md` | Rencana pengujian |
| `docs/DEPLOYMENT.md` | Prosedur konfigurasi & deploy |
| `docs/PROGRESS.md` | Progres per phase |

## Aturan Kontribusi
Baca `AGENTS.md` sebelum mengubah apa pun. Dilarang mengarang kebutuhan, data,
kredensial, koordinat kantor, atau kebijakan yang belum diberikan.

## Catatan Aset
Ikon di `assets/icons/` adalah placeholder netral, **bukan** logo resmi KPU.
Warna dan tipografi bersifat netral. Ganti setelah aset resmi diberikan berwenang.
