/* global it, jasmine */
import {
  SegwitP2SHWallet,
  SegwitBech32Wallet,
  HDSegwitP2SHWallet,
  HDLegacyBreadwalletWallet,
} from './class';
let assert = require('assert');

it.only('can convert witness to address', () => {
  let address = SegwitP2SHWallet.witnessToAddress(
    '035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8',
  );
  assert.equal(address, '34ZVGb3gT8xMLT6fpqC6dNVqJtJmvdjbD7');

  address = SegwitBech32Wallet.witnessToAddress(
    '035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8',
  );
  assert.equal(address, 'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv');
});

it('can create a BIP49', function() {
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
  let address = bitcoin.address.fromOutputScript(
    outputScript,
    bitcoin.networks.bitcoin,
  );

  assert.equal(address, '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK');

  // checking that WIF from HD corresponds to derived segwit address
  let Segwit = new SegwitP2SHWallet();
  Segwit.setSecret(child.keyPair.toWIF());
  assert.equal(address, Segwit.getAddress());

  // testing our class
  let hd = new HDSegwitP2SHWallet();
  hd.setSecret(mnemonic);
  assert.equal(address, hd._getExternalAddressByIndex(0));
  assert.equal(true, hd.validateMnemonic());

  assert.equal(child.keyPair.toWIF(), hd._getExternalWIFByIndex(0));
});

it('HD breadwallet works', async function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 300 * 1000;
  let hdBread = new HDLegacyBreadwalletWallet();
  hdBread.setSecret(
    'high relief amount witness try remember adult destroy puppy fox giant peace',
  );
  console.log(
    'bread 0/0 = ',
    hdBread._getExternalAddressByIndex(0),
    'bread 1/0 = ',
    hdBread._getInternalAddressByIndex(0),
    'valid = ',
    hdBread.validateMnemonic(),
  );
  console.log(hdBread.getXpub());
  await hdBread.fetchBalance();
  console.log(hdBread.balance);

  await hdBread.fetchTransactions();
  console.log('tx count  = ', hdBread.transactions.length);

  console.log(
    hdBread.next_free_address_index,
    hdBread.next_free_change_address_index,
  );

  // let bitcoin = require('bitcoinjs-lib');
  // let node = bitcoin.HDNode.fromBase58( hdBread.getXpub() );
  // console.log( "normal address", node.derive(0).derive(0).getAddress());
});
