# ARCHITECTURE — Arsitektur Sistem

> Status: **PHASE 2 — autentikasi diimplementasikan.** Fondasi PHASE 1 tersedia;
> login/sesi/manajemen akun ada & diuji lokal. Absensi (PHASE 3) belum.

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

## Struktur Frontend (aktual PHASE 2)
- `index.html` — halaman awal + panel masuk/sesi; menampilkan status aplikasi,
  jaringan, backend, dan versi. Tidak ada data fiktif.
- `manifest.webmanifest` — manifest PWA (`start_url`/`scope` relatif `./` agar
  kompatibel dengan sub-path GitHub Pages).
- `service-worker.js` — cache aset statis only (termasuk `api.js`/`auth.js`);
  permintaan lintas-origin diteruskan tanpa di-cache; navigasi fallback app shell.
- `assets/css/styles.css` — gaya netral, responsif, mode gelap sistem + form.
- `assets/js/config.js` — konfigurasi publik (nama, versi, `API_BASE_URL`). Tanpa rahasia.
- `assets/js/api.js` — klien POST `text/plain`; token sesi HANYA di memori (D1).
- `assets/js/app.js` — status jaringan, status backend (health check), registrasi SW.
- `assets/js/auth.js` — UI login/logout (NIP/NIPK + PIN); tidak menyimpan PIN.
- `assets/icons/` — ikon placeholder netral, dibuat `tools/generate-icons.mjs`.

Modul kamera & GPS **belum** ada — menunggu PHASE 3.

## Struktur Backend (aktual PHASE 2)
- `gas/Code.gs` — `doGet`/`doPost`, router aksi, respons JSON konsisten.
  Aksi: `health`, `login`, `logout`, `session.check`,
  `admin.account.create`, `admin.account.setActive`, `admin.account.resetPin`.
- `gas/Config.gs` — konfigurasi Script Properties + kebijakan (iterasi PBKDF2,
  TTL sesi, lockout) + `AppError_`.
- `gas/Auth.gs` — primitif PBKDF2-HMAC-SHA256, PIN, token, lockout, validitas sesi.
- `gas/Repo.gs` — akses Sheets, `LockService`, ID internal, log aktivitas.
- `gas/AuthService.gs` — alur autentikasi, otorisasi peran, manajemen akun admin.
- `gas/Bootstrap.gs` — `initializeSheets()` & `seedAdmin()` (manual, tanpa PIN default).
- `gas/appsscript.json` — timezone `Asia/Jakarta`, runtime V8, blok `webapp` (D8).
- Validasi absensi & penyimpanan foto: BELUM ADA (PHASE 3).

## Lapisan Data
- PHASE 2 (dibuat oleh `initializeSheets()`): `Pegawai`, `Akun`, `Sesi`, `LogAktivitas`
  (kolom sesuai `docs/DATA_DICTIONARY.md` §9).
- Phase lanjutan (belum): `Absensi`, `BuktiAbsensi`, `Pengaturan`, `HariLibur`,
  `PengajuanSusulan`.
- Spreadsheet belum dibuat secara nyata (menunggu `SPREADSHEET_ID`, DEC-P08).

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
