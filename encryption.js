let CryptoJS = require('crypto-js');

module.exports.encrypt = function(data, password) {
  if (data.length < 10) throw new Error('data length cant be < 10');
  let ciphertext = CryptoJS.AES.encrypt(data, password);
  return ciphertext.toString();
};

module.exports.decrypt = function(data, password) {
  let bytes = CryptoJS.AES.decrypt(data, password);
  let str = false;
  try {
    str = bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {}

  // for some reason, sometimes decrypt would succeed with wrong password and return random couple of characters.
  // at least in nodejs environment. so with this little hack we are not alowing to encrypt data that is shorter than
  // 10 characters, and thus if decrypted data is less than 10 characters we assume that decrypt actually failed.
  if (str.length < 10) return false;

  return str;
};
