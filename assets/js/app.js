/*
 * Logika antarmuka fondasi — Sistem Absensi KPU Kabupaten Aceh Selatan
 * PHASE 1. Tidak ada autentikasi, absensi, kamera, atau GPS.
 */
(function () {
  'use strict';

  var config = window.APP_CONFIG || {};

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = text;
    }
  }

  function setDot(id, variant) {
    var el = document.getElementById(id);
    if (el) {
      el.className = 'dot dot--' + variant;
    }
  }

  function renderAppInfo() {
    if (config.APP_NAME) {
      document.title = config.APP_NAME;
      setText('app-name', config.APP_NAME);
    }
    var version = config.VERSION ? 'versi ' + config.VERSION : 'versi -';
    setText('app-version', version);
    setText('version-value', config.VERSION || '-');
  }

  function renderNetworkStatus() {
    var online = navigator.onLine;
    setDot('net-dot', online ? 'online' : 'offline');
    setText('net-status', online ? 'Daring' : 'Luring (offline)');

    if (!online) {
      setText('app-status', 'Luring — tidak dapat masuk atau mengirim absensi');
    } else {
      setText('app-status', 'Daring — silakan masuk dengan NIP/NIPK dan PIN');
    }
  }

  function renderBackendStatus() {
    var isConfigured = Boolean(config.API_BASE_URL && config.API_BASE_URL.trim());
    if (!isConfigured) {
      setDot('backend-dot', 'neutral');
      setText('backend-status', 'BELUM DIKONFIGURASI');
      setText(
        'backend-hint',
        'URL Web App Apps Script belum diisi pada konfigurasi frontend.'
      );
      return;
    }

    // Backend dikonfigurasi. Lakukan health check ringan bila daring.
    setDot('backend-dot', 'neutral');
    setText('backend-status', 'Memeriksa…');

    if (!navigator.onLine) {
      setText('backend-status', 'Tidak dapat diperiksa (luring)');
      return;
    }

    var url = config.API_BASE_URL +
      (config.API_BASE_URL.indexOf('?') === -1 ? '?' : '&') +
      'action=' + encodeURIComponent(config.HEALTH_ACTION || 'health');

    fetch(url, { method: 'GET', cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        if (data && data.ok) {
          setDot('backend-dot', 'online');
          setText('backend-status', 'Terhubung (health check OK)');
        } else {
          setDot('backend-dot', 'offline');
          setText('backend-status', 'Endpoint merespons, tetapi tidak sehat');
        }
      })
      .catch(function () {
        setDot('backend-dot', 'offline');
        setText('backend-status', 'Tidak terhubung');
      });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./service-worker.js').catch(function () {
        // Gagal registrasi SW tidak menghentikan aplikasi; dilaporkan ke konsol.
        if (window.console && window.console.warn) {
          window.console.warn('Registrasi service worker gagal.');
        }
      });
    });
  }

  function bindConnectivityEvents() {
    window.addEventListener('online', renderNetworkStatus);
    window.addEventListener('offline', renderNetworkStatus);
  }

  function init() {
    renderAppInfo();
    renderNetworkStatus();
    renderBackendStatus();
    bindConnectivityEvents();
    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
