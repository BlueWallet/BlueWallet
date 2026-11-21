import assert from 'assert';
import { ECPairFactory } from 'ecpair';

import ecc from '../../blue_modules/noble_ecc';

const h = (hex: string) => Buffer.from(hex, 'hex');

describe('ecc', () => {
  it('ECPair accepts noble', () => {
    const ECPair = ECPairFactory(ecc);
    assert.ok(ECPair);
  });

  it('works (basic)', () => {
    assert.ok(ecc.isPoint(Buffer.from('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', 'hex')));
    assert.ok(
      !ecc.isPoint(
        Buffer.from(
          '0100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001',
          'hex',
        ),
      ),
    );
    assert.ok(!ecc.isPoint(Buffer.from('00', 'hex')));

    const rez2 = ecc.privateAdd(
      h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036413e'),
      h('0000000000000000000000000000000000000000000000000000000000000003'),
    );
    assert.strictEqual(rez2, null);

    assert.ok(!ecc.isPrivate(h('0000000000000000000000000000000000000000000000000000000000000000')));
  });

  describe('tweak edge cases', () => {
    const d = h('b7e151628aed2a6abf7158809cf4f3c762e7160f38b4da56a784d9045190cfef');
    const P = ecc.pointFromScalar(d, true)!;
    const G = h('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798');
    const zero = new Uint8Array(32);
    const one = h('0000000000000000000000000000000000000000000000000000000000000001');
    const n = h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
    const nPlusOne = h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364142');
    const eq = (actual: Uint8Array | null, expected: Uint8Array) =>
      assert.strictEqual(actual && Buffer.from(actual).toString('hex'), Buffer.from(expected).toString('hex'));

    it('zero tweak is identity', () => {
      eq(ecc.privateAdd(one, zero), one);
      eq(ecc.privateAdd(d, zero), d);
      eq(ecc.pointAddScalar(P, zero, true), P);
      const res = ecc.xOnlyPointAddTweak(P.slice(1), zero);
      assert.strictEqual(res?.parity, 0); // x-only input lifts to even y
      eq(res!.xOnlyPubkey, P.slice(1));
    });

    it('rejects tweak >= n', () => {
      for (const tweak of [n, nPlusOne, new Uint8Array(32).fill(0xff)]) {
        assert.strictEqual(ecc.privateAdd(d, tweak), null);
        assert.strictEqual(ecc.pointAddScalar(P, tweak, true), null);
        assert.strictEqual(ecc.pointMultiply(P, tweak, true), null);
        assert.strictEqual(ecc.xOnlyPointAddTweak(P.slice(1), tweak), null);
      }
    });

    it('accepts largest tweak n-1', () => {
      const nMinusOne = h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140');
      eq(ecc.privateAdd(h('0000000000000000000000000000000000000000000000000000000000000002'), nMinusOne), one);
      eq(ecc.pointMultiply(G, nMinusOne, true), h('0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'));
    });

    it('rejects tweak of wrong length', () => {
      assert.strictEqual(ecc.privateAdd(d, new Uint8Array(31)), null);
      assert.strictEqual(ecc.pointAddScalar(P, new Uint8Array(33), true), null);
      assert.strictEqual(ecc.pointMultiply(P, new Uint8Array(31).fill(1), true), null);
    });

    it('sums to zero and infinity give null', () => {
      assert.strictEqual(ecc.privateAdd(d, ecc.privateNegate(d)), null);
      assert.strictEqual(ecc.pointAddScalar(P, ecc.privateNegate(d), true), null);
      assert.strictEqual(ecc.pointMultiply(P, zero, true), null);
    });

    it('multiplies and adds correctly', () => {
      eq(ecc.pointMultiply(G, one, true), G);
      eq(ecc.pointMultiply(G, d, true), P);
      const dPlusOne = ecc.privateAdd(d, one)!;
      eq(ecc.pointAddScalar(P, one, true), ecc.pointFromScalar(dPlusOne, true)!);
    });
  });
});
