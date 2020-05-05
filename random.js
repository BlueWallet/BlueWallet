/**
 * @fileOverview wrap a secure native random number generator
 */

import { NativeModules } from 'react-native';

const { RNRandomBytes } = NativeModules;

/**
 * Generate cryptographically secure random bytes using native api.
 * @param  {number} size      The number of bytes of randomness
 * @return {Promise<Buffer>}  The random bytes
 */
export async function randomBytes(size) {
  return new Promise((resolve, reject) => {
    RNRandomBytes.randomBytes(size, (err, bytes) => {
      if (err) {
        reject(err);
      } else {
        resolve(Buffer.from(bytes, 'base64'));
      }
    });
  });
}
