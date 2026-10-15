# SECURITY — Threat Model Awal & Mitigasi

> Status: **PHASE 2 — autentikasi diimplementasikan & diuji lokal (Node).**
> Ini model ancaman, bukan jaminan keamanan. Aplikasi TIDAK boleh diklaim
> "sepenuhnya aman" — belum ada audit independen maupun pengujian runtime.
> Bagian autentikasi/PHASE 2: lihat `docs/PHASE2_AUDIT.md`.

## Keterbatasan Arsitektur Terverifikasi (PHASE 2)
Dirujuk dari dokumentasi resmi/praktik terbukti (bukan asumsi):
- **Tidak ada cookie.** Apps Script Web App tidak dapat menerima header `Cookie`
  dan ContentService tidak dapat mengirim `Set-Cookie`. Akibatnya `HttpOnly`,
  `Secure`, dan `SameSite` **tidak tersedia**. Sesi tidak dapat memakai cookie.
- **Tidak ada KDF bawaan.** Hanya `computeDigest` (SHA family) & HMAC. PBKDF2
  harus diimplementasikan manual (kripto buatan sendiri) atau memakai fast-hash.
- **Tidak ada IP klien andal.** Pembatasan percobaan hanya bisa per-akun, bukan per-IP.
- **Token hanya via body POST.** Query string dilarang; header tidak terbaca.
Lihat `docs/PHASE2_AUDIT.md` §2 untuk sumber dan implikasi.


## Asumsi Dasar
- Frontend di GitHub Pages bersifat publik dan seluruh kode/konfigurasi yang dikirim
  ke browser dapat dibaca penyerang.
- Apps Script adalah satu-satunya tempat validasi yang dipercaya.
- Google Sheets bukan database transaksional penuh.

## Daftar Ancaman & Mitigasi Rencana
| ID | Ancaman | Dampak | Mitigasi rencana | Status |
|----|---------|--------|------------------|--------|
| T-01 | Brute-force PIN | Akun diambil alih | PBKDF2-HMAC-SHA256 + salt + lockout 5×/15 mnt (D3); pencatatan percobaan | Sebagian (kode; uji lokal LULUS, runtime belum) |
| T-02 | Pemalsuan request dari frontend (mis. timestamp/GPS dikirim klien) | Absensi palsu | Waktu & validasi ditentukan server; klien hanya mengirim data mentah yang diverifikasi ulang (AMB-07/08) | Belum diterapkan |
| T-03 | Manipulasi jam perangkat | Absensi di luar jam | Server memakai waktu server `Asia/Jakarta`, bukan klien | Belum diterapkan |
| T-04 | Manipulasi parameter ID pegawai | Akses/pengubahan data pegawai lain | Otorisasi per-identitas di backend; token sesi terikat ke pegawai | Sebagian (aktor & peran dari sesi server; endpoint data pegawai belum ada) |
| T-05 | Akses data lintas pegawai | Kebocoran data pribadi | Backend hanya mengembalikan data milik pemanggil (kecuali admin) | Belum diterapkan (belum ada endpoint data pegawai) |
| T-06 | Akses foto via tautan publik | Foto privat bocor | Drive privat; dilarang anyone-with-link; akses via backend ber-otorisasi (AMB-20) | Belum diterapkan |
| T-07 | Penyalahgunaan endpoint admin | Manipulasi data | Cek peran admin di backend setiap request (jangan percaya klien) | Sebagian (cek peran admin di kode; uji lokal LULUS) |
| T-08 | Permintaan ganda / race condition | Duplikasi absensi | `LockService` + kunci unik (pegawai+tanggal+jenis); idempotency | Belum diterapkan |
| T-09 | Penyalahgunaan token/sesi | Akses tidak sah | Token acak kuat, disimpan sebagai hash, masa berlaku, revoke saat logout | Sebagian (kode; token di memori D1) |
| T-10 | Kebocoran konfigurasi/log | Eksposur resource | Secrets via Script Properties; log tanpa data pribadi/PIN/token | Sebagian (kode + uji lokal LULUS) |
| T-11 | Perubahan/penghapusan tanpa jejak | Tidak dapat diaudit | `LogAktivitas` append-only dengan aktor & waktu | Sebagian (login/logout/akun dicatat; kode) |
| T-12 | Kegagalan parsial Drive↔Sheets | Data tak konsisten | Urutan tulis & kompensasi; tandai status "perlu ditindaklanjuti"; jangan klaim berhasil | Belum diterapkan |
| T-13 | CORS / endpoint Apps Script publik | Request dari domain tak dikenal | Batasi/validasi Origin; token wajib (terkait AMB-21) | Belum diterapkan (D8 `ANYONE_ANONYMOUS`; validasi Origin belum) |

## Hasil Tinjauan Keamanan PHASE 1
- Tidak ada rahasia (ID resource, PIN, token) di frontend. Diperiksa otomatis oleh
  `tests/check-foundation.mjs` (pola private key, API key, token, dsb.) → lulus.
- `API_BASE_URL` sengaja kosong; halaman menampilkan **BELUM DIKONFIGURASI** dan
  tidak mengklaim backend terhubung.
- Service worker hanya meng-cache aset statis same-origin; permintaan lintas-origin
  (calon backend) tidak di-cache; tidak ada antrean offline; tidak ada caching respons API.
- `gas/appsscript.json` (PHASE 2) memuat blok `webapp` sesuai keputusan D8
  (`executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS`). Endpoint publik →
  token sesi wajib & otorisasi di backend; validasi `Origin` belum diterapkan.
- Endpoint `health` tidak mengakses data privat (hanya metadata waktu & status
  konfigurasi boolean).

## Prinsip Wajib
- Tidak ada rahasia (ID Spreadsheet, PIN, token) di repositori frontend.
- Validasi penting diulang di backend.
- Setiap endpoint sensitif memverifikasi identitas & peran.
- Gagal simpan → status UI bukan "berhasil".

## Keterbatasan yang Diakui
- Browser tidak dapat membuktikan foto berasal dari kamera fisik (bukan anti-curang mutlak).
- Validasi GPS dapat dipengaruhi spoofing lokasi; 50 m hanya kontrol, bukan jaminan.
- Google Sheets tidak menjamin transaksi penuh; perlu mitigasi aplikatif.
- Belum ada pengujian penetrasi / review keamanan independen → **BELUM DILAKUKAN**.
- CORS/visibilitas Web App belum diputuskan (AMB-21); keamanan endpoint belum final.

## Status Autentikasi PHASE 2 (terimplementasi, diuji lokal)
Kontrol yang sekarang ada di kode (`gas/Auth.gs`, `gas/AuthService.gs`, `gas/Repo.gs`):
- **PIN**: disimpan sebagai PBKDF2-HMAC-SHA256 + salt unik per akun; diversifikasi
  iterasi disimpan per baris (`pin_iterasi`). Diuji vs vektor RFC 7914 §11.
- **Token sesi**: acak (~244 bit dari UUID v4), disimpan sebagai SHA-256 base64;
  token mentah tidak disimpan/ dilog. Disimpan klien HANYA di memori (D1).
- **Lockout**: 5 gagal → kunci 15 menit (D3), per-akun (tidak ada IP andal).
- **Pesan seragam**: login gagal selalu `AUTH_FAILED` dengan pesan identik
  (akun tak ada / PIN salah / terkunci tidak dibedakan); verifikasi "dummy"
  dijalankan untuk akun tanpa kredensial untuk mengurangi kebocoran waktu.
- **Otorisasi**: peran diambil dari sesi terverifikasi, TIDAK dari body klien.
- **Log**: `login_failed`, `login_success`, `logout`, aksi akun — tanpa PIN/token.
- Tidak ada PIN default/kredensial di repositori frontend; `API_BASE_URL` kosong.

Belum / belum terverifikasi:
- **Benchmark jumlah iterasi PBKDF2 di runtime Apps Script nyata** (D2) — nilai 10000 sementara.
- Integrasi runtime Apps Script (butuh `SPREADSHEET_ID` — DEC-P08).
- Validasi `Origin`/CORS belum ada; endpoint Web App publik (D8).
- Belum ada pengujian penetrasi / review independen.
- Kripto PBKDF2 adalah kode kustom (Apps Script tanpa KDF bawaan) → risiko implementasi.
- Audit & opsi keputusan: `docs/PHASE2_AUDIT.md`.
