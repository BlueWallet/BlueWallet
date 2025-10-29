// BBQR Encoder
import { DEFAULT_QR_VERSION, ENCODING, FILE_TYPE, HEADER, QR_CAPACITIES, SPLIT_MODULO } from './constants';
import type { EncodingType, FileType } from './constants';
import { base32Encode, encodeByType, intToBase36, isPSBT, selectOptimalEncoding } from './utils';

export interface EncodeOptions {
  encoding?: EncodingType;
  fileType?: FileType;
  minVersion?: number;
  maxVersion?: number;
  minSplit?: number;
  maxSplit?: number;
}

export interface SplitStrategy {
  version: number;
  partCount: number;
  charsPerPart: number;
}

export interface EncodeResult {
  parts: string[];
  encoding: EncodingType;
  fileType: FileType;
  version: number;
  partCount: number;
}

/**
 * Auto-detect file type from binary data
 */
export function detectFileType(bytes: Uint8Array, hint?: FileType): FileType {
  if (hint) return hint;

  // Check for PSBT magic bytes
  if (isPSBT(bytes)) {
    return FILE_TYPE.PSBT;
  }

  // Check for Bitcoin transaction (heuristic: starts with version bytes 01000000 or 02000000)
  if (bytes.length >= 4) {
    const version = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
    if (version === 1 || version === 2) {
      // Could be a transaction, but not definitive
      return FILE_TYPE.TRANSACTION;
    }
  }

  // Try to detect JSON
  try {
    const text = new TextDecoder().decode(bytes);
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      JSON.parse(text);
      return FILE_TYPE.JSON;
    }
  } catch {
    // Not JSON
  }

  // Default to binary
  return FILE_TYPE.BINARY;
}

/**
 * Calculate optimal split strategy for encoded data
 */
export function calculateSplitStrategy(
  encodedLength: number,
  encoding: EncodingType,
  options: Required<Omit<EncodeOptions, 'encoding' | 'fileType'>>,
): SplitStrategy {
  const { minVersion, maxVersion, minSplit, maxSplit } = options;
  const splitMod = SPLIT_MODULO[encoding];
  const candidates: SplitStrategy[] = [];

  for (let version = minVersion; version <= maxVersion; version++) {
    const capacity = QR_CAPACITIES[version];
    if (!capacity) continue;

    // Total alphanumeric chars this version can hold
    const totalChars = capacity.alphanumeric;

    // Available for data (after 8-char header)
    const baseCapacity = totalChars - HEADER.LENGTH;

    if (baseCapacity <= 0) continue;

    // Adjust to meet splitMod requirement (all non-final parts must be mod X)
    const adjustedCapacity = baseCapacity - (baseCapacity % splitMod);

    // How many QRs do we need?
    const estimatedCount = Math.ceil(encodedLength / adjustedCapacity);

    if (estimatedCount === 1) {
      // Single QR - use full capacity (no modulo restriction)
      if (baseCapacity >= encodedLength) {
        candidates.push({
          version,
          partCount: 1,
          charsPerPart: encodedLength,
        });
      }
      continue;
    }

    // Multi-part: ensure all but last use adjustedCapacity
    const totalCapacity = (estimatedCount - 1) * adjustedCapacity + baseCapacity;
    const actualCount = totalCapacity >= encodedLength ? estimatedCount : estimatedCount + 1;

    if (actualCount >= minSplit && actualCount <= maxSplit) {
      candidates.push({
        version,
        partCount: actualCount,
        charsPerPart: adjustedCapacity,
      });
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      `Cannot fit data (${encodedLength} chars) within constraints: ` +
        `versions ${minVersion}-${maxVersion}, splits ${minSplit}-${maxSplit}`,
    );
  }

  // Sort: prefer fewer QRs, then lower version (smaller QR codes)
  candidates.sort((a, b) => a.partCount - b.partCount || a.version - b.version);

  return candidates[0];
}

/**
 * Split encoded string into QR code parts with headers
 */
export function splitIntoParts(encoded: string, fileType: FileType, encoding: EncodingType, strategy: SplitStrategy): string[] {
  const { partCount, charsPerPart } = strategy;
  const parts: string[] = [];

  for (let i = 0; i < partCount; i++) {
    const start = i * charsPerPart;
    const end = Math.min(start + charsPerPart, encoded.length);
    const chunk = encoded.slice(start, end);

    // Build 8-character header: B$ + encoding + fileType + totalParts + partIndex
    const header = HEADER.PREFIX + encoding + fileType + intToBase36(partCount, 2) + intToBase36(i, 2);

    parts.push(header + chunk);
  }

  return parts;
}

/**
 * Encode binary data into BBQR format
 *
 * @param data - Binary data to encode (Uint8Array) or hex string
 * @param options - Encoding options
 * @returns Array of QR code strings with BBQR headers
 */
export function encodeBBQR(data: Uint8Array | string, options: EncodeOptions = {}): EncodeResult {
  // Convert input to Uint8Array if needed
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    // Assume hex string if it looks like one
    if (/^[0-9a-fA-F]+$/.test(data) && data.length % 2 === 0) {
      const hexToBytes = (hex: string) => {
        const arr = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
        }
        return arr;
      };
      bytes = hexToBytes(data);
    } else {
      // Treat as UTF-8 text
      bytes = new TextEncoder().encode(data);
    }
  } else {
    bytes = data;
  }

  // Auto-detect file type
  const fileType = detectFileType(bytes, options.fileType);

  // Select optimal encoding (try compression by default)
  const selection = options.encoding
    ? { encoding: options.encoding, data: bytes, alreadyCompressed: false }
    : selectOptimalEncoding(bytes, options.encoding);
  const { encoding, data: processedData, alreadyCompressed } = selection;

  // Encode data
  const encoded =
    encoding === ENCODING.ZLIB && alreadyCompressed ? base32Encode(processedData) : encodeByType(processedData, encoding);

  // Calculate split strategy
  const strategy = calculateSplitStrategy(encoded.length, encoding, {
    minVersion: options.minVersion ?? DEFAULT_QR_VERSION.MIN,
    maxVersion: options.maxVersion ?? DEFAULT_QR_VERSION.MAX,
    minSplit: options.minSplit ?? HEADER.MIN_PARTS,
    maxSplit: options.maxSplit ?? HEADER.MAX_PARTS,
  });

  // Split into parts with headers
  const parts = splitIntoParts(encoded, fileType, encoding, strategy);

  return {
    parts,
    encoding,
    fileType,
    version: strategy.version,
    partCount: strategy.partCount,
  };
}

/**
 * Convenience function: Encode a PSBT
 */
export function encodePSBT(psbt: Uint8Array | string, options: Omit<EncodeOptions, 'fileType'> = {}): EncodeResult {
  return encodeBBQR(psbt, { ...options, fileType: FILE_TYPE.PSBT });
}

/**
 * Convenience function: Encode a transaction
 */
export function encodeTransaction(tx: Uint8Array | string, options: Omit<EncodeOptions, 'fileType'> = {}): EncodeResult {
  return encodeBBQR(tx, { ...options, fileType: FILE_TYPE.TRANSACTION });
}
