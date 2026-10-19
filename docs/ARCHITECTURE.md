# ARCHITECTURE — Arsitektur Sistem

> Status: **PHASE 4 — panel admin diimplementasikan & diuji lokal (Node).**
> Fondasi PHASE 1–3 (autentikasi, mesin absensi) tersedia. Integrasi runtime
> Apps Script & pengujian browser belum (butuh `SPREADSHEET_ID`, DEC-P08).

## Alur Tingkat Tinggi
```
Browser / PWA (GitHub Pages, HTML/CSS/JS)
        |  HTTPS  POST text/plain { action, token, data } (token di body; D1/D8)
        v
Google Apps Script Web App  (doGet/doPost; satu-satunya lapisan tepercaya)
        |
        +--> Google Sheets   (data absensi, pegawai, akun, pengajuan, log, pengaturan)
        +--> Google Drive    (foto privat)
```

## Struktur Frontend (aktual PHASE 4)
- `index.html` — halaman awal + panel masuk/sesi + section absensi +
  **section `admin-view`** (tab Pegawai/Absensi/Susulan/Log audit); menampilkan
  status aplikasi, jaringan, backend, dan versi. Tidak ada data fiktif.
- `manifest.webmanifest` — manifest PWA (`start_url`/`scope` relatif `./` agar
  kompatibel dengan sub-path GitHub Pages).
- `service-worker.js` — cache aset statis only (termasuk `api.js`/`auth.js`/
  `camera.js`/`attendance.js`/`admin.js`); permintaan lintas-origin diteruskan
  tanpa di-cache; navigasi fallback app shell.
- `assets/css/styles.css` — gaya netral, responsif, mode gelap sistem + form +
  panel admin.
- `assets/js/config.js` — konfigurasi publik (nama, versi, `API_BASE_URL`). Tanpa rahasia.
- `assets/js/api.js` — klien POST `text/plain`; token sesi HANYA di memori (D1).
- `assets/js/app.js` — status jaringan, status backend (health check), registrasi SW.
- `assets/js/auth.js` — UI login/logout (NIP/NIPK + PIN); dispatch event
  `auth:login`/`auth:logout`.
- `assets/js/camera.js` — kamera → canvas JPEG (DEC-P17).
- `assets/js/attendance.js` — alur absensi (jendela waktu/GPS/foto/idempoten).
- `assets/js/admin.js` — panel admin (PHASE 4); tampil hanya bila peran `admin`
  (event `auth:login`); render data via `textContent` (anti-XSS); tanpa URL foto.
- `assets/icons/` — ikon placeholder netral, dibuat `tools/generate-icons.mjs`.

## Struktur Backend (aktual PHASE 4)
- `gas/Code.gs` — `doGet`/`doPost`, router aksi, respons JSON konsisten.
  Aksi: `health`, `login`, `logout`, `session.check`,
  `admin.account.create`, `admin.account.setActive`, `admin.account.resetPin`,
  `attendance.submit`, dan 11 aksi PHASE 4:
  `admin.pegawai.list|detail|create|update|setActive`,
  `admin.absensi.list|detail`, `admin.susulan.list|detail|decide`,
  `admin.log.list`.
- `gas/Config.gs` — konfigurasi Script Properties + kebijakan (iterasi PBKDF2,
  TTL sesi, lockout) + `AppError_`.
- `gas/Auth.gs` — primitif PBKDF2-HMAC-SHA256, PIN, token, lockout, validitas sesi.
- `gas/Repo.gs` — akses Sheets, `LockService`, ID internal, log aktivitas;
  header `Pegawai`/`Akun`/`Sesi`/`Absensi`/`BuktiAbsensi`/`PengajuanSusulan`/`LogAktivitas`.
- `gas/AuthService.gs` — alur autentikasi, otorisasi peran, manajemen akun admin.
- `gas/AdminService.gs` — **endpoint panel admin (PHASE 4)**; semua aksi:
  POST + `requireAdmin_` (peran diverifikasi dari sesi server) + `withLock_`
  untuk operasi tulis + `logActivity_`.
- `gas/TimeRule.gs`, `gas/Geo.gs`, `gas/Drive.gs`, `gas/Attendance.gs` — mesin absensi (PHASE 3).
- `gas/Bootstrap.gs` — `initializeSheets()` & `seedAdmin()` (manual, tanpa PIN default).
- `gas/appsscript.json` — timezone `Asia/Jakarta`, runtime V8, blok `webapp` (D8).

## Lapisan Data
- Sheet (dibuat `initializeSheets()`; kolom DATA_DICTIONARY.md): `Pegawai`,
  `Akun`, `Sesi`, `Absensi`, `BuktiAbsensi`, `PengajuanSusulan`, `LogAktivitas`.
- `Pengaturan`, `HariLibur` — belum dibuat (belum ada kebutuhan di phase ini).
- Spreadsheet belum dibuat secara nyata (menunggu `SPREADSHEET_ID`, DEC-P08).

## Akses Foto Admin (PHASE 4)
- Panel admin hanya menerima **metadata bukti**: keberadaan, `mime`, `ukuran`,
  `path` folder. `drive_file_id`/URL TIDAK dikirim ke klien (AMB-20 belum
  ditetapkan); tidak ada endpoint pengambilan foto.

## Google Drive
- Struktur privat: `ABSENSI_KPU/YYYY/MM/Foto_Masuk|Foto_Pulang/`.
- Referensi file (ID, path, tanggal, jenis) disimpan di `BuktiAbsensi`.
- Belum ada folder yang dibuat pada PHASE 1.

## Batasan Arsitektur yang Diakui
- Google Sheets bukan DB transaksional penuh (tanpa foreign key/transaksi kuat) → mitigasi rencana: `LockService`, kunci unik, validasi ulang.
- Apps Script memiliki kuota waktu eksekusi & limit harian (AMB-24).
- CORS/Kredensial lintas-origin adalah risiko utama (AMB-21).
- Tidak ada backend server mandiri di GitHub Pages.

## BELUM DITETAPKAN
- Validasi `Origin`/CORS (D8 memilih akses publik; batas domain belum).
- Skema sheet phase lanjutan (absensi, susulan, dll.).
- Format respons & aturan bisnis absensi.

## Autentikasi (DIIMPLEMENTASIKAN)
Karena cookie tidak tersedia dan header tidak terbaca (lihat `PHASE2_AUDIT.md`
TC-02/03), model yang dipakai:
```
Login:  POST body { action:'login', data:{ nip, pin, agen } } -> server verifikasi PIN
        -> server buat token acak, simpan HASH token di sheet `Sesi`
        -> server balas token (DI BODY, bukan query string)
Klien:  menyimpan token HANYA di memori (D1) — TANPA cookie/localStorage
Request terautentikasi: POST body { action, token, data }
        -> server: hash(token) -> cari di `Sesi` -> cek kedaluwarsa/tercabut
        -> cek status akun & peran dari data server (BUKAN dari klien)
Logout: POST { action:'logout', token } -> tandai `dicabut_pada`
```
Lapisan: `Auth.gs` (hash/verify, sesi, lockout), `Repo.gs` (sheet + `LockService`),
`AuthService.gs` (alur + otorisasi), aksi di `Code.gs`. Detail keputusan: D0–D8.
