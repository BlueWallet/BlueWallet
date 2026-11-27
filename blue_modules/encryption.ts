/**
 * Encryption of the wallet store's buckets (H08). Two formats are read:
 *
 * - CryptoJS (`U2FsdGVkX1…`): AES-256-CBC with a key from one MD5 round
 *   (`EVP_BytesToKey`), no authentication. Every earlier version wrote it, and
 *   a bucket keeps it until its user moves it to the new one.
 * - `nw2:` (argon2id + XChaCha20-Poly1305, libsodium, through the native
 *   module `WalletCrypto`):
 *
 *     nw2:<header>.<body>
 *     header = base64url of {"v":2,"kdf":"argon2id","t":3,"m":65536,"p":1,"salt":…,"nonce":…}
 *     body   = base64url of XChaCha20-Poly1305(key, nonce, plaintext, aad = "nw2:<header>")
 *     key    = argon2id(UTF-8 password, salt, t passes, m KiB, p lanes), 32 bytes
 *
 *   Salt (16 bytes) and nonce (24 bytes) are base64url too. The header is
 *   authenticated as stored, so its parameters cannot be changed without the
 *   tag failing. A failed tag reads as a wrong password.
 *
 * Deriving a key costs about 0.2 s on a recent phone. This module keeps no
 * keys: `openBucket` and `sealBucket` return the key of the bucket they
 * opened or wrote (`BucketKey`), the session that unlocked holds that one
 * key, and passes it back so its saves keep the salt with a new nonce (one
 * derivation per unlock). A wrong password leaves nothing behind.
 */
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

import { randomBytesSync } from '../class/rng';
import NativeWalletCrypto from '../codegen/NativeWalletCrypto';
import { stringToBase64, uint8ArrayToBase64 } from './uint8array-extras';

export type BucketFormat = 'cryptojs' | 'nw2';

const NW2 = 'nw2:';

/** The argon2id cost of new buckets: 64 MiB, 3 passes, 1 lane (about 0.2 s on a Pixel 8 Pro). */
export const NW2_KDF = { t: 3, m: 65536, p: 1 } as const;

/**
 * What a reader accepts. The header is authenticated, but only after the key
 * is derived: these bounds keep a damaged or planted header from making the
 * unlock allocate more than a phone has.
 */
const KDF_BOUNDS = { tMin: 1, tMax: 10, mMin: 19456, mMax: 262144 } as const;

type Nw2Header = { v: 2; kdf: 'argon2id'; t: number; m: number; p: 1; salt: string; nonce: string };

const HEADER_KEYS = ['kdf', 'm', 'nonce', 'p', 'salt', 't', 'v'];
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const SALT = /^[A-Za-z0-9_-]{22}$/;
const NONCE = /^[A-Za-z0-9_-]{32}$/;
/** The shortest body is the 16-byte tag of an empty plaintext. */
const MIN_BODY = 22;

export function bucketFormat(bucket: string): BucketFormat {
  return bucket.startsWith(NW2) ? 'nw2' : 'cryptojs';
}

/** Whether this device can read and write `nw2:` buckets (the native module is built for Android only). */
export function strongEncryptionAvailable(): boolean {
  return NativeWalletCrypto != null;
}

function nativeCrypto() {
  if (!NativeWalletCrypto) throw new Error('strong encryption is not available on this device');
  return NativeWalletCrypto;
}

/** The parts of a `nw2:` bucket, or null when it is not one this version can read. */
function parseNw2(bucket: string): { header: Nw2Header; aad: string; body: string } | null {
  if (!bucket.startsWith(NW2)) return null;
  const dot = bucket.indexOf('.', NW2.length);
  if (dot < 0) return null;
  const headerPart = bucket.slice(NW2.length, dot);
  const body = bucket.slice(dot + 1);
  if (!BASE64URL.test(headerPart) || !BASE64URL.test(body) || body.length < MIN_BODY || body.length % 4 === 1) return null;
  let header: Record<string, unknown>;
  try {
    const json = globalThis.atob(headerPart.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (headerPart.length % 4)) % 4));
    // Written as ASCII JSON; anything else was not written by this format.
    if (/[^\x20-\x7e]/.test(json)) return null;
    header = JSON.parse(json);
  } catch {
    return null;
  }
  if (!header || typeof header !== 'object' || Array.isArray(header)) return null;
  if (Object.keys(header).sort().join() !== HEADER_KEYS.join()) return null;
  const { v, kdf, t, m, p, salt, nonce } = header;
  if (v !== 2 || kdf !== 'argon2id' || p !== 1) return null;
  if (!Number.isInteger(t) || (t as number) < KDF_BOUNDS.tMin || (t as number) > KDF_BOUNDS.tMax) return null;
  if (!Number.isInteger(m) || (m as number) < KDF_BOUNDS.mMin || (m as number) > KDF_BOUNDS.mMax) return null;
  if (typeof salt !== 'string' || !SALT.test(salt) || typeof nonce !== 'string' || !NONCE.test(nonce)) return null;
  return { header: header as Nw2Header, aad: NW2 + headerPart, body };
}

/**
 * The key of one `nw2:` bucket: its salt and cost, and the argon2id output
 * (base64url). As secret as the password; held only by the session that
 * opened or wrote that bucket.
 */
export type BucketKey = { readonly salt: string; readonly t: number; readonly m: number; readonly p: number; readonly key: string };

type Cost = { t: number; m: number; p: number };
const sameCost = (a: Cost, b: Cost) => a.t === b.t && a.m === b.m && a.p === b.p;

function deriveKey(password: string, header: Pick<Nw2Header, 't' | 'm' | 'p' | 'salt'>): BucketKey {
  const key = nativeCrypto().deriveKey(stringToBase64(password, { urlSafe: true }), header.salt, header.t, header.m);
  return { salt: header.salt, t: header.t, m: header.m, p: header.p, key };
}

/** `known` when it is the key for this salt and cost; otherwise one derived from the password. */
function keyFor(password: string, header: Pick<Nw2Header, 't' | 'm' | 'p' | 'salt'>, known?: BucketKey | null): BucketKey {
  return known && known.salt === header.salt && sameCost(known, header) ? known : deriveKey(password, header);
}

function decryptCryptoJs(data: string, password: string): string | false {
  const bytes = AES.decrypt(data, password);
  let str: string | false = false;
  try {
    str = bytes.toString(Utf8);
  } catch (e) {}

  // For some reason, sometimes decrypt would succeed with an incorrect password and return random characters.
  // In this TypeScript version, we are not allowing the encryption of data that is shorter than
  // 10 characters. If the decrypted data is less than 10 characters, we assume that the decrypt actually failed.
  if (str && str.length < 10) return false;

  return str;
}

/**
 * Opens a bucket of either format. For `nw2:`, `key` (the session's) is used
 * when it belongs to that salt and cost, so no derivation is needed; the key
 * that opened it is returned, and nothing is kept when it does not open.
 */
export function openBucket(data: string, password: string, key?: BucketKey | null): { plaintext: string; key: BucketKey | null } | false {
  if (bucketFormat(data) !== 'nw2') {
    const plaintext = decryptCryptoJs(data, password);
    return plaintext ? { plaintext, key: null } : false;
  }
  const parsed = parseNw2(data);
  if (!parsed) return false;
  const used = keyFor(password, parsed.header, key);
  const plaintext = nativeCrypto().open(used.key, parsed.header.nonce, parsed.body, parsed.aad);
  return plaintext === null || plaintext.length < 10 ? false : { plaintext, key: used };
}

/**
 * Seals `data` as a bucket and returns the key it used (null for CryptoJS).
 * @param options.format The format to write (CryptoJS when omitted).
 * @param options.like A stored bucket this one replaces: the same format, and
 *   for `nw2:` the same salt when its cost is today's.
 * @param options.key The session's key of `like`: reused instead of derived.
 */
export function sealBucket(
  data: string,
  password: string,
  options: { format?: BucketFormat; like?: string; key?: BucketKey | null } = {},
): { bucket: string; key: BucketKey | null } {
  if (data.length < 10) throw new Error('data length cant be < 10');
  const format = options.like !== undefined ? bucketFormat(options.like) : (options.format ?? 'cryptojs');
  if (format !== 'nw2') return { bucket: AES.encrypt(data, password).toString(), key: null };
  const previous = options.like !== undefined ? parseNw2(options.like) : null;
  // A bucket written with today's cost keeps its salt (and so its key); one
  // with another cost, or none, gets a new salt with today's cost.
  const keepSalt = previous !== null && sameCost(previous.header, NW2_KDF);
  const salt = keepSalt ? previous.header.salt : uint8ArrayToBase64(randomBytesSync(16), { urlSafe: true });
  const header: Nw2Header = {
    v: 2,
    kdf: 'argon2id',
    t: NW2_KDF.t,
    m: NW2_KDF.m,
    p: NW2_KDF.p,
    salt,
    nonce: uint8ArrayToBase64(randomBytesSync(24), { urlSafe: true }),
  };
  const used = keyFor(password, header, keepSalt ? options.key : null);
  const aad = NW2 + stringToBase64(JSON.stringify(header), { urlSafe: true });
  return { bucket: `${aad}.${nativeCrypto().seal(used.key, header.nonce, data, aad)}`, key: used };
}

/** `sealBucket` without the key. */
export function encrypt(
  data: string,
  password: string,
  options: { format?: BucketFormat; like?: string; key?: BucketKey | null } = {},
): string {
  return sealBucket(data, password, options).bucket;
}

/** `openBucket` without the key. */
export function decrypt(data: string, password: string, key?: BucketKey | null): string | false {
  const opened = openBucket(data, password, key);
  return opened ? opened.plaintext : false;
}
