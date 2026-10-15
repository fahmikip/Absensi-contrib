# DECISIONS — Catatan Keputusan

> Format tiap entri: ID, tanggal, status, keputusan, alasan, dampak, dokumen terkait.
> Aturan: keputusan lama tidak dihapus diam-diam. Perubahan disetujui dicatat sebagai
> keputusan baru yang merujuk keputusan lama.

## Keputusan yang Sudah Ditetapkan (dari spesifikasi disetujui)

### DEC-001 — Stack teknologi
- Tanggal: 2026-10-15
- Status: DISETUJUI (dari spesifikasi master prompt)
- Keputusan: Frontend HTML/CSS/JS di GitHub Pages; backend Google Apps Script Web App; database Google Sheets; foto di Google Drive privat; bentuk PWA.
- Alasan: ditetapkan pengguna.
- Dampak: seluruh arsitektur mengikuti batas ini; tidak boleh diganti tanpa persetujuan.

### DEC-002 — Zona waktu bisnis
- Tanggal: 2026-10-15
- Status: DISETUJUI
- Keputusan: Semua aturan waktu memakai `Asia/Jakarta`; keputusan memakai waktu server, bukan jam perangkat.
- Dampak: project Apps Script harus di-set timezone `Asia/Jakarta`; format penyimpanan waktu harus konsisten (lihat AMB-17).

### DEC-003 — Jam absensi reguler
- Tanggal: 2026-10-15
- Status: DISETUJUI
- Keputusan: Masuk `07:00:00–08:29:59` (≥08:30:00 ditolak); pulang `16:00:00–23:59:59`; absen pulang lintas tanggal ditolak sebagai reguler.

### DEC-004 — Kebijakan foto & GPS
- Tanggal: 2026-10-15
- Status: DISETUJUI
- Keputusan: Kamera wajib untuk semua absensi reguler; GPS wajib hanya untuk masuk WFO; radius maks 50 m; tanpa watermark; simpan foto asli; metadata terpisah; dilarang tautan publik.

### DEC-005 — Aturan transaksi
- Tanggal: 2026-10-15
- Status: DISETUJUI
- Keputusan: Satu masuk + satu pulang reguler per pegawai per tanggal; pulang mensyaratkan masuk valid; validasi backend; anti duplikasi.

### DEC-006 — Mode kerja
- Tanggal: 2026-10-15
- Status: DISETUJUI
- Keputusan: Mode WFO/WFH-WFA dipilih pegawai saat absensi; admin tidak menetapkan mode harian.

### DEC-007 — Privasi Drive
- Tanggal: 2026-10-15
- Status: DISETUJUI
- Keputusan: Folder Drive privat; struktur `ABSENSI_KPU/YYYY/MM/Foto_Masuk|Foto_Pulang/`; dilarang publik/"anyone with link"; bukti tidak dihapus saat akun nonaktif.

### DEC-008 — Service worker
- Tanggal: 2026-10-15
- Status: DISETUJUI
- Keputusan: Cache hanya aset statis aman; dilarang cache data privat; tidak ada antrean absensi offline.

## Keputusan Pending (menunggu jawaban pengguna)
| ID | Terkait | Keputusan yang dibutuhkan | Status |
|----|---------|---------------------------|--------|
| DEC-P01 | AMB-21 | Visibilitas Web App & strategi CORS/token | MENUNGGU |
| DEC-P02 | AMB-03/04/05 | Mekanisme PIN, hash, lockout, sesi | MENUNGGU |
| DEC-P03 | AMB-07 | Nilai koordinat kantor | MENUNGGU |
| DEC-P04 | AMB-15/16/17 | Skema data & format waktu | MENUNGGU |
| DEC-P05 | AMB-11/12 | Aturan susulan | MENUNGGU |
| DEC-P06 | AMB-18 | Retensi data | MENUNGGU |
| DEC-P07 | AMB-19 | Laporan & ekspor | MENUNGGU |
| DEC-P08 | AMB-23 | Nilai konfigurasi resource | MENUNGGU |
| DEC-P09 | AMB-05 | **D1** penyimpanan token sesi (memori/sessionStorage/localStorage/ubah arsitektur) | DISETUJUI 2026-10-15 |
| DEC-P10 | AMB-03 | **D2** metode penyimpanan & verifikasi PIN (PBKDF2 buatan sendiri / SHA-256+lockout / layanan eksternal) | DISETUJUI 2026-10-15 |
| DEC-P11 | AMB-04 | **D3** ambang & durasi lockout | DISETUJUI 2026-10-15 |
| DEC-P12 | AMB-06 | **D4** bootstrap admin pertama | DISETUJUI 2026-10-15 |
| DEC-P13 | AMB-01/02 | **D5** penerbitan PIN awal & reset | DISETUJUI 2026-10-15 |

## Keputusan Autentikasi yang Sudah Ditetapkan (PHASE 2)
Sumber: jawaban pengguna atas pertanyaan D0–D8 (lihat `docs/PHASE2_AUDIT.md`).

### DEC-P14 — Login (D0)
- Tanggal: 2026-10-15; Status: DISETUJUI
- Keputusan: Login memakai **NIP/NIPK + PIN** (PIN saja tidak dapat mengidentifikasi akun).

### DEC-P09 — Penyimpanan token sesi (D1)
- Tanggal: 2026-10-15; Status: DISETUJUI
- Keputusan: Token sesi disimpan di **memori JS saja** (tanpa localStorage/sessionStorage/cookie).
- Dampak: memuat ulang halaman = keluar; pengguna harus masuk lagi.

### DEC-P10 — Hash PIN (D2)
- Tanggal: 2026-10-15; Status: DISETUJUI
- Keputusan: **PBKDF2-HMAC-SHA256** (RFC 2898) dengan salt unik per akun; DIVALIDASI
  terhadap vektor uji RFC 7914 §11. Iterasi default 10000 (sementara) dan WAJIB
  di-benchmark di runtime Apps Script sebelum produksi.
- Catatan: Apps Script tidak menyediakan KDF bawaan → kode kustom, belum diaudit independen.

### DEC-P11 — Lockout (D3)
- Tanggal: 2026-10-15; Status: DISETUJUI
- Keputusan: **5 kali gagal → terkunci 15 menit** (per-akun; tidak ada IP klien andal).

### DEC-P12 — Bootstrap admin (D4)
- Tanggal: 2026-10-15; Status: DISETUJUI
- Keputusan: Admin pertama dibuat lewat **Script Properties + fungsi `seedAdmin()` satu kali**.
  Tidak ada PIN default di kode. `ADMIN_SETUP_PIN` dihapus setelah seed.

### DEC-P13 — Penerbitan/reset PIN (D5)
- Tanggal: 2026-10-15; Status: DISETUJUI (ditunda)
- Keputusan: Penerbitan & reset PIN **DIPISAH** dari PHASE 2. Hanya manajemen akun yang
  dibangun. Action `admin.account.resetPin` mengembalikan `NOT_AVAILABLE`.

### DEC-P15 — Skema data & format waktu (D6/D7)
- Tanggal: 2026-10-15; Status: DISETUJUI
- Keputusan: Menyetujui draf skema `docs/DATA_DICTIONARY.md`; ID berupa string;
  waktu ISO-8601 UTC + kolom tanggal lokal; sheet `Sesi` disetujui.

### DEC-P16 — Akses Web App (D8)
- Tanggal: 2026-10-15; Status: DISETUJUI
- Keputusan: Deploy Web App *Execute as* **USER_DEPLOYING** & *Who has access*
  **ANYONE_ANONYMOUS**. Diimplementasikan pada `gas/appsscript.json`.

## PASAL PENTING (PHASE 2)
- Cookie `HttpOnly`/`Secure`/`SameSite` **tidak tersedia** pada Apps Script Web App
  (ContentService tidak bisa `Set-Cookie`; `doGet/doPost` tak membaca Cookie).
  Sesi berbasis cookie dinyatakan tidak mungkin dengan stack saat ini.
- Apps Script tidak menyediakan KDF bawaan (PBKDF2/bcrypt/argon2).
- Detail & sumber: `docs/PHASE2_AUDIT.md` §2.
- D1–D8 telah dijawab; PHASE 2 diimplementasikan dan diuji lokal (lihat PROGRESS.md).
- Tidak ada standar keamanan yang diturunkan secara diam-diam.
