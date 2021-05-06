import { HDSegwitElectrumSeedP2WPKHWallet } from '../../class';
const assert = require('assert');

describe('HDSegwitElectrumSeedP2WPKHWallet', () => {
  it('wont accept BIP39 seed', () => {
    const hd = new HDSegwitElectrumSeedP2WPKHWallet();
    hd.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    assert.ok(!hd.validateMnemonic());
  });

  it('wont accept electrum seed, but STANDARD p2pkh seed', () => {
    const hd = new HDSegwitElectrumSeedP2WPKHWallet();
    hd.setSecret('receive happy  wash prosper update    pet neck acid try profit proud hungry  ');
    assert.ok(!hd.validateMnemonic());
  });

  it('can import mnemonics and generate addresses and WIFs', async function () {
    const hd = new HDSegwitElectrumSeedP2WPKHWallet();
    hd.setSecret('method goddess  humble  crumble output snake essay carpet monster barely trip betray ');
    assert.ok(hd.validateMnemonic());
    assert.strictEqual(
      hd.getXpub(),
      'zpub6n6X5F7QEogTDXchPXXhrvDQ38D5JTFNFWhFrFyri3Sazo4x225nENMeN1kKs1cYbeZDtuDUXhDQepUkxjnAi67z2PJ4d33qo8Cu3HLw74c',
    );

    let address = hd._getExternalAddressByIndex(0);
    assert.strictEqual(address, 'bc1q2yv6rhtw9ycqeq2rkch65sucf66ytwsd3csawr');
    assert.ok(hd.getAllExternalAddresses().includes('bc1q2yv6rhtw9ycqeq2rkch65sucf66ytwsd3csawr'));

    address = hd._getInternalAddressByIndex(0);
    assert.strictEqual(address, 'bc1qvdu80q26ghe66zq8tf5y09qr29vay4cg65mvuk');

    let wif = hd._getExternalWIFByIndex(0);
    assert.strictEqual(wif, 'L5a1N5JQzT9wDUmVS9hb2mrd1SMkwPfrWYS8C3Kngp7kiuBkpY2V');

    wif = hd._getInternalWIFByIndex(0);
    assert.strictEqual(wif, 'KwsLfaB2y9QZRd5cxY3uM3L4r2fE7ZPzocwjkPbp1cSFMFfE9tBq');

    assert.strictEqual(
      hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex'),
      '023cb68c37a1ca627c414e63dfb23706091eafb50e50d7de4e2a1a56d7085d42e6',
    );
    assert.strictEqual(
      hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex'),
      '02e7e6a8dc1fe62f7de88a7de3c5030f36ec6aec28c610bc1d573435fab18b9f94',
    );

    hd.setSecret('bs');
    assert.ok(!hd.validateMnemonic());
  });
});
