# Backend Google Apps Script — Absensi & Panel Admin (PHASE 2–4)

Backend Sistem Absensi KPU Kabupaten Aceh Selatan. Tersedia: autentikasi
(login NIP/NIPK + PIN, sesi, logout, manajemen akun admin), mesin absensi
reguler (PHASE 3), dan **panel admin** (PHASE 4: pengelolaan pegawai,
daftar/detail absensi, putuskan susulan, log audit).

## Berkas
| Berkas | Fungsi |
|--------|--------|
| `Code.gs` | Titik masuk `doGet`/`doPost`, router aksi, respons JSON, penanganan error. |
| `Config.gs` | Konfigurasi Script Properties + kebijakan (iterasi PBKDF2, TTL sesi, lockout). |
| `Auth.gs` | Primitif PBKDF2-HMAC-SHA256, PIN, token, lockout, validitas sesi. |
| `Repo.gs` | Akses Google Sheets, `LockService`, ID internal, log aktivitas. |
| `AuthService.gs` | Alur login/logout/session.check, otorisasi peran, manajemen akun admin. |
| `AdminService.gs` | Endpoint panel admin (semua wajib peran `admin` diverifikasi server). |
| `TimeRule.gs` | Aturan jendela waktu absensi (WIB; DEC-003/DEC-P18). |
| `Geo.gs` | Haversine + evaluasi GPS masuk WFO (radius ≤50 m). |
| `Drive.gs` | Simpan foto JPEG ke folder Drive privat ABSENSI_KPU/… |
| `Attendance.gs` | Mesin absensi reguler (validasi, lock, kompensasi parsial). |
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
| `attendance.submit` | POST | Ya | Absensi reguler (foto JPEG + GPS masuk WFO). |
| `admin.pegawai.list` | POST | Ya (admin) | Daftar pegawai (filter q/status/limit). |
| `admin.pegawai.detail` | POST | Ya (admin) | Detail pegawai + info akun (tanpa hash PIN). |
| `admin.pegawai.create` | POST | Ya (admin) | Tambah pegawai (kolom DATA_DICTIONARY §1). |
| `admin.pegawai.update` | POST | Ya (admin) | Ubah nama/NIP/jabatan/unit kerja. |
| `admin.pegawai.setActive` | POST | Ya (admin) | Aktif/nonaktif pegawai; nonaktif mencabut sesi; riwayat absensi tetap. |
| `admin.absensi.list` | POST | Ya (admin) | Daftar absensi (filter tanggal/jenis/pegawai); tanpa referensi foto. |
| `admin.absensi.detail` | POST | Ya (admin) | Detail absensi + metadata bukti (ada/mime/ukuran/path). |
| `admin.susulan.list` | POST | Ya (admin) | Daftar pengajuan susulan (filter status). |
| `admin.susulan.detail` | POST | Ya (admin) | Detail pengajuan + alasan + status keputusan. |
| `admin.susulan.decide` | POST | Ya (admin) | `keputusan:'terima'|'tolak'` + `catatan_keputusan`; hanya dari `menunggu`. |
| `admin.log.list` | POST | Ya (admin) | Log audit (filter aksi/limit). |

Catatan PHASE 4:
- Respons **tidak pernah** memuat `pin_hash`, `pin_salt`, `drive_file_id`, atau
  URL foto (akses foto menunggu AMB-20).
- Keputusan susulan hanya mengubah status pengajuan + log; **tidak** otomatis
  menulis baris `Absensi` (keputusan aturan belum ada).

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
   `Pegawai`, `Akun`, `Sesi`, `Absensi`, `BuktiAbsensi`, `PengajuanSusulan`,
   `LogAktivitas` beserta header.
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
- Pengajuan susulan oleh pegawai (form/alur belum ada; hanya keputusan admin).
- Akses/penampilan foto oleh admin (AMB-20) — tidak ada endpoint foto.
- Impor CSV (AMB-14), retensi (AMB-18), notifikasi (AMB-25).
- Laporan/ekspor (PHASE 5).
