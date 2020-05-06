/**
 * @fileOverview wrap a secure native random number generator
 */

const { NativeModules } = require('react-native');
const { RNRandomBytes } = NativeModules;

/**
 * Generate cryptographically secure random bytes using native api.
 * @param  {number} size        The number of bytes of randomness
 * @param  {function} callback  The number of bytes of randomness
 * @return {undefined}
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
