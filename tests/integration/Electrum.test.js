import config from '../../config';

/* global it, describe, afterAll, beforeAll, jasmine */
const assert = require('assert');
const bitcoin = require('bitcoinjs-lib');

global.net = require('net');

const BlueElectrum = require('../../BlueElectrum');

jest.setTimeout(150000);

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
  } catch (err) {
    console.log('failed to connect to Electrum:', err);
    process.exit(1);
  }
});

describe('Electrum', () => {
  it('ElectrumClient can test connection', async () => {
    assert.ok(await BlueElectrum.testConnection('157.245.20.66', '50001'));
  });

  it('ElectrumClient can estimate fees', async () => {
    assert.ok((await BlueElectrum.estimateFee(1)) >= 1);
  });

  xit('ElectrumClient can connect and query', async () => {
    const ElectrumClient = require('electrum-client');

    for (const peer of BlueElectrum.hardcodedPeers) {
      const mainClient = new ElectrumClient(peer.tcp, peer.host, 'tcp');

      try {
        await mainClient.connect();
        await mainClient.server_version('2.7.11', '1.4');
      } catch (e) {
        mainClient.reconnect = mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
        mainClient.close();
        throw new Error('bad connection: ' + JSON.stringify(peer) + ' ' + e.message);
      }

      let addr4elect = 'royale1q3c4dwjwr4k9f40tdy373zy4mmuwd52p95ell7u';
      let script = bitcoin.address.toOutputScript(addr4elect, config.network);
      let hash = bitcoin.crypto.sha256(script);
      let reversedHash = Buffer.from(hash.reverse());
      const start = new Date().getTime();
      let balance = await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex'));
      const end = new Date().getTime();
      console.warn(peer.host, 'took', (end - start) / 1000, 'seconds to fetch balance');
      assert.ok(balance.confirmed > 0);

      addr4elect = 'YRMrqNUKAfA2bQ7RmSz1hLYCeGAtci8NkT';
      script = bitcoin.address.toOutputScript(addr4elect, config.network);
      hash = bitcoin.crypto.sha256(script);
      reversedHash = Buffer.from(hash.reverse());
      balance = await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex'));

      // let peers = await mainClient.serverPeers_subscribe();
      // console.log(peers);
      mainClient.reconnect = mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
      mainClient.close();
    }
  });

  it('BlueElectrum can do getBalanceByAddress()', async function() {
    const address = 'RAvAthYyPGVEUMWRHBwod63XSKYcx6aF28';
    const balance = await BlueElectrum.getBalanceByAddress(address);
    assert.strictEqual(balance.confirmed, 52500000000);
    assert.strictEqual(balance.unconfirmed, 0);
    assert.strictEqual(balance.addr, address);
  });

  xit('BlueElectrum can do getTransactionsByAddress()', async function() {
    const txs = await BlueElectrum.getTransactionsByAddress('royale1q3c4dwjwr4k9f40tdy373zy4mmuwd52p95ell7u');
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].tx_hash, '99a385c93ccca11c10a61517c7a61c35c3c4b81c3e02a8deadc277d4b66eb47a');
    assert.strictEqual(txs[0].height, 24100);
  });

  xit('BlueElectrum can do getTransactionsFullByAddress()', async function() {
    const txs = await BlueElectrum.getTransactionsFullByAddress('royale1q3c4dwjwr4k9f40tdy373zy4mmuwd52p95ell7u');
    for (const tx of txs) {
      assert.ok(tx.txid);
      assert.ok(tx.confirmations);
      assert.ok(!tx.vin);
      assert.ok(!tx.vout);
      assert.ok(tx.inputs);
      assert.ok(tx.inputs[0].addresses.length > 0);
      assert.ok(tx.inputs[0].value > 0);
      assert.ok(tx.outputs);
      assert.ok(tx.outputs[0].value > 0);
      assert.ok(tx.outputs[0].scriptPubKey);
      assert.ok(tx.outputs[0].addresses.length > 0);
    }
  });

  xit('BlueElectrum can do multiGetBalanceByAddress()', async function() {
    const balances = await BlueElectrum.multiGetBalanceByAddress([
      'royale1q3c4dwjwr4k9f40tdy373zy4mmuwd52p95ell7u',
      'royale1qc7vp7vftj7fnld6ctqk4njyw5j3j7h3lwjfzwy',
      'royale1qcr4fdqnk5a7zhqv9vc9lzqszxc8c348kn8wyv8',
      'royale1q8jyz9ulx85rw0rlurs7dlxwtpp5rm7qnsq8l78',
    ]);

    assert.ok(balances.balance > 0);
    assert.ok(balances.unconfirmed_balance >= 0);
    assert.ok(balances.addresses['royale1q3c4dwjwr4k9f40tdy373zy4mmuwd52p95ell7u'].confirmed > 0);
    assert.ok(balances.addresses['royale1q3c4dwjwr4k9f40tdy373zy4mmuwd52p95ell7u'].unconfirmed >= 0);
    assert.ok(balances.addresses['royale1qc7vp7vftj7fnld6ctqk4njyw5j3j7h3lwjfzwy'].confirmed > 0);
    assert.ok(balances.addresses['royale1qc7vp7vftj7fnld6ctqk4njyw5j3j7h3lwjfzwy'].unconfirmed >= 0);
    assert.ok(balances.addresses['royale1qcr4fdqnk5a7zhqv9vc9lzqszxc8c348kn8wyv8'].confirmed > 0);
    assert.ok(balances.addresses['royale1qcr4fdqnk5a7zhqv9vc9lzqszxc8c348kn8wyv8'].unconfirmed >= 0);
    assert.ok(balances.addresses['royale1q8jyz9ulx85rw0rlurs7dlxwtpp5rm7qnsq8l78'].confirmed > 0);
    assert.ok(balances.addresses['royale1q8jyz9ulx85rw0rlurs7dlxwtpp5rm7qnsq8l78'].unconfirmed >= 0);
  });

  xit('BlueElectrum can do multiGetUtxoByAddress()', async () => {
    const utxos = await BlueElectrum.multiGetUtxoByAddress(
      [
        'royale1q3c4dwjwr4k9f40tdy373zy4mmuwd52p95ell7u',
        'royale1qc7vp7vftj7fnld6ctqk4njyw5j3j7h3lwjfzwy',
        'royale1qcr4fdqnk5a7zhqv9vc9lzqszxc8c348kn8wyv8',
        'royale1q80tvrdxvmnpljmkudl5v0xvk0f6qk37xmghwv3',
      ],
      3,
    );
    assert.ok(Object.keys(utxos).length >= 1248);
    assert.ok(utxos[0].value > 0);
  });

  it('ElectrumClient can do multiGetHistoryByAddress()', async () => {
    const histories = await BlueElectrum.multiGetHistoryByAddress(
      [
        'royale1q3c4dwjwr4k9f40tdy373zy4mmuwd52p95ell7u',
        'royale1qc7vp7vftj7fnld6ctqk4njyw5j3j7h3lwjfzwy',
        'royale1qcr4fdqnk5a7zhqv9vc9lzqszxc8c348kn8wyv8',
        'royale1q80tvrdxvmnpljmkudl5v0xvk0f6qk37xmghwv3',
        'royale1q80tvrdxvmnpljmkudl5v0xvk0f6qk37xmghwv3', // duplicate intended
      ],
      3,
    );

    assert.strictEqual(
      histories['royale1q3c4dwjwr4k9f40tdy373zy4mmuwd52p95ell7u'][0]['tx_hash'],
      '99a385c93ccca11c10a61517c7a61c35c3c4b81c3e02a8deadc277d4b66eb47a',
    );
    assert.strictEqual(
      histories['royale1qc7vp7vftj7fnld6ctqk4njyw5j3j7h3lwjfzwy'][0]['tx_hash'],
      '0ab3faf49bd7b990670519cc1f742303a225cad9506fed83f91d076ae688faf2',
    );
    assert.strictEqual(Object.keys(histories).length, 4);
  });

  it('ElectrumClient can do multiGetTransactionByTxid()', async () => {
    const txdatas = await BlueElectrum.multiGetTransactionByTxid(
      [
        'afbd7bc6269f19597ec8d87110771f285a8ebbe5d120a562c1ef4b3ee82e1272',
        '0d123609d612bb2d33e47f688d977b26ba20a6cb6905796d6ce97ee7533065ae',
        '61a7581aa7053b5f9f627ab02c525bddd4fa9f813a8c70b2b5149914c1226bbe',
        'f1922d776939b3e91a959627be7cabed8a5c2dae3001ebd03e9af7946f13474c',
        'f1922d776939b3e91a959627be7cabed8a5c2dae3001ebd03e9af7946f13474c', // duplicate intended
      ],
      3,
    );

    assert.strictEqual(
      txdatas['afbd7bc6269f19597ec8d87110771f285a8ebbe5d120a562c1ef4b3ee82e1272'].txid,
      'afbd7bc6269f19597ec8d87110771f285a8ebbe5d120a562c1ef4b3ee82e1272',
    );
    assert.strictEqual(
      txdatas['0d123609d612bb2d33e47f688d977b26ba20a6cb6905796d6ce97ee7533065ae'].txid,
      '0d123609d612bb2d33e47f688d977b26ba20a6cb6905796d6ce97ee7533065ae',
    );
    assert.ok(txdatas['61a7581aa7053b5f9f627ab02c525bddd4fa9f813a8c70b2b5149914c1226bbe'].size);
    assert.ok(txdatas['61a7581aa7053b5f9f627ab02c525bddd4fa9f813a8c70b2b5149914c1226bbe'].vin);
    assert.ok(txdatas['61a7581aa7053b5f9f627ab02c525bddd4fa9f813a8c70b2b5149914c1226bbe'].vout);
    assert.ok(txdatas['61a7581aa7053b5f9f627ab02c525bddd4fa9f813a8c70b2b5149914c1226bbe'].blocktime);
    assert.strictEqual(Object.keys(txdatas).length, 4);
  });

  it('multiGetTransactionByTxid() can work with huge tx', async () => {
    // electrum cant return verbose output because of "response too large (over 1,000,000 bytes"
    // for example:
    // echo '[{"jsonrpc":"2.0","method":"blockchain.transaction.get","params":["484a11c5e086a281413b9192b4f60c06abf745f08c2c28c4b4daefe6df3b9e5c", true],"id":1}]' | nc bitkoins.nl  50001 -i 1
    // @see https://electrumx.readthedocs.io/en/latest/protocol-methods.html#blockchain-transaction-get
    //
    // possible solution: fetch it without verbose and decode locally. unfortunatelly it omits such info as confirmations, time etc
    // so whoever uses it should be prepared for this.
    // tbh consumer wallets dont usually work with such big txs, so probably we dont need it
    const txdatas = await BlueElectrum.multiGetTransactionByTxid([
      '9a3d2f1e7c0cf4d9d5f7576ea793a0add94dc71891e31d9be18fca5a78629480',
    ]);
    assert.ok(txdatas['9a3d2f1e7c0cf4d9d5f7576ea793a0add94dc71891e31d9be18fca5a78629480']);
  });

  it('ElectrumClient can do multiGetHistoryByAddress() to obtain txhex', async () => {
    const txdatas = await BlueElectrum.multiGetTransactionByTxid(
      ['62ba1c261b6c31a129d885438f41bf8356d01336f1265d19a9c3858a786b52fc'],
      3,
      false,
    );

    assert.strictEqual(
      txdatas['62ba1c261b6c31a129d885438f41bf8356d01336f1265d19a9c3858a786b52fc'],
      '02000000000104809462785aca8fe19b1de39118c74dd9ada093a76e57f7d5d9f40c7c1e2f3d9a0100000017160014a21d86aa469af5cef87ddaf16ce78daf66e1ca47fdffffff809462785aca8fe19b1de39118c74dd9ada093a76e57f7d5d9f40c7c1e2f3d9a050000001716001431aa45e6690fb035bfb83909ff3a4da465884774fdffffff809462785aca8fe19b1de39118c74dd9ada093a76e57f7d5d9f40c7c1e2f3d9a0800000017160014256d22190d317be6088dcae1b1cb7446d19ff73ffdffffffb0406dcb9573ee3a6137dd2b619f0071d18ad1878dd415eeef3001b5a3a51cfe000000001716001491ddb278649be532d7e2727381dfedc3557406d0fdffffff02234dd9f15401000017a91439ba125086cebb6fc129e1e099edc40b2062f73b87005039278c040000160014c7981f312b97933fb758582d59c88ea4a32f5e3f024830450221008515476b27fee1c15db3e73fea846a4e1a624ea8ce7fa9fca50d3982c4a4dd8d02201d8f4d5eb92ce5209d5210ad1879f2b67da29afcf31df187e4962b981531bfe2012102917b439ed21c473a99e6911db0d22993f33df8d838d1ff8f41102c5a0dad872c0247304402207815132a33653873096c27f4cf93d453a0a2f8cce993398282a668640650d335022071390ebb50dff5d482eb8b6d89d87092cf48a87ad836b903b50ad0020d673b720121028c155d2f7ecbbb00657757796a060204d15e94f0de1fea369deb7beacbc92abc02483045022100bde4c12c0579226ca02c7ff8a440c09a1a025ca210dd33ad5ab3eeb172d3af6402201e823464e1d81a94d0fc615bf4cb26fabb1011f465df3793839c18b5f363ddb00121031ddb38a0322da4ec5f0a94c73ad74be8f83b678fad608ebc36d2fc3b7a99136b02473044022019785b7cba105fcb20f5b79a022c3a3a5265d699d115823b40444e41bef1083602202e98cac55c2ab0f7d9f34dd866a65a30985d2031f98ef6f2f2f317bb93db2753012102a13bb10e49db4f2996643ebee22ae9f8486b8f9a4c8bd6cfd41c4a32b60d797ed9270000',
    );
  });
});
