/**
 * @fileOverview creates an rng module that will bring all calls to 'crypto'
 * into one place to try and prevent mistakes when touching the crypto code.
 */

// React Native: entropy via global crypto.getRandomValues (polyfilled by react-native-get-random-values)

/**
 * Generate cryptographically secure random bytes using native api.
 * @param  {number}   size      The number of bytes of randomness
 * @return {Promise.<Uint8Array>}   The random bytes
 */
export async function randomBytes(size: number): Promise<Uint8Array> {
  const g: any = globalThis as any;
  const rnCrypto = g && g.crypto;
  if (!rnCrypto || typeof rnCrypto.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues is not available');
  }
  const bytes = new Uint8Array(size);
  rnCrypto.getRandomValues(bytes);
  return bytes;
}
