import { HDSegwitBech32Wallet } from '../../class';

describe('Bech32 Segwit HD (BIP84)', () => {
  it('can create', async function () {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonic);

    expect(true).toBe(hd.validateMnemonic());
    expect('zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs').toBe(
      hd.getXpub(),
    );

    expect(hd._getExternalWIFByIndex(0)).toBe('KyZpNDKnfs94vbrwhJneDi77V6jF64PWPF8x5cdJb8ifgg2DUc9d');
    expect(hd._getExternalWIFByIndex(1)).toBe('Kxpf5b8p3qX56DKEe5NqWbNUP9MnqoRFzZwHRtsFqhzuvUJsYZCy');
    expect(hd._getInternalWIFByIndex(0)).toBe('KxuoxufJL5csa1Wieb2kp29VNdn92Us8CoaUG3aGtPtcF3AzeXvF');
    expect(hd._getInternalWIFByIndex(0) !== hd._getInternalWIFByIndex(1)).toBeTruthy();

    expect(hd._getExternalAddressByIndex(0)).toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    expect(hd._getExternalAddressByIndex(1)).toBe('bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g');
    expect(hd._getInternalAddressByIndex(0)).toBe('bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el');
    expect(hd._getInternalAddressByIndex(0) !== hd._getInternalAddressByIndex(1)).toBeTruthy();

    expect(hd.getAllExternalAddresses().includes('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu')).toBeTruthy();
    expect(hd.getAllExternalAddresses().includes('bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g')).toBeTruthy();
    expect(!hd.getAllExternalAddresses().includes('bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el')).toBeTruthy(); // not internal

    expect(hd.addressIsChange('bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el')).toBeTruthy();
    expect(!hd.addressIsChange('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu')).toBeTruthy();

    expect(hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex')).toBe(
      '0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c',
    );
    expect(hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex')).toBe(
      '03025324888e429ab8e3dbaf1f7802648b9cd01e9b418485c5fa4c1b9b5700e1a6',
    );

    expect(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0))).toBe("m/84'/0'/0'/0/0");
    expect(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(1))).toBe("m/84'/0'/0'/0/1");
    expect(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0))).toBe("m/84'/0'/0'/1/0");
    expect(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(1))).toBe("m/84'/0'/0'/1/1");

    expect(hd.getMasterFingerprintHex()).toBe('73C5DA0A');
  });

  it('can generate addresses only via zpub', function () {
    const zpub = 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
    const hd = new HDSegwitBech32Wallet();
    hd._xpub = zpub;
    expect(hd._getExternalAddressByIndex(0)).toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    expect(hd._getExternalAddressByIndex(1)).toBe('bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g');
    expect(hd._getInternalAddressByIndex(0)).toBe('bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el');
    expect(hd._getInternalAddressByIndex(0) !== hd._getInternalAddressByIndex(1)).toBeTruthy();

    expect(hd.getAllExternalAddresses().includes('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu')).toBeTruthy();
    expect(hd.getAllExternalAddresses().includes('bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g')).toBeTruthy();
    expect(!hd.getAllExternalAddresses().includes('bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el')).toBeTruthy(); // not internal
  });

  it('can generate', async () => {
    const hd = new HDSegwitBech32Wallet();
    const hashmap = {};
    for (let c = 0; c < 1000; c++) {
      await hd.generate();
      const secret = hd.getSecret();
      expect(secret.split(' ').length).toBe(12);
      if (hashmap[secret]) {
        throw new Error('Duplicate secret generated!');
      }
      hashmap[secret] = 1;
      expect(secret.split(' ').length === 12 || secret.split(' ').length === 24).toBeTruthy();
    }

    const hd2 = new HDSegwitBech32Wallet();
    hd2.setSecret(hd.getSecret());
    expect(hd2.validateMnemonic()).toBeTruthy();
  });

  it('can coin control', async () => {
    const hd = new HDSegwitBech32Wallet();

    // fake UTXO so we don't need to use fetchUtxo
    hd._utxo = [
      { txid: '11111', vout: 0, value: 11111 },
      { txid: '22222', vout: 0, value: 22222 },
    ];

    expect(hd.getUtxo().length === 2).toBeTruthy();

    // freeze one UTXO and set a memo on it
    hd.setUTXOMetadata('11111', 0, { memo: 'somememo', frozen: true });
    expect(hd.getUTXOMetadata('11111', 0).memo).toBe('somememo');
    expect(hd.getUTXOMetadata('11111', 0).frozen).toBe(true);

    // now .getUtxo() should return a limited UTXO set
    expect(hd.getUtxo().length === 1).toBeTruthy();
    expect(hd.getUtxo()[0].txid).toBe('22222');

    // now .getUtxo(true) should return a full UTXO set
    expect(hd.getUtxo(true).length === 2).toBeTruthy();

    // for UTXO with no metadata .getUTXOMetadata() should return an empty object
    expect(Object.keys(hd.getUTXOMetadata('22222', 0)).length === 0).toBeTruthy();
  });

  it('can sign and verify messages', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonic);
    let signature;

    // external address
    signature = hd.signMessage('vires is numeris', hd._getExternalAddressByIndex(0));
    expect(signature).toBe('KGW4FfrptS9zV3UptUWxbEf65GhC2mCUz86G0GpN/H4MUC29Y5TsRhWGIqG2lettEpZXZETuc2yL+O7/UvDhxhM=');
    expect(hd.verifyMessage('vires is numeris', hd._getExternalAddressByIndex(0), signature)).toBe(true);

    // internal address
    signature = hd.signMessage('vires is numeris', hd._getInternalAddressByIndex(0));
    expect(signature).toBe('KJ5B9JkZ042FhtGeObU/MxLCzQWHbrpXNQxhfJj9wMboa/icLIIaAlsKaSkS27fZLvX3WH0qyj3aAaXscnWsfSw=');
    expect(hd.verifyMessage('vires is numeris', hd._getInternalAddressByIndex(0), signature)).toBe(true);

    // multiline message
    signature = hd.signMessage('vires\nis\nnumeris', hd._getExternalAddressByIndex(0));
    expect(signature).toBe('KFI22tlJVGq2HGQM5rcBtYu+Jq8oc7QyjSBP1ZQup3a/GEw1Khu2qFbL/iLzqw95wN22a/Tll1oMLdWxg9cWMYM=');
    expect(hd.verifyMessage('vires\nis\nnumeris', hd._getExternalAddressByIndex(0), signature)).toBe(true);

    // can't sign if address doesn't belong to wallet
    expect(() => hd.signMessage('vires is numeris', '186FBQmCV5W1xY7ywaWtTZPAQNciVN8Por')).toThrow();

    // can't verify wrong signature
    expect(() => hd.verifyMessage('vires is numeris', hd._getInternalAddressByIndex(0), 'wrong signature')).toThrow();

    // can verify electrum message signature
    // bech32 segwit (p2wpkh)
    expect(
      hd.verifyMessage(
        'vires is numeris',
        'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el',
        'Hya6IaZGbKF83eOmC5i1CX5V42Wqkf+eSMi8S+hvJuJrDmp5F56ivrHgAzcxNIShIpY2lJv76M2LB6zLV70KxWQ=',
      ),
    ).toBe(true);
    // p2sh-segwit (p2wpkh-p2sh)
    expect(
      hd.verifyMessage(
        'vires is numeris',
        '37VucYSaXLCAsxYyAPfbSi9eh4iEcbShgf',
        'IBm8XAd/NdWjjUBXr3pkXdVk1XQBHKPkBy4DCmSG0Ox4IKOLb1O+V7cTXPQ2vm3rcYquF+6iKSPJDiE1TPrAswY=',
      ),
    ).toBe(true);
    // legacy
    expect(
      hd.verifyMessage(
        'vires is numeris',
        '1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA',
        'IDNPawFev2E+W1xhHYi6NKuj7BY2Xe9qvXfddoWL4XZcPridoizzm8pda6jGEIwHlVYe4zrGhYqUR+j2hOsQxD8=',
      ),
    ).toBe(true);
  });

  it('can use mnemonic with passphrase', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const passphrase = 'super secret passphrase';
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonic);
    hd.setPassphrase(passphrase);

    expect(hd.getXpub()).toBe(
      'zpub6qNvUL1qNQwaReccveprgd4urE2EUvShpcFe7WB9tzf9L4NJNcWhPzJSk4fzNXqBNZdRr6135hBKaqqp5RVvyxZ6eMbZXL6u5iK4zrfkCaQ',
    );

    expect(hd._getExternalAddressByIndex(0)).toBe('bc1qgaj3satczjem43pz46ct6r3758twhnny4y720z');
    expect(hd._getInternalAddressByIndex(0)).toBe('bc1qthe7wh5eplzxczslvthyrer36ph3kxpnfnxgjg');
    expect(hd._getExternalWIFByIndex(0)).toBe('L1tfV6fbRjDNwGQdJqHC9fneM9bTHigApnWgoKoU8JwgziwbbE7i');
  });
});
