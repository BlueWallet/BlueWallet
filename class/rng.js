/**
 * @fileOverview creates an rng module that will bring all calls to 'crypto'
 * into one place to try and prevent mistakes when touching the crypto code.
 */

import crypto from 'crypto';

/**
 * Generate cryptographically secure random bytes using native api.
 * @param  {number}   size      The number of bytes of randomness
 * @return {Promise.<Buffer>}   The random bytes
 */
exports.randomBytes = async size =>
  new Promise((resolve, reject) => {
    crypto.randomBytes(size, (err, data) => {
      if (err) return reject(err);
      return resolve(data);
    });
  });
