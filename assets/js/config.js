/*
 * Konfigurasi frontend — HANYA BOLEH berisi nilai PUBLIK.
 * Dilarang menaruh PIN, token, kredensial, ID Spreadsheet, atau ID folder Drive
 * di berkas ini. Konfigurasi server berada di Apps Script (Script Properties).
 */
window.APP_CONFIG = Object.freeze({
  APP_NAME: 'Sistem Absensi KPU Kabupaten Aceh Selatan',
  APP_SHORT_NAME: 'Absensi KPU',

  // Sumber tunggal versi aplikasi. Selaraskan dengan CACHE_VERSION di
  // service-worker.js dan catat perubahan di docs/PROGRESS.md.
  VERSION: '0.2.0',

  // URL Web App Apps Script. Dikosongkan sampai deployment dilakukan
  // (lihat AMB-21 & AMB-23 di docs/AMBIGUITIES.md).
  // Contoh format: 'https://script.google.com/macros/s/XXXXXXXX/exec'
  API_BASE_URL: '',

  // Nama aksi health check yang sudah ada di kerangka backend (gas/Code.gs).
  HEALTH_ACTION: 'health'
});
