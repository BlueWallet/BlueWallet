import { md5 } from '@noble/hashes/legacy';
import { concatBytes } from '@noble/hashes/utils';

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
    prev = md5(concatBytes(prev, password, salt));
    const take = Math.min(prev.length, byteLength - written);
    out.set(prev.subarray(0, take), written);
    written += take;
  }
  return out;
}
