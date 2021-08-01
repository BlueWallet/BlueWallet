import assert from 'assert';
import { HDSegwitBech32Wallet } from '../../class';

describe('Bech32 Segwit HD (BIP84)', () => {
  it('can create', async function () {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonic);

    assert.strictEqual(true, hd.validateMnemonic());
    assert.strictEqual(
      'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs',
      hd.getXpub(),
    );

    assert.strictEqual(hd._getExternalWIFByIndex(0), 'KyZpNDKnfs94vbrwhJneDi77V6jF64PWPF8x5cdJb8ifgg2DUc9d');
    assert.strictEqual(hd._getExternalWIFByIndex(1), 'Kxpf5b8p3qX56DKEe5NqWbNUP9MnqoRFzZwHRtsFqhzuvUJsYZCy');
    assert.strictEqual(hd._getInternalWIFByIndex(0), 'KxuoxufJL5csa1Wieb2kp29VNdn92Us8CoaUG3aGtPtcF3AzeXvF');
    assert.ok(hd._getInternalWIFByIndex(0) !== hd._getInternalWIFByIndex(1));

    assert.strictEqual(hd._getExternalAddressByIndex(0), 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    assert.strictEqual(hd._getExternalAddressByIndex(1), 'bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el');
    assert.ok(hd._getInternalAddressByIndex(0) !== hd._getInternalAddressByIndex(1));

    assert.ok(hd.getAllExternalAddresses().includes('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu'));
    assert.ok(hd.getAllExternalAddresses().includes('bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g'));
    assert.ok(!hd.getAllExternalAddresses().includes('bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el')); // not internal

    assert.ok(hd.addressIsChange('bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el'));
    assert.ok(!hd.addressIsChange('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu'));

    assert.strictEqual(
      hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex'),
      '0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c',
    );
    assert.strictEqual(
      hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex'),
      '03025324888e429ab8e3dbaf1f7802648b9cd01e9b418485c5fa4c1b9b5700e1a6',
    );

    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/84'/0'/0'/0/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(1)), "m/84'/0'/0'/0/1");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/84'/0'/0'/1/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(1)), "m/84'/0'/0'/1/1");

    assert.strictEqual(hd.getMasterFingerprintHex(), '73C5DA0A');
  });

  it('can generate addresses only via zpub', function () {
    const zpub = 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
    const hd = new HDSegwitBech32Wallet();
    hd._xpub = zpub;
    assert.strictEqual(hd._getExternalAddressByIndex(0), 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    assert.strictEqual(hd._getExternalAddressByIndex(1), 'bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el');
    assert.ok(hd._getInternalAddressByIndex(0) !== hd._getInternalAddressByIndex(1));

    assert.ok(hd.getAllExternalAddresses().includes('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu'));
    assert.ok(hd.getAllExternalAddresses().includes('bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g'));
    assert.ok(!hd.getAllExternalAddresses().includes('bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el')); // not internal
  });

  it('can generate', async () => {
    const hd = new HDSegwitBech32Wallet();
    const hashmap = {};
    for (let c = 0; c < 1000; c++) {
      await hd.generate();
      const secret = hd.getSecret();
      assert.strictEqual(secret.split(' ').length, 12);
      if (hashmap[secret]) {
        throw new Error('Duplicate secret generated!');
      }
      hashmap[secret] = 1;
      assert.ok(secret.split(' ').length === 12 || secret.split(' ').length === 24);
    }

    const hd2 = new HDSegwitBech32Wallet();
    hd2.setSecret(hd.getSecret());
    assert.ok(hd2.validateMnemonic());
  });

  it('can coin control', async () => {
    const hd = new HDSegwitBech32Wallet();

    // fake UTXO so we don't need to use fetchUtxo
    hd._utxo = [
      { txid: '11111', vout: 0, value: 11111 },
      { txid: '22222', vout: 0, value: 22222 },
    ];

    assert.ok(hd.getUtxo().length === 2);

    // freeze one UTXO and set a memo on it
    hd.setUTXOMetadata('11111', 0, { memo: 'somememo', frozen: true });
    assert.strictEqual(hd.getUTXOMetadata('11111', 0).memo, 'somememo');
    assert.strictEqual(hd.getUTXOMetadata('11111', 0).frozen, true);

    // now .getUtxo() should return a limited UTXO set
    assert.ok(hd.getUtxo().length === 1);
    assert.strictEqual(hd.getUtxo()[0].txid, '22222');

    // now .getUtxo(true) should return a full UTXO set
    assert.ok(hd.getUtxo(true).length === 2);

    // for UTXO with no metadata .getUTXOMetadata() should return an empty object
    assert.ok(Object.keys(hd.getUTXOMetadata('22222', 0)).length === 0);
  });

  it('can sign and verify messages', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonic);
    let signature;

    // external address
    signature = hd.signMessage('vires is numeris', hd._getExternalAddressByIndex(0));
    assert.strictEqual(signature, 'KGW4FfrptS9zV3UptUWxbEf65GhC2mCUz86G0GpN/H4MUC29Y5TsRhWGIqG2lettEpZXZETuc2yL+O7/UvDhxhM=');
    assert.strictEqual(hd.verifyMessage('vires is numeris', hd._getExternalAddressByIndex(0), signature), true);

    // internal address
    signature = hd.signMessage('vires is numeris', hd._getInternalAddressByIndex(0));
    assert.strictEqual(signature, 'KJ5B9JkZ042FhtGeObU/MxLCzQWHbrpXNQxhfJj9wMboa/icLIIaAlsKaSkS27fZLvX3WH0qyj3aAaXscnWsfSw=');
    assert.strictEqual(hd.verifyMessage('vires is numeris', hd._getInternalAddressByIndex(0), signature), true);

    // multiline message
    signature = hd.signMessage('vires\nis\nnumeris', hd._getExternalAddressByIndex(0));
    assert.strictEqual(signature, 'KFI22tlJVGq2HGQM5rcBtYu+Jq8oc7QyjSBP1ZQup3a/GEw1Khu2qFbL/iLzqw95wN22a/Tll1oMLdWxg9cWMYM=');
    assert.strictEqual(hd.verifyMessage('vires\nis\nnumeris', hd._getExternalAddressByIndex(0), signature), true);

    // can't sign if address doesn't belong to wallet
    assert.throws(() => hd.signMessage('vires is numeris', '186FBQmCV5W1xY7ywaWtTZPAQNciVN8Por'));

    // can't verify wrong signature
    assert.throws(() => hd.verifyMessage('vires is numeris', hd._getInternalAddressByIndex(0), 'wrong signature'));

    // can verify electrum message signature
    // bech32 segwit (p2wpkh)
    assert.strictEqual(
      hd.verifyMessage(
        'vires is numeris',
        'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el',
        'Hya6IaZGbKF83eOmC5i1CX5V42Wqkf+eSMi8S+hvJuJrDmp5F56ivrHgAzcxNIShIpY2lJv76M2LB6zLV70KxWQ=',
      ),
      true,
    );
    // p2sh-segwit (p2wpkh-p2sh)
    assert.strictEqual(
      hd.verifyMessage(
        'vires is numeris',
        '37VucYSaXLCAsxYyAPfbSi9eh4iEcbShgf',
        'IBm8XAd/NdWjjUBXr3pkXdVk1XQBHKPkBy4DCmSG0Ox4IKOLb1O+V7cTXPQ2vm3rcYquF+6iKSPJDiE1TPrAswY=',
      ),
      true,
    );
    // legacy
    assert.strictEqual(
      hd.verifyMessage(
        'vires is numeris',
        '1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA',
        'IDNPawFev2E+W1xhHYi6NKuj7BY2Xe9qvXfddoWL4XZcPridoizzm8pda6jGEIwHlVYe4zrGhYqUR+j2hOsQxD8=',
      ),
      true,
    );
  });

  it('can use mnemonic with passphrase', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const passphrase = 'super secret passphrase';
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonic);
    hd.setPassphrase(passphrase);

    assert.strictEqual(
      hd.getXpub(),
      'zpub6qNvUL1qNQwaReccveprgd4urE2EUvShpcFe7WB9tzf9L4NJNcWhPzJSk4fzNXqBNZdRr6135hBKaqqp5RVvyxZ6eMbZXL6u5iK4zrfkCaQ',
    );

    assert.strictEqual(hd._getExternalAddressByIndex(0), 'bc1qgaj3satczjem43pz46ct6r3758twhnny4y720z');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'bc1qthe7wh5eplzxczslvthyrer36ph3kxpnfnxgjg');
    assert.strictEqual(hd._getExternalWIFByIndex(0), 'L1tfV6fbRjDNwGQdJqHC9fneM9bTHigApnWgoKoU8JwgziwbbE7i');
  });

  it('can create with custom derivation path', async () => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    hd.setDerivationPath("m/84'/0'/1'");

    assert.strictEqual(
      hd.getXpub(),
      'zpub6rFR7y4Q2AijF6Gk1bofHLs1d66hKFamhXWdWBup1Em25wfabZqkDqvaieV63fDQFaYmaatCG7jVNUpUiM2hAMo6SAVHcrUpSnHDpNzucB7',
    );

    assert.strictEqual(hd._getExternalAddressByIndex(0), 'bc1qku0qh0mc00y8tk0n65x2tqw4trlspak0fnjmfz');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'bc1qt0x83f5vmnapgl2gjj9r3d67rcghvjaqrvgpck');
    assert.strictEqual(hd._getExternalWIFByIndex(0), 'L4ouJZjss1Ua8LPhsJNkzN8V8uXrQpfADNsqzsaT5JHs1G752c9j');

    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/84'/0'/1'/0/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/84'/0'/1'/1/0");
  });

  it('can generate ID', () => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    const id1 = hd.getID();
    hd.setPassphrase('super secret passphrase');
    const id2 = hd.getID();
    hd.setDerivationPath("m/84'/0'/1'");
    const id3 = hd.getID();

    assert.notStrictEqual(id1, id2);
    assert.notStrictEqual(id2, id3);
    assert.notStrictEqual(id1, id3);
  });
});
