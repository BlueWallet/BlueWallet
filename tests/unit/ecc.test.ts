import assert from 'assert';
import { ECPairFactory } from 'ecpair';
import * as necc from '@noble/secp256k1';
import { SingleKey } from '@arkade-os/sdk';

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

    /*

    muted because of that:

    ```
        if (!isWithinCurveOrder(num))
        throw new Error('Expected private key: 0 < key < n');
    ````

    in `node_modules/@noble/secp256k1/lib/index.js`
    (this test runs in runtime in some versions if `ECPairFactory`)


    const rez = ecc.privateAdd(
      h('0000000000000000000000000000000000000000000000000000000000000001'),
      h('0000000000000000000000000000000000000000000000000000000000000000'),
    );


    assert.strictEqual(
      Buffer.from(rez).toString('hex'),
      h('0000000000000000000000000000000000000000000000000000000000000001').toString('hex'),
    );
*/

    const rez2 = ecc.privateAdd(
      h('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036413e'),
      h('0000000000000000000000000000000000000000000000000000000000000003'),
    );
    assert.strictEqual(rez2, null);

    assert.ok(!ecc.isPrivate(h('0000000000000000000000000000000000000000000000000000000000000000')));
  });

  it('lets the Arkade SDK sign messages without crypto.subtle, which Hermes lacks', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;
    const { getRandomValues } = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: getRandomValues.bind(globalThis.crypto) },
      configurable: true,
    });
    try {
      const key = SingleKey.fromHex('11'.repeat(32));
      const message = new Uint8Array(32).fill(7);
      const pub = await key.compressedPublicKey();
      assert.ok(necc.verify(await key.signMessage(message, 'ecdsa'), message, pub, { prehash: false }), 'ecdsa');
      assert.ok(necc.schnorr.verify(await key.signMessage(message, 'schnorr'), message, await key.xOnlyPublicKey()), 'schnorr');
      const deterministic = await key.signSchnorrDeterministic(message);
      assert.deepStrictEqual(await key.signSchnorrDeterministic(message), deterministic, 'deterministic');
    } finally {
      Object.defineProperty(globalThis, 'crypto', original);
    }
  });
});
