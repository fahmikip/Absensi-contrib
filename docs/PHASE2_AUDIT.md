# PHASE 2 AUDIT — Autentikasi, PIN, dan Sesi

> Status: **TERBLOKIR (sebagian besar).** Belum ada kode autentikasi yang ditulis.
> Alasan: keputusan kunci belum ditetapkan, dan dua keterbatasan arsitektur
> terverifikasi menghalangi implementasi sesi/PIN yang benar-benar aman.
> Jangan menganggap bagian mana pun "aman" sebelum keputusan & pengujian nyata.

## 1. FAKTA (sudah ditetapkan)
- Login memakai PIN pribadi; peran `pegawai` dan `admin` (REQUIREMENTS §3).
- PIN tidak boleh disimpan sebagai teks biasa.
- Wajib pembatasan percobaan login + penundaan/penguncian sementara.
- Reset PIN hanya via mekanisme admin terotorisasi.
- Peran tidak boleh dipercaya dari klien; verifikasi di backend.
- Akun nonaktif tidak boleh login; riwayat absensi tidak dihapus saat akun dinonaktifkan.
- Log aktivitas append-only dengan waktu server.
- Stack tetap: GitHub Pages + Apps Script Web App + Sheets (DEC-001).

## 2. KETERBATASAN TEKNIS TERVERIFIKASI (bukti)
Ini bukan asumsi; sudah diperiksa pada dokumentasi resmi/praktik terbukti:

| Kode | Temuan | Dampak | Sumber |
|------|--------|--------|--------|
| TC-01 | Apps Script hanya menyediakan `Utilities.computeDigest` (MD2/MD5/SHA-1/256/384/512) dan HMAC-SHA256. Tidak ada PBKDF2/bcrypt/scrypt/argon2 bawaan. | KDF aman harus diimplementasikan manual (kriptografi buatan sendiri) atau memakai fast-hash. | developers.google.com/apps-script/reference/utilities |
| TC-02 | Web App `doGet/doPost` hanya mengekspos parameter query; header/Cookie masuk tidak tersedia. | Sesi tidak bisa memakai cookie. | stackoverflow.com/q/79666995 |
| TC-03 | ContentService tidak dapat mengirim header `Set-Cookie`. | `HttpOnly`/`Secure`/`SameSite` **tidak tersedia** pada arsitektur ini. | stackoverflow.com/q/42463749 ; developers.google.com/apps-script/guides/content |
| TC-04 | Tidak ada API andal untuk memperoleh IP klien pada Web App. | Pembatasan percobaan per-IP tidak dapat dijamin; hanya per-akun. | (tidak ada API terdokumentasi) |
| TC-05 | Token tidak boleh di query string (aturan proyek). Karena header tidak terbaca, token hanya bisa dikirim di **body POST**. | Kontrak API: semua request terautentikasi = POST dengan token di body, via HTTPS. | REQUIREMENTS §7 (sesi), PHASE 2 §7 |

**Kesimpulan:** "sesi yang benar-benar aman" dalam arti cookie `HttpOnly` tidak
mungkin dengan stack saat ini. Sesuai PHASE 2 §7, implementasi sesi produksi
**dihentikan** dan opsi arsitektur diajukan (lihat D1).

## 3. KEPUTUSAN YANG DIBUTUHKAN

### D1 — Mekanisme sesi (blok AMB-05/AMB-21) — KRITIS
Karena cookie tidak tersedia (TC-02/03), token harus dipegang JavaScript dan
dikirim di body POST. Pilihan penyimpanan di klien:

| Opsi | Kelebihan | Risiko | Rekomendasi |
|------|-----------|--------|-------------|
| A. Token hanya di memori (variabel JS) | Paling tahan XSS persisten; tidak ada sisa di disk | Hilang saat refresh → harus login ulang tiap muat halaman | Paling aman |
| B. `sessionStorage` | Bertahan saat refresh, hilang saat tab ditutup | Terbaca skrip halaman bila ada XSS | **Pragmatis** |
| C. `localStorage` | Bertahan lama | Paparan XSS paling besar & paling persisten | Tidak disarankan |
| D. Ubah arsitektur agar bisa cookie `HttpOnly` (mis. backend lain/proksi) | Sesi paling kuat | Mengubah stack (perlu persetujuan) & menambah biaya | Jika keamanan prioritas |

Model token (jika A/B/C): token acak >= 128-bit; server menyimpan **hash** token di
sheet `Sesi` (lihat DATA_DICTIONARY §9) + masa berlaku + status tercabut; logout
mencabut di server; validasi tiap endpoint privat.

### D2 — Penyimpanan & verifikasi PIN (blok AMB-03) — KRITIS
| Opsi | Kelebihan | Risiko | Rekomendasi |
|------|-----------|--------|-------------|
| A. PBKDF2-HMAC-SHA256 diimplementasikan di Apps Script, salt unik/akun, jumlah iterasi diukur sesuai batas waktu Apps Script, divalidasi terhadap vektor uji RFC 6070 | KDF standar, jauh lebih baik dari SHA-256 tunggal | Kripto buatan sendiri → tidak diaudit; biaya CPU Apps Script tinggi | **Jika tetap pakai stack** |
| B. SHA-256 + salt + lockout ketat | Sederhana & cepat | Fast hash; jika sheet bocor, PIN rakyat mudah ditebak | Tidak disarankan |
| C. Pindahkan verifikasi PIN ke layanan pendukung bcrypt/argon2 | Kini terbaik | Perubahan arsitektur (perlu persetujuan) | Jika keamanan prioritas |

Catatan: PIN pendek berentropi rendah. Hashing tidak menghilangkan risiko
penebakan; lockout wajib. Parameter PBKDF2 final (iterasi) harus di-**benchmark**
di Apps Script sebelum dipakai, dan hasilnya dilaporkan.

### D3 — Kebijakan pembatasan percobaan (blok AMB-04) — KRITIS
Belum ditetapkan. Opsi:
- A. 5 gagal → kunci 15 menit (per akun).
- B. 5 gagal → kunci 30 menit.
- C. 3 gagal → kunci 5 menit.
- Wajib: pencatatan tanpa PIN; aman terhadap permintaan bersamaan (`LockService`);
  hindari penguncian permanen; pesan error seragam (tidak membedakan "PIN salah"
  vs "akun tidak ada").
- Keterbatasan: tidak bisa per-IP (TC-04) → serangan lintas-akun ("password
  spraying") tidak sepenuhnya dapat dicegah; hanya diperlambat.

### D4 — Admin pertama / bootstrap (blok AMB-06)
Tidak boleh ada admin default. Opsi:
- A. Rutin setup satu kali: nilai awal dimasukkan ke Script Properties, developer
  menjalankan fungsi seeding, lalu properti dihapus. (tanpa PIN di kode)
- B. Admin diseed manual di Sheet oleh developer terotorisasi.
Perlu keputusan: siapa yang berhak men-seed dan bagaimana diverifikasi.

### D5 — Penerbitan PIN awal & reset (blok AMB-01/AMB-02)
Rekomendasi agar **dipisah** dari manajemen akun (PHASE 2 §9): implementasi akun
dibuat lebih dulu tanpa alur kredensial. Opsi penerbitan:
- A. Admin membuat/mengatur PIN sementara; pegawai wajib ganti saat login pertama.
- B. Sistem menghasilkan PIN sementara, ditampilkan **sekali** ke admin; namun
  PHASE 2 §11 melarang menampilkan PIN awal di UI → butuh kanal lain/pengecualian.
- C. Belum diaktifkan (hanya struktur).
Perlu keputusan.

### D6 — Skema `Pegawai`, `Akun`, `LogAktivitas`, `Sesi` (blok AMB-13/15)
Belum disetujui. Draft ada di `docs/DATA_DICTIONARY.md` (termasuk usulan sheet
`Sesi`). Tanpa persetujuan, tidak ada sheet/tulisan data yang dibuat.

### D7 — Skema ID (AMB-16) & format waktu (AMB-17)
Belum ditetapkan. Diperlukan untuk `id_akun`, `id_sesi`, `id_log`, dan kolom waktu
(waktu server). Rekomendasi: ISO-8601 UTC untuk penyimpanan + kolom tanggal lokal
`Asia/Jakarta` terpisah. Perlu persetujuan.

### D8 — Visibilitas Web App / CORS (AMB-21)
Menentukan apakah endpoint dapat dipanggil dari GitHub Pages dan risiko
penyalahgunaan. Belum ditetapkan.

## 4. RENCANA IMPLEMENTASI (setelah keputusan)
1. `gas/Auth.gs` — hashing/verifikasi PIN (sesuai D2), pembuatan & validasi sesi
   (sesuai D1), lockout (sesuai D3), otorisasi peran.
2. `gas/Repo.gs` — akses `Akun`, `Sesi`, `LogAktivitas` dengan `LockService`.
3. `gas/Code.gs` — tambah aksi `login`, `logout`, `session.check`,
   `admin.account.create|activate|deactivate` (tanpa alur kredensial sampai D5).
4. Frontend `assets/js/auth.js` + halaman login ringkas (sesuai §11), tanpa
   dashboard absensi.
5. `tests/` — uji unit logika (hash/verify, lockout, validasi token) + simulasi.
6. Dokumentasi keamanan & hasil uji.

## 5. STATUS PENGUJIAN
Belum ada pengujian PHASE 2 yang dijalankan karena belum ada kode. Uji tidak dapat
dijalankan terhadap backend Apps Script nyata (belum dideploy; AMB-21/23).

## 6. KRITERIA UNBLOCK
Diperlukan jawaban D1–D8. Setelah itu implementasi dapat dimulai dan diuji.
