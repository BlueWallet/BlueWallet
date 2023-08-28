/**
 * adapted from https://github.com/BitGo/BitGoJS/blob/bitcoinjs_lib_6_sync/modules/utxo-lib/src/noble_ecc.ts
 * license: Apache License
 *
 * @see https://github.com/bitcoinjs/tiny-secp256k1/issues/84#issuecomment-1185682315
 * @see https://github.com/bitcoinjs/bitcoinjs-lib/issues/1781
 */
import createHash from 'create-hash';
import { createHmac } from 'crypto';
import * as necc from '@noble/secp256k1';
import { TinySecp256k1Interface } from 'ecpair/src/ecpair';
import { TinySecp256k1Interface as TinySecp256k1InterfaceBIP32 } from 'bip32/types/bip32';
import { XOnlyPointAddTweakResult } from 'bitcoinjs-lib/src/types';

export interface TinySecp256k1InterfaceExtended {
  pointMultiply(p: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null;

  pointAdd(pA: Uint8Array, pB: Uint8Array, compressed?: boolean): Uint8Array | null;

  isXOnlyPoint(p: Uint8Array): boolean;

  xOnlyPointAddTweak(p: Uint8Array, tweak: Uint8Array): XOnlyPointAddTweakResult | null;
}

necc.utils.sha256Sync = (...messages: Uint8Array[]): Uint8Array => {
  const sha256 = createHash('sha256');
  for (const message of messages) sha256.update(message);
  return sha256.digest();
};

necc.utils.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]): Uint8Array => {
  const hash = createHmac('sha256', Buffer.from(key));
  messages.forEach(m => hash.update(m));
  return Uint8Array.from(hash.digest());
};

/* const normal = necc.utils._normalizePrivateKey;
type Hex = string | Uint8Array;
type PrivKey = Hex | bigint | number;

necc.utils.privateAdd = (privateKey: PrivKey, tweak: Hex) => {
  console.log({ privateKey, tweak });
  const p = normal(privateKey);
  const t = normal(tweak);
  return necc.utils.privateAdd(necc.utils.mod(p + t, necc.CURVE.n));
}; */

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
      const P = necc.utils.pointAddScalar(p, tweak, true);
      const parity = P[0] % 2 === 1 ? 1 : 0;
      return { parity, xOnlyPubkey: P.slice(1) };
    }),

  pointFromScalar: (sk: Uint8Array, compressed?: boolean): Uint8Array | null =>
    throwToNull(() => necc.getPublicKey(sk, defaultTrue(compressed))),

  pointCompress: (p: Uint8Array, compressed?: boolean): Uint8Array => {
    return necc.Point.fromHex(p).toRawBytes(defaultTrue(compressed));
  },

  pointMultiply: (a: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null =>
    throwToNull(() => necc.utils.pointMultiply(a, tweak, defaultTrue(compressed))),

  pointAdd: (a: Uint8Array, b: Uint8Array, compressed?: boolean): Uint8Array | null =>
    throwToNull(() => {
      const A = necc.Point.fromHex(a);
      const B = necc.Point.fromHex(b);
      return A.add(B).toRawBytes(defaultTrue(compressed));
    }),

  pointAddScalar: (p: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null =>
    throwToNull(() => necc.utils.pointAddScalar(p, tweak, defaultTrue(compressed))),

  privateAdd: (d: Uint8Array, tweak: Uint8Array): Uint8Array | null =>
    throwToNull(() => {
      // console.log({ d, tweak });
      const ret = necc.utils.privateAdd(d, tweak);
      // console.log(ret);
      if (ret.join('') === '00000000000000000000000000000000') {
        return null;
      }
      return ret;
    }),

  // privateNegate: (d: Uint8Array): Uint8Array => necc.utils.privateNegate(d),

  sign: (h: Uint8Array, d: Uint8Array, e?: Uint8Array): Uint8Array => {
    return necc.signSync(h, d, { der: false, extraEntropy: e });
  },

  signSchnorr: (h: Uint8Array, d: Uint8Array, e: Uint8Array = Buffer.alloc(32, 0x00)): Uint8Array => {
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
