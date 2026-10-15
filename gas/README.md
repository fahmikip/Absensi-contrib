# Backend Google Apps Script — Autentikasi (PHASE 2)

Backend Sistem Absensi KPU Kabupaten Aceh Selatan. Pada phase ini tersedia
autentikasi (login NIP/NIPK + PIN), sesi, logout, dan manajemen akun admin.
Belum ada absensi, kamera, atau GPS (PHASE 3+).

## Berkas
| Berkas | Fungsi |
|--------|--------|
| `Code.gs` | Titik masuk `doGet`/`doPost`, router aksi, respons JSON, penanganan error. |
| `Config.gs` | Konfigurasi Script Properties + kebijakan (iterasi PBKDF2, TTL sesi, lockout). |
| `Auth.gs` | Primitif PBKDF2-HMAC-SHA256, PIN, token, lockout, validitas sesi. |
| `Repo.gs` | Akses Google Sheets, `LockService`, ID internal, log aktivitas. |
| `AuthService.gs` | Alur login/logout/session.check, otorisasi peran, manajemen akun admin. |
| `Bootstrap.gs` | Fungsi manual `initializeSheets()` & `seedAdmin()`. |
| `appsscript.json` | Manifest (zona waktu `Asia/Jakarta`, runtime V8, `webapp` D8). |

## Endpoint
Permintaan tulis/autentikasi dikirim sebagai **POST** body JSON:
`{ "action": "...", "token": "...", "data": { ... } }`
Token sesi HANYA dikirim di body (bukan query string).

| Aksi | Metode | Token? | Keterangan |
|------|--------|--------|------------|
| `health` | GET/POST | Tidak | Status dasar; tidak mengakses data privat. |
| `login` | POST | Tidak | `data:{nip,pin,agen}` → `{token, peran, nama, expiresAt}`. |
| `logout` | POST | Ya | Mencabut sesi (`dicabut_pada`). |
| `session.check` | POST | Ya | Memvalidasi sesi aktif. |
| `admin.account.create` | POST | Ya (admin) | Membuat akun untuk pegawai terdaftar (TANPA menerbitkan PIN). |
| `admin.account.setActive` | POST | Ya (admin) | Aktif/nonaktif akun; nonaktif mencabut semua sesi. |
| `admin.account.resetPin` | POST | — | **NOT_AVAILABLE** (menunggu keputusan D5). |

Contoh respons login sukses:
```json
{ "status": "ok", "ok": true, "token": "<rahasia>", "peran": "pegawai",
  "nama": "...", "expiresAt": "2026-10-15T11:00:00.000Z" }
```
Login gagal selalu: `{ "ok": false, "error": "AUTH_FAILED", "message": "NIP atau PIN tidak sesuai." }`
(tidak membedakan akun tidak ada / PIN salah / terkunci).

## Properti Script yang Digunakan
Isi via **Project Settings → Script Properties** (jangan simpan di kode):

| Kunci | Wajib? | Status saat ini |
|-------|--------|-----------------|
| `SPREADSHEET_ID` | Ya (PHASE 2) | BELUM DIKONFIGURASI (AMB-23 / DEC-P08) |
| `DRIVE_FOLDER_ID` | Nanti (PHASE 3+) | BELUM DIKONFIGURASI (AMB-23) |
| `OFFICE_LATITUDE` / `OFFICE_LONGITUDE` | PHASE 3 | BELUM DITETAPKAN (AMB-07) |
| `OFFICE_RADIUS_METERS` | PHASE 3 | 50 (DEC-004) |
| `PIN_KDF_ITERATIONS` | Opsional | 10000 sementara — **WAJIB benchmark** (D2) |
| `SESSION_TTL_MINUTES` | Opsional | 480 (8 jam) |
| `ADMIN_SETUP_NIP` | Ya (bootstrap) | BELUM DIISI (D4) |
| `ADMIN_SETUP_PIN` | Ya (bootstrap) | BELUM DIISI (D4) — HAPUS setelah seed |
| `ADMIN_SETUP_NAMA` | Opsional | BELUM DIISI (D4) |

> Script Properties **bukan** pengganti autentikasi. Setiap endpoint sensitif tetap
> memverifikasi identitas & peran di backend.

## Langkah Bootstrap (manual, sekali)
1. Set Script Properties `SPREADSHEET_ID` dan (sementara) `ADMIN_SETUP_NIP`,
   `ADMIN_SETUP_PIN`, opsional `ADMIN_SETUP_NAMA`.
2. Di editor Apps Script, jalankan `initializeSheets()` → membuat sheet
   `Pegawai`, `Akun`, `Sesi`, `LogAktivitas` beserta header.
3. Jalankan `seedAdmin()` → membuat 1 akun admin. **Hapus** `ADMIN_SETUP_PIN`
   (dan `ADMIN_SETUP_NIP`) setelah berhasil.
4. Deploy → **Web app** → *Execute as*: **Me**, *Who has access*: **Anyone** (D8).
5. Salin URL `/exec` ke `assets/js/config.js` → `API_BASE_URL` (URL publik, bukan rahasia).

## Batasan yang Diakui
- Apps Script tidak punya KDF bawaan → PBKDF2 di sini kode kustom, **belum diaudit**.
- Tidak ada cookie (`HttpOnly`/`Secure`/`SameSite`) → token di memori (D1).
- Tidak ada IP klien andal → lockout per-akun (5 gagal → 15 menit, D3).
- Iterasi PBKDF2 default belum di-benchmark di runtime nyata.

## Belum Diimplementasikan
- Penerbitan/reset PIN (D5).
- Absensi, kamera, GPS.
- Manajemen pegawai lengkap & laporan.
