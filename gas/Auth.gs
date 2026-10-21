/**
 * Auth.gs — primitif kriptografi, sesi, dan lockout.
 * Sistem Absensi KPU Kabupaten Aceh Selatan — PHASE 2.
 *
 * Prinsip:
 * - PIN TIDAK PERNAH disimpan sebagai teks biasa; hanya hash PBKDF2 + salt unik.
 * - Token sesi disimpan sebagai HASH; token mentah hanya ada di klien (memori).
 * - Tidak membuat algoritma kriptografi baru; PBKDF2-HMAC-SHA256 adalah
 *   konstruksi standar dan diuji terhadap vektor RFC 7914 §11 (lihat tests/).
 *
 * Keterbatasan terverifikasi (jangan diklaim aman berlebih):
 * - Apps Script tidak punya KDF bawaan (PBKDF2/bcrypt/argon2) → implementasi ini
 *   adalah kode kustom, belum diaudit independen.
 * - Apps Script tidak punya CSPRNG terdokumentasi → token/salt memakai UUID v4.
 * - Jumlah iterasi default WAJIB di-benchmark di lingkungan Apps Script nyata
 *   sebelum produksi (lihat docs/PHASE2_AUDIT.md D2).
 */

var PIN_KDF_ALGO = 'pbkdf2-sha256';
var PIN_KDF_DEFAULT_ITERATIONS = 10000; // sementara; wajib benchmark (D2)
var PIN_KDF_KEY_BYTES = 32;
var PIN_SALT_BYTES = 16;
var PIN_DIGITS = 6; // DEC-P22: PIN tepat 6 digit angka
var PIN_PATTERN = /^[0-9]{6}$/;
var SESSION_TOKEN_UUIDS = 2; // ~244 bit; lihat keterbatasan CSPRNG
var DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
var LOCK_MAX_FAILURES = 5;      // D3
var LOCK_DURATION_MS = 15 * 60 * 1000; // D3

/* ---------------- Byte helpers (pure) ---------------- */

/** @param {(number[]|Uint8Array)} bytes @return {number[]} */
function toUint8_(bytes) {
  var out = new Array(bytes.length);
  for (var i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] & 0xff;
  }
  return out;
}

/** @param {number[]} a @param {number[]} b @return {number[]} */
function concatBytes_(a, b) {
  var out = a.slice();
  for (var i = 0; i < b.length; i++) {
    out.push(b[i] & 0xff);
  }
  return out;
}

/** @param {number} n @return {number[]} 4 byte big-endian */
function intTo4Bytes_(n) {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

/** @param {number[]} bytes @return {string} */
function bytesToHex_(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) {
    var h = (bytes[i] & 0xff).toString(16);
    if (h.length < 2) h = '0' + h;
    s += h;
  }
  return s;
}

/** UTF-8 encoder (pure). @param {string} str @return {number[]} */
function utf8Bytes_(str) {
  str = String(str);
  var bytes = [];
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      var c2 = str.charCodeAt(i + 1);
      if (c2 >= 0xdc00 && c2 <= 0xdfff) {
        var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        bytes.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f)
        );
        i++;
      } else {
        bytes.push(0xef, 0xbf, 0xbd);
      }
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return bytes;
}

/** Perbandingan waktu-tetap untuk string (hash base64). */
function constantTimeEqualStr_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/* ---------------- PBKDF2-HMAC-SHA256 (pure + Apps Script HMAC) ---------------- */

/**
 * PBKDF2 dengan PRF yang disuntikkan (agar dapat diuji). Mengikuti RFC 2898.
 * @param {number[]} passwordBytes
 * @param {number[]} saltBytes
 * @param {number} iterations
 * @param {number} dkLenBytes
 * @param {function(number[], number[]): number[]} hmacFn (key, message)
 * @return {number[]}
 */
function pbkdf2Sha256_(passwordBytes, saltBytes, iterations, dkLenBytes, hmacFn) {
  var hLen = 32; // SHA-256
  var blocks = Math.ceil(dkLenBytes / hLen);
  var dk = [];
  for (var i = 1; i <= blocks; i++) {
    var u = toUint8_(hmacFn(passwordBytes, concatBytes_(saltBytes, intTo4Bytes_(i))));
    var t = u.slice();
    for (var c = 1; c < iterations; c++) {
      u = toUint8_(hmacFn(passwordBytes, u));
      for (var j = 0; j < hLen; j++) {
        t[j] ^= u[j];
      }
    }
    for (var k = 0; k < hLen; k++) {
      dk.push(t[k]);
    }
  }
  return dk.slice(0, dkLenBytes);
}

/** HMAC-SHA256 via Apps Script. @return {number[]} unsigned bytes */
function hmacSha256_(keyBytes, msgBytes) {
  var sig = Utilities.computeHmacSha256Signature(toUint8_(msgBytes), toUint8_(keyBytes));
  return toUint8_(sig);
}

/* ---------------- Base64 / digest (Apps Script) ---------------- */

function bytesToBase64_(bytes) {
  return Utilities.base64Encode(toUint8_(bytes));
}

function base64ToBytes_(b64) {
  return toUint8_(Utilities.base64Decode(b64));
}

function sha256Base64_(str) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(str),
    Utilities.Charset.UTF_8
  );
  return bytesToBase64_(digest);
}

/* ---------------- Random (keterbatasan: pakai UUID v4) ---------------- */

function randomBytes_(n) {
  var out = [];
  while (out.length < n) {
    var hex = Utilities.getUuid().replace(/-/g, '');
    for (var i = 0; i < hex.length && out.length < n; i += 2) {
      out.push(parseInt(hex.substr(i, 2), 16) & 0xff);
    }
  }
  return out;
}

/* ---------------- PIN: create & verify ---------------- */

/**
 * Validasi format PIN (DEC-P22): tepat 6 digit angka.
 * @param {*} pin
 * @return {boolean}
 */
function isValidPin_(pin) {
  return PIN_PATTERN.test(String(pin === null || pin === undefined ? '' : pin));
}

/**
 * @param {string} pin
 * @param {number=} iterations
 * @return {{algo:string, iterations:number, salt:string, hash:string}}
 */
function createPinRecord_(pin, iterations) {
  var it = iterations || PIN_KDF_DEFAULT_ITERATIONS;
  var salt = randomBytes_(PIN_SALT_BYTES);
  var key = pbkdf2Sha256_(utf8Bytes_(String(pin)), salt, it, PIN_KDF_KEY_BYTES, hmacSha256_);
  return {
    algo: PIN_KDF_ALGO,
    iterations: it,
    salt: bytesToBase64_(salt),
    hash: bytesToBase64_(key)
  };
}

/**
 * @param {string} pin
 * @param {{salt:string, hash:string, iterations:number}} record
 * @return {boolean}
 */
function verifyPin_(pin, record) {
  if (!record || !record.salt || !record.hash) return false;
  var it = record.iterations || PIN_KDF_DEFAULT_ITERATIONS;
  var salt = base64ToBytes_(record.salt);
  var derived = bytesToBase64_(
    pbkdf2Sha256_(utf8Bytes_(String(pin)), salt, it, PIN_KDF_KEY_BYTES, hmacSha256_)
  );
  return constantTimeEqualStr_(derived, record.hash);
}

/** Record dummy untuk menyamakan waktu respons saat akun tidak ada. */
function dummyPinRecord_() {
  if (!dummyPinRecord_.cache) {
    dummyPinRecord_.cache = createPinRecord_('dummy-timing-equalizer', PIN_KDF_DEFAULT_ITERATIONS);
  }
  return dummyPinRecord_.cache;
}

/* ---------------- Sesi ---------------- */

/** @return {string} token mentah (hanya dikembalikan ke klien) */
function generateSessionToken_() {
  var parts = [];
  for (var i = 0; i < SESSION_TOKEN_UUIDS; i++) {
    parts.push(Utilities.getUuid().replace(/-/g, ''));
  }
  return parts.join('');
}

/** Hash token untuk disimpan; token mentah tidak pernah disimpan. */
function hashToken_(token) {
  return sha256Base64_(String(token));
}

/**
 * @param {{revokedAtMs:(number|null), expiresAtMs:(number|null)}} session
 * @param {number} nowMs
 * @return {boolean}
 */
function isSessionValid_(session, nowMs) {
  return Boolean(session) &&
    !session.revokedAtMs &&
    session.expiresAtMs !== null &&
    session.expiresAtMs !== undefined &&
    session.expiresAtMs > nowMs;
}

/* ---------------- Lockout (pure) ---------------- */

function isLocked_(lockUntilMs, nowMs) {
  return Boolean(lockUntilMs) && nowMs < lockUntilMs;
}

/**
 * Menghitung status lock berikutnya.
 * @param {number} failedCount
 * @param {(number|null)} lockUntilMs
 * @param {boolean} success
 * @param {number} nowMs
 * @param {{maxFailures:number, lockMs:number}=} policy
 * @return {{failedCount:number, lockUntilMs:(number|null)}}
 */
function nextLockState_(failedCount, lockUntilMs, success, nowMs, policy) {
  var p = policy || { maxFailures: LOCK_MAX_FAILURES, lockMs: LOCK_DURATION_MS };
  if (success) {
    return { failedCount: 0, lockUntilMs: null };
  }
  var count = (failedCount || 0) + 1;
  if (count >= p.maxFailures) {
    return { failedCount: 0, lockUntilMs: nowMs + p.lockMs };
  }
  return { failedCount: count, lockUntilMs: lockUntilMs || null };
}

/* ---------------- Small shared helpers (pure) ---------------- */

function isTruthy_(v) {
  if (v === true) return true;
  if (v === false || v === null || v === undefined || v === '') return false;
  var s = String(v).toLowerCase();
  return s === 'true' || s === '1' || s === 'ya' || s === 'yes';
}

function parseTimeOrNull_(v) {
  if (!v) return null;
  if (v instanceof Date) return v.getTime();
  var t = Date.parse(String(v));
  return isNaN(t) ? null : t;
}
