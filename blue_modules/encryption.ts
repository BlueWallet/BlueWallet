// @ts-ignore: Ignore import errors
import CryptoJS from 'crypto-js';

export function encrypt(data: string, password: string): string {
  if (data.length < 10) throw new Error('data length cant be < 10');
  const ciphertext = CryptoJS.AES.encrypt(data, password);
  return ciphertext.toString();
}

export function decrypt(data: string, password: string): string | false {
  const bytes = CryptoJS.AES.decrypt(data, password);
  let str: string | false = false;
  try {
    str = bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {}

  // For some reason, sometimes decrypt would succeed with an incorrect password and return random characters.
  // In this TypeScript version, we are not allowing the encryption of data that is shorter than
  // 10 characters. If the decrypted data is less than 10 characters, we assume that the decrypt actually failed.
  if (str && str.length < 10) return false;

  return str;
}
