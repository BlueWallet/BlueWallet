import http from 'http';
import assert from 'assert';

import { HDLegacyP2PKHWallet, HDSegwitP2SHWallet } from '../../class';
import AOPP from '../../class/aopp';

let server;
let POST = '';

beforeAll(async () => {
  // start https server, wait for POST requests and decode them
  server = http
    .createServer((req, res) => {
      if (req.method !== 'POST') return;
      let body = '';
      req.on('data', data => (body += data));
      req.on('end', () => (POST = JSON.parse(body)));
      res.writeHead(200);
      res.end('ok');
    })
    .listen(19616);
});

afterAll(() => {
  server.close();
});

describe('AOPP', () => {
  it('can validate uri', async () => {
    const a = new AOPP('aopp:?v=0&msg=vasp-chosen-msg&asset=btc&format=p2wpkh&callback=https://vasp.com/proofs/vasp-chosen-token');
    assert.strictEqual(a.v, 0);
    assert.strictEqual(a.msg, 'vasp-chosen-msg');
    assert.strictEqual(a.format, 'p2wpkh');
    assert.strictEqual(a.callback, 'https://vasp.com/proofs/vasp-chosen-token');
    assert.strictEqual(a.callbackHostname, 'vasp.com');

    // wrong version
    assert.throws(() => new AOPP('aopp:?v=1&msg=vasp-chosen-msg&asset=btc&format=p2wpkh&callback=https://vasp.com/'));

    // wrong asset
    assert.throws(() => new AOPP('aopp:?v=0&msg=vasp-chosen-msg&asset=bch&format=p2wpkh&callback=https://vasp.com/'));

    // wrong format
    assert.throws(() => new AOPP('aopp:?v=0&msg=vasp-chosen-msg&asset=btc&format=erc20&callback=https://vasp.com/'));
  });

  it('can cast address format to our internal segwitType', () => {
    assert.throws(() => AOPP.getSegwitByAddressFormat('any'));
    assert.throws(() => AOPP.getSegwitByAddressFormat('blablabla'));

    assert.strictEqual(AOPP.getSegwitByAddressFormat('p2wpkh'), 'p2wpkh');
    assert.strictEqual(AOPP.getSegwitByAddressFormat('p2sh'), 'p2sh(p2wpkh)');
    assert.strictEqual(AOPP.getSegwitByAddressFormat('p2pkh'), undefined);
  });

  it('can sign and send signature using segwit address', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    const address = hd._getExternalAddressByIndex(0);

    const a = new AOPP('aopp:?v=0&msg=Vires+in+Numeris&asset=btc&format=any&callback=http%3A%2F%2Flocalhost:19616');
    const signature = hd.signMessage(a.msg, address);
    await a.send({ address, signature });

    assert.strictEqual(POST.version, 0);
    assert.strictEqual(POST.address, address);
    assert.ok(POST.signature);
  });

  it('can sign and send signature using legacy address', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDLegacyP2PKHWallet();
    hd.setSecret(mnemonic);
    const address = hd._getExternalAddressByIndex(0);

    const a = new AOPP('aopp:?v=0&msg=Vires+in+Numeris&asset=btc&format=any&callback=http%3A%2F%2Flocalhost:19616');
    const signature = hd.signMessage(a.msg, address);
    await a.send({ address, signature });

    assert.strictEqual(POST.version, 0);
    assert.strictEqual(POST.address, address);
    assert.ok(POST.signature);
  });
});
