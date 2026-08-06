import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xFFFFFFFF;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
};

const chunk = (type, data) => {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
};

const png = (width, height, paint) => {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = paint(x, y, width, height);
      const offset = row + 1 + x * 4;
      raw[offset] = r; raw[offset + 1] = g; raw[offset + 2] = b; raw[offset + 3] = a;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const mix = (a, b, t) => Math.round(a + (b - a) * Math.max(0, Math.min(1, t)));
const circle = (x, y, cx, cy, radius) => Math.hypot(x - cx, y - cy) <= radius;

const brandPaint = (transparent = false) => (x, y, width, height) => {
  const nx = x / width;
  const ny = y / height;
  const bg = [mix(2, 17, ny), mix(3, 19, ny), mix(26, 69, ny), transparent ? 0 : 255];
  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(width, height);
  const glow = Math.hypot(x - cx, y - cy) / (scale * 0.48);
  if (glow < 1) {
    bg[0] = mix(bg[0], 56, 1 - glow);
    bg[1] = mix(bg[1], 56, 1 - glow);
    bg[2] = mix(bg[2], 140, 1 - glow);
    bg[3] = transparent ? Math.round(220 * (1 - glow * 0.45)) : 255;
  }
  const shipY = cy - scale * 0.03;
  const body = Math.abs(x - cx) < scale * 0.09 && y > shipY - scale * 0.22 && y < shipY + scale * 0.2;
  const nose = y <= shipY - scale * 0.04 && Math.abs(x - cx) < (shipY - y + scale * 0.23) * 0.38;
  const wings = y > shipY + scale * 0.01 && y < shipY + scale * 0.17 && Math.abs(x - cx) < scale * 0.22;
  if (body || nose || wings) return [235, 249, 255, 255];
  if (circle(x, y, cx, shipY - scale * 0.03, scale * 0.055)) return [76, 220, 255, 255];
  if (y > shipY + scale * 0.18 && y < shipY + scale * 0.34 && Math.abs(x - cx) < scale * 0.035) return [255, 209, 73, 255];
  const starSeed = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  if (starSeed % 13007 === 0) return [255, 245, 166, 255];
  return bg;
};

const write = (path, width, height, painter) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png(width, height, painter));
};

write('assets/icon.png', 1024, 1024, brandPaint(false));
write('assets/adaptive-icon.png', 1024, 1024, brandPaint(true));
write('assets/splash.png', 1600, 900, brandPaint(false));
console.log('Generated Number Nova production icon, adaptive icon, and landscape splash artwork.');
