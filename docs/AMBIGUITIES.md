# AMBIGUITIES — Daftar Ketidakpastian & Keputusan yang Belum Ditetapkan

> Status: **PHASE 0 — Audit.** Semua item di bawah **BELUM DITETAPKAN** kecuali
> ditandai lain. Jangan mengarang jawaban. Setiap item harus dijawab pengguna
> sebelum bagian terkait diimplementasikan.

Legenda status: `OPEN` (belum dijawab) · `ANSWERED` (dijawab) · `DEFERRED` (sengaja ditunda).

| ID | Topik | Pertanyaan / Ketidakpastian | Phase terdampak | Status |
|----|-------|-----------------------------|-----------------|--------|
| AMB-01 | Penerbitan PIN awal | Bagaimana PIN awal dibuat & didistribusikan ke pegawai? | 2 | OPEN |
| AMB-02 | Aktivasi & pemulihan akun | Proses aktivasi akun baru & pemulihan bila PIN hilang/lupa? | 2 | OPEN |
| AMB-03 | Format & hash PIN | Panjang/format PIN (angka? 6 digit?) dan algoritma hash yang dipakai di Apps Script? | 2 | OPEN |
| AMB-04 | Anti brute-force | Jumlah percobaan gagal yang diizinkan, durasi lockout, cakupan (per akun/per IP)? | 2 | OPEN |
| AMB-05 | Sesi & token | Mekanisme sesi antar-request (Apps Script tanpa sesi bawaan), tempat penyimpanan token di klien, masa berlaku, cara logout? | 2 | OPEN |
| AMB-06 | Bootstrap admin | Siapa admin pertama dan bagaimana peran admin ditetapkan/diubah dengan aman? | 2 | OPEN |
| AMB-07 | Koordinat kantor | Nilai latitude/longitude titik kantor (dinyatakan belum ditetapkan). Fitur validasi lokasi diblokir sampai ini diisi. | 3 | OPEN |
| AMB-08 | Akurasi GPS | Toleransi `accuracy` GPS; perilaku bila akurasi rendah/tidak pasti; apakah butuh banyak sampel? | 3 | OPEN |
| AMB-09 | Multi-lokasi | Apakah hanya satu titik kantor, atau boleh banyak titik/lokasi? | 3 | OPEN |
| AMB-10 | Hari libur & akhir pekan | Apakah absensi pada hari libur/Sabtu-Minggu diizinkan? Sumber daftar libur (`HariLibur`) & aturannya? | 3 | OPEN |
| AMB-11 | Batas susulan | Batas maksimal tanggal pengajuan susulan (dinyatakan belum ditetapkan). | 4 | OPEN |
| AMB-12 | Bukti susulan | Bukti wajib untuk pengajuan susulan (foto? dokumen? keterangan atasan?) & formatnya? | 4 | OPEN |
| AMB-13 | Field pegawai | Konfirmasi field final `Pegawai` & `Akun` (ID internal, NIP/NIPPPK, jabatan, unit kerja, dll.). | 2 | OPEN |
| AMB-14 | Impor data | Apakah impor CSV/Excel wajib? Format & validasi kolomnya? | 2 | OPEN |
| AMB-15 | Kolom sheet | Kolom final tiap sheet di `DATA_DICTIONARY.md`. | 1 | OPEN |
| AMB-16 | Skema ID | Format ID internal stabil (Pegawai, Absensi, Bukti, Pengajuan). | 1 | OPEN |
| AMB-17 | Format waktu & tanggal | Simpan UTC ISO-8601 atau waktu lokal `Asia/Jakarta`? Batas "tanggal" untuk aturan masuk/pulang. | 1,3 | OPEN |
| AMB-18 | Retensi data | Kebijakan retensi & penghapusan foto/metadata (dinyatakan belum ditetapkan). | 4 | OPEN |
| AMB-19 | Laporan & ekspor | Isi rekap, format ekspor (CSV/PDF), siapa yang boleh mengekspor? | 5 | ANSWERED (DEC-P07: CSV saja, admin; indikator kebijakan tetap BELUM DITETAPKAN) |
| AMB-20 | Akses foto admin | Bagaimana admin melihat foto privat secara aman (tanpa tautan publik)? Ditampilkan inline, unduhan terproteksi? | 4 | OPEN |
| AMB-21 | Visibilitas Web App | Deploy Apps Script sebagai "Execute as: Me" + "Who has access: Anyone" (perlu untuk PWA lintas-origin) atau "Anyone with Google account"? Implikasi CORS & keamanan. | 1 | OPEN |
| AMB-22 | Ukuran & kompresi foto | Batas ukuran/kompresi foto; resolusi; batas payload base64 ke Apps Script; penanganan kegagalan unggah besar. | 3 | OPEN |
| AMB-23 | Konfigurasi resource | Nilai `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, nama/URL repo GitHub, URL deployment Apps Script. | 1 | OPEN (sebagian: URL deployment dijawab DEC-P19; sisanya belum) |
| AMB-24 | Kuota & beban | Strategi menghadapi kuota Apps Script (waktu eksekusi 6 menit, trigger, limit harian) saat ramai. | 6 | OPEN |
| AMB-25 | Notifikasi | Apakah diperlukan notifikasi (mis. ke admin saat ada pengajuan susulan)? (belum disebut sebagai kebutuhan). | 4 | OPEN |
| AMB-26 | Akun nonaktif | Perilaku saat pegawai nonaktif mencoba login (pesan, penanganan riwayat). | 2 | OPEN |
| AMB-27 | Mode kerja harian | Apakah ada validasi bahwa mode WFH/WFA sesuai kebijakan kantor, atau sepenuhnya mandiri tanpa validasi? | 3 | OPEN |
| AMB-28 | Jam khusus | Apakah ada jam masuk/pulang berbeda untuk hari tertentu (mis. Jumat) atau untuk admin? | 3 | OPEN |
| AMB-29 | Data uji | Di mana & bagaimana data sintetis `TEST` disimpan agar terpisah dari produksi (spreadsheet terpisah? flag?) | 1,6 | OPEN |
| AMB-30 | Pemulihan bencana | Prosedur backup/restore Sheets & Drive; RPO/RTO; kepemilikan akun Google. | 6 | OPEN |

## Ringkasan Blocker Kritis (menghambat implementasi)
1. **AMB-07 (koordinat kantor)** — memblokir seluruh validasi GPS WFO masuk (PHASE 3).
2. **AMB-21 (visibilitas Web App + CORS)** — menentukan bentuk autentikasi/token dan seluruh komunikasi frontend↔backend (PHASE 1–2).
3. **AMB-03/AMB-04/AMB-05 (PIN, lockout, sesi)** — memblokir PHASE 2.
4. **AMB-15/AMB-16/AMB-17 (skema data & format waktu)** — memblokir PHASE 1.
