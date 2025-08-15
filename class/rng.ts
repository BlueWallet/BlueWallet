/**
 * @fileOverview creates an rng module that will bring all calls to 'crypto'
 * into one place to try and prevent mistakes when touching the crypto code.
 */

import { randomBytes as rnRandomBytes } from 'react-native-randombytes';

/**
 * Generate cryptographically secure random bytes using native api.
 * @param  {number}   size      The number of bytes of randomness
 * @return {Promise.<Buffer>}   The random bytes
 */
export async function randomBytes(size: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    rnRandomBytes(size, (err: Error | null, data: Buffer) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
