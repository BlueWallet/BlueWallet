#!/usr/bin/env node

// Creates a PNG that can be used by the Android Emulator's imagefile camera
// source. Kept dependency-free apart from the QR encoder already used by the
// project so this also works on CI before the emulator is started.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { encodeQR } = require('qr');

const text = process.argv[2];
const output = process.argv[3];

if (!text || !output) {
  console.error('Usage: generate-qr-image.js <text> <output.png>');
  process.exit(1);
}

const bitmap = encodeQR(text, 'raw', { border: 4, scale: 4 });
const width = bitmap[0].length;
const rows = Buffer.concat(
  bitmap.map(row =>
    Buffer.from([0, ...row.map(pixel => (pixel ? 0 : 255))]),
  ),
);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const body = Buffer.concat([typeBuffer, data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, body, checksum]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(width, 0);
header.writeUInt32BE(bitmap.length, 4);
header[8] = 8; // bit depth
header[9] = 0; // grayscale
const png = Buffer.concat([
  Buffer.from('\x89PNG\r\n\x1a\n', 'binary'),
  chunk('IHDR', header),
  chunk('IDAT', zlib.deflateSync(rows)),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, png);
