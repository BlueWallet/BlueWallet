/**
 * @fileOverview creates an rng module that will bring all calls to 'crypto'
 * into one place to try and prevent mistakes when touching the crypto code.
 */

import { base64 } from '@scure/base';
import { NativeModules } from 'react-native';

const MAX_BYTES = 65536;

/**
 * Generate cryptographically secure random bytes using native api.
 * Throws instead of falling back to JavaScript randomness when the native
 * bridge is unavailable, including during Chrome remote debugging.
 * @param  {number}   size      The number of bytes of randomness
 * @return {Promise.<Uint8Array>}   The random bytes
 */
export async function randomBytes(size: number): Promise<Uint8Array> {
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES) {
    throw new Error(`randomBytes: invalid size ${size}`);
  }

  const native = NativeModules.RNGetRandomValues;
  if (typeof native?.getRandomBase64 !== 'function') {
    throw new Error('Secure RNG unavailable: RNGetRandomValues is not linked');
  }

  const encoded = native.getRandomBase64(size);
  if (typeof encoded !== 'string') {
    throw new Error('Secure RNG returned a non-string value');
  }

  const bytes = base64.decode(encoded);
  if (bytes.length !== size) {
    throw new Error(`Secure RNG length mismatch: expected ${size}, got ${bytes.length}`);
  }

  return bytes;
}
