let CryptoJS = require('crypto-js');

module.exports.encrypt = function(data, password) {
  let ciphertext = CryptoJS.AES.encrypt(data, password);
  return ciphertext.toString();
};

module.exports.decrypt = function(data, password) {
  let bytes = CryptoJS.AES.decrypt(data, password);
  return bytes.toString(CryptoJS.enc.Utf8);
};
