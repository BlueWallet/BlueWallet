/**
 * Lightweight RNG smoke checks for SelfTest.
 * Not a substitute for NIST/Dieharder — just catches broken/stuck generators.
 */

import { uint8ArrayToHex } from '../blue_modules/uint8array-extras';
import { randomBytes } from './rng';

const SAMPLE_SIZE = 64 * 1024;
const UNIQUENESS_COUNT = 256;

function popcount(byte: number): number {
  return byte.toString(2).split('1').length - 1;
}

/** Pure checks on a byte sample. Exported for unit tests. */
export function assertRngSample(sample: Uint8Array): void {
  if (sample.length === 0) {
    throw new Error('RNG sample is empty');
  }

  let allSame = true;
  for (let i = 1; i < sample.length; i++) {
    if (sample[i] !== sample[0]) {
      allSame = false;
      break;
    }
  }
  if (allSame) {
    throw new Error('RNG produced constant output');
  }

  // Monobit needs enough bits to avoid false positives on tiny samples
  if (sample.length < 1024) {
    return;
  }

  let ones = 0;
  for (let i = 0; i < sample.length; i++) {
    ones += popcount(sample[i]);
  }
  const ratio = ones / (sample.length * 8);
  if (ratio < 0.45 || ratio > 0.55) {
    throw new Error(`RNG monobit failed: ones ratio ${ratio.toFixed(4)}`);
  }
}

export async function runRngSelfTest(): Promise<void> {
  const probe = await randomBytes(32);
  if (probe.length !== 32) {
    throw new Error(`randomBytes(32) returned length ${probe.length}`);
  }
  assertRngSample(probe);

  const sample = await randomBytes(SAMPLE_SIZE);
  if (sample.length !== SAMPLE_SIZE) {
    throw new Error(`randomBytes(${SAMPLE_SIZE}) returned length ${sample.length}`);
  }
  assertRngSample(sample);

  const seen: Record<string, 1> = {};
  for (let i = 0; i < UNIQUENESS_COUNT; i++) {
    const hex = uint8ArrayToHex(await randomBytes(32));
    if (seen[hex]) {
      throw new Error('RNG produced duplicate 32-byte sample');
    }
    seen[hex] = 1;
  }
}
