/**
 * (c) Copyright 2024 by Coinkite Inc. This file is in the public domain.
 *
 * Helper/utility functions.
 */

import { base32 } from '@scure/base';
// @ts-ignore not installing types
import pako from 'pako';
import { QR_DATA_CAPACITY } from './consts';
import type { Encoding, SplitOptions, Version } from './types';

export function hexToBytes(hex: string) {
  // convert a hex string to a Uint8Array

  const match = hex.match(/.{1,2}/g) ?? [];

  return Uint8Array.from(match.map(byte => parseInt(byte, 16)));
}

export function base64ToBytes(base64: string) {
  // convert a base64 string to a Uint8Array

  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

export function intToBase36(n: number) {
  // convert an integer 0-1295 to two digits of base 36 - 00-ZZ

  if (n < 0 || n > 1295 || !Number.isInteger(n)) {
    throw new Error('Out of range');
  }

  return n.toString(36).toUpperCase().padStart(2, '0');
}

export async function fileToBytes(file: File) {
  // read a File's contents and return as a Uint8Array

  const reader = new FileReader();

  return new Promise<Uint8Array>((resolve, reject) => {
    reader.onload = e => {
      const result = e.target?.result;

      if (result instanceof ArrayBuffer) {
        resolve(new Uint8Array(result));
      } else {
        reject(new Error('FileReader result is not an ArrayBuffer'));
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

function joinByteParts(parts: Uint8Array[]) {
  // perf-optimized way to join Uint8Arrays

  const length = parts.reduce((acc, bytes) => acc + bytes.length, 0);

  const rv = new Uint8Array(length);

  let offset = 0;
  for (const bytes of parts) {
    rv.set(bytes, offset);
    offset += bytes.length;
  }

  return rv;
}

export function isValidVersion(v: number): v is Version {
  // act as a TS type guard but also a runtime check

  return v in QR_DATA_CAPACITY;
}

export function isValidSplit(s: number) {
  return s >= 1 && s <= 1295;
}

export function validateSplitOptions(opts: SplitOptions) {
  // ensure all split options are valid, filling in defaults as needed

  const allOpts = {
    minVersion: opts.minVersion ?? 5,
    maxVersion: opts.maxVersion ?? 40,
    minSplit: opts.minSplit ?? 1,
    maxSplit: opts.maxSplit ?? 1295,
    encoding: opts.encoding ?? 'Z',
  } as const;

  if (allOpts.minVersion > allOpts.maxVersion || !isValidVersion(allOpts.minVersion) || !isValidVersion(allOpts.maxVersion)) {
    throw new Error('min/max version out of range');
  }

  if (!isValidSplit(allOpts.minSplit) || !isValidSplit(allOpts.maxSplit) || allOpts.minSplit > allOpts.maxSplit) {
    throw new Error('min/max split out of range');
  }

  return allOpts;
}

export function looksLikePsbt(data: Uint8Array) {
  try {
    // 'psbt' + 0xff
    return new Uint8Array([0x70, 0x73, 0x62, 0x74, 0xff]).every((b, i) => b === data[i]);
  } catch (err) {
    return false;
  }
}

export function shuffled<T>(arr: T[]): T[] {
  // modern Fisher-Yates shuffle (https://en.wikipedia.org/wiki/Fisher–Yates_shuffle#The_modern_algorithm)

  // create a copy so we don't mutate the original
  arr = [...arr];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }

  return arr;
}

export function versionToChars(v: Version) {
  // return number of **chars** that fit into indicated version QR
  // - assumes L for ECC
  // - assumes alnum encoding

  if (!isValidVersion(v)) {
    throw new Error('Invalid version');
  }

  const ecc = 'L';
  const encoding = 2; // alnum

  return QR_DATA_CAPACITY[v][ecc][encoding];
}

export function encodeData(raw: Uint8Array, encoding?: Encoding) {
  // return new encoding (if we upgraded) and the
  // characters after encoding (a string)
  // - default is Zlib or if compression doesn't help, base32
  // - returned data can be split, but must be done modX where X provided

  encoding = encoding ?? 'Z';

  if (encoding === 'H') {
    return {
      encoding,
      encoded: raw.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '').toUpperCase(),
    };
  }

  if (encoding === 'Z') {
    // trial compression, but skip if it embiggens the data

    const compressed = pako.deflate(raw, { windowBits: -10 });

    // @ts-ignore wont install types
    if (compressed.length >= raw.length) {
      encoding = '2';
    } else {
      encoding = 'Z';
      // @ts-ignore wont install types
      raw = compressed;
    }
  }

  return {
    encoding,
    // base32 without padding
    encoded: base32.encode(raw).replace(/[=]*$/, ''),
  };
}

export function decodeData(parts: string[], encoding: Encoding) {
  // decode the parts back into a Uint8Array

  if (encoding === 'H') {
    return joinByteParts(parts.map(p => hexToBytes(p)));
  }

  const bytes = joinByteParts(
    parts.map(p => {
      const padding = (8 - (p.length % 8)) % 8;

      return base32.decode(p + '='.repeat(padding));
    }),
  );

  if (encoding === 'Z') {
    return pako.inflate(bytes, { windowBits: -10 });
  }

  return bytes;
}

// EOF
