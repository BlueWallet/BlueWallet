import { HDSegwitElectrumSeedP2WPKHWallet } from '../../class';

describe('HDSegwitElectrumSeedP2WPKHWallet', () => {
  it('wont accept BIP39 seed', () => {
    const hd = new HDSegwitElectrumSeedP2WPKHWallet();
    hd.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    expect(!hd.validateMnemonic()).toBeTruthy();
  });

  it('wont accept electrum seed, but STANDARD p2pkh seed', () => {
    const hd = new HDSegwitElectrumSeedP2WPKHWallet();
    hd.setSecret('receive happy  wash prosper update    pet neck acid try profit proud hungry  ');
    expect(!hd.validateMnemonic()).toBeTruthy();
  });

  it('can import mnemonics and generate addresses and WIFs', async function () {
    const hd = new HDSegwitElectrumSeedP2WPKHWallet();
    hd.setSecret('method goddess  humble  crumble output snake essay carpet monster barely trip betray ');
    expect(hd.validateMnemonic()).toBeTruthy();
    expect(hd.getXpub()).toBe(
      'zpub6n6X5F7QEogTDXchPXXhrvDQ38D5JTFNFWhFrFyri3Sazo4x225nENMeN1kKs1cYbeZDtuDUXhDQepUkxjnAi67z2PJ4d33qo8Cu3HLw74c',
    );

    let address = hd._getExternalAddressByIndex(0);
    expect(address).toBe('bc1q2yv6rhtw9ycqeq2rkch65sucf66ytwsd3csawr');
    expect(hd.getAllExternalAddresses().includes('bc1q2yv6rhtw9ycqeq2rkch65sucf66ytwsd3csawr')).toBeTruthy();

    address = hd._getInternalAddressByIndex(0);
    expect(address).toBe('bc1qvdu80q26ghe66zq8tf5y09qr29vay4cg65mvuk');

    let wif = hd._getExternalWIFByIndex(0);
    expect(wif).toBe('L5a1N5JQzT9wDUmVS9hb2mrd1SMkwPfrWYS8C3Kngp7kiuBkpY2V');

    wif = hd._getInternalWIFByIndex(0);
    expect(wif).toBe('KwsLfaB2y9QZRd5cxY3uM3L4r2fE7ZPzocwjkPbp1cSFMFfE9tBq');

    expect(hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex')).toBe(
      '023cb68c37a1ca627c414e63dfb23706091eafb50e50d7de4e2a1a56d7085d42e6',
    );
    expect(hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex')).toBe(
      '02e7e6a8dc1fe62f7de88a7de3c5030f36ec6aec28c610bc1d573435fab18b9f94',
    );

    hd.setSecret('bs');
    expect(!hd.validateMnemonic()).toBeTruthy();
  });

  // from electrum tests https://github.com/spesmilo/electrum/blob/9c1a51547a301e765b9b0f9935c6d940bb9d658e/electrum/tests/test_wallet_vertical.py#L130
  it('can use mnemonic with passphrase', () => {
    const mnemonic = 'bitter grass shiver impose acquire brush forget axis eager alone wine silver';
    const UNICODE_HORROR = '₿ 😀 😈     う けたま わる w͢͢͝h͡o͢͡ ̸͢k̵͟n̴͘ǫw̸̛s͘ ̀́w͘͢ḩ̵a҉̡͢t ̧̕h́o̵r͏̵rors̡ ̶͡͠lį̶e͟͟ ̶͝in͢ ͏t̕h̷̡͟e ͟͟d̛a͜r̕͡k̢̨ ͡h̴e͏a̷̢̡rt́͏ ̴̷͠ò̵̶f̸ u̧͘ní̛͜c͢͏o̷͏d̸͢e̡͝?͞';
    const hd = new HDSegwitElectrumSeedP2WPKHWallet();
    hd.setSecret(mnemonic);
    hd.setPassphrase(UNICODE_HORROR);

    expect(hd.getXpub()).toBe(
      'zpub6nD7dvF6ArArjskKHZLmEL9ky8FqaSti1LN5maDWGwFrqwwGTp1b6ic4EHwciFNaYDmCXcQYxXSiF9BjcLCMPcaYkVN2nQD6QjYQ8vpSR3Z',
    );

    expect(hd._getExternalAddressByIndex(0)).toBe('bc1qx94dutas7ysn2my645cyttujrms5d9p57f6aam');
    expect(hd._getInternalAddressByIndex(0)).toBe('bc1qcywwsy87sdp8vz5rfjh3sxdv6rt95kujdqq38g');
    expect(hd._getExternalWIFByIndex(0)).toBe('KyBagP6JHrNTGanqBSDVzKrsBTVbD9hhkTeVe1zEhewKeCU6wJb7');
  });
});
