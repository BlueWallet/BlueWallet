import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';

import { HDSegwitBech32Transaction, isTxVerificationError } from '../../class/hd-segwit-bech32-transaction';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';

// What a (possibly malicious) Electrum server answers, keyed by txid
const serverHex: Record<string, string> = {};
const serverVerbose: Record<string, any> = {};

jest.mock('../../blue_modules/BlueElectrum', () => ({
  multiGetTransactionByTxid: jest.fn(async (txids: string[], verbose: boolean) => {
    const ret: Record<string, any> = {};
    for (const txid of txids) {
      const value = verbose ? serverVerbose[txid] : serverHex[txid];
      if (value) ret[txid] = value;
    }
    return ret;
  }),
  getTransactionsByAddress: jest.fn(async () => []),
}));

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const RECIPIENT = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const ATTACKER = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';

function verboseOf(tx: bitcoin.Transaction, overrideOutputAddress?: string) {
  return {
    txid: tx.getId(),
    confirmations: 0,
    vin: tx.ins.map(inp => ({
      txid: uint8ArrayToHex(new Uint8Array(inp.hash).reverse()),
      vout: inp.index,
    })),
    vout: tx.outs.map((o, n) => ({
      value: Number(o.value) / 1e8,
      n,
      scriptPubKey: {
        addresses: [overrideOutputAddress ?? bitcoin.address.fromOutputScript(o.script)],
      },
    })),
  };
}

function serve(tx: bitcoin.Transaction, opts: { asTxid?: string; verbose?: any } = {}) {
  const txid = opts.asTxid ?? tx.getId();
  serverHex[txid] = tx.toHex();
  serverVerbose[txid] = opts.verbose ?? verboseOf(tx);
}

function outputAddresses(tx: bitcoin.Transaction) {
  return tx.outs.map(o => bitcoin.address.fromOutputScript(o.script));
}

function setup() {
  for (const k of Object.keys(serverHex)) delete serverHex[k];
  for (const k of Object.keys(serverVerbose)) delete serverVerbose[k];

  const wallet = new HDSegwitBech32Wallet();
  wallet.setSecret(MNEMONIC);
  const ourAddress = wallet._getExternalAddressByIndex(0);
  const changeAddress = wallet._getInternalAddressByIndex(0);

  // tx funding our wallet
  const fundingTx = new bitcoin.Transaction();
  fundingTx.version = 2;
  fundingTx.addInput(new Uint8Array(32).fill(0x11), 0);
  fundingTx.addOutput(bitcoin.address.toOutputScript(ourAddress), 100_000n);
  serve(fundingTx);

  // our genuine payment (tx1)
  const { tx } = wallet.createTransaction(
    [{ txid: fundingTx.getId(), vout: 0, value: 100_000, address: ourAddress }],
    [{ address: RECIPIENT, value: 50_000 }],
    2,
    changeAddress,
  );
  assert(tx);
  const tx1 = bitcoin.Transaction.fromHex(tx.toHex());

  // forged conflicting tx2: same inputs and witness as tx1, but the payment goes to the attacker
  const tx2 = bitcoin.Transaction.fromHex(tx1.toHex());
  tx2.outs[0].script = bitcoin.address.toOutputScript(ATTACKER);
  assert.notStrictEqual(tx2.getId(), tx1.getId());

  return { wallet, fundingTx, tx1, tx2, ourAddress };
}

describe('HDSegwitBech32Transaction vs malicious Electrum server (GHSA-6jp4-8v48-cc5v class)', () => {
  it('bumps the fee of a genuine tx and keeps paying the original recipient', async () => {
    const { wallet, tx1 } = setup();
    serve(tx1);
    const { tx } = await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10);
    assert(tx);
    const addresses = outputAddresses(tx);
    assert.ok(addresses.includes(RECIPIENT));
    assert.ok(!addresses.includes(ATTACKER));
  });

  it('cancels a genuine tx by paying everything back to us', async () => {
    const { wallet, tx1 } = setup();
    serve(tx1);
    const { tx } = await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFcancelTx(10);
    assert(tx);
    assert.strictEqual(tx.outs.length, 1);
    assert.ok(wallet.weOwnAddress(outputAddresses(tx)[0]));
  });

  it('CPFP of a genuine tx spends our change output', async () => {
    const { wallet, tx1 } = setup();
    serve(tx1);
    const { tx } = await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createCPFPbumpFee(10);
    assert(tx);
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(uint8ArrayToHex(new Uint8Array(tx.ins[0].hash).reverse()), tx1.getId());
  });

  it('refuses to bump the fee of a forged tx whose signatures are not valid', async () => {
    const { wallet, tx2 } = setup();
    serve(tx2); // server swallowed tx1 and shows tx2 in our history instead
    await assert.rejects(
      new HDSegwitBech32Transaction(null, tx2.getId(), wallet).createRBFbumpFee(10),
      (err: Error) => isTxVerificationError(err) && /signature/.test(err.message),
    );
  });

  it('refuses to cancel a forged tx whose signatures are not valid', async () => {
    const { wallet, tx2 } = setup();
    serve(tx2);
    await assert.rejects(
      new HDSegwitBech32Transaction(null, tx2.getId(), wallet).createRBFcancelTx(10),
      (err: Error) => isTxVerificationError(err) && /signature/.test(err.message),
    );
  });

  it('takes the outputs to re-pay from the signed tx, not from the server-decoded (verbose) tx', async () => {
    const { wallet, tx1 } = setup();
    serve(tx1, { verbose: verboseOf(tx1, ATTACKER) }); // genuine hex, lying decoded json
    const { tx } = await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10);
    assert(tx);
    const addresses = outputAddresses(tx);
    assert.ok(addresses.includes(RECIPIENT));
    assert.ok(!addresses.includes(ATTACKER));
  });

  it('refuses a tx hex that does not match the requested txid', async () => {
    const { wallet, tx1, tx2 } = setup();
    serve(tx2, { asTxid: tx1.getId(), verbose: verboseOf(tx1) });
    await assert.rejects(
      new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10),
      (err: Error) => isTxVerificationError(err) && /txid/.test(err.message),
    );
  });

  it('refuses a previous tx hex that does not match the txid it spends', async () => {
    const { wallet, fundingTx, tx1, ourAddress } = setup();
    serve(tx1);
    const fakeFunding = new bitcoin.Transaction();
    fakeFunding.version = 2;
    fakeFunding.addInput(new Uint8Array(32).fill(0x22), 0);
    fakeFunding.addOutput(bitcoin.address.toOutputScript(ourAddress), 1_000_000n);
    serve(fakeFunding, { asTxid: fundingTx.getId() });
    await assert.rejects(
      new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10),
      (err: Error) => isTxVerificationError(err) && /txid/.test(err.message),
    );
  });

  it('still allows CPFP of an incoming tx (inputs we do not own are not checked)', async () => {
    const { wallet, ourAddress } = setup();
    const foreignFunding = new bitcoin.Transaction();
    foreignFunding.version = 2;
    foreignFunding.addInput(new Uint8Array(32).fill(0x33), 0);
    foreignFunding.addOutput(bitcoin.address.toOutputScript(RECIPIENT), 200_000n);
    serve(foreignFunding);
    const incoming = new bitcoin.Transaction();
    incoming.version = 2;
    incoming.addInput(bitcoin.Transaction.fromHex(foreignFunding.toHex()).getHash(), 0);
    incoming.ins[0].witness = [new Uint8Array(71), new Uint8Array(33)];
    incoming.addOutput(bitcoin.address.toOutputScript(ourAddress), 199_000n);
    serve(incoming);

    const { unconfirmedUtxos, fee } = await new HDSegwitBech32Transaction(null, incoming.getId(), wallet).getInfo();
    assert.strictEqual(fee, 1000);
    assert.deepStrictEqual(unconfirmedUtxos, [{ vout: 0, value: 199_000, txid: incoming.getId(), address: ourAddress }]);
  });
});
