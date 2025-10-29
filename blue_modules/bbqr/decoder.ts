// BBQR Decoder
import { HEADER } from './constants';
import type { EncodingType, FileType } from './constants';
import { base36ToInt, decodeByType, isValidEncoding } from './utils';

export interface BBQRHeader {
  encoding: EncodingType;
  fileType: FileType;
  partCount: number;
  partIndex: number;
}

export interface DecodeResult {
  raw: Uint8Array;
  encoding: EncodingType;
  fileType: FileType;
  partCount: number;
}

/**
 * Parse BBQR header from a QR code string
 * Header format: B$HPNN0X
 * - B$ = Fixed prefix
 * - H = Encoding (H/2/Z)
 * - P = File type (P/T/J/U/B/X/C)
 * - NN = Total parts (base36, 00-ZZ)
 * - 0X = Part index (base36, 00-ZZ)
 */
export function parseHeader(part: string): BBQRHeader {
  if (part.length < HEADER.LENGTH) {
    throw new Error(`BBQR part too short: ${part.length} < ${HEADER.LENGTH}`);
  }

  // Check fixed prefix
  if (!part.startsWith(HEADER.PREFIX)) {
    throw new Error(`Invalid BBQR prefix: expected "${HEADER.PREFIX}", got "${part.slice(0, 2)}"`);
  }

  // Extract encoding
  const encoding = part[2];
  if (!isValidEncoding(encoding)) {
    throw new Error(`Invalid encoding type: ${encoding}`);
  }

  // Extract file type
  const fileType = part[3] as FileType;
  if (!/^[A-Z]$/.test(fileType)) {
    throw new Error(`Invalid file type: ${fileType}`);
  }

  // Extract part count
  const partCountStr = part.slice(4, 6);
  const partCount = base36ToInt(partCountStr);
  if (partCount < HEADER.MIN_PARTS || partCount > HEADER.MAX_PARTS) {
    throw new Error(`Invalid part count: ${partCount}`);
  }

  // Extract part index
  const partIndexStr = part.slice(6, 8);
  const partIndex = base36ToInt(partIndexStr);
  if (partIndex >= partCount) {
    throw new Error(`Part index ${partIndex} exceeds total ${partCount}`);
  }

  return {
    encoding,
    fileType,
    partCount,
    partIndex,
  };
}

/**
 * Collect and order BBQR parts
 * Parts can be scanned in any order
 */
export function collectParts(parts: string[]): { headers: BBQRHeader[]; orderedData: string[] } {
  if (parts.length === 0) {
    throw new Error('No parts provided');
  }

  // Parse all headers
  const headers = parts.map(parseHeader);

  // Validate consistency
  const first = headers[0];
  for (const header of headers) {
    if (header.encoding !== first.encoding) {
      throw new Error(`Encoding mismatch: ${header.encoding} !== ${first.encoding}`);
    }
    if (header.fileType !== first.fileType) {
      throw new Error(`File type mismatch: ${header.fileType} !== ${first.fileType}`);
    }
    if (header.partCount !== first.partCount) {
      throw new Error(`Part count mismatch: ${header.partCount} !== ${first.partCount}`);
    }
  }

  // Build map of part index -> data
  const dataMap = new Map<number, string>();

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const header = headers[i];

    // Extract data (everything after 8-char header)
    const data = part.slice(HEADER.LENGTH);

    // Check for duplicates
    if (dataMap.has(header.partIndex)) {
      const existing = dataMap.get(header.partIndex)!;
      if (existing !== data) {
        throw new Error(`Duplicate part ${header.partIndex} with different content`);
      }
      // Ignore exact duplicate
      continue;
    }

    dataMap.set(header.partIndex, data);
  }

  // Ensure all parts received
  const orderedData: string[] = [];
  for (let i = 0; i < first.partCount; i++) {
    if (!dataMap.has(i)) {
      throw new Error(`Missing part ${i}`);
    }
    orderedData.push(dataMap.get(i)!);
  }

  return { headers, orderedData };
}

/**
 * Decode BBQR parts into raw binary data
 *
 * @param parts - Array of BBQR part strings (can be in any order)
 * @returns Decoded result with raw bytes and metadata
 */
export function decodeBBQR(parts: string[]): DecodeResult {
  // Collect and order parts
  const { headers, orderedData } = collectParts(parts);

  // Join all data
  const combined = orderedData.join('');

  // Decode based on encoding type
  const raw = decodeByType(combined, headers[0].encoding);

  return {
    raw,
    encoding: headers[0].encoding,
    fileType: headers[0].fileType,
    partCount: headers[0].partCount,
  };
}

/**
 * Streaming BBQR decoder for animated QR codes
 * Accumulates parts as they're scanned
 */
export class BBQRDecoder {
  private parts: Map<number, string> = new Map();
  private _encoding?: EncodingType;
  private _fileType?: FileType;
  private _partCount?: number;

  /**
   * Add a scanned QR code part
   * Returns true if this is a new part (not a duplicate)
   */
  receivePart(part: string): boolean {
    // Parse header
    const header = parseHeader(part);

    // Initialize metadata from first part
    if (this._encoding === undefined) {
      this._encoding = header.encoding;
      this._fileType = header.fileType;
      this._partCount = header.partCount;
    } else {
      // Validate consistency with previous parts
      if (header.encoding !== this._encoding) {
        throw new Error(`Encoding mismatch: ${header.encoding} !== ${this._encoding}`);
      }
      if (header.fileType !== this._fileType) {
        throw new Error(`File type mismatch: ${header.fileType} !== ${this._fileType}`);
      }
      if (header.partCount !== this._partCount) {
        throw new Error(`Part count mismatch: ${header.partCount} !== ${this._partCount}`);
      }
    }

    // Extract data
    const data = part.slice(HEADER.LENGTH);

    // Check if this is a new part
    if (this.parts.has(header.partIndex)) {
      const existing = this.parts.get(header.partIndex)!;
      if (existing !== data) {
        throw new Error(`Duplicate part ${header.partIndex} with different content`);
      }
      return false; // Not new
    }

    // Store part
    this.parts.set(header.partIndex, data);
    return true; // New part
  }

  /**
   * Get number of parts received so far
   */
  get partsReceived(): number {
    return this.parts.size;
  }

  /**
   * Get total number of parts expected
   */
  get partsTotal(): number | undefined {
    return this._partCount;
  }

  /**
   * Get encoding type (available after first part)
   */
  get encoding(): EncodingType | undefined {
    return this._encoding;
  }

  /**
   * Get file type (available after first part)
   */
  get fileType(): FileType | undefined {
    return this._fileType;
  }

  /**
   * Check if all parts have been received
   */
  isComplete(): boolean {
    if (this._partCount === undefined) return false;
    return this.parts.size === this._partCount;
  }

  /**
   * Get progress as a number between 0 and 1
   */
  get progress(): number {
    if (this._partCount === undefined) return 0;
    return this.parts.size / this._partCount;
  }

  /**
   * Get missing part indices
   */
  getMissingParts(): number[] {
    if (this._partCount === undefined) return [];

    const missing: number[] = [];
    for (let i = 0; i < this._partCount; i++) {
      if (!this.parts.has(i)) {
        missing.push(i);
      }
    }
    return missing;
  }

  /**
   * Decode accumulated parts into raw binary data
   * Throws if not all parts have been received
   */
  decode(): DecodeResult {
    if (!this.isComplete()) {
      const missing = this.getMissingParts();
      throw new Error(`Missing parts: ${missing.join(', ')}`);
    }

    // Build ordered array of parts
    const orderedData: string[] = [];
    for (let i = 0; i < this._partCount!; i++) {
      orderedData.push(this.parts.get(i)!);
    }

    // Join and decode
    const combined = orderedData.join('');
    const raw = decodeByType(combined, this._encoding!);

    return {
      raw,
      encoding: this._encoding!,
      fileType: this._fileType!,
      partCount: this._partCount!,
    };
  }

  /**
   * Reset decoder state
   */
  reset(): void {
    this.parts.clear();
    this._encoding = undefined;
    this._fileType = undefined;
    this._partCount = undefined;
  }
}
