/* global it, jasmine */
import { SegwitP2SHWallet, SegwitBech32Wallet, HDSegwitP2SHWallet, HDLegacyBreadwalletWallet, HDLegacyP2PKHWallet } from './class';
let assert = require('assert');

it('can convert witness to address', () => {
  let address = SegwitP2SHWallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
  assert.equal(address, '34ZVGb3gT8xMLT6fpqC6dNVqJtJmvdjbD7');

  address = SegwitBech32Wallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
  assert.equal(address, 'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv');
});

it('can create a Segwit HD (BIP49)', async function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
  let mnemonic =
    'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode';
  let hd = new HDSegwitP2SHWallet();
  hd.setSecret(mnemonic);
  assert.equal('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', hd._getExternalAddressByIndex(0));
  assert.equal('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3', hd._getExternalAddressByIndex(1));
  assert.equal('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei', hd._getInternalAddressByIndex(0));
  assert.equal(true, hd.validateMnemonic());

  await hd.fetchBalance();
  assert.equal(hd.getBalance(), 0);

  assert.ok(hd._lastTxFetch === 0);
  await hd.fetchTransactions();
  assert.ok(hd._lastTxFetch > 0);
  assert.equal(hd.transactions.length, 4);

  assert.equal('L4MqtwJm6hkbACLG4ho5DF8GhcXdLEbbvpJnbzA9abfD6RDpbr2m', hd._getExternalWIFByIndex(0));
  assert.equal(
    'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp',
    hd.getXpub(),
  );

  // checking that internal pointer and async address getter return the same address
  let freeAddress = await hd.getAddressAsync();
  assert.equal(hd._getExternalAddressByIndex(hd.next_free_address_index), freeAddress);
  let freeChangeAddress = await hd.getChangeAddressAsync();
  assert.equal(hd._getInternalAddressByIndex(hd.next_free_change_address_index), freeChangeAddress);
});

it('Segwit HD (BIP49) can generate addressess only via ypub', async function() {
  let ypub = 'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp';
  let hd = new HDSegwitP2SHWallet();
  hd._xpub = ypub;
  assert.equal('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', hd._getExternalAddressByIndex(0));
  assert.equal('35p5LwCAE7mH2css7onyQ1VuS1jgWtQ4U3', hd._getExternalAddressByIndex(1));
  assert.equal('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei', hd._getInternalAddressByIndex(0));
});

it('can generate Segwit HD (BIP49)', async () => {
  let hd = new HDSegwitP2SHWallet();
  let hashmap = {};
  for (let c = 0; c < 1000; c++) {
    hd.generate();
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

it('HD (BIP49) can create TX', async () => {
  if (!process.env.HD_MNEMONIC) {
    console.error('process.env.HD_MNEMONIC not set, skipped');
    return;
  }
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 90 * 1000;
  let hd = new HDSegwitP2SHWallet();
  hd.setSecret(process.env.HD_MNEMONIC);
  assert.ok(hd.validateMnemonic());

  await hd.fetchUtxo();
  await hd.getChangeAddressAsync(); // to refresh internal pointer to next free address
  await hd.getAddressAsync(); // to refresh internal pointer to next free address
  let txhex = hd.createTx(hd.utxo, 0.000014, 0.000001, '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK');
  assert.equal(
    txhex,
    '010000000001029d98d81fe2b596fd79e845fa9f38d7e0b6fb73303c40fac604d04df1fa137aee00000000171600142f18e8406c9d210f30c901b24e5feeae78784eb7ffffffff67fb86f310df24e508d40fce9511c7fde4dd4ee91305fd08a074279a70e2cd22000000001716001468dde644410cc789d91a7f36b823f38369755a1cffffffff02780500000000000017a914a3a65daca3064280ae072b9d6773c027b30abace87dc0500000000000017a914850f4dbc255654de2c12c6f6d79cf9cb756cad038702483045022100dc8390a9fd34c31259fa47f9fc182f20d991110ecfd5b58af1cf542fe8de257a022004c2d110da7b8c4127675beccc63b46fd65c706951f090fd381fa3b21d3c5c08012102edd141c5a27a726dda66be10a38b0fd3ccbb40e7c380034aaa43a1656d5f4dd60247304402207c0aef8313d55e72474247daad955979f62e56d1cbac5f2d14b8b022c6ce112602205d9aa3804f04624b12ab8a5ab0214b529c531c2f71c27c6f18aba6502a6ea0a80121030db3c49461a5e539e97bab62ab2b8f88151d1c2376493cf73ef1d02ef60637fd00000000',
  );

  let bitcoin = require('bitcoinjs-lib');
  txhex = hd.createTx(hd.utxo, 0.000005, 0.000001, '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK');
  var tx = bitcoin.Transaction.fromHex(txhex);
  assert.equal(tx.ins.length, 1);
  assert.equal(tx.outs.length, 2);
  assert.equal(tx.outs[0].value, 500);
  assert.equal(tx.outs[1].value, 400);
  let chunksIn = bitcoin.script.decompile(tx.outs[0].script);
  let toAddress = bitcoin.address.fromOutputScript(chunksIn);
  chunksIn = bitcoin.script.decompile(tx.outs[1].script);
  let changeAddress = bitcoin.address.fromOutputScript(chunksIn);
  assert.equal('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', toAddress);
  assert.equal(hd._getInternalAddressByIndex(hd.next_free_change_address_index), changeAddress);

  //

  txhex = hd.createTx(hd.utxo, 0.000015, 0.000001, '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK');
  tx = bitcoin.Transaction.fromHex(txhex);
  assert.equal(tx.ins.length, 2);
  assert.equal(tx.outs.length, 2);

  //

  txhex = hd.createTx(hd.utxo, 0.00025, 0.00001, '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK');
  tx = bitcoin.Transaction.fromHex(txhex);
  assert.equal(tx.ins.length, 7);
  assert.equal(tx.outs.length, 1);
  chunksIn = bitcoin.script.decompile(tx.outs[0].script);
  toAddress = bitcoin.address.fromOutputScript(chunksIn);
  assert.equal('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', toAddress);
});

it('Segwit HD (BIP49) can fetch UTXO', async function() {
  let hd = new HDSegwitP2SHWallet();
  hd.usedAddresses = ['1Ez69SnzzmePmZX3WpEzMKTrcBF2gpNQ55', '1BiTCHeYzJNMxBLFCMkwYXNdFEdPJP53ZV']; // hacking internals
  await hd.fetchUtxo();
  assert.equal(hd.utxo.length, 9);
  assert.ok(typeof hd.utxo[0].confirmations === 'number');
  assert.ok(hd.utxo[0].txid);
  assert.ok(hd.utxo[0].vout);
  assert.ok(hd.utxo[0].amount);
  assert.ok(
    hd.utxo[0].address &&
      (hd.utxo[0].address === '1Ez69SnzzmePmZX3WpEzMKTrcBF2gpNQ55' || hd.utxo[0].address === '1BiTCHeYzJNMxBLFCMkwYXNdFEdPJP53ZV'),
  );
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
  assert.equal(seed1, seed2);
  assert.ok(hd.validateMnemonic());
});

it('can create a Legacy HD (BIP44)', async function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
  let mnemonic = 'high relief amount witness try remember adult destroy puppy fox giant peace';
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
  assert.ok(hd._lastTxFetch === 0);
  await hd.fetchTransactions();
  assert.ok(hd._lastTxFetch > 0);
  assert.equal(hd.transactions.length, 4);
  assert.equal(hd.next_free_address_index, 1);
  assert.equal(hd.next_free_change_address_index, 1);

  for (let tx of hd.getTransactions()) {
    assert.ok(tx.value === 1000 || tx.value === 1377 || tx.value === -1377 || tx.value === -1000);
  }

  // checking that internal pointer and async address getter return the same address
  let freeAddress = await hd.getAddressAsync();
  assert.equal(hd._getExternalAddressByIndex(hd.next_free_address_index), freeAddress);
});

it('Legacy HD (BIP44) can generate addressess based on xpub', async function() {
  let xpub = 'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps';
  let hd = new HDLegacyP2PKHWallet();
  hd._xpub = xpub;
  assert.equal(hd._getExternalAddressByIndex(0), '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG');
  assert.equal(hd._getInternalAddressByIndex(0), '1KZjqYHm7a1DjhjcdcjfQvYfF2h6PqatjX');
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

  assert.ok(hdBread._lastTxFetch === 0);
  await hdBread.fetchTransactions();
  assert.ok(hdBread._lastTxFetch > 0);
  assert.equal(hdBread.transactions.length, 177);
  for (let tx of hdBread.getTransactions()) {
    assert.ok(tx.confirmations);
  }

  assert.equal(hdBread.next_free_address_index, 10);
  assert.equal(hdBread.next_free_change_address_index, 118);

  // checking that internal pointer and async address getter return the same address
  let freeAddress = await hdBread.getAddressAsync();
  assert.equal(hdBread._getExternalAddressByIndex(hdBread.next_free_address_index), freeAddress);
});

it('can convert blockchain.info TX to blockcypher TX format', () => {
  const blockchaininfotx = {
    hash: '25aa409a9ecbea6a987b35cef18ffa9c53f5ba985bdaadffaac85cdf9fdbb9e1',
    ver: 1,
    vin_sz: 1,
    vout_sz: 1,
    size: 189,
    weight: 756,
    fee: 1184,
    relayed_by: '0.0.0.0',
    lock_time: 0,
    tx_index: 357712243,
    double_spend: false,
    result: -91300,
    balance: 0,
    time: 1530469581,
    block_height: 530072,
    inputs: [
      {
        prev_out: {
          value: 91300,
          tx_index: 357704878,
          n: 1,
          spent: true,
          script: '76a9147580ebb44301a1165e73e25bcccd7372e1bbfe9c88ac',
          type: 0,
          addr: '1BiJW1jyUaxcJp2JWwbPLPzB1toPNWTFJV',
          xpub: {
            m: 'xpub68nLLEi3KERQY7jyznC9PQSpSjmekrEmN8324YRCXayMXaavbdEJsK4gEcX2bNf9vGzT4xRks9utZ7ot1CTHLtdyCn9udvv1NWvtY7HXroh',
            path: 'M/1/117',
          },
        },
        sequence: 4294967295,
        script:
          '47304402206f676bd8c87dcf6f9e5016a8d222b06cd542d824e3b22c9ae937c05e59590f7602206cfb75a516e70a79e5f33031a189ebca55f1339be8fcd94b1e1fc9149b55354201210339b7fc52be2c33a64f8f4020c9e80fb23f5ee89992a8c5dd070309b001f16a21',
        witness: '',
      },
    ],
    out: [
      {
        value: 90116,
        tx_index: 357712243,
        n: 0,
        spent: true,
        script: 'a914e286d58e53f9247a4710e51232cce0686f16873c87',
        type: 0,
        addr: '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC',
      },
    ],
  };
  let blockcyphertx = HDSegwitP2SHWallet.convertTx(blockchaininfotx);
  assert.ok(blockcyphertx.received); // time
  assert.ok(blockcyphertx.hash);
  assert.ok(blockcyphertx.value);
  assert.ok(typeof blockcyphertx.confirmations === 'number');
  assert.ok(blockcyphertx.outputs);
});
