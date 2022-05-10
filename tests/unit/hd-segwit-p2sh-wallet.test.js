import assert from 'assert';

import { SegwitP2SHWallet, SegwitBech32Wallet, HDSegwitP2SHWallet, HDLegacyP2PKHWallet, LegacyWallet } from '../../class';

describe('P2SH Segwit HD (BIP49)', () => {
  it('can create a wallet', async () => {
    const mnemonic =
      'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    assert.strictEqual('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', hd._getExternalAddressByIndex(0));
    assert.strictEqual('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3', hd._getExternalAddressByIndex(1));
    assert.strictEqual('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei', hd._getInternalAddressByIndex(0));
    assert.ok(hd.getAllExternalAddresses().includes('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK'));
    assert.ok(hd.getAllExternalAddresses().includes('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3'));
    assert.ok(!hd.getAllExternalAddresses().includes('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei')); // not internal
    assert.strictEqual(true, hd.validateMnemonic());

    assert.strictEqual(
      hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex'),
      '0348192db90b753484601aaf1e6220644ffe37d83a9a5feff32b4da43739f736be',
    );
    assert.strictEqual(
      hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex'),
      '03c107e6976d59e17490513fbed3fb321736b7231d24f3d09306c72714acf1859d',
    );

    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/49'/0'/0'/0/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/49'/0'/0'/1/0");

    assert.strictEqual('L4MqtwJm6hkbACLG4ho5DF8GhcXdLEbbvpJnbzA9abfD6RDpbr2m', hd._getExternalWIFByIndex(0));
    assert.strictEqual(
      'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp',
      hd.getXpub(),
    );
  });

  it('can convert witness to address', () => {
    let address = SegwitP2SHWallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
    assert.strictEqual(address, '34ZVGb3gT8xMLT6fpqC6dNVqJtJmvdjbD7');
    address = SegwitP2SHWallet.witnessToAddress();
    assert.strictEqual(address, false);
    address = SegwitP2SHWallet.witnessToAddress('trololo');
    assert.strictEqual(address, false);

    address = SegwitP2SHWallet.scriptPubKeyToAddress('a914e286d58e53f9247a4710e51232cce0686f16873c87');
    assert.strictEqual(address, '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
    address = SegwitP2SHWallet.scriptPubKeyToAddress();
    assert.strictEqual(address, false);
    address = SegwitP2SHWallet.scriptPubKeyToAddress('trololo');
    assert.strictEqual(address, false);

    address = SegwitBech32Wallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
    assert.strictEqual(address, 'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv');
    address = SegwitBech32Wallet.witnessToAddress();
    assert.strictEqual(address, false);
    address = SegwitBech32Wallet.witnessToAddress('trololo');
    assert.strictEqual(address, false);

    address = SegwitBech32Wallet.scriptPubKeyToAddress('00144d757460da5fcaf84cc22f3847faaa1078e84f6a');
    assert.strictEqual(address, 'bc1qf46hgcx6tl90snxz9uuy0742zpuwsnm27ysdh7');
    address = SegwitBech32Wallet.scriptPubKeyToAddress();
    assert.strictEqual(address, false);
    address = SegwitBech32Wallet.scriptPubKeyToAddress('trololo');
    assert.strictEqual(address, false);

    address = LegacyWallet.scriptPubKeyToAddress('76a914d0b77eb1502c81c4093da9aa6eccfdf560cdd6b288ac');
    assert.strictEqual(address, '1L2bNMGRQQLT2AVUek4K9L7sn3SSMioMgE');
    address = LegacyWallet.scriptPubKeyToAddress();
    assert.strictEqual(address, false);
    address = LegacyWallet.scriptPubKeyToAddress('trololo');
    assert.strictEqual(address, false);
  });

  it('Segwit HD (BIP49) can generate addressess only via ypub', function () {
    const ypub = 'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp';
    const hd = new HDSegwitP2SHWallet();
    hd._xpub = ypub;
    assert.strictEqual('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', hd._getExternalAddressByIndex(0));
    assert.strictEqual('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3', hd._getExternalAddressByIndex(1));
    assert.strictEqual('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei', hd._getInternalAddressByIndex(0));
    assert.ok(hd.getAllExternalAddresses().includes('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK'));
    assert.ok(hd.getAllExternalAddresses().includes('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3'));
    assert.ok(!hd.getAllExternalAddresses().includes('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei')); // not internal
  });

  it('can generate Segwit HD (BIP49)', async () => {
    const hd = new HDSegwitP2SHWallet();
    const hashmap = {};
    for (let c = 0; c < 1000; c++) {
      await hd.generate();
      const secret = hd.getSecret();
      if (hashmap[secret]) {
        throw new Error('Duplicate secret generated!');
      }
      hashmap[secret] = 1;
      assert.ok(secret.split(' ').length === 12 || secret.split(' ').length === 24);
    }

    const hd2 = new HDSegwitP2SHWallet();
    hd2.setSecret(hd.getSecret());
    assert.ok(hd2.validateMnemonic());
  });

  it('can work with malformed mnemonic', () => {
    let mnemonic =
      'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode';
    let hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    const seed1 = hd._getSeed().toString('hex');
    assert.ok(hd.validateMnemonic());

    mnemonic = 'hell';
    hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    assert.ok(!hd.validateMnemonic());

    // now, malformed mnemonic

    mnemonic =
      '    honey  risk   juice    trip     orient      galaxy win !situate ;; shoot   ;;;   anchor Bounce remind\nhorse \n traffic exotic since escape mimic ramp skin judge owner topple erode ';
    hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    const seed2 = hd._getSeed().toString('hex');
    assert.strictEqual(seed1, seed2);
    assert.ok(hd.validateMnemonic());
  });

  it('can generate addressess based on xpub', async function () {
    const xpub = 'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps';
    const hd = new HDLegacyP2PKHWallet();
    hd._xpub = xpub;
    assert.strictEqual(hd._getExternalAddressByIndex(0), '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG');
    assert.strictEqual(hd._getInternalAddressByIndex(0), '1KZjqYHm7a1DjhjcdcjfQvYfF2h6PqatjX');
    assert.strictEqual(hd._getExternalAddressByIndex(1), '1QDCFcpnrZ4yrAQxmbvSgeUC9iZZ8ehcR5');
    assert.strictEqual(hd._getInternalAddressByIndex(1), '13CW9WWBsWpDUvLtbFqYziWBWTYUoQb4nU');
    assert.ok(hd.getAllExternalAddresses().includes('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG'));
    assert.ok(hd.getAllExternalAddresses().includes('1QDCFcpnrZ4yrAQxmbvSgeUC9iZZ8ehcR5'));
    assert.ok(!hd.getAllExternalAddresses().includes('1KZjqYHm7a1DjhjcdcjfQvYfF2h6PqatjX')); // not internal
  });

  it('can consume user generated entropy', async () => {
    const hd = new HDSegwitP2SHWallet();
    const zeroes = [...Array(32)].map(() => 0);
    await hd.generateFromEntropy(Buffer.from(zeroes));
    assert.strictEqual(
      hd.getSecret(),
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
    );
  });

  it('can fullfill user generated entropy if less than 32 bytes provided', async () => {
    const hd = new HDSegwitP2SHWallet();
    const zeroes = [...Array(16)].map(() => 0);
    await hd.generateFromEntropy(Buffer.from(zeroes));
    const secret = hd.getSecret();
    assert.strictEqual(secret.startsWith('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon'), true);

    let secretWithoutChecksum = secret.split(' ');
    secretWithoutChecksum.pop();
    secretWithoutChecksum = secretWithoutChecksum.join(' ');
    assert.strictEqual(
      secretWithoutChecksum.endsWith('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon'),
      false,
    );

    assert.ok(secret.split(' ').length === 12 || secret.split(' ').length === 24);
  });

  it('can sign and verify messages', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    let signature;

    // external address
    signature = hd.signMessage('vires is numeris', hd._getExternalAddressByIndex(0));
    assert.strictEqual(signature, 'JMgoRSlLLLw6mw/Gbbg8Uj3fACkIJ85CZ52T5ZQfBnpUBkz0myRju6Rmgvmq7ugytc4WyYbzdGEc3wufNbjP09g=');
    assert.strictEqual(hd.verifyMessage('vires is numeris', hd._getExternalAddressByIndex(0), signature), true);

    // internal address
    signature = hd.signMessage('vires is numeris', hd._getInternalAddressByIndex(0));
    assert.strictEqual(signature, 'I5WkniWTnJhTW74t3kTAkHq3HdiupTNgOZLpMp0hvUfAJw2HMuyRiNLl2pbNWobNCCrmvffSWM7IgkOBz/J9fYA=');
    assert.strictEqual(hd.verifyMessage('vires is numeris', hd._getInternalAddressByIndex(0), signature), true);
  });

  it('can show fingerprint', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    assert.strictEqual(hd.getMasterFingerprintHex(), '73C5DA0A');
  });

  it('can use mnemonic with passphrase', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const passphrase = 'super secret passphrase';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    hd.setPassphrase(passphrase);

    assert.strictEqual(
      hd.getXpub(),
      'ypub6Xa3WiyXHriYt1fxZGWS8B1iduw92yxHCMWKSwJkW6w92FUCTJxwWQQHLXjRHBSsMLY6SvRu8ErqFEC3JmrkTHEm7KSUfbzhUhj7Yopo2JR',
    );

    assert.strictEqual(hd._getExternalAddressByIndex(0), '3BtnNenqpGTXwwjb5a1KgzzoKV4TjCuySm');
    assert.strictEqual(hd._getInternalAddressByIndex(0), '3EJctafkUBvcSHYhunQRa2iYUHjrMGLXBV');
    assert.strictEqual(hd._getExternalWIFByIndex(0), 'L489rJZvUMrFsNop9EyuG2XdEmyKNTbjC1DWkg9WGEc1ddK6jgDg');
  });

  it('can create with custom derivation path', async () => {
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    hd.setDerivationPath("m/49'/0'/1'");

    assert.strictEqual(
      hd.getXpub(),
      'ypub6Ww3ibxVfGzLtJR4F9SRBicspAfvmvw54yern9Q6qZWFC9T6FYA34K57La5Sgs8pXuyvpDfEHX5KNZRiZRukUWaVPyL4NxA69sEAqdoV8ve',
    );

    assert.strictEqual(hd._getExternalAddressByIndex(0), '35eszW2wmZ4hn7hfG5LGqxw5xCPjZcEJPM');
    assert.strictEqual(hd._getInternalAddressByIndex(0), '35gZZo6xPJEPgcz1cj1mTQHRMiPP97NGRY');
    assert.strictEqual(hd._getExternalWIFByIndex(0), 'KxTxanpst8612uDETejiDfSfbC2paXJi7teZ1ZfW5RpNfXbXnszw');

    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/49'/0'/1'/0/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/49'/0'/1'/1/0");
  });
});
