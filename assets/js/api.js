/*
 * API klien — Sistem Absensi KPU Kabupaten Aceh Selatan (PHASE 2).
 *
 * Aturan keamanan:
 * - Token sesi disimpan HANYA di memori (variabel modul), tidak di
 *   localStorage/sessionStorage/cookie (keputusan D1).
 * - Permintaan dikirim sebagai POST dengan Content-Type "text/plain" agar
 *   termasuk "simple request" (menghindari preflight CORS di Apps Script).
 * - PIN tidak pernah disimpan; hanya dikirim sekali saat login.
 */
window.AppApi = (function () {
  'use strict';

  var config = window.APP_CONFIG || {};

  // Token sesi: hanya di memori. Hilang saat halaman dimuat ulang (harus login lagi).
  var sessionToken = null;

  function hasBackend() {
    return Boolean(config.API_BASE_URL && config.API_BASE_URL.trim());
  }

  function setToken(token) {
    sessionToken = token ? String(token) : null;
  }

  function clearToken() {
    sessionToken = null;
  }

  function getToken() {
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
    call: call
  };
})();
