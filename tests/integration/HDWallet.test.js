import { SegwitP2SHWallet, SegwitBech32Wallet, HDSegwitP2SHWallet, HDLegacyP2PKHWallet } from '../../class';
import config from '../../config';
/* global it, jasmine, afterAll, beforeAll */
import { BitcoinUnit } from '../../models/bitcoinUnits';

const assert = require('assert');
const bitcoin = require('bitcoinjs-lib');
global.crypto = require('crypto'); // shall be used by tests under nodejs CLI, but not in RN environment

global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
const BlueElectrum = require('../../BlueElectrum');
// so it connects ASAP
jest.setTimeout(300000);

afterAll(() => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
  return new Promise(resolve => setTimeout(resolve, 10000)); // simple sleep to wait for all timeouts termination
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  try {
    await BlueElectrum.waitTillConnected();
  } catch (Err) {
    console.log('failed to connect to Electrum:', Err);
    process.exit(2);
  }
});

it('can convert witness to address', () => {
  let address = SegwitP2SHWallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
  assert.strictEqual(address, 'RC9fRZSXW4SYKHmSAuWdJGU6vdUezHmowA');

  address = SegwitP2SHWallet.scriptPubKeyToAddress('a914e286d58e53f9247a4710e51232cce0686f16873c87');
  assert.strictEqual(address, 'RVvxKKBuC7jRDuYxmmXTex4F4Bqs86Vfca');

  address = SegwitBech32Wallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
  assert.strictEqual(address, 'royale1quhnve8q4tk3unhmjts7ymxv8cd6w9xv80d8n3p');

  address = SegwitBech32Wallet.scriptPubKeyToAddress('00144d757460da5fcaf84cc22f3847faaa1078e84f6a');
  assert.strictEqual(address, 'royale1qf46hgcx6tl90snxz9uuy0742zpuwsnm2ldam6n');
});

xit('can create a Segwit HD (BIP49)', async function() {
  const mnemonic =
    'fiber quiz produce chuckle sort crisp price direct speak recipe adult layer thumb lift tape start peace wave jungle fluid green interest cave learn';
  const hd = new HDSegwitP2SHWallet();
  await hd.setSecret(mnemonic);
  assert.strictEqual(hd.getAddress()[0], 'RVUYxQnej5m99PEr5qKrMS128czSCSPz4W');
  assert.strictEqual(hd.getAddress()[1], 'RA4DhjMkk67nBYbNhPh8q3Zh3mDeGZzCdX');
  assert.strictEqual(hd.getAddress()[2], 'RKBm1Wz1tPBefb92d3hEXYMZqZTsxEcPJe');
  assert.strictEqual(true, hd.validateMnemonic());

  await hd.fetchBalance();
  assert.strictEqual(hd.getBalance(), 0);

  assert.ok(hd._lastTxFetch === 0);
  await hd.fetchTransactions();
  assert.ok(hd._lastTxFetch > 0);
  assert.strictEqual(hd.transactions.length, 2);

  assert.strictEqual(await hd._getWIFByIndex(0), 'L5KcrwqMGgEtVnsM4ZGS6XdRoBDinfb1hfFW61RhsY9QuumePh8b');
  assert.strictEqual(
    await hd.getXpub(),
    'ypub6Wj9dHZAtSM3DQB6kG37aK5i1yJbBoM2d1W57aMkyLx4cNyGqWYpGvL194zA4HSxWpQyoPrsXE2PP4pNUqu5cvvHUK2ZpfUeHFmuK4THAD3',
  );
});

xit('HD (BIP49) can work with a gap', async function() {
  jest.setTimeout(300000);
  const hd = new HDSegwitP2SHWallet();
  hd._xpub =
    'ypub6XRzrn3HB1tjhhvrHbk1vnXCecZEdXohGzCk3GXwwbDoJ3VBzZ34jNGWbC6WrS7idXrYjjXEzcPDX5VqnHEnuNf5VAXgLfSaytMkJ2rwVqy'; // has gap
  await hd.fetchBalance();

  // for (let c = 0; c < 5; c++) {
  //   console.log('internal', c, hd._getInternalAddressByIndex(c));
  // }

  // for (let c = 0; c < 5; c++) {
  //   console.log('external', c, hd._getExternalAddressByIndex(c));
  // }
  await hd.fetchTransactions();
  assert.ok(hd.transactions.length >= 3);
});

it.skip('Segwit HD (BIP49) can batch fetch many txs', async function() {
  jest.setTimeout(300000);
  const hd = new HDSegwitP2SHWallet();
  hd._xpub =
    'ypub6WZ2c7YJ1SQ1rBYftwMqwV9bBmybXzETFxWmkzMz25bCf6FkDdXjNgR7zRW8JGSnoddNdUH7ZQS7JeQAddxdGpwgPskcsXFcvSn1JdGVcPQ';
  await hd.fetchBalance();
  await hd.fetchTransactions();
  assert.ok(hd.getTransactions().length === 153);
});

it.skip('Segwit HD (BIP49) can fetch more data if pointers to last_used_addr are lagging behind', async function() {
  jest.setTimeout(300000);
  const hd = new HDSegwitP2SHWallet();
  hd._xpub =
    'ypub6Wj9dHZAtSM3DQB6kG37aK5i1yJbBoM2d1W57aMkyLx4cNyGqWYpGvL194zA4HSxWpQyoPrsXE2PP4pNUqu5cvvHUK2ZpfUeHFmuK4THAD3';
  hd.next_free_change_address_index = 40;
  hd.next_free_address_index = 50;
  await hd.fetchBalance();
  await hd.fetchTransactions();
  assert.strictEqual(hd.getTransactions().length, 153);
});

xit('Segwit HD (BIP49) can generate addressess only via ypub', function() {
  const ypub =
    'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp';
  const hd = new HDSegwitP2SHWallet();
  hd._xpub = ypub;
  hd.generateAddresses();
  assert.strictEqual(hd.getAddress()[0], 'RVUYxQnej5m99PEr5qKrMS128czSCSPz4W');
  assert.strictEqual(hd.getAddress()[1], 'RA4DhjMkk67nBYbNhPh8q3Zh3mDeGZzCdX');
  assert.strictEqual(hd.getAddress()[2], 'RKBm1Wz1tPBefb92d3hEXYMZqZTsxEcPJe');
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

it('HD (BIP49) can create TX', async () => {
  if (!process.env.HD_MNEMONIC_BIP49) {
    console.error('process.env.HD_MNEMONIC_BIP49 not set, skipped');
    return;
  }
  const hd = new HDSegwitP2SHWallet();
  hd.setSecret(process.env.HD_MNEMONIC_BIP49);
  assert.ok(hd.validateMnemonic());

  await hd.fetchUtxos();
  await hd.getChangeAddressAsync(); // to refresh internal pointer to next free address
  await hd.getAddressAsync(); // to refresh internal pointer to next free address
  let txhex = hd.createTx(hd.utxo, 0.000014, 0.000001, 'RKBm1Wz1tPBefb92d3hEXYMZqZTsxEcPJe');
  assert.strictEqual(
    txhex,
    '0100000000010187c9acd9d5714845343b18abaa26cb83299be2487c22da9c0e270f241b4d9cfe0000000017160014a239b6a0cbc7aadc2e77643de36306a6167fad15ffffffff02780500000000000017a914a3a65daca3064280ae072b9d6773c027b30abace87b45f00000000000017a9140acff2c37ed45110baece4bb9d4dcc0c6309dbbd8702483045022100f489dfbd372b66348a25f6e9ba1b5eb88a3646efcd75ef1211c96cf46eed692c0220416ac99a94c5f4a076588291d9857fc5b854e02404d69635dc35e82fde3ecd9701210202ac3bd159e54dc31e65842ad5f9a10b4eb024e83864a319b27de65ee08b2a3900000000',
  );

  txhex = hd.createTx(hd.utxo, 0.000005, 0.000001, '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK');
  let tx = bitcoin.Transaction.fromHex(txhex);
  assert.strictEqual(tx.ins.length, 1);
  assert.strictEqual(tx.outs.length, 2);
  assert.strictEqual(tx.outs[0].value, 500);
  assert.strictEqual(tx.outs[1].value, 25400);
  let toAddress = bitcoin.address.fromOutputScript(tx.outs[0].script, config.network);
  const changeAddress = bitcoin.address.fromOutputScript(tx.outs[1].script, config.network);
  assert.strictEqual('RKBm1Wz1tPBefb92d3hEXYMZqZTsxEcPJe', toAddress);
  assert.strictEqual(hd._getInternalAddressByIndex(hd.next_free_change_address_index), changeAddress);

  //

  txhex = hd.createTx(hd.utxo, 0.000015, 0.000001, 'RKBm1Wz1tPBefb92d3hEXYMZqZTsxEcPJe');
  tx = bitcoin.Transaction.fromHex(txhex);
  assert.strictEqual(tx.ins.length, 1);
  assert.strictEqual(tx.outs.length, 2);

  //

  txhex = hd.createTx(hd.utxo, 0.00025, 0.00001, 'RKBm1Wz1tPBefb92d3hEXYMZqZTsxEcPJe');
  tx = bitcoin.Transaction.fromHex(txhex);
  assert.strictEqual(tx.ins.length, 1);
  assert.strictEqual(tx.outs.length, 1);
  toAddress = bitcoin.address.fromOutputScript(tx.outs[0].script, config.network);
  assert.strictEqual('RKBm1Wz1tPBefb92d3hEXYMZqZTsxEcPJe', toAddress);

  // testing sendMAX
  hd.utxo = [
    {
      txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      vout: 0,
      amount: 26000,
      address: 'RA4DhjMkk67nBYbNhPh8q3Zh3mDeGZzCdX',
      wif: 'KzfH6KQz3zg8zh7b1gn2hdi8XvqM3tbHgY8NrABnowPuRJ8WNb6t',
    },
    {
      txid: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      vout: 0,
      amount: 26000,
      address: 'RA4DhjMkk67nBYbNhPh8q3Zh3mDeGZzCdX',
      wif: 'KzfH6KQz3zg8zh7b1gn2hdi8XvqM3tbHgY8NrABnowPuRJ8WNb6t',
    },
    {
      txid: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      vout: 0,
      amount: 26000,
      address: '39SpCj47M88ajRBTbkfaKRA4DhjMkk67nBYbNhPh8q3Zh3mDeGZzCdXRgpaX7FTLQJz5',
      wif: 'KzfH6KQz3zg8zh7b1gn2hdi8XvqM3tbHgY8NrABnowPuRJ8WNb6t',
    },
  ];
  txhex = hd.createTx(hd.utxo, BitcoinUnit.MAX, 0.00003, 'RKBm1Wz1tPBefb92d3hEXYMZqZTsxEcPJe');
  tx = bitcoin.Transaction.fromHex(txhex);
  assert.strictEqual(tx.outs.length, 1);
  assert.strictEqual(tx.outs[0].value, 75000);
});

xit('Segwit HD (BIP49) can fetch UTXO', async function() {
  const hd = new HDSegwitP2SHWallet();
  hd._address = ['YWw3NfAvYyZfMgzqooG4b4NYUzBdAToYba', 'YRMrqNUKAfA2bQ7RmSz1hLYCeGAtci8NkT']; // hacking internals
  await hd.fetchUtxos();
  assert.ok(hd.utxo.length >= 12);
  assert.ok(typeof hd.utxo[0].confirmations === 'number');
  assert.ok(hd.utxo[0].txid);
  assert.ok(hd.utxo[0].vout);
  assert.ok(hd.utxo[0].amount);
  assert.ok(
    hd.utxo[0].address &&
      (hd.utxo[0].address === 'YWw3NfAvYyZfMgzqooG4b4NYUzBdAToYba' ||
        hd.utxo[0].address === 'YRMrqNUKAfA2bQ7RmSz1hLYCeGAtci8NkT'),
  );
});

it('Segwit HD (BIP49) can fetch balance with many used addresses in hierarchy', async function() {
  if (!process.env.HD_MNEMONIC_BIP49_MANY_TX) {
    console.error('process.env.HD_MNEMONIC_BIP49_MANY_TX not set, skipped');
    return;
  }

  const hd = new HDSegwitP2SHWallet();
  hd.setSecret(process.env.HD_MNEMONIC_BIP49_MANY_TX);
  assert.ok(hd.validateMnemonic());
  const start = new Date().getTime();
  await hd.fetchBalance();
  const end = new Date().getTime();
  const took = (end - start) / 1000;
  took > 15 && console.warn('took', took, "sec to fetch huge HD wallet's balance");
  assert.strictEqual(hd.getBalance(), 51432);

  await hd.fetchUtxos();
  assert.ok(hd.utxo.length > 0);
  assert.ok(hd.utxo[0].txid);
  assert.ok(hd.utxo[0].vout === 0);
  assert.ok(hd.utxo[0].amount);

  await hd.fetchTransactions();
  assert.strictEqual(hd.getTransactions().length, 107);
});

it('can work with malformed mnemonic', async () => {
  let mnemonic =
    'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode';
  let hd = new HDSegwitP2SHWallet();
  await hd.setSecret(mnemonic);
  const seed1 = await hd.getMnemonicToSeedHex();
  assert.ok(hd.validateMnemonic());

  mnemonic = 'hell';
  hd = new HDSegwitP2SHWallet();
  await hd.setSecret(mnemonic);
  assert.ok(!hd.validateMnemonic());

  // now, malformed mnemonic

  mnemonic =
    '    honey  risk   juice    trip     orient      galaxy win !situate ;; shoot   ;;;   anchor Bounce remind\nhorse \n traffic exotic since escape mimic ramp skin judge owner topple erode ';
  hd = new HDSegwitP2SHWallet();
  await hd.setSecret(mnemonic);
  const seed2 = await hd.getMnemonicToSeedHex();
  assert.strictEqual(seed1, seed2);
  assert.ok(hd.validateMnemonic());
});

it('can create a Legacy HD (BIP44)', async function() {
  if (!process.env.HD_MNEMONIC_BREAD) {
    console.error('process.env.HD_MNEMONIC_BREAD not set, skipped');
    return;
  }

  const mnemonic = process.env.HD_MNEMONIC_BREAD;
  const hd = new HDLegacyP2PKHWallet();
  hd.setSecret(mnemonic);
  assert.strictEqual(hd.validateMnemonic(), true);
  assert.strictEqual(hd._getExternalAddressByIndex(0), '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG');
  assert.strictEqual(hd._getExternalAddressByIndex(1), '1QDCFcpnrZ4yrAQxmbvSgeUC9iZZ8ehcR5');
  assert.strictEqual(hd._getInternalAddressByIndex(0), '1KZjqYHm7a1DjhjcdcjfQvYfF2h6PqatjX');
  assert.strictEqual(hd._getInternalAddressByIndex(1), '13CW9WWBsWpDUvLtbFqYziWBWTYUoQb4nU');
  assert.strictEqual(
    hd.getXpub(),
    'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps',
  );

  assert.strictEqual(hd._getExternalWIFByIndex(0), 'L1hqNoJ26YuCdujMBJfWBNfgf4Jo7AcKFvcNcKLoMtoJDdDtRq7Q');
  assert.strictEqual(hd._getExternalWIFByIndex(1), 'KyyH4h59iatJWwFfiYPnYkw39SP7cBwydC3xzszsBBXHpfwz9cKb');
  assert.strictEqual(hd._getInternalWIFByIndex(0), 'Kx3QkrfemEEV49Mj5oWfb4bsWymboPdstta7eN3kAzop9apxYEFP');
  assert.strictEqual(hd._getInternalWIFByIndex(1), 'Kwfg1EDjFapN9hgwafdNPEH22z3vkd4gtG785vXXjJ6uvVWAJGtr');
  await hd.fetchBalance();
  assert.strictEqual(hd.balance, 0);
  assert.ok(hd._lastTxFetch === 0);
  await hd.fetchTransactions();
  assert.ok(hd._lastTxFetch > 0);
  assert.strictEqual(hd.transactions.length, 4);
  assert.strictEqual(hd.next_free_address_index, 1);
  assert.strictEqual(hd.next_free_change_address_index, 1);

  for (const tx of hd.getTransactions()) {
    assert.ok(tx.value === 1000 || tx.value === 1377 || tx.value === -1377 || tx.value === -1000);
  }

  // checking that internal pointer and async address getter return the same address
  const freeAddress = await hd.getAddressAsync();
  assert.strictEqual(hd._getExternalAddressByIndex(hd.next_free_address_index), freeAddress);
});

it('Legacy HD (BIP44) can generate addressess based on xpub', async function() {
  const xpub =
    'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps';
  const hd = new HDLegacyP2PKHWallet();
  hd._xpub = xpub;
  await hd.generateAddresses();
  assert.strictEqual(hd.getAddress()[0], 'Yd1tx3ziqNa9G5hoMEKdZ7ep9JxMbFefDW');
  assert.strictEqual(hd.getAddress()[1], 'YRWK5bPer6ZDfo42uoicrzdtPSPSHHFAzg');
  assert.strictEqual(hd.getAddress()[2], 'YTeuE3HqGbGKHrtkbZuTqhvmza2drgJaTR');
});

it('Legacy HD (BIP44) can create TX', async () => {
  if (!process.env.HD_MNEMONIC) {
    console.error('process.env.HD_MNEMONIC not set, skipped');
    return;
  }
  const hd = new HDLegacyP2PKHWallet();
  hd.setSecret(process.env.HD_MNEMONIC);
  assert.ok(hd.validateMnemonic());

  await hd.fetchUtxos();
  await hd.getChangeAddressAsync(); // to refresh internal pointer to next free address
  await hd.getAddressAsync(); // to refresh internal pointer to next free address
  let txhex = hd.createTx(hd.utxo, 0.0008, 0.000005, 'RA4DhjMkk67nBYbNhPh8q3Zh3mDeGZzCdX');

  assert.strictEqual(
    txhex,
    '01000000045fbc74110c2d6fcf4d1161a59913fbcd2b6ab3c5a9eb4d0dc0859515cbc8654f030000006b4830450221009be5dbe37db5a8409ddce3570140c95d162a07651b1e48cf39a6a741892adc53022061a25b8024d8f3cb1b94f264245de0c6e9a103ea557ddeb66245b40ec8e9384b012102ad7b2216f3a2b38d56db8a7ee5c540fd12c4bbb7013106eff78cc2ace65aa002ffffffff5fbc74110c2d6fcf4d1161a59913fbcd2b6ab3c5a9eb4d0dc0859515cbc8654f000000006a47304402207106e9fa4e2e35d351fbccc9c0fad3356d85d0cd35a9d7e9cbcefce5440da1e5022073c1905b5927447378c0f660e62900c1d4b2691730799458889fb87d86f5159101210316e84a2556f30a199541633f5dda6787710ccab26771b7084f4c9e1104f47667ffffffff5fbc74110c2d6fcf4d1161a59913fbcd2b6ab3c5a9eb4d0dc0859515cbc8654f020000006a4730440220250b15094096c4d4fe6793da8e45fa118ed057cc2759a480c115e76e23590791022079cdbdc9e630d713395602071e2837ecc1d192a36a24d8ec71bc51d5e62b203b01210316e84a2556f30a199541633f5dda6787710ccab26771b7084f4c9e1104f47667ffffffff5fbc74110c2d6fcf4d1161a59913fbcd2b6ab3c5a9eb4d0dc0859515cbc8654f010000006b483045022100879da610e6ed12c84d55f12baf3bf6222d59b5282502b3c7f4db1d22152c16900220759a1c88583cbdaf7fde21c273ad985dfdf94a2fa85e42ee41dcea2fd69136fd012102ad7b2216f3a2b38d56db8a7ee5c540fd12c4bbb7013106eff78cc2ace65aa002ffffffff02803801000000000017a914a3a65daca3064280ae072b9d6773c027b30abace872c4c0000000000001976a9146ee5e3e66dc73587a3a2d77a1a6c8554fae21b8a88ac00000000',
  );

  let tx = bitcoin.Transaction.fromHex(txhex);
  assert.strictEqual(tx.ins.length, 4);
  assert.strictEqual(tx.outs.length, 2);
  assert.strictEqual(tx.outs[0].value, 80000); // payee
  assert.strictEqual(tx.outs[1].value, 19500); // change
  const toAddress = bitcoin.address.fromOutputScript(tx.outs[0].script, config.network);
  const changeAddress = bitcoin.address.fromOutputScript(tx.outs[1].script, config.network);
  assert.strictEqual(toAddress, 'RA4DhjMkk67nBYbNhPh8q3Zh3mDeGZzCdX');
  assert.strictEqual(hd._getInternalAddressByIndex(hd.next_free_change_address_index), changeAddress);

  // checking that change amount is at least 3x of fee, otherwise screw the change, just add it to fee.
  // theres 0.001 on UTXOs, lets transfer (0.001 - 100sat), soo fee is equal to change (100 sat)
  // which throws @dust error if broadcasted
  txhex = hd.createTx(hd.utxo, 0.000998, 0.000001, '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK');
  tx = bitcoin.Transaction.fromHex(txhex);
  assert.strictEqual(tx.ins.length, 4);
  assert.strictEqual(tx.outs.length, 1); // only 1 output, which means change is neglected
  assert.strictEqual(tx.outs[0].value, 99800);
});

xit('Legacy HD (BIP44) can fetch UTXO', async function() {
  const hd = new HDLegacyP2PKHWallet();
  hd._address = ['YWw3NfAvYyZfMgzqooG4b4NYUzBdAToYba', 'YRMrqNUKAfA2bQ7RmSz1hLYCeGAtci8NkT']; // hacking internals
  await hd.fetchUtxos();
  assert.ok(hd.utxo.length >= 12);
  assert.ok(typeof hd.utxo[0].confirmations === 'number');
  assert.ok(hd.utxo[0].txid);
  assert.ok(hd.utxo[0].vout);
  assert.ok(hd.utxo[0].amount);
  assert.ok(
    hd.utxo[0].address &&
      (hd.utxo[0].address === 'YWw3NfAvYyZfMgzqooG4b4NYUzBdAToYba' ||
        hd.utxo[0].address === 'YRMrqNUKAfA2bQ7RmSz1hLYCeGAtci8NkT'),
  );
});
