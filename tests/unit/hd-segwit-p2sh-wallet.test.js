/* global it */
import { SegwitP2SHWallet, SegwitBech32Wallet, HDSegwitP2SHWallet, HDLegacyP2PKHWallet, LegacyWallet } from '../../class';
global.crypto = require('crypto'); // shall be used by tests under nodejs CLI, but not in RN environment
let assert = require('assert');

it('can create a Segwit HD (BIP49)', async function() {
  let mnemonic =
    'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode';
  let hd = new HDSegwitP2SHWallet();
  hd.setSecret(mnemonic);
  assert.strictEqual('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', hd._getExternalAddressByIndex(0));
  assert.strictEqual('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3', hd._getExternalAddressByIndex(1));
  assert.strictEqual('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei', hd._getInternalAddressByIndex(0));
  assert.strictEqual(true, hd.validateMnemonic());

  assert.strictEqual(
    hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex'),
    '0348192db90b753484601aaf1e6220644ffe37d83a9a5feff32b4da43739f736be',
  );
  assert.strictEqual(
    hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex'),
    '03c107e6976d59e17490513fbed3fb321736b7231d24f3d09306c72714acf1859d',
  );

  assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/84'/0'/0'/0/0"); // wrong, FIXME
  assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/84'/0'/0'/1/0"); // wrong, FIXME

  assert.strictEqual('L4MqtwJm6hkbACLG4ho5DF8GhcXdLEbbvpJnbzA9abfD6RDpbr2m', hd._getExternalWIFByIndex(0));
  assert.strictEqual(
    'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp',
    hd.getXpub(),
  );
});

it('can convert witness to address', () => {
  let address = SegwitP2SHWallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
  assert.strictEqual(address, '34ZVGb3gT8xMLT6fpqC6dNVqJtJmvdjbD7');

  address = SegwitP2SHWallet.scriptPubKeyToAddress('a914e286d58e53f9247a4710e51232cce0686f16873c87');
  assert.strictEqual(address, '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');

  address = SegwitBech32Wallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
  assert.strictEqual(address, 'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv');

  address = SegwitBech32Wallet.scriptPubKeyToAddress('00144d757460da5fcaf84cc22f3847faaa1078e84f6a');
  assert.strictEqual(address, 'bc1qf46hgcx6tl90snxz9uuy0742zpuwsnm27ysdh7');

  address = LegacyWallet.scriptPubKeyToAddress('76a914d0b77eb1502c81c4093da9aa6eccfdf560cdd6b288ac');
  assert.strictEqual(address, '1L2bNMGRQQLT2AVUek4K9L7sn3SSMioMgE');
});

it('Segwit HD (BIP49) can generate addressess only via ypub', function() {
  let ypub = 'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp';
  let hd = new HDSegwitP2SHWallet();
  hd._xpub = ypub;
  assert.strictEqual('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', hd._getExternalAddressByIndex(0));
  assert.strictEqual('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3', hd._getExternalAddressByIndex(1));
  assert.strictEqual('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei', hd._getInternalAddressByIndex(0));
});

it('can generate Segwit HD (BIP49)', async () => {
  let hd = new HDSegwitP2SHWallet();
  let hashmap = {};
  for (let c = 0; c < 1000; c++) {
    await hd.generate();
    let secret = hd.getSecret();
    if (hashmap[secret]) {
      throw new Error('Duplicate secret generated!');
    }
    hashmap[secret] = 1;
    assert.ok(secret.split(' ').length === 12 || secret.split(' ').length === 24);
  }

  let hd2 = new HDSegwitP2SHWallet();
  hd2.setSecret(hd.getSecret());
  assert.ok(hd2.validateMnemonic());
});

it('can work with malformed mnemonic', () => {
  let mnemonic =
    'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode';
  let hd = new HDSegwitP2SHWallet();
  hd.setSecret(mnemonic);
  let seed1 = hd.getMnemonicToSeedHex();
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
  let seed2 = hd.getMnemonicToSeedHex();
  assert.strictEqual(seed1, seed2);
  assert.ok(hd.validateMnemonic());
});

it('Legacy HD (BIP44) can generate addressess based on xpub', async function() {
  let xpub = 'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps';
  let hd = new HDLegacyP2PKHWallet();
  hd._xpub = xpub;
  assert.strictEqual(hd._getExternalAddressByIndex(0), '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG');
  assert.strictEqual(hd._getInternalAddressByIndex(0), '1KZjqYHm7a1DjhjcdcjfQvYfF2h6PqatjX');
  assert.strictEqual(hd._getExternalAddressByIndex(1), '1QDCFcpnrZ4yrAQxmbvSgeUC9iZZ8ehcR5');
  assert.strictEqual(hd._getInternalAddressByIndex(1), '13CW9WWBsWpDUvLtbFqYziWBWTYUoQb4nU');
});
