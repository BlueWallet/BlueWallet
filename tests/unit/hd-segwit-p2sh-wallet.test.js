import { SegwitP2SHWallet, SegwitBech32Wallet, HDSegwitP2SHWallet, HDLegacyP2PKHWallet, LegacyWallet } from '../../class';

describe('P2SH Segwit HD (BIP49)', () => {
  it('can create a wallet', async () => {
    const mnemonic =
      'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    expect('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK').toBe(hd._getExternalAddressByIndex(0));
    expect('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3').toBe(hd._getExternalAddressByIndex(1));
    expect('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei').toBe(hd._getInternalAddressByIndex(0));
    expect(hd.getAllExternalAddresses().includes('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK')).toBeTruthy();
    expect(hd.getAllExternalAddresses().includes('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3')).toBeTruthy();
    expect(!hd.getAllExternalAddresses().includes('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei')).toBeTruthy(); // not internal
    expect(true).toBe(hd.validateMnemonic());

    expect(hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex')).toBe(
      '0348192db90b753484601aaf1e6220644ffe37d83a9a5feff32b4da43739f736be',
    );
    expect(hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex')).toBe(
      '03c107e6976d59e17490513fbed3fb321736b7231d24f3d09306c72714acf1859d',
    );

    expect(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0))).toBe("m/49'/0'/0'/0/0");
    expect(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0))).toBe("m/49'/0'/0'/1/0");

    expect('L4MqtwJm6hkbACLG4ho5DF8GhcXdLEbbvpJnbzA9abfD6RDpbr2m').toBe(hd._getExternalWIFByIndex(0));
    expect('ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp').toBe(
      hd.getXpub(),
    );
  });

  it('can convert witness to address', () => {
    let address = SegwitP2SHWallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
    expect(address).toBe('34ZVGb3gT8xMLT6fpqC6dNVqJtJmvdjbD7');
    address = SegwitP2SHWallet.witnessToAddress();
    expect(address).toBe(false);
    address = SegwitP2SHWallet.witnessToAddress('trololo');
    expect(address).toBe(false);

    address = SegwitP2SHWallet.scriptPubKeyToAddress('a914e286d58e53f9247a4710e51232cce0686f16873c87');
    expect(address).toBe('3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
    address = SegwitP2SHWallet.scriptPubKeyToAddress();
    expect(address).toBe(false);
    address = SegwitP2SHWallet.scriptPubKeyToAddress('trololo');
    expect(address).toBe(false);

    address = SegwitBech32Wallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
    expect(address).toBe('bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv');
    address = SegwitBech32Wallet.witnessToAddress();
    expect(address).toBe(false);
    address = SegwitBech32Wallet.witnessToAddress('trololo');
    expect(address).toBe(false);

    address = SegwitBech32Wallet.scriptPubKeyToAddress('00144d757460da5fcaf84cc22f3847faaa1078e84f6a');
    expect(address).toBe('bc1qf46hgcx6tl90snxz9uuy0742zpuwsnm27ysdh7');
    address = SegwitBech32Wallet.scriptPubKeyToAddress();
    expect(address).toBe(false);
    address = SegwitBech32Wallet.scriptPubKeyToAddress('trololo');
    expect(address).toBe(false);

    address = LegacyWallet.scriptPubKeyToAddress('76a914d0b77eb1502c81c4093da9aa6eccfdf560cdd6b288ac');
    expect(address).toBe('1L2bNMGRQQLT2AVUek4K9L7sn3SSMioMgE');
    address = LegacyWallet.scriptPubKeyToAddress();
    expect(address).toBe(false);
    address = LegacyWallet.scriptPubKeyToAddress('trololo');
    expect(address).toBe(false);
  });

  it('Segwit HD (BIP49) can generate addressess only via ypub', function () {
    const ypub = 'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp';
    const hd = new HDSegwitP2SHWallet();
    hd._xpub = ypub;
    expect('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK').toBe(hd._getExternalAddressByIndex(0));
    expect('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3').toBe(hd._getExternalAddressByIndex(1));
    expect('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei').toBe(hd._getInternalAddressByIndex(0));
    expect(hd.getAllExternalAddresses().includes('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK')).toBeTruthy();
    expect(hd.getAllExternalAddresses().includes('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3')).toBeTruthy();
    expect(!hd.getAllExternalAddresses().includes('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei')).toBeTruthy(); // not internal
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
      expect(secret.split(' ').length === 12 || secret.split(' ').length === 24).toBeTruthy();
    }

    const hd2 = new HDSegwitP2SHWallet();
    hd2.setSecret(hd.getSecret());
    expect(hd2.validateMnemonic()).toBeTruthy();
  });

  it('can work with malformed mnemonic', () => {
    let mnemonic =
      'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode';
    let hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    const seed1 = hd._getSeed().toString('hex');
    expect(hd.validateMnemonic()).toBeTruthy();

    mnemonic = 'hell';
    hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    expect(!hd.validateMnemonic()).toBeTruthy();

    // now, malformed mnemonic

    mnemonic =
      '    honey  risk   juice    trip     orient      galaxy win !situate ;; shoot   ;;;   anchor Bounce remind\nhorse \n traffic exotic since escape mimic ramp skin judge owner topple erode ';
    hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    const seed2 = hd._getSeed().toString('hex');
    expect(seed1).toBe(seed2);
    expect(hd.validateMnemonic()).toBeTruthy();
  });

  it('can generate addressess based on xpub', async function () {
    const xpub = 'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps';
    const hd = new HDLegacyP2PKHWallet();
    hd._xpub = xpub;
    expect(hd._getExternalAddressByIndex(0)).toBe('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG');
    expect(hd._getInternalAddressByIndex(0)).toBe('1KZjqYHm7a1DjhjcdcjfQvYfF2h6PqatjX');
    expect(hd._getExternalAddressByIndex(1)).toBe('1QDCFcpnrZ4yrAQxmbvSgeUC9iZZ8ehcR5');
    expect(hd._getInternalAddressByIndex(1)).toBe('13CW9WWBsWpDUvLtbFqYziWBWTYUoQb4nU');
    expect(hd.getAllExternalAddresses().includes('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG')).toBeTruthy();
    expect(hd.getAllExternalAddresses().includes('1QDCFcpnrZ4yrAQxmbvSgeUC9iZZ8ehcR5')).toBeTruthy();
    expect(!hd.getAllExternalAddresses().includes('1KZjqYHm7a1DjhjcdcjfQvYfF2h6PqatjX')).toBeTruthy(); // not internal
  });

  it('can consume user generated entropy', async () => {
    const hd = new HDSegwitP2SHWallet();
    const zeroes = [...Array(32)].map(() => 0);
    await hd.generateFromEntropy(Buffer.from(zeroes));
    expect(hd.getSecret()).toBe(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
    );
  });

  it('can fullfill user generated entropy if less than 32 bytes provided', async () => {
    const hd = new HDSegwitP2SHWallet();
    const zeroes = [...Array(16)].map(() => 0);
    await hd.generateFromEntropy(Buffer.from(zeroes));
    const secret = hd.getSecret();
    expect(secret.startsWith('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon')).toBe(true);

    let secretWithoutChecksum = secret.split(' ');
    secretWithoutChecksum.pop();
    secretWithoutChecksum = secretWithoutChecksum.join(' ');
    expect(secretWithoutChecksum.endsWith('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon')).toBe(
      false,
    );

    expect(secret.split(' ').length === 12 || secret.split(' ').length === 24).toBeTruthy();
  });

  it('can sign and verify messages', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    let signature;

    // external address
    signature = hd.signMessage('vires is numeris', hd._getExternalAddressByIndex(0));
    expect(signature).toBe('JMgoRSlLLLw6mw/Gbbg8Uj3fACkIJ85CZ52T5ZQfBnpUBkz0myRju6Rmgvmq7ugytc4WyYbzdGEc3wufNbjP09g=');
    expect(hd.verifyMessage('vires is numeris', hd._getExternalAddressByIndex(0), signature)).toBe(true);

    // internal address
    signature = hd.signMessage('vires is numeris', hd._getInternalAddressByIndex(0));
    expect(signature).toBe('I5WkniWTnJhTW74t3kTAkHq3HdiupTNgOZLpMp0hvUfAJw2HMuyRiNLl2pbNWobNCCrmvffSWM7IgkOBz/J9fYA=');
    expect(hd.verifyMessage('vires is numeris', hd._getInternalAddressByIndex(0), signature)).toBe(true);
  });

  it('can show fingerprint', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    expect(hd.getMasterFingerprintHex()).toBe('73C5DA0A');
  });

  it('can use mnemonic with passphrase', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const passphrase = 'super secret passphrase';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    hd.setPassphrase(passphrase);

    expect(hd.getXpub()).toBe(
      'ypub6Xa3WiyXHriYt1fxZGWS8B1iduw92yxHCMWKSwJkW6w92FUCTJxwWQQHLXjRHBSsMLY6SvRu8ErqFEC3JmrkTHEm7KSUfbzhUhj7Yopo2JR',
    );

    expect(hd._getExternalAddressByIndex(0)).toBe('3BtnNenqpGTXwwjb5a1KgzzoKV4TjCuySm');
    expect(hd._getInternalAddressByIndex(0)).toBe('3EJctafkUBvcSHYhunQRa2iYUHjrMGLXBV');
    expect(hd._getExternalWIFByIndex(0)).toBe('L489rJZvUMrFsNop9EyuG2XdEmyKNTbjC1DWkg9WGEc1ddK6jgDg');
  });
});
