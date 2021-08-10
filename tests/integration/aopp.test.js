import assert from 'assert';

import { HDLegacyP2PKHWallet, HDSegwitP2SHWallet } from '../../class';
import AOPP from '../../class/aopp';

describe('AOPP', () => {
  it('can validate uri', async () => {
    const a = new AOPP('aopp:?v=0&msg=vasp-chosen-msg&asset=btc&format=p2wpkh&callback=https://vasp.com/proofs/vasp-chosen-token');
    assert.strictEqual(a.v, 0);
    assert.strictEqual(a.msg, 'vasp-chosen-msg');
    assert.strictEqual(a.format, 'p2wpkh');
    assert.strictEqual(a.callback, 'https://vasp.com/proofs/vasp-chosen-token');
    assert.strictEqual(a.callbackHostname, 'vasp.com');

    // wrong version
    assert.throws(() => new AOPP('aopp:?v=1&msg=vasp-chosen-msg&asset=btc&format=p2wpkh&callback=https://vasp.com/'));

    // wrong asset
    assert.throws(() => new AOPP('aopp:?v=0&msg=vasp-chosen-msg&asset=bch&format=p2wpkh&callback=https://vasp.com/'));

    // wrong format
    assert.throws(() => new AOPP('aopp:?v=0&msg=vasp-chosen-msg&asset=btc&format=erc20&callback=https://vasp.com/'));
  });

  it('can cast address format to our internal segwitType', () => {
    assert.throws(() => AOPP.getSegwitByAddressFormat('any'));
    assert.throws(() => AOPP.getSegwitByAddressFormat('blablabla'));

    assert.strictEqual(AOPP.getSegwitByAddressFormat('p2wpkh'), 'p2wpkh');
    assert.strictEqual(AOPP.getSegwitByAddressFormat('p2sh'), 'p2sh(p2wpkh)');
    assert.strictEqual(AOPP.getSegwitByAddressFormat('p2pkh'), undefined);
  });

  // these tests depends on unstable https://testing.21analytics.ch/ ( link can be found at https://testing.aopp.group/) so we don't want to run chem all the time
  it.skip('can sign and send signature using legacy address', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDLegacyP2PKHWallet();
    hd.setSecret(mnemonic);
    const address = hd._getExternalAddressByIndex(0);

    const a = new AOPP(
      'aopp:?v=0&msg=I+confirm+that+this+Bitcoin+%28BTC%29+address+is+controlled+by+Thomas+Turner%2C+Poststrasse+22%2C+Zug%2C+Switzerland.+Unique+Identifier%3A+24a37b6a555311c&asset=btc&format=any&callback=https%3A%2F%2Ftesting.21analytics.ch%2Fproofs%2F31e05ce3-bd03-47cb-aa0e-be37505bec5f',
    );
    const signature = hd.signMessage(a.msg, address);

    await a.send({ address, signature });
  });

  it.skip('can sign and send signature using segwit address', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    const address = hd._getExternalAddressByIndex(0);

    const a = new AOPP(
      'aopp:?v=0&msg=I+confirm+that+this+Bitcoin+%28BTC%29+address+is+controlled+by+Thomas+Turner%2C+Poststrasse+22%2C+Zug%2C+Switzerland.+Unique+Identifier%3A+24a37b6a555311c&asset=btc&format=any&callback=https%3A%2F%2Ftesting.21analytics.ch%2Fproofs%2F31e05ce3-bd03-47cb-aa0e-be37505bec5f',
    );
    const signature = hd.signMessage(a.msg, address);

    await a.send({ address, signature });
  });
});
