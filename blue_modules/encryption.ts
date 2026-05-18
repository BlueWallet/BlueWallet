import { cbc } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/hashes/utils';

import { areUint8ArraysEqual, base64ToUint8Array, concatUint8Arrays, stringToUint8Array, uint8ArrayToBase64 } from './uint8array-extras';
import { evpBytesToKeyMd5 } from './crypto/evp_bytes_to_key';

// "Salted__" — OpenSSL envelope magic. Hardcoded as bytes so the wire
// format cannot drift through any encoder.
const SALT_MAGIC = new Uint8Array([0x53, 0x61, 0x6c, 0x74, 0x65, 0x64, 0x5f, 0x5f]);
const SALT_LEN = 8;
const KEY_LEN = 32;
const IV_LEN = 16;
const BLOCK_LEN = 16;

/**
 * AES-256-CBC encrypt with the OpenSSL "Salted__" envelope, EVP_BytesToKey-MD5
 * key derivation and PKCS7 padding. Output is base64-encoded.
 *
 * Wire format is bit-identical to CryptoJS@4.x's default
 * `AES.encrypt(data, password).toString()` — we kept the swap-the-library
 * change a drop-in replacement so existing encrypted wallets on user
 * devices remain readable, with no migration step.
 */
export function encrypt(data: string, password: string): string {
  if (data.length < 10) throw new Error('data length cant be < 10');
  const salt = randomBytes(SALT_LEN);
  const kdf = evpBytesToKeyMd5(stringToUint8Array(password), salt, KEY_LEN + IV_LEN);
  const key = kdf.subarray(0, KEY_LEN);
  const iv = kdf.subarray(KEY_LEN);
  const ciphertext = cbc(key, iv).encrypt(stringToUint8Array(data));
  return uint8ArrayToBase64(concatUint8Arrays([SALT_MAGIC, salt, ciphertext]));
}

/**
 * Inverse of `encrypt`. Accepts the legacy CryptoJS wire format and returns
 * the original UTF-8 plaintext. Any error (bad base64, missing magic, wrong
 * password, bad padding) collapses to `false`.
 */
export function decrypt(data: string, password: string): string | false {
  try {
    // crypto-js's base64 decoder ignored whitespace. Some old encrypted-backup
    // export/import flows (manual file paste, clipboard transit, email-based
    // wallet transfer) introduced stray newlines or padding spaces. Strip them
    // before strict base64 decode so legacy backups still open. `\s` does not
    // include `=`, so base64 padding survives.
    const envelope = base64ToUint8Array(data.replace(/\s+/g, ''));
    if (envelope.length < SALT_MAGIC.length + SALT_LEN + BLOCK_LEN) return false;
    if (!areUint8ArraysEqual(envelope.subarray(0, SALT_MAGIC.length), SALT_MAGIC)) return false;
    const salt = envelope.subarray(SALT_MAGIC.length, SALT_MAGIC.length + SALT_LEN);
    const ciphertext = envelope.subarray(SALT_MAGIC.length + SALT_LEN);
    const kdf = evpBytesToKeyMd5(stringToUint8Array(password), salt, KEY_LEN + IV_LEN);
    const key = kdf.subarray(0, KEY_LEN);
    const iv = kdf.subarray(KEY_LEN);
    const plain = cbc(key, iv).decrypt(ciphertext);
    // Strict UTF-8 decode — wrong-password decrypts that happen to survive
    // PKCS7 unpadding overwhelmingly fail here (crypto-js's `enc.Utf8` was
    // strict too; we preserve that gate by using `fatal: true`).
    const str = new TextDecoder('utf-8', { fatal: true }).decode(plain);
    // Belt-and-suspenders: legitimate plaintext is always ≥ 10 chars
    // (enforced by encrypt()), so anything shorter is rejected.
    if (str.length < 10) return false;
    return str;
  } catch (e) {
    return false;
  }
}
