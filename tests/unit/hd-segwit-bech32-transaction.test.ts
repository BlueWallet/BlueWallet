import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';

import { HDSegwitBech32Transaction, TxVerificationError } from '../../class/hd-segwit-bech32-transaction';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';
import ecc from '../../blue_modules/noble_ecc';
import { ECPairFactory } from 'ecpair';

// what a (possibly malicious) Electrum server answers, keyed by txid
const serverHex: Record<string, any> = {};
const serverVerbose: Record<string, any> = {};
// local cache of raw hex answers, like Realm cache in BlueElectrum
const cachedHex: Record<string, any> = {};

jest.mock('../../blue_modules/BlueElectrum', () => ({
  multiGetTransactionByTxid: jest.fn(async (txids: string[], verbose: boolean) => {
    const ret: Record<string, any> = {};
    for (const txid of txids) {
      const value = verbose ? serverVerbose[txid] : (cachedHex[txid] ?? serverHex[txid]);
      if (value) ret[txid] = value;
      if (value && !verbose) cachedHex[txid] = value;
    }
    return ret;
  }),
  forgetCachedTransactions: jest.fn(async (txids: string[]) => {
    for (const txid of txids) delete cachedHex[txid];
  }),
}));

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const RECIPIENT = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const ATTACKER = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';

// server-decoded json of a tx, with an option to lie about where outputs go
function verboseOf(tx: bitcoin.Transaction, outputAddress?: string) {
  return {
    txid: tx.getId(),
    confirmations: 0,
    vout: tx.outs.map((o, n) => ({
      value: Number(o.value) / 1e8,
      n,
      scriptPubKey: { addresses: [outputAddress ?? bitcoin.address.fromOutputScript(o.script)] },
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
  for (const map of [serverHex, serverVerbose, cachedHex]) {
    for (const k of Object.keys(map)) delete map[k];
  }

  const wallet = new HDSegwitBech32Wallet();
  wallet.setSecret(MNEMONIC);
  const ourAddress = wallet._getExternalAddressByIndex(0);

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
    wallet._getInternalAddressByIndex(0),
  );
  assert(tx);
  const tx1 = bitcoin.Transaction.fromHex(tx.toHex());

  // forged conflicting tx2: same inputs and witness as tx1, but the payment goes to the attacker
  const tx2 = bitcoin.Transaction.fromHex(tx1.toHex());
  tx2.outs[0].script = bitcoin.address.toOutputScript(ATTACKER);

  return { wallet, fundingTx, tx1, tx2, ourAddress };
}

describe('HDSegwitBech32Transaction vs malicious Electrum server (GHSA-6jp4-8v48-cc5v)', () => {
  it('bumps, cancels and CPFPs a genuine tx', async () => {
    const { wallet, tx1 } = setup();
    serve(tx1);
    const t = () => new HDSegwitBech32Transaction(null, tx1.getId(), wallet);

    const { tx: bumped } = await t().createRBFbumpFee(10);
    assert.deepStrictEqual(outputAddresses(bumped!).includes(RECIPIENT), true);

    const { tx: cancelled } = await t().createRBFcancelTx(10);
    assert.strictEqual(cancelled!.outs.length, 1);
    assert.ok(wallet.weOwnAddress(outputAddresses(cancelled!)[0]));

    const { tx: child } = await t().createCPFPbumpFee(10);
    assert.strictEqual(uint8ArrayToHex(new Uint8Array(child!.ins[0].hash).reverse()), tx1.getId());
  });

  it('refuses to bump or cancel a forged tx: our inputs, but signatures dont match its outputs', async () => {
    const { wallet, tx2 } = setup();
    serve(tx2); // server swallowed tx1 and shows tx2 in our history instead
    const t = () => new HDSegwitBech32Transaction(null, tx2.getId(), wallet);
    await assert.rejects(t().createRBFbumpFee(10), TxVerificationError);
    await assert.rejects(t().createRBFcancelTx(10), TxVerificationError);
  });

  // re-signs the only input of `tx` with `keyPair` and serves it
  function resign(tx: bitcoin.Transaction, keyPair: { publicKey: Uint8Array; sign: (hash: Uint8Array) => Uint8Array }, hashType: number) {
    const hash = tx.hashForWitnessV0(0, bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey }).output!, 100_000n, hashType);
    tx.ins[0].witness = [bitcoin.script.signature.encode(keyPair.sign(hash), hashType), keyPair.publicKey];
    serve(tx);
  }

  it('refuses a forged tx signed with our key but SIGHASH_NONE: such signature does not commit to outputs', async () => {
    const { wallet, tx2 } = setup();
    resign(tx2, ECPairFactory(ecc).fromWIF(wallet._getWIFByIndex(false, 0) as string), bitcoin.Transaction.SIGHASH_NONE);
    await assert.rejects(new HDSegwitBech32Transaction(null, tx2.getId(), wallet).createRBFbumpFee(10), TxVerificationError);
  });

  it("refuses a forged tx validly signed with attacker's own key", async () => {
    const { wallet, tx2 } = setup();
    resign(tx2, ECPairFactory(ecc).makeRandom(), bitcoin.Transaction.SIGHASH_ALL);
    await assert.rejects(new HDSegwitBech32Transaction(null, tx2.getId(), wallet).createRBFbumpFee(10), TxVerificationError);
  });

  it('takes outputs from the raw tx, not from server-decoded json', async () => {
    const { wallet, tx1 } = setup();
    serve(tx1, { verbose: verboseOf(tx1, ATTACKER) }); // genuine hex, lying json
    const { tx } = await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10);
    assert.ok(outputAddresses(tx!).includes(RECIPIENT));
    assert.ok(!outputAddresses(tx!).includes(ATTACKER));
  });

  it('refuses a tx (or a previous tx) whose hex does not match the txid', async () => {
    const { wallet, fundingTx, tx1, tx2, ourAddress } = setup();
    serve(tx2, { asTxid: tx1.getId() });
    await assert.rejects(new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10), TxVerificationError);

    serve(tx1);
    const fakeFunding = new bitcoin.Transaction();
    fakeFunding.addInput(new Uint8Array(32).fill(0x22), 0);
    fakeFunding.addOutput(bitcoin.address.toOutputScript(ourAddress), 1_000_000n);
    serve(fakeFunding, { asTxid: fundingTx.getId() });
    await assert.rejects(new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10), TxVerificationError);
  });

  it('drops a bad cached copy, so a fresh one is fetched next time', async () => {
    const { wallet, tx1 } = setup();
    serve(tx1);
    const tampered = bitcoin.Transaction.fromHex(tx1.toHex());
    tampered.ins[0].witness[0] = new Uint8Array(71).fill(1); // same txid, bad signature
    assert.strictEqual(tampered.getId(), tx1.getId());
    cachedHex[tx1.getId()] = tampered.toHex();

    await assert.rejects(new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10), TxVerificationError);
    assert.strictEqual(cachedHex[tx1.getId()], undefined);
    await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10);

    const padded = bitcoin.Transaction.fromHex(tx1.toHex());
    padded.ins[0].witness.push(new Uint8Array(500)); // same txid, signature still valid, but vsize is bigger
    cachedHex[tx1.getId()] = padded.toHex();
    await assert.rejects(new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10), TxVerificationError);
    assert.strictEqual(cachedHex[tx1.getId()], undefined);
  });

  it('allows CPFP of an incoming tx, inputs we dont own are not checked', async () => {
    const { wallet, ourAddress } = setup();
    const foreignFunding = new bitcoin.Transaction();
    foreignFunding.addInput(new Uint8Array(32).fill(0x33), 0);
    foreignFunding.addOutput(bitcoin.address.toOutputScript(RECIPIENT), 200_000n);
    serve(foreignFunding);
    const incoming = new bitcoin.Transaction();
    incoming.addInput(foreignFunding.getHash(), 0);
    incoming.ins[0].witness = [new Uint8Array(71), new Uint8Array(33)];
    incoming.addOutput(bitcoin.address.toOutputScript(ourAddress), 199_000n);
    serve(incoming);

    const t = () => new HDSegwitBech32Transaction(null, incoming.getId(), wallet);
    const { fee, utxos, unconfirmedUtxos } = await t().getInfo();
    assert.strictEqual(fee, 1000);
    assert.deepStrictEqual(utxos, []);
    assert.deepStrictEqual(unconfirmedUtxos, [{ vout: 0, value: 199_000, txid: incoming.getId(), address: ourAddress }]);
    await t().createCPFPbumpFee(10);
    // but RBF needs all inputs to be ours
    await assert.rejects(t().createRBFbumpFee(10), /inputs/);
    await assert.rejects(t().createRBFcancelTx(10), /inputs/);
  });

  it('refuses CPFP when a previous tx is withheld or outputs exceed inputs (fee would be negative)', async () => {
    const { wallet, ourAddress } = setup();
    const incoming = new bitcoin.Transaction();
    incoming.addInput(new Uint8Array(32).fill(0x44), 0);
    incoming.addOutput(bitcoin.address.toOutputScript(ourAddress), 1_000_000n);
    serve(incoming); // previous tx is not served
    await assert.rejects(new HDSegwitBech32Transaction(null, incoming.getId(), wallet).createCPFPbumpFee(10), TxVerificationError);

    const foreignFunding = new bitcoin.Transaction();
    foreignFunding.addInput(new Uint8Array(32).fill(0x55), 0);
    foreignFunding.addOutput(bitcoin.address.toOutputScript(RECIPIENT), 100n);
    serve(foreignFunding);
    incoming.ins[0].hash = foreignFunding.getHash();
    serve(incoming);
    await assert.rejects(new HDSegwitBech32Transaction(null, incoming.getId(), wallet).createCPFPbumpFee(10), TxVerificationError);
  });

  it('bumps a sendMAX tx with an OP_RETURN output, keeping it as is', async () => {
    const { wallet, fundingTx, ourAddress } = setup();
    const opReturn = '6a4c50' + '00'.repeat(80);
    const { tx } = wallet.createTransaction(
      [{ txid: fundingTx.getId(), vout: 0, value: 100_000, address: ourAddress }],
      [{ value: 0, script: { hex: opReturn } }, { address: RECIPIENT }],
      2,
      wallet._getInternalAddressByIndex(0),
    );
    assert.strictEqual(tx!.outs.length, 2); // no change
    serve(bitcoin.Transaction.fromHex(tx!.toHex()), { verbose: { txid: tx!.getId(), confirmations: 0 } });

    const { tx: bumped } = await new HDSegwitBech32Transaction(null, tx!.getId(), wallet).createRBFbumpFee(10);
    assert.strictEqual(uint8ArrayToHex(bumped!.outs[0].script), opReturn);
    assert.strictEqual(Number(bumped!.outs[0].value), 0);
    assert.strictEqual(bitcoin.address.fromOutputScript(bumped!.outs[1].script), RECIPIENT);
    assert.ok(Number(bumped!.outs[1].value) < Number(tx!.outs[1].value)); // recipient gets less, fee went up
  });
});
