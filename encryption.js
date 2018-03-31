let CryptoJS = require('crypto-js');

module.exports.encrypt = function(data, password) {
  let ciphertext = CryptoJS.AES.encrypt(data, password);
  return ciphertext.toString();
};

module.exports.decrypt = function(data, password) {
  let bytes = CryptoJS.AES.decrypt(data, password);
  let str = false;
  try {
    str = bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {}
  return str;
};
