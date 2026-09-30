/**
 * Rasterizes lucide-style stroke icons to PNG for email (Gmail cannot
 * render SVG CID and lists those files as downloads).
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 72;
const STROKE = 5.25;
const COLOR = [107, 114, 128];
const SCALE = SIZE / 24;

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function distSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-8) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function distCircle(px, py, cx, cy, r) {
  return Math.abs(Math.hypot(px - cx, py - cy) - r);
}

function distFilledCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

function distRoundRect(px, py, x, y, w, h, r) {
  const cx = Math.max(x + r, Math.min(px, x + w - r));
  const cy = Math.max(y + r, Math.min(py, y + h - r));
  const inside = px >= x && px <= x + w && py >= y && py <= y + h;
  if (inside) {
    const dl = px - x;
    const dr = x + w - px;
    const dt = py - y;
    const db = y + h - py;
    let d = Math.min(dl, dr, dt, db);
    const inCornerX = px < x + r || px > x + w - r;
    const inCornerY = py < y + r || py > y + h - r;
    if (inCornerX && inCornerY) {
      const kx = px < x + r ? x + r : x + w - r;
      const ky = py < y + r ? y + r : y + h - r;
      d = r - Math.hypot(px - kx, py - ky);
    }
    return Math.abs(d);
  }
  if (px >= x + r && px <= x + w - r) return Math.min(Math.abs(py - y), Math.abs(py - (y + h)));
  if (py >= y + r && py <= y + h - r) return Math.min(Math.abs(px - x), Math.abs(px - (x + w)));
  const kx = px < x + r ? x + r : x + w - r;
  const ky = py < y + r ? y + r : y + h - r;
  return Math.abs(Math.hypot(px - kx, py - ky) - r);
}

function strokeA(d, width = STROKE) {
  const half = width / 2;
  const aa = 0.85;
  if (d <= half - aa) return 1;
  if (d >= half + aa) return 0;
  return 1 - (d - (half - aa)) / (2 * aa);
}

function fillA(d) {
  const aa = 0.85;
  if (d <= -aa) return 1;
  if (d >= aa) return 0;
  return 1 - (d + aa) / (2 * aa);
}

function paint(minDist) {
  const rgba = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const a = Math.max(0, Math.min(1, minDist(x + 0.5, y + 0.5)));
      const i = (y * SIZE + x) * 4;
      rgba[i] = COLOR[0];
      rgba[i + 1] = COLOR[1];
      rgba[i + 2] = COLOR[2];
      rgba[i + 3] = Math.round(a * 255);
    }
  }
  return encodePng(SIZE, SIZE, rgba);
}

function s(n) {
  return n * SCALE;
}

const icons = {
  calendar: paint((x, y) => {
    let d = distRoundRect(x, y, s(3), s(4), s(18), s(18), s(2));
    d = Math.min(d, distSeg(x, y, s(16), s(2), s(16), s(6)));
    d = Math.min(d, distSeg(x, y, s(8), s(2), s(8), s(6)));
    d = Math.min(d, distSeg(x, y, s(3), s(10), s(21), s(10)));
    return strokeA(d);
  }),
  clock: paint((x, y) => {
    let d = distCircle(x, y, s(12), s(12), s(10));
    d = Math.min(d, distSeg(x, y, s(12), s(6), s(12), s(12)));
    d = Math.min(d, distSeg(x, y, s(12), s(12), s(16), s(14)));
    return strokeA(d);
  }),
  user: paint((x, y) => {
    let d = distCircle(x, y, s(12), s(7), s(4));
    d = Math.min(d, distSeg(x, y, s(20), s(21), s(20), s(19)));
    d = Math.min(d, distSeg(x, y, s(4), s(21), s(4), s(19)));
    d = Math.min(d, distSeg(x, y, s(8), s(15), s(16), s(15)));
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const a0 = t0 * (Math.PI / 2);
      const a1 = t1 * (Math.PI / 2);
      d = Math.min(
        d,
        distSeg(
          x, y,
          s(16) + s(4) * Math.cos(a0),
          s(19) - s(4) * Math.sin(a0),
          s(16) + s(4) * Math.cos(a1),
          s(19) - s(4) * Math.sin(a1),
        ),
        distSeg(
          x, y,
          s(8) - s(4) * Math.sin(a0),
          s(19) - s(4) * Math.cos(a0),
          s(8) - s(4) * Math.sin(a1),
          s(19) - s(4) * Math.cos(a1),
        ),
      );
    }
    return strokeA(d);
  }),
  instagram: paint((x, y) => {
    let d = distRoundRect(x, y, s(2), s(2), s(20), s(20), s(5));
    d = Math.min(d, distCircle(x, y, s(12), s(12), s(4)));
    const dot = fillA(distFilledCircle(x, y, s(17.5), s(6.5), s(1.05)));
    return Math.max(strokeA(d), dot);
  }),
};

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "brand");
mkdirSync(outDir, { recursive: true });
for (const [name, buf] of Object.entries(icons)) {
  const dest = join(outDir, `mail-icon-${name}.png`);
  writeFileSync(dest, buf);
  console.log("wrote", dest, buf.length);
}
