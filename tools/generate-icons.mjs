/*
 * Generator ikon placeholder — Sistem Absensi KPU Kabupaten Aceh Selatan.
 *
 * Menghasilkan ikon netral (bukan logo resmi) berukuran 192 dan 512 px.
 * Jalankan: node tools/generate-icons.mjs
 *
 * Ikon ini hanya placeholder. Ganti dengan aset resmi setelah diberikan pihak
 * berwenang. Jangan menganggapnya sebagai identitas instansi.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'assets', 'icons');

const BG = [229, 231, 235];   // #E5E7EB netral
const FRAME = [107, 114, 128]; // #6B7280
const PAPER = [255, 255, 255];
const LINE = [156, 163, 175];  // #9CA3AF

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgb) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function makeCanvas(size) {
  return Buffer.alloc(size * size * 3);
}

function fillRect(canvas, size, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const i = (y * size + x) * 3;
      canvas[i] = color[0];
      canvas[i + 1] = color[1];
      canvas[i + 2] = color[2];
    }
  }
}

function drawPlaceholder(size) {
  const canvas = makeCanvas(size);
  fillRect(canvas, size, 0, 0, size, size, BG);

  const u = size / 24; // unit grid
  const pad = Math.round(5 * u);
  const inner = size - pad * 2;
  const border = Math.max(1, Math.round(u / 2));

  // Kerangka "berkas" netral
  fillRect(canvas, size, pad, pad, inner, inner, FRAME);
  fillRect(canvas, size, pad + border, pad + border, inner - border * 2, inner - border * 2, PAPER);

  // Garis-garis netral di dalam
  const lineH = Math.max(1, Math.round(u));
  const lx = pad + Math.round(3 * u);
  const lw = inner - Math.round(6 * u);
  const ys = [pad + Math.round(6 * u), pad + Math.round(9 * u), pad + Math.round(12 * u)];
  ys.forEach((y, idx) => {
    const width = idx === 2 ? Math.round(lw * 0.5) : lw;
    fillRect(canvas, size, lx, y, width, lineH, LINE);
  });

  return canvas;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  [192, 512].forEach((size) => {
    const png = encodePng(size, size, drawPlaceholder(size));
    const file = join(OUT_DIR, `icon-${size}.png`);
    writeFileSync(file, png);
    console.log(`Wrote ${file} (${png.length} bytes)`);
  });
}

main();
