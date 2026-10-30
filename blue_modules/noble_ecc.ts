/**
 * adapted from https://github.com/BitGo/BitGoJS/blob/bitcoinjs_lib_6_sync/modules/utxo-lib/src/noble_ecc.ts
 * license: Apache License
 *
 * @see https://github.com/bitcoinjs/tiny-secp256k1/issues/84#issuecomment-1185682315
 * @see https://github.com/bitcoinjs/bitcoinjs-lib/issues/1781
 */
import * as necc from '@noble/secp256k1';
import { TinySecp256k1Interface as TinySecp256k1InterfaceBIP32 } from 'bip32';
import { XOnlyPointAddTweakResult } from 'bitcoinjs-lib/src/types';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { TinySecp256k1Interface } from 'ecpair';

export interface TinySecp256k1InterfaceExtended {
  pointMultiply(p: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null;

  pointAdd(pA: Uint8Array, pB: Uint8Array, compressed?: boolean): Uint8Array | null;

  isXOnlyPoint(p: Uint8Array): boolean;

  xOnlyPointAddTweak(p: Uint8Array, tweak: Uint8Array): XOnlyPointAddTweakResult | null;

  privateNegate(d: Uint8Array): Uint8Array;

  signDER(h: Uint8Array, d: Uint8Array, e?: Uint8Array): Uint8Array;
}

// @noble/hashes types differ slightly from @noble/secp256k1 v3 hash slot typings.
necc.hashes.sha256 = sha256 as NonNullable<typeof necc.hashes.sha256>;
necc.hashes.hmacSha256 = ((key: Uint8Array, message: Uint8Array) => hmac(sha256, key, message)) as NonNullable<
  typeof necc.hashes.hmacSha256
>;

// Removed from @noble/secp256k1 v1.7; vendored from noble test vectors.
// @see https://github.com/paulmillr/noble-secp256k1/blob/1.7.2/test/index.ts
const { mod, secretKeyToScalar, numberToBytesBE, bytesToNumberBE } = necc.etc;
const CURVE_N = necc.Point.CURVE().n;

function pointFromBytes(p: Uint8Array): necc.Point {
  if (p.length === 32) {
    const prefixed = new Uint8Array(33);
    prefixed[0] = 0x02;
    prefixed.set(p, 1);
    return necc.Point.fromBytes(prefixed);
  }
  return necc.Point.fromBytes(p);
}

// Unlike a private key, a tweak may be zero: 0 <= t < n.
function tweakToScalar(tweak: Uint8Array): bigint {
  const t = bytesToNumberBE(tweak);
  if (tweak.length !== 32 || t >= CURVE_N) throw new Error('Expected Tweak');
  return t;
}

const tweakUtils = {
  privateAdd: (privateKey: Uint8Array, tweak: Uint8Array): Uint8Array | null => {
    const sum = mod(secretKeyToScalar(privateKey) + tweakToScalar(tweak), CURVE_N);
    return sum === 0n ? null : numberToBytesBE(sum);
  },

  privateNegate: (privateKey: Uint8Array): Uint8Array => numberToBytesBE(CURVE_N - secretKeyToScalar(privateKey)),

  pointAddScalar: (p: Uint8Array, tweak: Uint8Array, isCompressed?: boolean): Uint8Array => {
    const P = pointFromBytes(p);
    const t = tweakToScalar(tweak);
    const Q = t === 0n ? P : P.add(necc.Point.BASE.multiply(t));
    if (Q.is0()) throw new Error('Tweaked point at infinity');
    return Q.toBytes(isCompressed);
  },

  pointMultiply: (p: Uint8Array, tweak: Uint8Array, isCompressed?: boolean): Uint8Array => {
    const t = tweakToScalar(tweak);
    if (t === 0n) throw new Error('Point at infinity');
    return pointFromBytes(p).multiply(t).toBytes(isCompressed);
  },
};

const defaultTrue = (param?: boolean): boolean => param !== false;

function compactToDER(sig: Uint8Array): Uint8Array {
  const encodeInt = (bytes: Uint8Array): Uint8Array => {
    let i = 0;
    while (i < bytes.length - 1 && bytes[i] === 0) i++;
    let trimmed = bytes.subarray(i);
    if (trimmed[0] >= 0x80) {
      const prefixed = new Uint8Array(trimmed.length + 1);
      prefixed[0] = 0;
      prefixed.set(trimmed, 1);
      trimmed = prefixed;
    }
    const encoded = new Uint8Array(2 + trimmed.length);
    encoded[0] = 0x02;
    encoded[1] = trimmed.length;
    encoded.set(trimmed, 2);
    return encoded;
  };

  const rDer = encodeInt(sig.subarray(0, 32));
  const sDer = encodeInt(sig.subarray(32, 64));
  const seqLen = rDer.length + sDer.length;
  const der = new Uint8Array(2 + seqLen);
  der[0] = 0x30;
  der[1] = seqLen;
  der.set(rDer, 2);
  der.set(sDer, 2 + rDer.length);
  return der;
}

function throwToNull<Type>(fn: () => Type): Type | null {
  try {
    return fn();
  } catch (e) {
    return null;
  }
}

function isPoint(p: Uint8Array, xOnly: boolean): boolean {
  if ((p.length === 32) !== xOnly) return false;
  try {
    pointFromBytes(p);
    return true;
  } catch (e) {
    return false;
  }
}

const ecc: TinySecp256k1InterfaceExtended & TinySecp256k1Interface & TinySecp256k1InterfaceBIP32 = {
  isPoint: (p: Uint8Array): boolean => isPoint(p, false),
  isPrivate: (d: Uint8Array): boolean => necc.utils.isValidSecretKey(d),
  isXOnlyPoint: (p: Uint8Array): boolean => isPoint(p, true),

  xOnlyPointAddTweak: (p: Uint8Array, tweak: Uint8Array): { parity: 0 | 1; xOnlyPubkey: Uint8Array } | null =>
    throwToNull(() => {
      const P = tweakUtils.pointAddScalar(p, tweak, true);
      const parity = P[0] % 2 === 1 ? 1 : 0;
      return { parity, xOnlyPubkey: P.slice(1) };
    }),

  pointFromScalar: (sk: Uint8Array, compressed?: boolean): Uint8Array | null =>
    throwToNull(() => necc.getPublicKey(sk, defaultTrue(compressed))),

  pointCompress: (p: Uint8Array, compressed?: boolean): Uint8Array => {
    return pointFromBytes(p).toBytes(defaultTrue(compressed));
  },

  pointMultiply: (a: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null =>
    throwToNull(() => tweakUtils.pointMultiply(a, tweak, defaultTrue(compressed))),

  pointAdd: (a: Uint8Array, b: Uint8Array, compressed?: boolean): Uint8Array | null =>
    throwToNull(() => {
      const A = pointFromBytes(a);
      const B = pointFromBytes(b);
      return A.add(B).toBytes(defaultTrue(compressed));
    }),

  pointAddScalar: (p: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null =>
    throwToNull(() => tweakUtils.pointAddScalar(p, tweak, defaultTrue(compressed))),

  privateAdd: (d: Uint8Array, tweak: Uint8Array): Uint8Array | null => throwToNull(() => tweakUtils.privateAdd(d, tweak)),

  privateNegate: (d: Uint8Array): Uint8Array => tweakUtils.privateNegate(d),

  sign: (h: Uint8Array, d: Uint8Array, e?: Uint8Array): Uint8Array => {
    return necc.sign(h, d, { prehash: false, extraEntropy: e });
  },

  signDER: (h: Uint8Array, d: Uint8Array, e?: Uint8Array): Uint8Array => {
    return compactToDER(necc.sign(h, d, { prehash: false, extraEntropy: e }));
  },

  signSchnorr: (h: Uint8Array, d: Uint8Array, e: Uint8Array = new Uint8Array(32).fill(0x00)): Uint8Array => {
    return necc.schnorr.sign(h, d, e);
  },

  verify: (h: Uint8Array, Q: Uint8Array, signature: Uint8Array, strict?: boolean): boolean => {
    return necc.verify(signature, h, Q, { prehash: false, lowS: strict !== false });
  },

  verifySchnorr: (h: Uint8Array, Q: Uint8Array, signature: Uint8Array): boolean => {
    return necc.schnorr.verify(signature, h, Q);
  },
};

export default ecc;
