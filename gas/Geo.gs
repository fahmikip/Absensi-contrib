/**
 * Geo.gs — validasi GPS & perhitungan jarak (PHASE 3).
 *
 * Keputusan:
 * - GPS WAJIB hanya untuk absensi masuk mode WFO (DEC-004).
 * - Radius maksimum 50 meter (DEC-004). "Tolak jika jarak lebih dari 50 meter"
 *   → jarak tepat 50,0 m DITERIMA (inklusif). Toleransi numerik 1 cm
 *   (GPS_BOUNDARY_EPSILON_M) agar batas tidak terbalik karena galat floating point.
 * - Koordinat kantor dari Script Properties (AMB-07). Selama OFFICE_LATITUDE/
 *   OFFICE_LONGITUDE belum diisi, masuk WFO DITOLAK (fitur tidak aktif untuk
 *   produksi; jangan mengarang koordinat).
 * - Akurasi GPS dicatat bila tersedia; ambang batas akurasi BELUM ditetapkan
 *   (AMB-08) sehingga tidak divalidasi.
 *
 * Keterbatasan yang diakui: GPS browser dapat dipalsukan (spoofing) pada
 * perangkat tertentu. Radius 50 m BUKAN bukti lokasi yang antimanipulasi.
 */

var EARTH_RADIUS_M = 6371000;
var GPS_BOUNDARY_EPSILON_M = 0.01;
var OFFICE_RADIUS_DEFAULT_M = 50;

function toRadians_(deg) {
  return Number(deg) * Math.PI / 180;
}

function isFiniteNumber_(v) {
  if (typeof v !== 'number' && typeof v !== 'string') return false;
  if (typeof v === 'string' && String(v).trim() === '') return false;
  return isFinite(Number(v));
}

function isValidLatitude_(lat) {
  if (!isFiniteNumber_(lat)) return false;
  var n = Number(lat);
  return n >= -90 && n <= 90;
}

function isValidLongitude_(lng) {
  if (!isFiniteNumber_(lng)) return false;
  var n = Number(lng);
  return n >= -180 && n <= 180;
}

/**
 * Jarak lingkaran besar (Haversine) dalam meter. Fungsi murni.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @return {number}
 */
function haversineMeters_(lat1, lng1, lat2, lng2) {
  var dLat = toRadians_(Number(lat2) - Number(lat1));
  var dLng = toRadians_(Number(lng2) - Number(lng1));
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians_(lat1)) * Math.cos(toRadians_(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Membaca konfigurasi kantor dari Script Properties.
 * @return {{lat:number, lng:number, radiusMeters:number}|null null bila belum dikonfigurasi}
 */
function getOfficeLocation_() {
  var cfg = getServerConfig_();
  if (!isOfficeLocationConfigured_()) return null;
  var lat = Number(cfg.OFFICE_LATITUDE);
  var lng = Number(cfg.OFFICE_LONGITUDE);
  if (!isValidLatitude_(lat) || !isValidLongitude_(lng)) return null;
  var r = parseInt(cfg.OFFICE_RADIUS_METERS, 10);
  var radius = (isFinite(r) && r > 0) ? r : OFFICE_RADIUS_DEFAULT_M;
  return { lat: lat, lng: lng, radiusMeters: radius };
}

/**
 * Menilai bukti GPS untuk masuk WFO. Fungsi murni.
 * @param {Object|null} gps {lat, lng, accuracy?} dari klien (TIDAK dipercaya
 *        sebagai bukti lokasi; hanya divalidasi format & rentangnya).
 * @param {{lat:number, lng:number, radiusMeters:number}|null} office
 * @return {{ok:boolean, code:(string|null), message:(string|null),
 *           lat:(number|null), lng:(number|null),
 *           accuracy:(number|null), jarakMeter:(number|null)}}
 */
function evaluateGpsForMasukWfo_(gps, office) {
  if (!office) {
    return {
      ok: false, code: 'OFFICE_NOT_CONFIGURED',
      message: 'Validasi lokasi kantor belum dikonfigurasi. Absensi masuk WFO belum dapat diproses.',
      lat: null, lng: null, accuracy: null, jarakMeter: null
    };
  }
  if (!gps || typeof gps !== 'object') {
    return {
      ok: false, code: 'GPS_REQUIRED',
      message: 'Lokasi GPS wajib untuk absensi masuk WFO.',
      lat: null, lng: null, accuracy: null, jarakMeter: null
    };
  }
  var lat = gps.lat === undefined || gps.lat === null || gps.lat === '' ? NaN : Number(gps.lat);
  var lng = gps.lng === undefined || gps.lng === null || gps.lng === '' ? NaN : Number(gps.lng);
  if (!isValidLatitude_(lat) || !isValidLongitude_(lng)) {
    return {
      ok: false, code: 'GPS_INVALID',
      message: 'Koordinat GPS tidak valid.',
      lat: null, lng: null, accuracy: null, jarakMeter: null
    };
  }
  var accuracy = null;
  if (gps.accuracy !== undefined && gps.accuracy !== null && gps.accuracy !== '') {
    var acc = Number(gps.accuracy);
    if (isFinite(acc) && acc >= 0) accuracy = acc;
  }
  var jarak = haversineMeters_(office.lat, office.lng, lat, lng);
  if (jarak > office.radiusMeters + GPS_BOUNDARY_EPSILON_M) {
    return {
      ok: false, code: 'OUT_OF_RADIUS',
      message: 'Anda berada di luar radius ' + office.radiusMeters + ' meter dari kantor.',
      lat: lat, lng: lng, accuracy: accuracy, jarakMeter: Math.round(jarak * 100) / 100
    };
  }
  return {
    ok: true, code: null, message: null,
    lat: lat, lng: lng, accuracy: accuracy,
    jarakMeter: Math.round(jarak * 100) / 100
  };
}
