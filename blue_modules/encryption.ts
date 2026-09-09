import { gcm, cbc } from '@noble/ciphers/aes';
import { md5 } from '@noble/hashes/legacy';
import { scryptAsync } from '@noble/hashes/scrypt';
import { randomBytes } from '@noble/hashes/utils';

import { areUint8ArraysEqual, base64ToUint8Array, concatUint8Arrays, stringToUint8Array, uint8ArrayToBase64 } from './uint8array-extras';

/**
 * OpenSSL EVP_BytesToKey using MD5 with 1 iteration.
 *
 * Reproduces the default key+IV derivation used by CryptoJS@4.x's
 * `AES.encrypt(string, password)` so the on-disk wire format stays
 * bit-identical after we swap the underlying library.
 *
 *   D1 = MD5( password || salt )
 *   Di = MD5( D(i-1) || password || salt )   for i ≥ 2
 *   key||iv = D1 || D2 || ...                (take first `byteLength` bytes)
 *
 * MD5 is intentional: it matches the legacy OpenSSL format. The
 * cryptographic weakness of MD5 is not relevant here — the function is
 * only used as a deterministic byte-stretcher; the password's entropy is
 * what protects the wallet, not MD5.
 */
export function evpBytesToKeyMd5(password: Uint8Array, salt: Uint8Array, byteLength: number): Uint8Array {
  if (!Number.isInteger(byteLength) || byteLength < 0) {
    throw new Error('evpBytesToKeyMd5: byteLength must be a non-negative integer');
  }
  const out = new Uint8Array(byteLength);
  let written = 0;
  let prev: Uint8Array = new Uint8Array(0);
  while (written < byteLength) {
    prev = md5(concatUint8Arrays([prev, password, salt]));
    const take = Math.min(prev.length, byteLength - written);
    out.set(prev.subarray(0, take), written);
    written += take;
  }
  return out;
}

// =============================================================================
// v2: scrypt + AES-256-GCM. Always emitted by `encrypt`.
// -----------------------------------------------------------------------------
// Wire format: "v2:" + base64( salt(16) || nonce(12) || gcm_ciphertext_and_tag )
// KDF: scrypt N=2^15, r=8, p=1, dkLen=32. Memory-hard, GPU/ASIC-resistant.
// Cipher: AES-256-GCM. AEAD — auth-tag mismatch on wrong password → throw → false.
// =============================================================================
const V2_PREFIX = 'v2:';
const V2_SALT_LEN = 16;
const V2_NONCE_LEN = 12;
const V2_KEY_LEN = 32;
const V2_TAG_LEN = 16;
const V2_SCRYPT_OPTS = { N: 2 ** 15, r: 8, p: 1, dkLen: V2_KEY_LEN, asyncTick: 10 } as const;

async function deriveV2Key(password: string, salt: Uint8Array): Promise<Uint8Array> {
  return scryptAsync(stringToUint8Array(password), salt, V2_SCRYPT_OPTS);
}

async function encryptV2(data: string, password: string): Promise<string> {
  const salt = randomBytes(V2_SALT_LEN);
  const nonce = randomBytes(V2_NONCE_LEN);
  const key = await deriveV2Key(password, salt);
  const ct = gcm(key, nonce).encrypt(stringToUint8Array(data));
  return V2_PREFIX + uint8ArrayToBase64(concatUint8Arrays([salt, nonce, ct]));
}

async function decryptV2(data: string, password: string): Promise<string | false> {
  try {
    const envelope = base64ToUint8Array(data.slice(V2_PREFIX.length).replace(/\s+/g, ''));
    if (envelope.length < V2_SALT_LEN + V2_NONCE_LEN + V2_TAG_LEN) return false;
    const salt = envelope.subarray(0, V2_SALT_LEN);
    const nonce = envelope.subarray(V2_SALT_LEN, V2_SALT_LEN + V2_NONCE_LEN);
    const ct = envelope.subarray(V2_SALT_LEN + V2_NONCE_LEN);
    const key = await deriveV2Key(password, salt);
    const plain = gcm(key, nonce).decrypt(ct); // throws on auth-tag mismatch (wrong password / tampered)
    // Deliberately no `length < 10` belt-and-suspenders here: GCM's auth tag
    // is the wrong-password gate. Any failed decrypt has already thrown
    // above; if we reach this line, `plain` is the genuine plaintext.
    return new TextDecoder('utf-8', { fatal: true }).decode(plain);
  } catch (_) {
    return false;
  }
}

// =============================================================================
// v1: EVP_BytesToKey-MD5 + AES-256-CBC. Read-only — kept for legacy ciphertexts.
// -----------------------------------------------------------------------------
// Wire format: base64( "Salted__"(8) || salt(8) || aes_cbc_pkcs7_ciphertext )
// New encryptions never emit this format. Existing on-device wallets stay
// readable forever; `decryptData` lazily rewrites them as v2 on the first
// successful unlock via `loadFromDisk` (the only opt-in caller).
// =============================================================================
const V1_SALT_MAGIC = new Uint8Array([0x53, 0x61, 0x6c, 0x74, 0x65, 0x64, 0x5f, 0x5f]); // "Salted__"
const V1_SALT_LEN = 8;
const V1_KEY_LEN = 32;
const V1_IV_LEN = 16;
const V1_BLOCK_LEN = 16;

function decryptV1(data: string, password: string): string | false {
  try {
    // crypto-js's base64 decoder ignored whitespace. Some old encrypted-backup
    // export/import flows (manual file paste, clipboard transit, email-based
    // wallet transfer) introduced stray newlines or padding spaces. Strip them
    // before strict base64 decode so legacy backups still open. `\s` does not
    // include `=`, so base64 padding survives.
    const envelope = base64ToUint8Array(data.replace(/\s+/g, ''));
    if (envelope.length < V1_SALT_MAGIC.length + V1_SALT_LEN + V1_BLOCK_LEN) return false;
    if (!areUint8ArraysEqual(envelope.subarray(0, V1_SALT_MAGIC.length), V1_SALT_MAGIC)) return false;
    const salt = envelope.subarray(V1_SALT_MAGIC.length, V1_SALT_MAGIC.length + V1_SALT_LEN);
    const ciphertext = envelope.subarray(V1_SALT_MAGIC.length + V1_SALT_LEN);
    const kdf = evpBytesToKeyMd5(stringToUint8Array(password), salt, V1_KEY_LEN + V1_IV_LEN);
    const key = kdf.subarray(0, V1_KEY_LEN);
    const iv = kdf.subarray(V1_KEY_LEN);
    const plain = cbc(key, iv).decrypt(ciphertext);
    // Strict UTF-8 — wrong-password decrypts that happen to survive PKCS7 unpad
    // overwhelmingly fail here. crypto-js's `enc.Utf8` was strict; we match that
    // gate via `fatal: true`.
    const str = new TextDecoder('utf-8', { fatal: true }).decode(plain);
    // Belt-and-suspenders: legitimate plaintext is always ≥ 10 chars (enforced
    // by encrypt()), so anything shorter is treated as wrong-password garbage.
    if (str.length < 10) return false;
    return str;
  } catch (_) {
    return false;
  }
}

// =============================================================================
// Public API. Always async (scrypt KDF is non-trivial work; `scryptAsync` keeps
// the JS thread responsive by yielding every ~`asyncTick` ms).
// =============================================================================

/**
 * Encrypt `data` under `password` and return a `v2:`-prefixed base64 envelope
 * (scrypt + AES-256-GCM). New writes always use this format; the legacy
 * `Salted__` reader still handles ciphertexts produced by earlier app versions.
 */
export async function encrypt(data: string, password: string): Promise<string> {
  if (data.length < 10) throw new Error('data length cant be < 10');
  return encryptV2(data, password);
}

/**
 * Decrypt either a `v2:` ciphertext (scrypt + GCM) or a legacy `Salted__`
 * envelope (EVP_BytesToKey-MD5 + CBC). Any error (wrong password, tampered
 * bytes, malformed input) collapses to `false`.
 */
export async function decrypt(data: string, password: string): Promise<string | false> {
  if (typeof data !== 'string' || data.length === 0) return false;
  if (data.startsWith(V2_PREFIX)) return decryptV2(data, password);
  return decryptV1(data, password);
}
