const CryptoJS = require('crypto-js');

module.exports.encrypt = function(data, password) {
  const ciphertext = CryptoJS.AES.encrypt(data, password);
  return ciphertext.toString();
};

module.exports.decrypt = function(data, password) {
  const bytes = CryptoJS.AES.decrypt(data, password);
  let str = false;
  try {
    str = bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {}
  return str;
};
