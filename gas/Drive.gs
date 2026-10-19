/**
 * Drive.gs — penyimpanan foto absensi di Google Drive privat (PHASE 3).
 *
 * Keputusan (DEC-007):
 * - Struktur: <root>/ABSENSI_KPU/YYYY/MM/Foto_Masuk|Foto_Pulang/.
 * - DRIVE_FOLDER_ID adalah folder ROOT wadah (dibuat operator); sub-folder
 *   ABSENSI_KPU dibuat otomatis oleh backend.
 * - File dibuat privat (akun pengelola); tanpa "anyone with link".
 *
 * Validasi berkas (DEC-P17):
 * - Format yang diterima: JPEG (magic bytes FF D8 FF). Klien selalu mengirim
 *   hasil konversi canvas → JPEG; MIME kiriman klien BUKAN satu-satunya
 *   pemeriksaan — byte aktual diperiksa di sini.
 * - Ukuran maksimum: PHASE3_PHOTO_MAX_BYTES (default 1.000.000 byte).
 *
 * Keterbatasan yang diakui: konversi canvas ke JPEG membuat berkas TIDAK
 * identik byte-per-byte dengan buffer sensor kamera. Tidak ada watermark/
 * teks yang ditambahkan pada piksel.
 */

var DRIVE_ROOT_FOLDER_NAME = 'ABSENSI_KPU';
var PHOTO_MAGIC_JPEG = [0xff, 0xd8, 0xff];
var PHOTO_MIME_ALLOWED = 'image/jpeg';
var PHOTO_EXT = '.jpg';

/**
 * @param {string} base64 teks base64 murni atau data-URL.
 * @return {number[]} byte hasil decode (kosong bila gagal).
 */
function decodePhotoBase64_(base64) {
  var s = String(base64 || '');
  var comma = s.indexOf(',');
  if (s.substring(0, 5) === 'data:' && comma !== -1) {
    s = s.substring(comma + 1);
  }
  s = s.replace(/\s/g, '');
  if (!s) return [];
  try {
    return toUint8_(Utilities.base64Decode(s));
  } catch (err) {
    return [];
  }
}

/**
 * Memeriksa apakah byte adalah JPEG (magic FF D8 FF). Fungsi murni.
 * @param {number[]} bytes
 * @return {boolean}
 */
function hasJpegMagic_(bytes) {
  if (!bytes || bytes.length < 3) return false;
  return (bytes[0] & 0xff) === 0xff &&
    (bytes[1] & 0xff) === 0xd8 &&
    (bytes[2] & 0xff) === 0xff;
}

/**
 * Memvalidasi foto mentah (decode, magic, ukuran). Fungsi murni kecuali decode.
 * @param {string} base64
 * @param {number} maxBytes
 * @return {{ok:boolean, code:(string|null), message:(string|null), bytes:(number[]|null)}}
 */
function validatePhotoBlob_(base64, maxBytes) {
  if (!base64 || typeof base64 !== 'string') {
    return { ok: false, code: 'INVALID_INPUT', message: 'Foto wajib diisi.', bytes: null };
  }
  var bytes = decodePhotoBase64_(base64);
  if (!bytes.length) {
    return { ok: false, code: 'PHOTO_INVALID', message: 'Foto tidak dapat dibaca (base64 tidak valid).', bytes: null };
  }
  if (!hasJpegMagic_(bytes)) {
    return { ok: false, code: 'PHOTO_INVALID', message: 'Format foto tidak didukung (harus JPEG).', bytes: null };
  }
  if (bytes.length > maxBytes) {
    return {
      ok: false, code: 'PHOTO_TOO_LARGE',
      message: 'Ukuran foto melebihi batas ' + maxBytes + ' byte.',
      bytes: null
    };
  }
  return { ok: true, code: null, message: null, bytes: bytes };
}

function getDriveRootFolder_() {
  var id = getServerConfig_().DRIVE_FOLDER_ID;
  if (!id) {
    throw AppError_('NOT_CONFIGURED', 'Folder Drive belum dikonfigurasi (DRIVE_FOLDER_ID).', true);
  }
  return DriveApp.getFolderById(String(id));
}

/**
 * Mengambil sub-folder; membuatnya bila belum ada.
 * @param {GoogleAppsScript.Drive.Folder} parent
 * @param {string} name
 * @return {GoogleAppsScript.Drive.Folder}
 */
function getOrCreateSubfolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

/**
 * Menyimpan foto absensi ke struktur folder privat.
 * @param {{idAbsensi:string, idPegawai:string, tanggal:string,
 *          jenis:string, bytes:number[]}} params
 * @return {{driveFileId:string, path:string, mime:string, ukuran:number}}
 */
function saveAttendancePhoto_(params) {
  var yyyy = params.tanggal.substring(0, 4);
  var mm = params.tanggal.substring(5, 7);
  var jenisFolder = params.jenis === 'masuk' ? 'Foto_Masuk' : 'Foto_Pulang';

  var root = getDriveRootFolder_();
  var folder = getOrCreateSubfolder_(root, DRIVE_ROOT_FOLDER_NAME);
  folder = getOrCreateSubfolder_(folder, yyyy);
  folder = getOrCreateSubfolder_(folder, mm);
  folder = getOrCreateSubfolder_(folder, jenisFolder);

  var fileName = 'absensi_' + params.idPegawai + '_' + params.tanggal +
    '_' + params.jenis + '_' + params.idAbsensi + PHOTO_EXT;
  var blob = Utilities.newBlob(params.bytes, PHOTO_MIME_ALLOWED, fileName);
  var file = folder.createFile(blob);

  // Pertahanan defensif: pastikan file tidak dibagikan publik.
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.NONE);
  } catch (err) {
    // Jika API sharing tidak tersedia, file tetap privat secara default.
    if (typeof Logger !== 'undefined') {
      Logger.log('saveAttendancePhoto_: setSharing dilewati: ' + (err && err.message));
    }
  }

  var path = DRIVE_ROOT_FOLDER_NAME + '/' + yyyy + '/' + mm + '/' + jenisFolder + '/' + fileName;
  return {
    driveFileId: file.getId(),
    path: path,
    mime: PHOTO_MIME_ALLOWED,
    ukuran: params.bytes.length
  };
}

/**
 * Mencoba menghapus file Drive (kompensasi kegagalan parsial). Tidak pernah
 * melempar; hasil dicatat pemanggil.
 * @param {string} fileId
 * @return {boolean} true bila berhasil dihapus
 */
function tryDeleteDriveFile_(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    return true;
  } catch (err) {
    return false;
  }
}
