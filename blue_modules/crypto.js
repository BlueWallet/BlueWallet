/**
 * @fileOverview wraps a secure native random number generator.
 * This module mimics the node crypto api and is intended to work in RN environment.
 */

const { NativeModules } = require('react-native');
const { RNRandomBytes } = NativeModules;

/**
 * Generate cryptographically secure random bytes using native api.
 * @param  {number}   size      The number of bytes of randomness
 * @param  {function} callback  The callback to return the bytes
 * @return {Buffer}             The random bytes
 */
exports.randomBytes = (size, callback) => {
  RNRandomBytes.randomBytes(size, (err, bytes) => {
    if (err) {
      callback(err);
    } else {
      callback(null, Buffer.from(bytes, 'base64'));
    }
  });
};
