// BBQR Utility Functions
import { base32 } from '@scure/base';
import pako from 'pako';
import { ENCODING } from './constants';
import type { EncodingType } from './constants';

/**
 * Convert bytes to uppercase hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  // Remove any whitespace and convert to uppercase
  const cleanHex = hex.replace(/\s/g, '').toUpperCase();

  if (cleanHex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }

  if (!/^[0-9A-F]*$/.test(cleanHex)) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Encode bytes as Base32 (RFC 4648) without padding
 */
export function base32Encode(bytes: Uint8Array): string {
  const encoded = base32.encode(bytes);
  // Remove padding characters
  return encoded.replace(/[=]*$/, '');
}

/**
 * Decode Base32 string to bytes
 */
export function base32Decode(str: string): Uint8Array {
  // Add padding back if needed
  const padding = (8 - (str.length % 8)) % 8;
  const padded = str + '='.repeat(padding);
  return base32.decode(padded);
}

/**
 * Compress bytes using Zlib with BBQR settings
 * Uses raw deflate (no headers), windowBits=-10, level 9
 */
export function zlibCompress(bytes: Uint8Array): Uint8Array {
  return pako.deflate(bytes, {
    windowBits: -10, // Negative = raw deflate, 10 bits window (1KB)
    level: 9, // Maximum compression
  });
}

/**
 * Decompress Zlib-compressed bytes
 */
export function zlibDecompress(compressed: Uint8Array): Uint8Array {
  return pako.inflate(compressed, {
    windowBits: -10, // Must match compression settings
  });
}

/**
 * Convert integer to base36 string with fixed width
 * @param n - Number to convert (0-1295)
 * @param width - Width of output string (default 2)
 */
export function intToBase36(n: number, width: number = 2): string {
  if (n < 0 || n > 1295) {
    throw new Error(`Number out of range: ${n} (must be 0-1295)`);
  }

  const base36 = n.toString(36).toUpperCase();
  return base36.padStart(width, '0');
}

/**
 * Convert base36 string to integer
 */
export function base36ToInt(str: string): number {
  const value = parseInt(str, 36);
  if (isNaN(value) || value < 0 || value > 1295) {
    throw new Error(`Invalid base36 string: ${str}`);
  }
  return value;
}

/**
 * Detect if data is likely a PSBT
 * PSBTs start with magic bytes: 0x70 0x73 0x62 0x74 0xFF ("psbt" + 0xFF)
 */
export function isPSBT(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  return bytes[0] === 0x70 && bytes[1] === 0x73 && bytes[2] === 0x62 && bytes[3] === 0x74 && bytes[4] === 0xff;
}

/**
 * Detect if hex string is a PSBT
 */
export function isPSBTHex(hex: string): boolean {
  return /^70736274ff/i.test(hex);
}

/**
 * Encode data based on encoding type
 * Returns the encoded string
 */
export function encodeByType(bytes: Uint8Array, encoding: EncodingType): string {
  switch (encoding) {
    case ENCODING.HEX:
      return bytesToHex(bytes);
    case ENCODING.BASE32:
      return base32Encode(bytes);
    case ENCODING.ZLIB: {
      const compressed = zlibCompress(bytes);
      return base32Encode(compressed);
    }
    default:
      throw new Error(`Unknown encoding type: ${encoding}`);
  }
}

/**
 * Decode data based on encoding type
 * Returns the decoded bytes
 */
export function decodeByType(encoded: string, encoding: EncodingType): Uint8Array {
  switch (encoding) {
    case ENCODING.HEX:
      return hexToBytes(encoded);
    case ENCODING.BASE32:
      return base32Decode(encoded);
    case ENCODING.ZLIB: {
      const compressed = base32Decode(encoded);
      return zlibDecompress(compressed);
    }
    default:
      throw new Error(`Unknown encoding type: ${encoding}`);
  }
}

/**
 * Calculate bytes per QR code for a given encoding and character capacity
 */
export function calculateBytesPerQR(charCapacity: number, encoding: EncodingType): number {
  switch (encoding) {
    case ENCODING.HEX:
      return Math.floor(charCapacity / 2); // 2 hex chars per byte
    case ENCODING.BASE32:
    case ENCODING.ZLIB:
      return Math.floor((charCapacity * 5) / 8); // 8 base32 chars per 5 bytes
    default:
      throw new Error(`Unknown encoding type: ${encoding}`);
  }
}

/**
 * Validate that a string contains only alphanumeric QR characters
 */
export function isAlphanumeric(str: string): boolean {
  return /^[0-9A-Z $%*+\-./:]*$/.test(str);
}

/**
 * Check if encoding type is valid
 */
export function isValidEncoding(encoding: string): encoding is EncodingType {
  return encoding === ENCODING.HEX || encoding === ENCODING.BASE32 || encoding === ENCODING.ZLIB;
}

/**
 * Try compression and decide if it's beneficial
 * Returns the encoding type to use and the data
 */
export function selectOptimalEncoding(
  bytes: Uint8Array,
  preferredEncoding?: EncodingType,
): { encoding: EncodingType; data: Uint8Array; alreadyCompressed: boolean } {
  // If hex is explicitly requested, use it
  if (preferredEncoding === ENCODING.HEX) {
    return { encoding: ENCODING.HEX, data: bytes, alreadyCompressed: false };
  }

  // If base32 is explicitly requested, use it
  if (preferredEncoding === ENCODING.BASE32) {
    return { encoding: ENCODING.BASE32, data: bytes, alreadyCompressed: false };
  }

  // Try compression (default behavior)
  const compressed = zlibCompress(bytes);

  // If compression doesn't help (or makes it worse), use Base32
  if (compressed.length >= bytes.length) {
    return { encoding: ENCODING.BASE32, data: bytes, alreadyCompressed: false };
  }

  // Compression helped, use Zlib
  return { encoding: ENCODING.ZLIB, data: compressed, alreadyCompressed: true };
}
