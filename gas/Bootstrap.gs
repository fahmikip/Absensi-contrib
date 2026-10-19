/**
 * Bootstrap.gs — penyiapan awal (dijalankan MANUAL dari editor Apps Script).
 *
 * Fungsi di file ini TIDAK diekspos sebagai action Web App. Tidak ada default
 * PIN di kode (D4). Kredensial admin awal dibaca dari Script Properties.
 *
 * Keterbatasan yang diakui: fungsi bootstrap hanya mengandalkan izin editor
 * Apps Script (bukan mekanisme aplikasi). Setelah dipakai, HAPUS properti
 * ADMIN_SETUP_* (lihat seedAdmin) agar tidak tersisa sebagai kredensial statis.
 */

/** Membuat semua sheet + header (PHASE 2 & 3) bila belum ada. Jalankan sekali manual. */
function initializeSheets() {
  ensureAllSheets_();
  Logger.log('initializeSheets: sheet siap: ' + ALL_SHEET_NAMES.join(', '));
}

/**
 * Membuat 1 akun admin awal dari Script Properties ADMIN_SETUP_*.
 * Jalankan sekali manual. PIN tidak pernah dicetak ke log.
 */
function seedAdmin() {
  var cfg = getServerConfig_();
  var nip = cfg.ADMIN_SETUP_NIP;
  var pin = cfg.ADMIN_SETUP_PIN;
  if (!nip || !pin) {
    throw AppError_('NOT_CONFIGURED',
      'ADMIN_SETUP_NIP dan ADMIN_SETUP_PIN harus diisi di Script Properties.', true);
  }

  var existingAdmin = null;
  var akunRows = readObjects_('Akun');
  for (var i = 0; i < akunRows.length; i++) {
    if (String(akunRows[i].peran) === 'admin' && isTruthy_(akunRows[i].status_aktif)) {
      existingAdmin = akunRows[i];
      break;
    }
  }
  if (existingAdmin) {
    throw AppError_('ALREADY_EXISTS',
      'Admin aktif sudah ada. seedAdmin ditolak untuk mencegah admin ganda.', true);
  }

  var pegawai = findPegawaiByNip_(nip);
  if (!pegawai) {
    pegawai = {
      id_pegawai: newId_('PEG'),
      nama: cfg.ADMIN_SETUP_NAMA || 'BELUM DITETAPKAN',
      nip_nipk: String(nip).trim(),
      jabatan: 'BELUM DITETAPKAN',
      unit_kerja: 'BELUM DITETAPKAN',
      status_aktif: true,
      dibuat_pada: nowIso_(),
      dibuat_oleh: 'bootstrap',
      diubah_pada: nowIso_(),
      diubah_oleh: 'bootstrap'
    };
    appendObject_('Pegawai', pegawai);
  }

  if (findAkunByPegawaiId_(pegawai.id_pegawai)) {
    throw AppError_('ALREADY_EXISTS', 'Akun untuk NIP admin ini sudah ada.', true);
  }

  var rec = createPinRecord_(pin, pinKdfIterations_());
  var akun = {
    id_akun: newId_('AKN'),
    id_pegawai: pegawai.id_pegawai,
    pin_hash: rec.hash,
    pin_salt: rec.salt,
    pin_algo: rec.algo,
    pin_iterasi: rec.iterations,
    peran: 'admin',
    status_aktif: true,
    gagal_login: 0,
    terkunci_sampai: '',
    diubah_pada: nowIso_(),
    diubah_oleh: 'bootstrap'
  };
  appendObject_('Akun', akun);

  logActivity_('bootstrap_admin_created', akun.id_akun, 'admin', 'akun', akun.id_akun);
  Logger.log('seedAdmin: akun admin dibuat (id_akun=' + akun.id_akun + '). ' +
    'HAPUS ADMIN_SETUP_PIN (dan ADMIN_SETUP_NIP) dari Script Properties sekarang.');
}
