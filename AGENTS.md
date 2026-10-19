# AGENTS.md — Aturan untuk Sesi OpenCode Berikutnya

> WAJIB dibaca sebelum mengubah kode/dokumen apa pun pada proyek ini.

## Identitas Proyek
Sistem Absensi KPU Kabupaten Aceh Selatan. PWA: HTML/CSS/JS (GitHub Pages) →
Google Apps Script → Google Sheets + Google Drive privat. Zona waktu `Asia/Jakarta`.

## Aturan Mutlak
1. **Jangan mengarang** kebutuhan, fitur, aturan bisnis, data pegawai, identitas,
   jadwal, konfigurasi, koordinat kantor, NIP, PIN, atau kredensial.
2. **Jangan mengisi placeholder dengan rekaan.** Tandai `BELUM DITETAPKAN`.
3. Jika keputusan belum ada dan memengaruhi implementasi, **berhenti** dan bertanya.
4. Jangan mengubah stack (HTML/CSS/JS, GitHub Pages, Apps Script, Sheets, Drive)
   tanpa persetujuan.
5. Jangan menaruh rahasia/PIN/token/kredensial di frontend.
   Semua rahasia via Apps Script `Script Properties`.
6. Validasi penting diulang di **backend**. Jangan percaya klien.
7. Jangan mengklaim selesai/aman/teruji tanpa verifikasi nyata.
8. Jangan commit kecuali diminta.

## Urutan Sumber Kebenaran
1. Instruksi terbaru pengguna. 2. `docs/REQUIREMENTS.md` disetujui.
3. Dokumen arsitektur/keputusan disetujui. 4. Dokumentasi resmi teknologi.
5. Asumsi teknis sementara yang dicatat eksplisit.

## Alur Kerja
- Kerjakan **satu phase** pada satu waktu (lihat `docs/PROGRESS.md`).
- Sebelum coding: baca dokumen, audit ambiguitas, jelaskan rencana & file yang diubah.
- Sesudah coding: jalankan pengujian yang ada, laporkan hasil apa adanya,
  perbarui `docs/PROGRESS.md`, dan jangan lanjut phase tanpa instruksi.
- Perubahan sekecil mungkin; jangan refactor tak berkaitan.

## Status Saat Ini
- PHASE 0–4 dikerjakan. PHASE 3 (mesin absensi) & PHASE 4 (panel admin)
  **selesai (lokal)** — implementasi + uji Node lulus; integrasi runtime Apps
  Script & pengujian browser belum. Lihat `docs/PROGRESS.md`.
- Keputusan D0–D8 sudah dijawab pengguna (lihat `docs/DECISIONS.md` DEC-P09..P16);
  aturan waktu & foto: DEC-P17/P18.
- Kode: autentikasi (`gas/Auth*.gs`, `assets/js/auth.js`), absensi
  (`gas/TimeRule.gs`, `Geo.gs`, `Drive.gs`, `Attendance.gs`; `assets/js/camera.js`,
  `attendance.js`), panel admin (`gas/AdminService.gs`; `assets/js/admin.js`).
  Keterbatasan terverifikasi: Apps Script tak punya cookie (`HttpOnly` tak
  tersedia) & tak punya KDF bawaan (PBKDF2 kode kustom, belum diaudit).
- Perintah uji: `node tests/check-foundation.mjs`, `node tests/auth.test.mjs`,
  `node tests/attendance.test.mjs`, `node tests/admin.test.mjs`.
- Jalankan lokal: `py -m http.server 8765` lalu buka `http://127.0.0.1:8765/`.

## Blocker Aktif (jangan diimplementasikan sebelum dijawab)
- **Benchmark iterasi PBKDF2 di runtime Apps Script nyata** (D2) — nilai 10000
  masih sementara.
- Integrasi runtime Apps Script & browser menunggu `SPREADSHEET_ID` (DEC-P08);
  jangan mengarang ID.
- Penerbitan/reset PIN (AMB-01/02) → D5 (ditunda). `admin.account.resetPin`
  sengaja mengembalikan `NOT_AVAILABLE`.
- AMB-11/12 (aturan susulan), AMB-20 (akses foto admin), AMB-14 (impor),
  AMB-18 (retensi), AMB-25 (notifikasi) → belum diimplementasikan; jangan mengarang.
- Konversi persetujuan susulan menjadi baris absensi → butuh keputusan aturan.
- FD-09: `API_BASE_URL` terisi tetapi tes mensyaratkan kosong → keputusan pengguna.
- Koordinat kantor (AMB-07) → memblokir validasi GPS WFO (PHASE 3).
- Jangan mulai PHASE 5 tanpa instruksi.

## Format Laporan Phase
Lihat bagian 14 master prompt: PHASE, STATUS, PERUBAHAN, VALIDASI, KEAMANAN,
KEPUTUSAN YANG DIBUTUHKAN, LANGKAH BERIKUTNYA.
