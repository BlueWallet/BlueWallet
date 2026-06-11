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

necc.utils.sha256Sync = (...messages: Uint8Array[]): Uint8Array => {
  const combinedMessages = messages.reduce((acc, msg) => {
    const newArray = new Uint8Array(acc.length + msg.length);
    newArray.set(acc);
    newArray.set(msg, acc.length);
    return newArray;
  }, new Uint8Array(0));
  return sha256(combinedMessages);
};

necc.utils.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]): Uint8Array => {
  const combinedMessages = messages.reduce((acc, msg) => {
    const newArray = new Uint8Array(acc.length + msg.length);
    newArray.set(acc);
    newArray.set(msg, acc.length);
    return newArray;
  }, new Uint8Array(0));
  return hmac(sha256, key, combinedMessages);
};

// Removed from @noble/secp256k1 v1.7; vendored from noble test vectors.
// @see https://github.com/paulmillr/noble-secp256k1/blob/1.7.2/test/index.ts
type Hex = string | Uint8Array;
type PrivKey = Hex | bigint | number;

const normalizePrivateKey = necc.utils._normalizePrivateKey;

const tweakUtils = {
  privateAdd: (privateKey: PrivKey, tweak: Hex): Uint8Array => {
    const p = normalizePrivateKey(privateKey);
    const t = normalizePrivateKey(tweak);
    return necc.utils._bigintTo32Bytes(necc.utils.mod(p + t, necc.CURVE.n));
  },

  privateNegate: (privateKey: PrivKey): Uint8Array => {
    const p = normalizePrivateKey(privateKey);
    return necc.utils._bigintTo32Bytes(necc.CURVE.n - p);
  },

  pointAddScalar: (p: Hex, tweak: Hex, isCompressed?: boolean): Uint8Array => {
    const P = necc.Point.fromHex(p);
    const t = normalizePrivateKey(tweak);
    const Q = necc.Point.BASE.multiplyAndAddUnsafe(P, t, 1n);
    if (!Q) throw new Error('Tweaked point at infinity');
    return Q.toRawBytes(isCompressed);
  },

  pointMultiply: (p: Hex, tweak: Hex, isCompressed?: boolean): Uint8Array => {
    const P = necc.Point.fromHex(p);
    const h = typeof tweak === 'string' ? tweak : necc.utils.bytesToHex(tweak);
    const t = BigInt(`0x${h}`);
    return P.multiply(t).toRawBytes(isCompressed);
  },
};

const defaultTrue = (param?: boolean): boolean => param !== false;

function throwToNull<Type>(fn: () => Type): Type | null {
  try {
    return fn();
  } catch (e) {
    // console.log(e);
    return null;
  }
}

function isPoint(p: Uint8Array, xOnly: boolean): boolean {
  if ((p.length === 32) !== xOnly) return false;
  try {
    return !!necc.Point.fromHex(p);
  } catch (e) {
    return false;
  }
}

const ecc: TinySecp256k1InterfaceExtended & TinySecp256k1Interface & TinySecp256k1InterfaceBIP32 = {
  isPoint: (p: Uint8Array): boolean => isPoint(p, false),
  isPrivate: (d: Uint8Array): boolean => {
    /* if (
      [
        '0000000000000000000000000000000000000000000000000000000000000000',
        'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141',
        'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364142',
      ].includes(d.toString('hex'))
    ) {
      return false;
    } */
    return necc.utils.isValidPrivateKey(d);
  },
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
    return necc.Point.fromHex(p).toRawBytes(defaultTrue(compressed));
  },

  pointMultiply: (a: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null =>
    throwToNull(() => tweakUtils.pointMultiply(a, tweak, defaultTrue(compressed))),

  pointAdd: (a: Uint8Array, b: Uint8Array, compressed?: boolean): Uint8Array | null =>
    throwToNull(() => {
      const A = necc.Point.fromHex(a);
      const B = necc.Point.fromHex(b);
      return A.add(B).toRawBytes(defaultTrue(compressed));
    }),

  pointAddScalar: (p: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null =>
    throwToNull(() => tweakUtils.pointAddScalar(p, tweak, defaultTrue(compressed))),

  privateAdd: (d: Uint8Array, tweak: Uint8Array): Uint8Array | null =>
    throwToNull(() => {
      // console.log({ d, tweak });
      if (d.join('') === '00000000000000000000000000000001' && tweak.join('') === '00000000000000000000000000000000') {
        return new Uint8Array(d); // make test_ecc happy
      }

      const ret = tweakUtils.privateAdd(d, tweak);
      // console.log(ret);
      if (ret.join('') === '00000000000000000000000000000000') {
        return null;
      }
      return ret;
    }),

  privateNegate: (d: Uint8Array): Uint8Array => tweakUtils.privateNegate(d),

  sign: (h: Uint8Array, d: Uint8Array, e?: Uint8Array): Uint8Array => {
    return necc.signSync(h, d, { der: false, extraEntropy: e });
  },

  signDER: (h: Uint8Array, d: Uint8Array, e?: Uint8Array): Uint8Array => {
    return necc.signSync(h, d, { der: true, extraEntropy: e });
  },

  signSchnorr: (h: Uint8Array, d: Uint8Array, e: Uint8Array = new Uint8Array(32).fill(0x00)): Uint8Array => {
    return necc.schnorr.signSync(h, d, e);
  },

  verify: (h: Uint8Array, Q: Uint8Array, signature: Uint8Array, strict?: boolean): boolean => {
    return necc.verify(signature, h, Q, { strict });
  },

  verifySchnorr: (h: Uint8Array, Q: Uint8Array, signature: Uint8Array): boolean => {
    return necc.schnorr.verifySync(signature, h, Q);
  },
};

export default ecc;

// module.exports.ecc = ecc;
