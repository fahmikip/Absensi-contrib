/*
 * Kamera — Sistem Absensi KPU Kabupaten Aceh Selatan (PHASE 3).
 *
 * Tanggung jawab: membuka kamera via getUserMedia, menampilkan pratinjau,
 * mengambil gambar via canvas, mengonversi ke JPEG (DEC-P17: sisi terpanjang
 * maksimum 1280 px, kualitas 0.85, maksimum 1.000.000 byte — batas resmi
 * divalidasi backend), dan menghentikan media stream.
 *
 * Batasan yang diakui (jangan diklaim anti-curang):
 * - Hasil tangkapan dikonversi canvas → JPEG; berkas TIDAK identik byte-per-byte
 *   dengan buffer sensor kamera.
 * - Browser tidak membuktikan gambar berasal dari kamera fisik.
 * - Tidak ada watermark/teks yang digambar ke piksel (metadata dipisah).
 * - Tidak tersedia unggahan galeri pada alur absensi reguler.
 */
window.AppCamera = (function () {
  'use strict';

  var PHOTO_MAX_EDGE = 1280;
  var PHOTO_QUALITY = 0.85;
  var PHOTO_MIME = 'image/jpeg';

  var currentStream = null;

  function isSupported() {
    return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
  }

  function mapGetUserMediaError(err) {
    var name = (err && err.name) || '';
    if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
      return { code: 'CAMERA_DENIED', message: 'Izin kamera ditolak. Absensi reguler memerlukan kamera.' };
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return { code: 'CAMERA_UNAVAILABLE', message: 'Kamera tidak ditemukan pada perangkat ini.' };
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return { code: 'CAMERA_UNAVAILABLE', message: 'Kamera sedang tidak dapat digunakan (dipakai aplikasi lain?).' };
    }
    if (name === 'OverconstrainedError') {
      return { code: 'CAMERA_UNAVAILABLE', message: 'Pengaturan kamera tidak didukung perangkat ini.' };
    }
    return { code: 'CAMERA_ERROR', message: 'Gagal membuka kamera.' };
  }

  /**
   * Membuka kamera depan (facingMode user) & menempelkannya ke elemen video.
   * @param {HTMLVideoElement} videoEl
   * @return {Promise<void>}
   */
  function start(videoEl) {
    if (!isSupported()) {
      return Promise.reject({
        code: 'CAMERA_UNSUPPORTED',
        message: 'Perangkat/browser ini tidak mendukung API kamera.'
      });
    }
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    }).then(function (stream) {
      currentStream = stream;
      videoEl.srcObject = stream;
      return videoEl.play().catch(function () {
        // Autoplay muted video umumnya aman; kegagalan play tetap ditampilkan sebagai live feed.
      });
    }).catch(function (err) {
      throw mapGetUserMediaError(err);
    });
  }

  /** Menghentikan semua track aktif (panggil saat kamera tidak dipakai). */
  function stop() {
    if (currentStream) {
      currentStream.getTracks().forEach(function (track) {
        track.stop();
      });
      currentStream = null;
    }
  }

  function isActive() {
    return !!currentStream;
  }

  function base64ByteLength(base64) {
    var s = String(base64 || '');
    var comma = s.indexOf(',');
    if (s.substring(0, 5) === 'data:' && comma !== -1) {
      s = s.substring(comma + 1);
    }
    s = s.replace(/\s/g, '');
    var padding = 0;
    if (s.slice(-2) === '==') padding = 2;
    else if (s.slice(-1) === '=') padding = 1;
    return Math.max(0, Math.floor(s.length * 3 / 4) - padding);
  }

  function canvasToJpegBlob(canvas) {
    return new Promise(function (resolve, reject) {
      try {
        if (typeof canvas.toBlob === 'function') {
          canvas.toBlob(function (blob) {
            if (!blob) {
              reject({ code: 'CAPTURE_FAILED', message: 'Gagal mengubah hasil tangkapan menjadi JPEG.' });
              return;
            }
            var reader = new FileReader();
            reader.onloadend = function () {
              var dataUrl = String(reader.result || '');
              resolve({
                blob: blob,
                base64: dataUrl.substring(dataUrl.indexOf(',') + 1),
                bytes: blob.size
              });
            };
            reader.onerror = function () {
              reject({ code: 'CAPTURE_FAILED', message: 'Gagal membaca hasil tangkapan.' });
            };
            reader.readAsDataURL(blob);
          }, PHOTO_MIME, PHOTO_QUALITY);
          return;
        }
        // Fallback browser lama tanpa toBlob.
        var dataUrl = canvas.toDataURL(PHOTO_MIME, PHOTO_QUALITY);
        var base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
        resolve({ blob: null, base64: base64, bytes: base64ByteLength(base64) });
      } catch (err) {
        reject({ code: 'CAPTURE_FAILED', message: 'Gagal mengambil foto.' });
      }
    });
  }

  /**
   * Mengambil gambar dari elemen video → JPEG (tanpa watermark/overlay).
   * Sisi terpanjang diskalakan ke <= PHOTO_MAX_EDGE px (kualitas 0.85).
   * @param {HTMLVideoElement} videoEl
   * @param {number} maxBytes batas byte yang ditoleransi frontend (backend tetap otoritatif)
   * @return {Promise<{base64:string, bytes:number, width:number, height:number}>}
   */
  function capture(videoEl, maxBytes) {
    var w = videoEl.videoWidth;
    var h = videoEl.videoHeight;
    if (!w || !h) {
      return Promise.reject({ code: 'CAPTURE_FAILED', message: 'Kamera belum siap. Coba lagi.' });
    }
    var scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(w, h));
    var outW = Math.max(1, Math.round(w * scale));
    var outH = Math.max(1, Math.round(h * scale));

    var canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      return Promise.reject({ code: 'CAPTURE_FAILED', message: 'Canvas tidak tersedia di browser ini.' });
    }
    // Hanya membingkai ulang piksel video; TANPA teks/watermark.
    ctx.drawImage(videoEl, 0, 0, outW, outH);

    return canvasToJpegBlob(canvas).then(function (res) {
      if (maxBytes && res.bytes > maxBytes) {
        throw {
          code: 'PHOTO_TOO_LARGE',
          message: 'Foto hasil tangkapan melebihi batas ukuran. Coba kurangi pencahayaan ruangan atau gunakan perangkat lain.'
        };
      }
      return { base64: res.base64, bytes: res.bytes, width: outW, height: outH };
    });
  }

  return {
    isSupported: isSupported,
    start: start,
    stop: stop,
    isActive: isActive,
    capture: capture,
    base64ByteLength: base64ByteLength,
    PHOTO_MAX_EDGE: PHOTO_MAX_EDGE,
    PHOTO_QUALITY: PHOTO_QUALITY,
    PHOTO_MIME: PHOTO_MIME,
    PHOTO_MAX_BYTES: 1000000
  };
})();
