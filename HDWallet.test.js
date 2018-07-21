/* global it, jasmine */
import {
  SegwitP2SHWallet,
  SegwitBech32Wallet,
  HDSegwitP2SHWallet,
  HDLegacyBreadwalletWallet,
  HDLegacyP2PKHWallet,
  LegacyWallet,
} from './class';
let assert = require('assert');

it('can convert witness to address', () => {
  let address = SegwitP2SHWallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
  assert.equal(address, '34ZVGb3gT8xMLT6fpqC6dNVqJtJmvdjbD7');

  address = SegwitBech32Wallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
  assert.equal(address, 'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv');
});

it('can create a Segwit HD (BIP49)', async function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
  let bip39 = require('bip39');
  let bitcoin = require('bitcoinjs-lib');
  let mnemonic =
    'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode';
  assert.ok(bip39.validateMnemonic(mnemonic));
  let seed = bip39.mnemonicToSeed(mnemonic);
  let root = bitcoin.HDNode.fromSeedBuffer(seed);

  let path = "m/49'/0'/0'/0/0";
  let child = root.derivePath(path);

  let keyhash = bitcoin.crypto.hash160(child.getPublicKeyBuffer());
  let scriptSig = bitcoin.script.witnessPubKeyHash.output.encode(keyhash);
  let addressBytes = bitcoin.crypto.hash160(scriptSig);
  let outputScript = bitcoin.script.scriptHash.output.encode(addressBytes);
  let address = bitcoin.address.fromOutputScript(outputScript, bitcoin.networks.bitcoin);

  assert.equal(address, '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK');

  // checking that WIF from HD corresponds to derived segwit address
  let Segwit = new SegwitP2SHWallet();
  Segwit.setSecret(child.keyPair.toWIF());
  assert.equal(address, Segwit.getAddress());

  // testing our class
  let hd = new HDSegwitP2SHWallet();
  hd.setSecret(mnemonic);
  assert.equal(address, hd._getExternalAddressByIndex(0));
  assert.equal('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3', hd._getExternalAddressByIndex(1));
  assert.equal('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei', hd._getInternalAddressByIndex(0));
  assert.equal(true, hd.validateMnemonic());

  await hd.fetchBalance();
  assert.equal(hd.getBalance(), 0);

  await hd.fetchTransactions();
  assert.equal(hd.transactions.length, 2);

  assert.equal(child.keyPair.toWIF(), hd._getExternalWIFByIndex(0));
  assert.equal(
    'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp',
    hd.getXpub(),
  );

  // checking that internal pointer and async address getter return the same address
  let freeAddress = await hd.getAddressAsync();
  assert.equal(hd._getExternalAddressByIndex(hd.next_free_address_index), freeAddress);
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
    '    honey  risk   juice    trip     orient      galaxy win !situate ;; shoot   ;;;   anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode ';
  hd = new HDSegwitP2SHWallet();
  hd.setSecret(mnemonic);
  let seed2 = hd.getMnemonicToSeedHex();
  assert.equal(seed1, seed2);
  assert.ok(hd.validateMnemonic());
});

it('can create a Legacy HD (BIP44)', async function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
  let bip39 = require('bip39');
  let bitcoin = require('bitcoinjs-lib');
  let mnemonic = 'high relief amount witness try remember adult destroy puppy fox giant peace';
  assert.ok(bip39.validateMnemonic(mnemonic));
  let seed = bip39.mnemonicToSeed(mnemonic);
  let root = bitcoin.HDNode.fromSeedBuffer(seed);

  let path = "m/44'/0'/0'/0/0";
  let child = root.derivePath(path);

  let w = new LegacyWallet();
  w.setSecret(child.keyPair.toWIF());
  assert.equal('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG', w.getAddress());

  // testing our class
  let hd = new HDLegacyP2PKHWallet();
  hd.setSecret(mnemonic);
  assert.equal(hd.validateMnemonic(), true);
  assert.equal(hd._getExternalAddressByIndex(0), '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG');
  assert.equal(hd._getInternalAddressByIndex(0), '1KZjqYHm7a1DjhjcdcjfQvYfF2h6PqatjX');
  assert.equal(
    hd.getXpub(),
    'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps',
  );

  assert.equal(hd._getExternalWIFByIndex(0), 'L1hqNoJ26YuCdujMBJfWBNfgf4Jo7AcKFvcNcKLoMtoJDdDtRq7Q');
  assert.equal(hd._getInternalWIFByIndex(0), 'Kx3QkrfemEEV49Mj5oWfb4bsWymboPdstta7eN3kAzop9apxYEFP');
  await hd.fetchBalance();
  assert.equal(hd.balance, 0);
  await hd.fetchTransactions();
  assert.equal(hd.transactions.length, 4);
  assert.equal(hd.next_free_address_index, 1);
  assert.equal(hd.next_free_change_address_index, 1);

  // checking that internal pointer and async address getter return the same address
  let freeAddress = await hd.getAddressAsync();
  assert.equal(hd._getExternalAddressByIndex(hd.next_free_address_index), freeAddress);
});

it('HD breadwallet works', async function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 300 * 1000;
  let hdBread = new HDLegacyBreadwalletWallet();
  hdBread.setSecret('high relief amount witness try remember adult destroy puppy fox giant peace');

  assert.equal(hdBread.validateMnemonic(), true);
  assert.equal(hdBread._getExternalAddressByIndex(0), '1ARGkNMdsBE36fJhddSwf8PqBXG3s4d2KU');
  assert.equal(hdBread._getInternalAddressByIndex(0), '1JLvA5D7RpWgChb4A5sFcLNrfxYbyZdw3V');

  assert.equal(
    hdBread.getXpub(),
    'xpub68nLLEi3KERQY7jyznC9PQSpSjmekrEmN8324YRCXayMXaavbdEJsK4gEcX2bNf9vGzT4xRks9utZ7ot1CTHLtdyCn9udvv1NWvtY7HXroh',
  );
  await hdBread.fetchBalance();
  assert.equal(hdBread.balance, 0);

  await hdBread.fetchTransactions();
  assert.equal(hdBread.transactions.length, 175);

  assert.equal(hdBread.next_free_address_index, 10);
  assert.equal(hdBread.next_free_change_address_index, 118);

  // checking that internal pointer and async address getter return the same address
  let freeAddress = await hdBread.getAddressAsync();
  assert.equal(hdBread._getExternalAddressByIndex(hdBread.next_free_address_index), freeAddress);
});
