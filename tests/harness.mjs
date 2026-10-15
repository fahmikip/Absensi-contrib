/*
 * Harness pengujian Apps Script di Node — PHASE 2.
 *
 * Menyediakan stub untuk Utilities/PropertiesService/SpreadsheetApp/LockService
 * yang cukup untuk menguji primitif kriptografi, lockout, dan alur AuthService
 * secara lokal. Bukan pengganti pengujian di runtime Apps Script nyata.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { createHash, createHmac, randomUUID } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const GAS_FILES = [
  'gas/Config.gs',
  'gas/Auth.gs',
  'gas/Repo.gs',
  'gas/AuthService.gs',
  'gas/Code.gs',
  'gas/Bootstrap.gs'
];

function signed(buf) {
  return Array.from(buf, (b) => (b > 127 ? b - 256 : b));
}

function unsigned(arr) {
  return Array.from(arr, (b) => b & 0xff);
}

function makeSheet(name) {
  const data = [];
  return {
    name,
    getDataRange() {
      return { getValues: () => data.map((r) => r.slice()) };
    },
    getLastRow() {
      return data.length;
    },
    appendRow(row) {
      data.push(row.slice());
    },
    getRange(rowStart, colStart, numRows, numCols) {
      return {
        setValues(values) {
          for (let i = 0; i < numRows; i++) {
            const idx = rowStart - 1 + i;
            if (!data[idx]) data[idx] = [];
            for (let j = 0; j < numCols; j++) {
              data[idx][colStart - 1 + j] = values[i][j];
            }
          }
        }
      };
    }
  };
}

function makeSpreadsheet() {
  const sheets = new Map();
  return {
    getSheetByName: (n) => sheets.get(n) || null,
    insertSheet(n) {
      const s = makeSheet(n);
      sheets.set(n, s);
      return s;
    }
  };
}

/**
 * @param {{props?: Object}} [options]
 * @return {{sandbox:Object, props:Map, spreadsheet:Object, logs:Array}}
 */
export function createEnv(options = {}) {
  const spreadsheet = makeSpreadsheet();
  const props = new Map(Object.entries(options.props || {}));
  const logs = [];

  const sandbox = {
    console,
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      getUuid: () => randomUUID(),
      computeHmacSha256Signature: (value, key) =>
        signed(createHmac('sha256', Buffer.from(unsigned(key)))
          .update(Buffer.from(unsigned(value)))
          .digest()),
      computeDigest: (algo, value) => {
        if (algo !== 'SHA_256') throw new Error('algoritma tidak didukung: ' + algo);
        return signed(createHash('sha256').update(String(value), 'utf8').digest());
      },
      base64Encode: (bytes) => Buffer.from(unsigned(bytes)).toString('base64'),
      base64Decode: (b64) => signed(Buffer.from(b64, 'base64'))
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (props.has(k) ? props.get(k) : null),
        setProperty: (k, v) => props.set(k, v),
        deleteProperty: (k) => props.delete(k)
      })
    },
    SpreadsheetApp: { openById: () => spreadsheet },
    LockService: {
      getScriptLock: () => ({ waitLock() {}, releaseLock() {} })
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({
        _text: String(text),
        setMimeType() { return this; },
        getContent() { return this._text; }
      })
    },
    Logger: { log: (m) => logs.push(String(m)) },
    Session: { getScriptTimeZone: () => 'Asia/Jakarta' }
  };

  createContext(sandbox);
  for (const f of GAS_FILES) {
    runInContext(readFileSync(join(ROOT, f), 'utf8'), sandbox, { filename: f });
  }

  return { sandbox, props, spreadsheet, logs };
}

/** Hmac SHA-256 murni Node untuk menguji PBKDF2 tanpa stub Apps Script. */
export function nodeHmac(key, msg) {
  return Array.from(createHmac('sha256', Buffer.from(unsigned(key)))
    .update(Buffer.from(unsigned(msg)))
    .digest());
}

/** Mengisi Spreadsheet_ID + membuat sheet, lalu menambah 1 pegawai & akun. */
export function seedAccount(sandbox, props, opts) {
  props.set('SPREADSHEET_ID', 'TEST_SS_ID');
  sandbox.initializeSheets();
  const rec = sandbox.createPinRecord_(opts.pin, opts.iterations);
  const pegawai = {
    id_pegawai: opts.idPegawai || 'PEG-TEST-1',
    nama: opts.nama || 'Uji Coba',
    nip_nipk: opts.nip,
    jabatan: 'BELUM DITETAPKAN',
    unit_kerja: 'BELUM DITETAPKAN',
    status_aktif: opts.aktif === undefined ? true : opts.aktif,
    dibuat_pada: sandbox.nowIso_(),
    dibuat_oleh: 'test',
    diubah_pada: sandbox.nowIso_(),
    diubah_oleh: 'test'
  };
  sandbox.appendObject_('Pegawai', pegawai);
  const akun = {
    id_akun: opts.idAkun || 'AKN-TEST-1',
    id_pegawai: pegawai.id_pegawai,
    pin_hash: rec.hash,
    pin_salt: rec.salt,
    pin_algo: rec.algo,
    pin_iterasi: rec.iterations,
    peran: opts.peran || 'pegawai',
    status_aktif: true,
    gagal_login: 0,
    terkunci_sampai: '',
    diubah_pada: sandbox.nowIso_(),
    diubah_oleh: 'test'
  };
  sandbox.appendObject_('Akun', akun);
  return { pegawai, akun };
}
