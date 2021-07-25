import { HDLegacyP2PKHWallet, HDSegwitP2SHWallet } from '../../class';
import AOPP from '../../class/aopp';

describe('AOPP', () => {
  it('can validate uri', async () => {
    const a = new AOPP('aopp:?v=0&msg=vasp-chosen-msg&asset=btc&format=p2wpkh&callback=https://vasp.com/proofs/vasp-chosen-token');
    expect(a.v).toBe(0);
    expect(a.msg).toBe('vasp-chosen-msg');
    expect(a.format).toBe('p2wpkh');
    expect(a.callback).toBe('https://vasp.com/proofs/vasp-chosen-token');
    expect(a.callbackHostname).toBe('vasp.com');

    // wrong version
    expect(() => new AOPP('aopp:?v=1&msg=vasp-chosen-msg&asset=btc&format=p2wpkh&callback=https://vasp.com/')).toThrow();

    // wrong asset
    expect(() => new AOPP('aopp:?v=0&msg=vasp-chosen-msg&asset=bch&format=p2wpkh&callback=https://vasp.com/')).toThrow();

    // wrong format
    expect(() => new AOPP('aopp:?v=0&msg=vasp-chosen-msg&asset=btc&format=erc20&callback=https://vasp.com/')).toThrow();
  });

  it('can cast address format to our internal segwitType', () => {
    expect(() => AOPP.getSegwitByAddressFormat('any')).toThrow();
    expect(() => AOPP.getSegwitByAddressFormat('blablabla')).toThrow();

    expect(AOPP.getSegwitByAddressFormat('p2wpkh')).toBe('p2wpkh');
    expect(AOPP.getSegwitByAddressFormat('p2sh')).toBe('p2sh(p2wpkh)');
    expect(AOPP.getSegwitByAddressFormat('p2pkh')).toBe(undefined);
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
