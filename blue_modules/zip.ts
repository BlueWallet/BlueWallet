/* eslint-disable no-bitwise -- ZIP headers and CRC-32 require byte-level operations. */
import { deflateRaw, inflateRaw } from './pako';
import { concatUint8Arrays, stringToUint8Array } from './uint8array-extras';

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const UTF8_FLAG = 0x0800;
const DEFLATE_METHOD = 8;
const MAX_ENTRY_COUNT = 10_000;
const MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024;

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index++) {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[index] = value >>> 0;
}

const crc32 = (bytes: Uint8Array): number => {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
};

const uint16 = (bytes: Uint8Array, offset: number): number => bytes[offset] | (bytes[offset + 1] << 8);
const uint32 = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;

const setUint16 = (bytes: Uint8Array, offset: number, value: number): void => {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
};

const setUint32 = (bytes: Uint8Array, offset: number, value: number): void => {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
};

export const createZip = (files: Record<string, Uint8Array>): Uint8Array => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const [name, contents] of Object.entries(files)) {
    const nameBytes = stringToUint8Array(name);
    const compressed = deflateRaw(contents, { level: 6 }) as Uint8Array;
    const checksum = crc32(contents);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    setUint32(localHeader, 0, LOCAL_FILE_HEADER);
    setUint16(localHeader, 4, 20);
    setUint16(localHeader, 6, UTF8_FLAG);
    setUint16(localHeader, 8, DEFLATE_METHOD);
    setUint32(localHeader, 14, checksum);
    setUint32(localHeader, 18, compressed.length);
    setUint32(localHeader, 22, contents.length);
    setUint16(localHeader, 26, nameBytes.length);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, compressed);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    setUint32(centralHeader, 0, CENTRAL_DIRECTORY_HEADER);
    setUint16(centralHeader, 4, 20);
    setUint16(centralHeader, 6, 20);
    setUint16(centralHeader, 8, UTF8_FLAG);
    setUint16(centralHeader, 10, DEFLATE_METHOD);
    setUint32(centralHeader, 16, checksum);
    setUint32(centralHeader, 20, compressed.length);
    setUint32(centralHeader, 24, contents.length);
    setUint16(centralHeader, 28, nameBytes.length);
    setUint32(centralHeader, 42, localOffset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    localOffset += localHeader.length + compressed.length;
  }

  if (centralParts.length > 0xffff) throw new Error('ZIP archive has too many files');
  const centralDirectory = concatUint8Arrays(centralParts);
  const end = new Uint8Array(22);
  setUint32(end, 0, END_OF_CENTRAL_DIRECTORY);
  setUint16(end, 8, centralParts.length);
  setUint16(end, 10, centralParts.length);
  setUint32(end, 12, centralDirectory.length);
  setUint32(end, 16, localOffset);
  return concatUint8Arrays([...localParts, centralDirectory, end]);
};

const findEndOfCentralDirectory = (archive: Uint8Array): number => {
  const minimumOffset = Math.max(0, archive.length - 65_557);
  for (let offset = archive.length - 22; offset >= minimumOffset; offset--) {
    if (uint32(archive, offset) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new Error('Invalid ZIP archive');
};

export const readZip = (archive: Uint8Array): Record<string, Uint8Array> => {
  const endOffset = findEndOfCentralDirectory(archive);
  const entryCount = uint16(archive, endOffset + 10);
  const centralOffset = uint32(archive, endOffset + 16);
  if (entryCount > MAX_ENTRY_COUNT || centralOffset >= archive.length) throw new Error('Unsupported ZIP archive');

  const decoder = new TextDecoder('utf-8');
  const files: Record<string, Uint8Array> = {};
  let totalUncompressedSize = 0;
  let offset = centralOffset;

  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > archive.length || uint32(archive, offset) !== CENTRAL_DIRECTORY_HEADER) throw new Error('Invalid ZIP directory');
    const flags = uint16(archive, offset + 8);
    const method = uint16(archive, offset + 10);
    const checksum = uint32(archive, offset + 16);
    const compressedSize = uint32(archive, offset + 20);
    const uncompressedSize = uint32(archive, offset + 24);
    const nameLength = uint16(archive, offset + 28);
    const extraLength = uint16(archive, offset + 30);
    const commentLength = uint16(archive, offset + 32);
    const localHeaderOffset = uint32(archive, offset + 42);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if (nextOffset > archive.length || flags & 1) throw new Error('Encrypted or invalid ZIP archive');
    const name = decoder.decode(archive.slice(offset + 46, offset + 46 + nameLength));

    if (localHeaderOffset + 30 > archive.length || uint32(archive, localHeaderOffset) !== LOCAL_FILE_HEADER) {
      throw new Error('Invalid ZIP file header');
    }
    const localNameLength = uint16(archive, localHeaderOffset + 26);
    const localExtraLength = uint16(archive, localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > archive.length) throw new Error('Invalid ZIP file data');
    const compressed = archive.slice(dataOffset, dataOffset + compressedSize);
    const contents = method === 0 ? compressed : method === DEFLATE_METHOD ? (inflateRaw(compressed) as Uint8Array) : undefined;
    if (!contents || contents.length !== uncompressedSize || crc32(contents) !== checksum) throw new Error('Invalid ZIP entry');
    totalUncompressedSize += contents.length;
    if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE) throw new Error('ZIP archive is too large');
    files[name] = contents;
    offset = nextOffset;
  }

  return files;
};
