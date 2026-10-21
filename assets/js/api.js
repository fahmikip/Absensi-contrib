/*
 * API klien — Sistem Absensi KPU Kabupaten Aceh Selatan (PHASE 2).
 *
 * Aturan keamanan:
 * - Token sesi disimpan di memori (variabel modul). Bila pengguna mencentang
 *   "Ingat saya" saat login, token JUGA disimpan di localStorage agar sesi
 *   bertahan melewati muat ulang halaman (DEC-P30; mengubah DEC-P09).
 *   Cookie tidak mungkin pada stack ini (Apps Script tidak mendukung cookie).
 * - Token persisten tetap berlaku sampai: logout, server menolak sesi
 *   (kedaluwarsa/dicabut, TTL server 8 jam), atau token lokal rusak.
 * - Permintaan dikirim sebagai POST dengan Content-Type "text/plain" agar
 *   termasuk "simple request" (menghindari preflight CORS di Apps Script).
 * - PIN tidak pernah disimpan; hanya dikirim sekali saat login.
 */
window.AppApi = (function () {
  'use strict';

  var config = window.APP_CONFIG || {};

  // Kunci penyimpanan token persisten (hanya berlaku bila "Ingat saya" aktif).
  var TOKEN_KEY = 'absensi-kpu.token';

  // Token sesi: di memori; disalin ke localStorage bila persist menyala.
  var sessionToken = null;

  function hasBackend() {
    return Boolean(config.API_BASE_URL && config.API_BASE_URL.trim());
  }

  /**
   * Membaca token persisten dari localStorage dengan aman (mode privat/kuota
   * penuh bisa melempar). Mengembalikan null bila tidak ada/tidak dapat dibaca.
   * @return {string|null}
   */
  function readStoredToken() {
    try {
      var v = window.localStorage.getItem(TOKEN_KEY);
      return v ? String(v) : null;
    } catch (err) {
      return null;
    }
  }

  function writeStoredToken(token) {
    try {
      if (token) {
        window.localStorage.setItem(TOKEN_KEY, String(token));
      } else {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    } catch (err) {
      // Gagal menyimpan → sesi tetap jalan di memori (tidak fatal).
    }
  }

  function hasStoredToken() {
    return Boolean(readStoredToken());
  }

  /**
   * Menyimpan token sesi.
   * @param {string} token
   * @param {boolean} [persist] true → simpan juga ke localStorage ("Ingat saya").
   */
  function setToken(token, persist) {
    sessionToken = token ? String(token) : null;
    if (!sessionToken) {
      writeStoredToken(null);
      return;
    }
    if (persist) {
      writeStoredToken(sessionToken);
    }
  }

  function clearToken() {
    sessionToken = null;
    writeStoredToken(null);
  }

  function getToken() {
    return sessionToken;
  }

  /**
   * Memuat token persisten ke memori (dipanggil saat aplikasi mulai). Tidak
   * melakukan permintaan jaringan; validitas tetap dibuktikan lewat
   * `session.check` oleh pemanggil.
   * @return {string|null}
   */
  function restoreToken() {
    var stored = readStoredToken();
    if (stored) {
      sessionToken = stored;
    }
    return sessionToken;
  }

  function call(action, data) {
    if (!hasBackend()) {
      return Promise.resolve({
        ok: false,
        error: 'NOT_CONFIGURED',
        message: 'Backend belum dikonfigurasi.'
      });
    }

    var body = { action: action, data: data || {} };
    if (sessionToken) {
      body.token = sessionToken;
    }

    return fetch(config.API_BASE_URL, {
      method: 'POST',
      cache: 'no-store',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () {
        throw new Error('Respons backend tidak valid.');
      });
    });
  }

  return {
    hasBackend: hasBackend,
    setToken: setToken,
    clearToken: clearToken,
    getToken: getToken,
    restoreToken: restoreToken,
    hasStoredToken: hasStoredToken,
    call: call
  };
})();
