# Sistem Absensi KPU Kabupaten Aceh Selatan (PWA)

Aplikasi absensi pegawai berbasis Progressive Web App (PWA).

- **Frontend:** HTML, CSS, JavaScript — dihosting di GitHub Pages.
- **Backend:** Google Apps Script Web App.
- **Database:** Google Sheets.
- **Penyimpanan foto:** Google Drive privat.
- **Zona waktu:** `Asia/Jakarta`.
- **Versi aplikasi:** `0.4.0` (sumber: `assets/js/config.js`).

## Status Proyek
**PHASE 4 — Panel Admin: selesai (lokal).** Endpoint admin (otorisasi peran
`admin` penuh di server), pengelolaan pegawai, daftar/detail absensi (tanpa
tautan foto), persetujuan/penolakan susulan, dan log audit telah diimplementasikan
& diuji lokal di Node (156 cek). Integrasi runtime Apps Script (butuh
`SPREADSHEET_ID`) dan pengujian browser **belum** dijalankan. Pengajuan susulan
oleh pegawai, akses foto admin (AMB-20), dan laporan **belum** dibuat.
Lihat `docs/PROGRESS.md`.

## Struktur Proyek
```
index.html                  Halaman awal (status aplikasi/jaringan/backend/versi)
manifest.webmanifest        Manifest PWA
service-worker.js           Cache aset statis (tanpa data privat)
assets/
  css/styles.css            Gaya dasar, responsif, mode gelap + form auth + panel admin
  js/config.js              Konfigurasi PUBLIK (nama, versi, URL API)
  js/api.js                 Klien POST (token sesi hanya di memori)
  js/app.js                 Logika antarmuka (status jaringan/backend)
  js/auth.js                UI login/logout (NIP/NIPK + PIN)
  js/camera.js              Kamera → canvas JPEG (kompresi klien)
  js/attendance.js          Alur absensi (jenis/mode/GPS/foto/kirim)
  js/admin.js               Panel admin (pegawai/absensi/susulan/log audit)
  icons/icon-192.png        Ikon placeholder (bukan logo resmi)
  icons/icon-512.png
gas/
  Code.gs                   Titik masuk doGet/doPost + router aksi + respons JSON
  Config.gs                 Konfigurasi server (Script Properties) + kebijakan
  Auth.gs                   Primitif PBKDF2/PIN/token/lockout
  Repo.gs                   Akses Sheets, LockService, log aktivitas
  AuthService.gs            Alur login/sesi/otorisasi/manajemen akun
  AdminService.gs           Endpoint panel admin (otorisasi admin, PHASE 4)
  TimeRule.gs               Aturan jendela waktu absensi (WIB)
  Geo.gs                    Haversine + evaluasi GPS masuk WFO
  Drive.gs                  Simpan foto JPEG ke folder Drive privat
  Attendance.gs             Mesin absensi reguler (validasi & penyimpanan)
  Bootstrap.gs              initializeSheets() & seedAdmin() (manual)
  appsscript.json           Manifest Apps Script (timezone + webapp D8)
  README.md                 Dokumentasi backend & deploy
tools/generate-icons.mjs    Generator ikon placeholder
tests/check-foundation.mjs  Pemeriksaan fondasi otomatis (54 cek)
tests/harness.mjs           Stub runtime Apps Script untuk pengujian Node
tests/auth.test.mjs         Pengujian autentikasi otomatis (42 cek)
tests/attendance.test.mjs   Pengujian mesin absensi otomatis (112 cek)
tests/admin.test.mjs        Pengujian panel admin otomatis (156 cek)
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
node tests/check-foundation.mjs   # struktur, sintaks, JSON, ikon, tanpa rahasia (54 cek)
node tests/auth.test.mjs          # autentikasi & kripto (42 cek, termasuk RFC 7914 §11)
node tests/attendance.test.mjs    # mesin absensi: waktu/GPS/foto/duplikat (112 cek)
node tests/admin.test.mjs         # panel admin: otorisasi/pegawai/absensi/susulan/log (156 cek)
```
Pengujian berjalan di Node dengan stub runtime Apps Script; ini **bukan**
pengganti pengujian di runtime Apps Script nyata (lihat `docs/TEST_PLAN.md`).
Catatan: `check-foundation` saat ini memiliki 1 kegagalan FD-09 (`API_BASE_URL`
terisi) yang pre-existing — lihat `docs/PROGRESS.md` PHASE 4 "Temuan".

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
