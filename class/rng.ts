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
  return new Promise((resolve, reject) => {
    crypto.randomBytes(size, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
