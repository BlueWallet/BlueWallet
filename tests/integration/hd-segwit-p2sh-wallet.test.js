import * as bitcoin from 'bitcoinjs-lib';
import { HDSegwitP2SHWallet } from '../../class';
global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
global.tls = require('tls'); // needed by Electrum client. For RN it is proviced in shim.js
const BlueElectrum = require('../../blue_modules/BlueElectrum'); // so it connects ASAP
jasmine.DEFAULT_TIMEOUT_INTERVAL = 300 * 1000;

afterAll(() => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
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

it('HD (BIP49) can work with a gap', async function () {
  const hd = new HDSegwitP2SHWallet();
  hd._xpub = 'ypub6XRzrn3HB1tjhhvrHbk1vnXCecZEdXohGzCk3GXwwbDoJ3VBzZ34jNGWbC6WrS7idXrYjjXEzcPDX5VqnHEnuNf5VAXgLfSaytMkJ2rwVqy'; // has gap
  await hd.fetchBalance();

  // for (let c = 0; c < 5; c++) {
  //   console.log('internal', c, hd._getInternalAddressByIndex(c));
  // }

  // for (let c = 0; c < 5; c++) {
  //   console.log('external', c, hd._getExternalAddressByIndex(c));
  // }
  await hd.fetchTransactions();
  expect(hd.getTransactions().length >= 3).toBeTruthy();
});

it('Segwit HD (BIP49) can fetch more data if pointers to last_used_addr are lagging behind', async function () {
  const hd = new HDSegwitP2SHWallet();
  hd._xpub = 'ypub6WZ2c7YJ1SQ1rBYftwMqwV9bBmybXzETFxWmkzMz25bCf6FkDdXjNgR7zRW8JGSnoddNdUH7ZQS7JeQAddxdGpwgPskcsXFcvSn1JdGVcPQ';
  hd.next_free_change_address_index = 40;
  hd.next_free_address_index = 50;
  await hd.fetchBalance();
  await hd.fetchTransactions();
  expect(hd.getTransactions().length).toBe(153);
});

it('HD (BIP49) can create TX', async () => {
  if (!process.env.HD_MNEMONIC_BIP49) {
    console.error('process.env.HD_MNEMONIC_BIP49 not set, skipped');
    return;
  }
  const hd = new HDSegwitP2SHWallet();
  hd.setSecret(process.env.HD_MNEMONIC_BIP49);
  expect(hd.validateMnemonic()).toBeTruthy();

  await hd.fetchBalance();
  await hd.fetchUtxo();
  expect(typeof hd.utxo[0].confirmations === 'number').toBeTruthy();
  expect(hd.utxo[0].txid).toBeTruthy();
  expect(hd.utxo[0].vout !== undefined).toBeTruthy();
  expect(hd.utxo[0].amount).toBeTruthy();
  expect(hd.utxo[0].address).toBeTruthy();
  expect(hd.utxo[0].wif).toBeTruthy();

  let txNew = hd.createTransaction(
    hd.getUtxo(),
    [{ address: '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', value: 500 }],
    1,
    hd._getInternalAddressByIndex(hd.next_free_change_address_index),
  );
  let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
  expect(txNew.tx.toHex()).toBe(
    '0200000000010187c9acd9d5714845343b18abaa26cb83299be2487c22da9c0e270f241b4d9cfe0000000017160014a239b6a0cbc7aadc2e77643de36306a6167fad150000008002f40100000000000017a914a3a65daca3064280ae072b9d6773c027b30abace87ba6200000000000017a9140acff2c37ed45110baece4bb9d4dcc0c6309dbbd8702483045022100a14eb345f26933b29ba2a68075994ecf10f16286611c1d34ccd5850d977c25620220050e80c62ba64d99101253d94f756791f881bdb92100885fbe5ea3e29964573001210202ac3bd159e54dc31e65842ad5f9a10b4eb024e83864a319b27de65ee08b2a3900000000',
  );
  expect(tx.ins.length).toBe(1);
  expect(tx.outs.length).toBe(2);
  expect(tx.outs[0].value).toBe(500);
  expect(tx.outs[1].value).toBe(25274);
  let toAddress = bitcoin.address.fromOutputScript(tx.outs[0].script);
  const changeAddress = bitcoin.address.fromOutputScript(tx.outs[1].script);
  expect('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK').toBe(toAddress);
  expect(hd._getInternalAddressByIndex(hd.next_free_change_address_index)).toBe(changeAddress);

  //

  txNew = hd.createTransaction(
    hd.getUtxo(),
    [{ address: '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK', value: 25000 }],
    5,
    hd._getInternalAddressByIndex(hd.next_free_change_address_index),
  );
  tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
  expect(tx.ins.length).toBe(1);
  expect(tx.outs.length).toBe(1);
  toAddress = bitcoin.address.fromOutputScript(tx.outs[0].script);
  expect('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK').toBe(toAddress);

  // testing sendMAX
  const utxo = [
    {
      height: 591862,
      value: 26000,
      address: '3C5iv2Hp6nfuhkfTZibb7GJPkXj367eurD',
      vout: 0,
      txid: '2000000000000000000000000000000000000000000000000000000000000000',
      amount: 26000,
      wif: 'L3fg5Jb6tJDVMvoG2boP4u3CxjX1Er3e7Z4zDALQdGgVLLE8zVUr',
      confirmations: 1,
    },
    {
      height: 591862,
      value: 26000,
      address: '3C5iv2Hp6nfuhkfTZibb7GJPkXj367eurD',
      vout: 0,
      txid: '1000000000000000000000000000000000000000000000000000000000000000',
      amount: 26000,
      wif: 'L3fg5Jb6tJDVMvoG2boP4u3CxjX1Er3e7Z4zDALQdGgVLLE8zVUr',
      confirmations: 1,
    },
    {
      height: 591862,
      value: 26000,
      address: '3C5iv2Hp6nfuhkfTZibb7GJPkXj367eurD',
      vout: 0,
      txid: '0000000000000000000000000000000000000000000000000000000000000000',
      amount: 26000,
      wif: 'L3fg5Jb6tJDVMvoG2boP4u3CxjX1Er3e7Z4zDALQdGgVLLE8zVUr',
      confirmations: 1,
    },
  ];

  // one MAX output
  txNew = hd.createTransaction(
    utxo,
    [{ address: '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK' }],
    1,
    hd._getInternalAddressByIndex(hd.next_free_change_address_index),
  );
  tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
  expect(tx.outs.length).toBe(1);
  expect(tx.outs[0].value > 77000).toBeTruthy();

  // MAX with regular output
  txNew = hd.createTransaction(
    utxo,
    [{ address: '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK' }, { address: 'bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p', value: 25000 }],
    1,
    hd._getInternalAddressByIndex(hd.next_free_change_address_index),
  );
  tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
  expect(tx.outs.length).toBe(2);
  expect(tx.outs[0].value > 50000).toBeTruthy();
  expect(tx.outs[1].value).toBe(25000);
});

it('Segwit HD (BIP49) can fetch balance with many used addresses in hierarchy', async function () {
  if (!process.env.HD_MNEMONIC_BIP49_MANY_TX) {
    console.error('process.env.HD_MNEMONIC_BIP49_MANY_TX not set, skipped');
    return;
  }

  const hd = new HDSegwitP2SHWallet();
  hd.setSecret(process.env.HD_MNEMONIC_BIP49_MANY_TX);
  expect(hd.validateMnemonic()).toBeTruthy();
  const start = +new Date();
  await hd.fetchBalance();
  const end = +new Date();
  const took = (end - start) / 1000;
  took > 15 && console.warn('took', took, "sec to fetch huge HD wallet's balance");
  expect(hd.getBalance()).toBe(51432);

  await hd.fetchUtxo();
  expect(hd.utxo.length > 0).toBeTruthy();
  expect(hd.utxo[0].txid).toBeTruthy();
  expect(hd.utxo[0].vout === 0).toBeTruthy();
  expect(hd.utxo[0].amount).toBeTruthy();

  await hd.fetchTransactions();
  expect(hd.getTransactions().length).toBe(107);
});
