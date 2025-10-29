// BBQR Protocol Constants
// Based on https://bbqr.org specification

/**
 * Encoding types for BBQR
 */
export const ENCODING = {
  HEX: 'H', // Hex encoding (uppercase A-F)
  BASE32: '2', // Base32 (RFC 4648, no padding)
  ZLIB: 'Z', // Zlib compressed then Base32
} as const;

export type EncodingType = (typeof ENCODING)[keyof typeof ENCODING];

/**
 * File types for BBQR
 */
export const FILE_TYPE = {
  PSBT: 'P', // PSBT file
  TRANSACTION: 'T', // Bitcoin transaction
  JSON: 'J', // JSON
  UNICODE: 'U', // Unicode text (UTF-8)
  BINARY: 'B', // Binary data
  EXECUTABLE: 'X', // Executable
  CBOR: 'C', // CBOR
} as const;

export type FileType = (typeof FILE_TYPE)[keyof typeof FILE_TYPE];

/**
 * Split modulo requirements for each encoding type
 * All non-final parts must have length divisible by this value
 */
export const SPLIT_MODULO: Record<EncodingType, number> = {
  [ENCODING.HEX]: 2, // Hex: 2 chars per byte
  [ENCODING.BASE32]: 8, // Base32: 8 chars per 5 bytes
  [ENCODING.ZLIB]: 8, // Zlib uses Base32
};

/**
 * BBQR header constants
 */
export const HEADER = {
  PREFIX: 'B$', // Fixed protocol identifier
  LENGTH: 8, // Total header length
  MAX_PARTS: 1295, // Maximum parts (ZZ in base36)
  MIN_PARTS: 1,
} as const;

/**
 * QR Code capacity table for alphanumeric encoding mode, error correction level L
 * Format: [version, size, alphanumeric_capacity]
 *
 * Key versions:
 * - Version 5: 37x37, 154 chars
 * - Version 11: 61x61, 468 chars
 * - Version 21: 101x101, 1352 chars
 * - Version 27: 125x125, 2132 chars
 * - Version 40: 177x177, 4296 chars
 */
export const QR_CAPACITIES: Record<number, { size: number; alphanumeric: number }> = {
  5: { size: 37, alphanumeric: 154 },
  6: { size: 41, alphanumeric: 195 },
  7: { size: 45, alphanumeric: 224 },
  8: { size: 49, alphanumeric: 279 },
  9: { size: 53, alphanumeric: 335 },
  10: { size: 57, alphanumeric: 395 },
  11: { size: 61, alphanumeric: 468 },
  12: { size: 65, alphanumeric: 535 },
  13: { size: 69, alphanumeric: 619 },
  14: { size: 73, alphanumeric: 667 },
  15: { size: 77, alphanumeric: 758 },
  16: { size: 81, alphanumeric: 854 },
  17: { size: 85, alphanumeric: 938 },
  18: { size: 89, alphanumeric: 1046 },
  19: { size: 93, alphanumeric: 1153 },
  20: { size: 97, alphanumeric: 1249 },
  21: { size: 101, alphanumeric: 1352 },
  22: { size: 105, alphanumeric: 1460 },
  23: { size: 109, alphanumeric: 1588 },
  24: { size: 113, alphanumeric: 1704 },
  25: { size: 117, alphanumeric: 1853 },
  26: { size: 121, alphanumeric: 1990 },
  27: { size: 125, alphanumeric: 2132 },
  28: { size: 129, alphanumeric: 2223 },
  29: { size: 133, alphanumeric: 2369 },
  30: { size: 137, alphanumeric: 2520 },
  31: { size: 141, alphanumeric: 2677 },
  32: { size: 145, alphanumeric: 2840 },
  33: { size: 149, alphanumeric: 3009 },
  34: { size: 153, alphanumeric: 3183 },
  35: { size: 157, alphanumeric: 3351 },
  36: { size: 161, alphanumeric: 3537 },
  37: { size: 165, alphanumeric: 3729 },
  38: { size: 169, alphanumeric: 3927 },
  39: { size: 173, alphanumeric: 4087 },
  40: { size: 177, alphanumeric: 4296 },
};

/**
 * Default QR version range
 */
export const DEFAULT_QR_VERSION = {
  MIN: 5,
  MAX: 40,
} as const;

/**
 * Maximum file sizes by encoding type (using version 40, 1295 parts)
 */
export const MAX_FILE_SIZE = {
  [ENCODING.HEX]: 2_776_480, // 2144 bytes per QR * 1295 parts
  [ENCODING.BASE32]: 3_470_600, // 2680 bytes per QR * 1295 parts
  [ENCODING.ZLIB]: 3_470_600, // Same as Base32 (before decompression)
} as const;

/**
 * Alphanumeric character set for QR codes
 * All BBQR data must use only these characters
 */
export const ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

/**
 * Base36 character set for header encoding
 */
export const BASE36_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
