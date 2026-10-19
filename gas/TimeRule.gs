/**
 * TimeRule.gs — aturan waktu absensi (PHASE 3).
 *
 * Keputusan:
 * - Zona bisnis: Asia/Jakarta (DEC-002).
 * - Masuk reguler: 07:00:00–08:29:59; >= 08:30:00 ditolak (DEC-003).
 * - Pulang reguler: 16:00:00–23:59:59; lintas tanggal ditolak sebagai reguler
 *   (DEC-003). Karena tanggal bisnis dihitung dari waktu server Asia/Jakarta,
 *   percobaan pulang setelah tengah malam otomatis menolak (di luar jendela).
 * - Jendela jam berlaku setiap hari, termasuk akhir pekan/hari libur (DEC-P18;
 *   AMB-10). Tidak ada filter hari pada mesin absensi.
 *
 * Prinsip: keputusan memakai WAKTU SERVER. Fungsi murni (evaluateTimeWindow_)
 * bekerja pada detik-hari yang sudah diekstrak agar dapat diuji tanpa runtime;
 * pembungkus GAS mengekstrak komponen via Utilities.formatDate dengan zona
 * eksplisit (bukan zona default runtime).
 */

var BIZ_TIMEZONE = 'Asia/Jakarta';

var TIME_WINDOWS = Object.freeze({
  masuk: { startSec: 7 * 3600, endSec: 8 * 3600 + 29 * 60 + 59 },       // 25200..30599
  pulang: { startSec: 16 * 3600, endSec: 23 * 3600 + 59 * 60 + 59 }     // 57600..86399
});

var ATTENDANCE_JENIS = Object.freeze(['masuk', 'pulang']);
var ATTENDANCE_MODE = Object.freeze(['WFO', 'WFH_WFA']);

/**
 * Mengubah komponen jam ke detik dalam sehari. Nilai di luar rentang aman
 * menghasilkan null (bukan perbandingan string).
 * @param {number} h 0..23
 * @param {number} m 0..59
 * @param {number} s 0..59
 * @return {number|null}
 */
function hmsToSecondsOfDay_(h, m, s) {
  h = Number(h); m = Number(m); s = Number(s);
  if (!isFinite(h) || !isFinite(m) || !isFinite(s)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return null;
  return h * 3600 + m * 60 + s;
}

/**
 * Mengevaluasi detik-hari terhadap jendela jenis absensi. Fungsi murni.
 * @param {string} jenis 'masuk' | 'pulang'
 * @param {number} secondsOfDay detik dalam sehari (0..86399)
 * @return {{ok:boolean, code:(string|null), message:(string|null)}}
 */
function evaluateTimeWindow_(jenis, secondsOfDay) {
  var win = TIME_WINDOWS[jenis];
  if (!win) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Jenis absensi tidak dikenali.' };
  }
  var sec = Number(secondsOfDay);
  if (!isFinite(sec) || sec < 0 || sec > 86399) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Waktu server tidak valid.' };
  }
  if (sec < win.startSec || sec > win.endSec) {
    if (jenis === 'masuk') {
      return {
        ok: false,
        code: 'TIME_WINDOW',
        message: 'Absensi masuk reguler hanya 07:00.00–08.29.59 WIB.'
      };
    }
    return {
      ok: false,
      code: 'TIME_WINDOW',
      message: 'Absensi pulang reguler hanya 16:00.00–23.59.59 WIB.'
    };
  }
  return { ok: true, code: null, message: null };
}

/**
 * Mengekstrak tanggal bisnis (YYYY-MM-DD) & detik-hari dari waktu server.
 * Zona eksplisit Asia/Jakarta; tidak bergantung pada zona runtime.
 * @param {number} nowMs epoch ms
 * @return {{tanggal:string, detikHari:number}|null}
 */
function civilFromServerMs_(nowMs) {
  var d = new Date(nowMs);
  var tanggal = Utilities.formatDate(d, BIZ_TIMEZONE, 'yyyy-MM-dd');
  var hhmmss = Utilities.formatDate(d, BIZ_TIMEZONE, 'HHmmss');
  if (!tanggal || !hhmmss || hhmmss.length !== 6) return null;
  var detik = hmsToSecondsOfDay_(
    parseInt(hhmmss.substring(0, 2), 10),
    parseInt(hhmmss.substring(2, 4), 10),
    parseInt(hhmmss.substring(4, 6), 10)
  );
  if (detik === null) return null;
  return { tanggal: tanggal, detikHari: detik };
}

/**
 * Evaluasi waktu absensi memakai waktu server sekarang.
 * @param {string} jenis
 * @param {number} nowMs
 * @return {{ok:boolean, code:(string|null), message:(string|null),
 *           tanggal:(string|null), detikHari:(number|null)}}
 */
function evaluateAttendanceTime_(jenis, nowMs) {
  var civil = civilFromServerMs_(nowMs);
  if (!civil) {
    return { ok: false, code: 'INTERNAL_ERROR', message: 'Gagal membaca waktu server.', tanggal: null, detikHari: null };
  }
  var evalRes = evaluateTimeWindow_(jenis, civil.detikHari);
  return {
    ok: evalRes.ok,
    code: evalRes.code,
    message: evalRes.message,
    tanggal: civil.tanggal,
    detikHari: civil.detikHari
  };
}

/**
 * Memvalidasi nilai mode kerja. Fungsi murni.
 * @param {*} mode
 * @return {{ok:boolean, mode:(string|null)}}
 */
function normalizeModeKerja_(mode) {
  var m = mode === null || mode === undefined ? '' : String(mode).trim().toUpperCase();
  return ATTENDANCE_MODE.indexOf(m) !== -1 ? { ok: true, mode: m } : { ok: false, mode: null };
}

/**
 * Memvalidasi nilai jenis absensi. Fungsi murni.
 * @param {*} jenis
 * @return {{ok:boolean, jenis:(string|null)}}
 */
function normalizeJenis_(jenis) {
  var j = jenis === null || jenis === undefined ? '' : String(jenis).trim().toLowerCase();
  return ATTENDANCE_JENIS.indexOf(j) !== -1 ? { ok: true, jenis: j } : { ok: false, jenis: null };
}
