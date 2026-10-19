# Sistem Absensi KPU Kabupaten Aceh Selatan (PWA)

Aplikasi absensi pegawai berbasis Progressive Web App (PWA).

- **Frontend:** HTML, CSS, JavaScript — dihosting di GitHub Pages.
- **Backend:** Google Apps Script Web App.
- **Database:** Google Sheets.
- **Penyimpanan foto:** Google Drive privat.
- **Zona waktu:** `Asia/Jakarta`.
- **Versi aplikasi:** `0.6.1` (sumber: `assets/js/config.js`).

## Status Proyek
**PHASE 6 — QA rilis: selesai (lokal); BELUM SIAP RILIS.** Audit kode & keamanan
dilakukan; 3 bug frontend diperbaiki (retry absensi, reset tombol kirim, penanganan
sesi kedaluwarsa); seluruh suite uji lokal lulus (67/42/112/156/162). Verifikasi
nyata: backend Apps Script ter-deploy & health check `ok:true` dengan
`backendConfigured:true` (`SPREADSHEET_ID`/`DRIVE_FOLDER_ID` terisi — DEC-P08/DEC-P20)
dan **`officeLocationConfigured:true`** (koordinat kantor tersimpan — AMB-07/DEC-P20);
**GitHub Pages sudah aktif** — frontend live di `https://kipasel.github.io/Absensi/`
(HTTP 200, versi 0.6.1). Rilis terblokir **uji integrasi/browser nyata**
(kamera/GPS/PWA/SW, login & absensi akun nyata). Lihat `docs/PROGRESS.md`
& `docs/DEPLOYMENT.md`.

**UI 0.6.0 (mobile app):** antarmuka dirombak menjadi app shell — app bar lengket
+ **bilah navigasi bawah** (Beranda/Absensi/Admin/Profil), kartu, dan tombol besar
ala aplikasi mobile; aksen indigo; mode gelap. `assets/js/nav.js` mengatur
perpindahan tampilan (item Admin hanya untuk peran admin). Logika bisnis & seluruh
ID/kelas yang dipakai modul lain tidak berubah.

Rincian phase sebelumnya:
**PHASE 5 — Laporan & Ekspor: selesai (lokal).** Halaman laporan admin (filter
periode/pegawai/jenis/mode/sumber/status), rekapitulasi fakta terhitung, tabel
rincian berpaginasi, dan ekspor **CSV** (DEC-P07) telah diimplementasikan &
diuji lokal di Node (162 cek; seluruh endpoint `report.*` terotorisasi `admin`
di server). Integrasi runtime Apps Script (butuh `SPREADSHEET_ID`) dan
pengujian browser **belum** dijalankan. Pengajuan susulan oleh pegawai, akses
foto admin (AMB-20), indikator kebijakan (terlambat/persen kehadiran), dan
format ekspor selain CSV **belum** dibuat. Lihat `docs/PROGRESS.md`.

## Struktur Proyek
```
index.html                  Halaman awal (status aplikasi/jaringan/backend/versi)
manifest.webmanifest        Manifest PWA
service-worker.js           Cache aset statis (tanpa data privat)
assets/
  css/styles.css            Sistem desain mobile-first (app bar, kartu, nav bawah), mode gelap
  js/config.js              Konfigurasi PUBLIK (nama, versi, URL API)
  js/api.js                 Klien POST (token sesi hanya di memori)
  js/app.js                 Logika antarmuka (status jaringan/backend)
  js/auth.js                UI login/logout (NIP/NIPK + PIN)
  js/camera.js              Kamera → canvas JPEG (kompresi klien)
  js/attendance.js          Alur absensi (jenis/mode/GPS/foto/kirim)
  js/admin.js               Panel admin (pegawai/absensi/susulan/log audit)
  js/report.js              Tab laporan admin (filter, rekap, rincian, ekspor CSV)
  js/nav.js                 Controller navigasi (bottom nav + perpindahan tampilan)
  icons/icon-192.png        Ikon placeholder (bukan logo resmi)
  icons/icon-512.png
gas/
  Code.gs                   Titik masuk doGet/doPost + router aksi + respons JSON
  Config.gs                 Konfigurasi server (Script Properties) + kebijakan
  Auth.gs                   Primitif PBKDF2/PIN/token/lockout
  Repo.gs                   Akses Sheets, LockService, log aktivitas
  AuthService.gs            Alur login/sesi/otorisasi/manajemen akun
  AdminService.gs           Endpoint panel admin (otorisasi admin, PHASE 4)
  ReportService.gs          Endpoint laporan, rekap & ekspor CSV (PHASE 5)
  TimeRule.gs               Aturan jendela waktu absensi (WIB)
  Geo.gs                    Haversine + evaluasi GPS masuk WFO
  Drive.gs                  Simpan foto JPEG ke folder Drive privat
  Attendance.gs             Mesin absensi reguler (validasi & penyimpanan)
  Bootstrap.gs              initializeSheets() & seedAdmin() (manual)
  appsscript.json           Manifest Apps Script (timezone + webapp D8)
  README.md                 Dokumentasi backend & deploy
tools/generate-icons.mjs    Generator ikon placeholder
tests/check-foundation.mjs  Pemeriksaan fondasi otomatis (59 cek)
tests/harness.mjs           Stub runtime Apps Script untuk pengujian Node
tests/auth.test.mjs         Pengujian autentikasi otomatis (42 cek)
tests/attendance.test.mjs   Pengujian mesin absensi otomatis (112 cek)
tests/admin.test.mjs         Pengujian panel admin otomatis (156 cek)
tests/report.test.mjs        Pengujian laporan & ekspor CSV otomatis (162 cek)
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
node tests/check-foundation.mjs   # struktur, sintaks, JSON, ikon, tanpa rahasia (59 cek)
node tests/auth.test.mjs          # autentikasi & kripto (42 cek, termasuk RFC 7914 §11)
node tests/attendance.test.mjs    # mesin absensi: waktu/GPS/foto/duplikat (112 cek)
node tests/admin.test.mjs         # panel admin: otorisasi/pegawai/absensi/susulan/log (156 cek)
node tests/report.test.mjs        # laporan/rekap/ekspor CSV: otorisasi/filter/keamanan (162 cek)
```
Pengujian berjalan di Node dengan stub runtime Apps Script; ini **bukan**
pengganti pengujian di runtime Apps Script nyata (lihat `docs/TEST_PLAN.md`).
Catatan: `API_BASE_URL` sudah terisi dengan URL deployment Apps Script yang
dikonfirmasi pengguna (DEC-P19); health live merespons tetapi
`backendConfigured:false` — `SPREADSHEET_ID`/`DRIVE_FOLDER_ID` belum diisi di
Script Properties (DEC-P08).

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
