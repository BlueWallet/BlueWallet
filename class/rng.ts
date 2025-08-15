/**
 * @fileOverview creates an rng module that will bring all calls to 'crypto'
 * into one place to try and prevent mistakes when touching the crypto code.
 */

import crypto from 'crypto';
// uses `crypto` module under nodejs/cli and shim under RN
// check out 'react-native-crypto' in package.json

/**
 * Generate cryptographically secure random bytes using native api.
 * @param  {number}   size      The number of bytes of randomness
 * @return {Promise.<Buffer>}   The random bytes
 */
export async function randomBytes(size: number): Promise<Buffer> {
  const g: any = globalThis as any;
  const webCrypto = g && g.crypto && (g.crypto.getRandomValues ? g.crypto : g.crypto.webcrypto);
  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(size);
    webCrypto.getRandomValues(bytes);
    return Buffer.from(bytes);
  }
  return new Promise((resolve, reject) => {
    crypto.randomBytes(size, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
