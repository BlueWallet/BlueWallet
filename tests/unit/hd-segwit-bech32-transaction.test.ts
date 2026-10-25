import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';

import { HDSegwitBech32Transaction, isTxNotReplaceableError, isTxVerificationError } from '../../class/hd-segwit-bech32-transaction';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';
import ecc from '../../blue_modules/noble_ecc';
import { ECPairFactory } from 'ecpair';

// What a (possibly malicious) Electrum server answers, keyed by txid
const serverHex: Record<string, any> = {};
const serverVerbose: Record<string, any> = {};
// local cache of non-verbose (raw hex) answers, like the Realm cache in BlueElectrum
const mockCachedHex: Record<string, any> = {};

jest.mock('../../blue_modules/BlueElectrum', () => ({
  multiGetTransactionByTxid: jest.fn(async (txids: string[], verbose: boolean) => {
    const ret: Record<string, any> = {};
    for (const txid of txids) {
      const value = verbose ? serverVerbose[txid] : (mockCachedHex[txid] ?? serverHex[txid]);
      if (value) ret[txid] = value;
      if (value && !verbose) mockCachedHex[txid] = value;
    }
    return ret;
  }),
  forgetCachedTransactions: jest.fn(async (txids: string[]) => {
    for (const txid of txids) delete mockCachedHex[txid];
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
  for (const k of Object.keys(mockCachedHex)) delete mockCachedHex[k];

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

  it('refuses CPFP when the server withholds a previous tx (fee would be negative)', async () => {
    const { wallet, ourAddress } = setup();
    const incoming = new bitcoin.Transaction();
    incoming.version = 2;
    for (let i = 0; i < 5; i++) {
      incoming.addInput(new Uint8Array(32).fill(0x30 + i), 0);
      incoming.ins[i].witness = [new Uint8Array(72), new Uint8Array(33)];
    }
    incoming.addOutput(bitcoin.address.toOutputScript(ourAddress), 1_000_000n);
    serve(incoming); // parents are not served

    const tx = new HDSegwitBech32Transaction(null, incoming.getId(), wallet);
    await assert.rejects(tx.createCPFPbumpFee(10), (err: Error) => isTxVerificationError(err) && /previous/.test(err.message));
    await assert.rejects(tx.getInfo(), isTxVerificationError);
  });

  it('refuses when a previous tx comes back decoded instead of raw hex', async () => {
    const { wallet, fundingTx, tx1 } = setup();
    serve(tx1);
    serverHex[fundingTx.getId()] = verboseOf(fundingTx); // e.g. -32600 fallback used to return decoded tx
    await assert.rejects(new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createCPFPbumpFee(10), isTxVerificationError);
    await assert.rejects(new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10), isTxVerificationError);
  });

  it('refuses CPFP of a tx with negative fee, but allows a zero-fee parent', async () => {
    const { wallet, ourAddress } = setup();
    const foreignFunding = new bitcoin.Transaction();
    foreignFunding.version = 2;
    foreignFunding.addInput(new Uint8Array(32).fill(0x44), 0);
    foreignFunding.addOutput(bitcoin.address.toOutputScript(RECIPIENT), 100_000n);
    serve(foreignFunding);
    const incomingPaying = (outValue: bigint) => {
      const incoming = new bitcoin.Transaction();
      incoming.version = 2;
      incoming.addInput(foreignFunding.getHash(), 0);
      incoming.ins[0].witness = [new Uint8Array(71), new Uint8Array(33)];
      incoming.addOutput(bitcoin.address.toOutputScript(ourAddress), outValue);
      serve(incoming);
      return incoming;
    };

    const negative = incomingPaying(150_000n);
    await assert.rejects(
      new HDSegwitBech32Transaction(null, negative.getId(), wallet).createCPFPbumpFee(10),
      (err: Error) => isTxVerificationError(err) && /fee/.test(err.message),
    );

    const zeroFee = incomingPaying(100_000n);
    const { fee, feeRate } = await new HDSegwitBech32Transaction(null, zeroFee.getId(), wallet).getInfo();
    assert.strictEqual(fee, 0);
    assert.strictEqual(feeRate, 0);
    const { tx, fee: childFee } = await new HDSegwitBech32Transaction(null, zeroFee.getId(), wallet).createCPFPbumpFee(10);
    assert(tx);
    // child pays for both txs
    assert.ok(childFee / (zeroFee.virtualSize() + tx.virtualSize()) >= 10);
  });

  it('drops a cached tampered copy of our tx (same txid, bad witness) and uses a fresh one from the server', async () => {
    const { wallet, tx1 } = setup();
    serve(tx1);
    const tampered = bitcoin.Transaction.fromHex(tx1.toHex());
    tampered.ins[0].witness = [new Uint8Array(72).fill(1), tampered.ins[0].witness[1]];
    assert.strictEqual(tampered.getId(), tx1.getId());
    mockCachedHex[tx1.getId()] = tampered.toHex(); // saved while connected to a malicious server

    const { tx } = await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10);
    assert(tx);
    assert.ok(outputAddresses(tx).includes(RECIPIENT));
    assert.strictEqual(mockCachedHex[tx1.getId()], tx1.toHex());
  });

  it('drops a cached copy with the wrong txid and uses a fresh one from the server', async () => {
    const { wallet, tx1, tx2 } = setup();
    serve(tx1);
    mockCachedHex[tx1.getId()] = tx2.toHex();
    const { tx } = await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFcancelTx(10);
    assert(tx);
    assert.strictEqual(mockCachedHex[tx1.getId()], tx1.toHex());
  });

  it('still refuses when the server keeps sending a tampered copy', async () => {
    const { wallet, tx1 } = setup();
    const tampered = bitcoin.Transaction.fromHex(tx1.toHex());
    tampered.ins[0].witness = [new Uint8Array(72).fill(1), tampered.ins[0].witness[1]];
    serve(tampered);
    await assert.rejects(new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10), isTxVerificationError);
  });

  it('refuses RBF (on load and on create) when not all inputs are ours, but still allows CPFP', async () => {
    const { wallet, fundingTx, ourAddress } = setup();
    const ECPair = ECPairFactory(ecc);
    const foreignKey = ECPair.makeRandom();
    const foreignScript = bitcoin.payments.p2wpkh({
      pubkey: foreignKey.publicKey,
    }).output!;
    const foreignFunding = new bitcoin.Transaction();
    foreignFunding.version = 2;
    foreignFunding.addInput(new Uint8Array(32).fill(0x55), 0);
    foreignFunding.addOutput(foreignScript, 50_000n);
    serve(foreignFunding);

    // payjoin-like tx: our input + someone else's input, both properly signed
    const tx = new bitcoin.Transaction();
    tx.version = 2;
    tx.addInput(fundingTx.getHash(), 0, HDSegwitBech32Wallet.defaultRBFSequence);
    tx.addInput(foreignFunding.getHash(), 0, HDSegwitBech32Wallet.defaultRBFSequence);
    tx.addOutput(bitcoin.address.toOutputScript(RECIPIENT), 100_000n);
    tx.addOutput(bitcoin.address.toOutputScript(wallet._getInternalAddressByIndex(0)), 49_000n);
    const ourKey = ECPair.fromWIF(wallet._getWIFByIndex(false, 0) as string);
    const sign = (i: number, key: typeof ourKey, value: bigint) => {
      const scriptCode = bitcoin.payments.p2pkh({
        pubkey: key.publicKey,
      }).output!;
      const hash = tx.hashForWitnessV0(i, scriptCode, value, bitcoin.Transaction.SIGHASH_ALL);
      tx.ins[i].witness = [bitcoin.script.signature.encode(key.sign(hash), bitcoin.Transaction.SIGHASH_ALL), key.publicKey];
    };
    sign(0, ourKey, 100_000n);
    sign(1, foreignKey, 50_000n);
    assert.ok(wallet.weOwnAddress(ourAddress));
    serve(tx);

    const t = () => new HDSegwitBech32Transaction(null, tx.getId(), wallet);
    await assert.rejects(t().getInfo('bump'), (err: Error) => isTxNotReplaceableError(err) && /inputs/.test(err.message));
    await assert.rejects(t().getInfo('cancel'), isTxNotReplaceableError);
    await assert.rejects(t().createRBFbumpFee(10), isTxNotReplaceableError);
    await assert.rejects(t().createRBFcancelTx(10), isTxNotReplaceableError);
    const { fee } = await t().getInfo();
    assert.strictEqual(fee, 1000);
    const { tx: child } = await t().createCPFPbumpFee(10);
    assert(child);
  });

  it('refuses RBF bump (on load and on create) of a tx with an OP_RETURN output, cancel still works', async () => {
    const { wallet, fundingTx, ourAddress } = setup();
    const { tx } = wallet.createTransaction(
      [
        {
          txid: fundingTx.getId(),
          vout: 0,
          value: 100_000,
          address: ourAddress,
        },
      ],
      [
        { address: RECIPIENT, value: 546 },
        { value: 0, script: { hex: '6a4c50' + '00'.repeat(80) } },
      ],
      2,
      wallet._getInternalAddressByIndex(0),
      HDSegwitBech32Wallet.defaultRBFSequence,
    );
    assert(tx);
    const opReturnTx = bitcoin.Transaction.fromHex(tx.toHex());
    serve(opReturnTx, {
      verbose: { txid: opReturnTx.getId(), confirmations: 0 },
    });

    const t = () => new HDSegwitBech32Transaction(null, opReturnTx.getId(), wallet);
    await assert.rejects(t().getInfo('bump'), (err: Error) => isTxNotReplaceableError(err) && /output/.test(err.message));
    await assert.rejects(t().createRBFbumpFee(10), isTxNotReplaceableError);
    await t().getInfo('cancel');
    const { tx: cancelTx } = await t().createRBFcancelTx(10);
    assert(cancelTx);
    assert.strictEqual(cancelTx.outs.length, 1);
    assert.ok(wallet.weOwnAddress(outputAddresses(cancelTx)[0]));
  });

  it('drops an undecodable cached copy of our tx and uses a fresh one from the server', async () => {
    const { wallet, tx1 } = setup();
    serve(tx1);
    for (const garbage of ['0x' + tx1.toHex(), 'zz', tx1.toHex().slice(0, 40)]) {
      mockCachedHex[tx1.getId()] = garbage;
      const { tx } = await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10);
      assert(tx);
      assert.ok(outputAddresses(tx).includes(RECIPIENT));
      assert.strictEqual(mockCachedHex[tx1.getId()], tx1.toHex());
    }
  });

  it('drops an undecodable cached copy of a previous tx and uses a fresh one from the server', async () => {
    const { wallet, fundingTx, tx1 } = setup();
    serve(tx1);
    mockCachedHex[fundingTx.getId()] = '0x' + fundingTx.toHex();
    const { tx } = await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createCPFPbumpFee(10);
    assert(tx);
    assert.strictEqual(mockCachedHex[fundingTx.getId()], fundingTx.toHex());
  });

  it('refuses with TxVerificationError when the server keeps sending undecodable hex', async () => {
    const { wallet, fundingTx, tx1 } = setup();
    serve(tx1);
    serverHex[tx1.getId()] = 'zz' + tx1.toHex();
    await assert.rejects(
      new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createRBFbumpFee(10),
      (err: Error) => isTxVerificationError(err) && /decoded/.test(err.message),
    );

    serve(tx1);
    serverHex[fundingTx.getId()] = '0x' + fundingTx.toHex();
    await assert.rejects(
      new HDSegwitBech32Transaction(null, tx1.getId(), wallet).createCPFPbumpFee(10),
      (err: Error) => isTxVerificationError(err) && /decoded/.test(err.message),
    );
  });

  it('CPFP does not overpay when the server pads witness of an input we cannot verify', async () => {
    const { wallet, ourAddress } = setup();
    const foreignFunding = new bitcoin.Transaction();
    foreignFunding.version = 2;
    foreignFunding.addInput(new Uint8Array(32).fill(0x66), 0);
    foreignFunding.addOutput(bitcoin.address.toOutputScript(RECIPIENT), 200_000n);
    serve(foreignFunding);
    const honest = new bitcoin.Transaction();
    honest.version = 2;
    honest.addInput(foreignFunding.getHash(), 0);
    honest.ins[0].witness = [new Uint8Array(72), new Uint8Array(33)];
    honest.addOutput(bitcoin.address.toOutputScript(ourAddress), 197_000n); // 3000 sat fee, ~27 sat/vB

    serve(honest);
    const honestInfo = await new HDSegwitBech32Transaction(null, honest.getId(), wallet).getInfo();
    assert.strictEqual(honestInfo.vsize, honest.virtualSize());
    const honestChild = await new HDSegwitBech32Transaction(null, honest.getId(), wallet).createCPFPbumpFee(40);

    for (const padding of [
      [new Uint8Array(200_000)],
      [new Uint8Array(3000), new Uint8Array(3000)],
      new Array(500).fill(new Uint8Array(1)),
    ]) {
      for (const k of Object.keys(mockCachedHex)) delete mockCachedHex[k];
      const padded = bitcoin.Transaction.fromHex(honest.toHex());
      padded.ins[0].witness = [...padded.ins[0].witness, ...padding];
      assert.strictEqual(padded.getId(), honest.getId());
      assert.ok(padded.virtualSize() > honest.virtualSize());
      serve(padded);

      const info = await new HDSegwitBech32Transaction(null, honest.getId(), wallet).getInfo();
      assert.strictEqual(info.feeRate, honestInfo.feeRate);
      const { tx, fee } = await new HDSegwitBech32Transaction(null, honest.getId(), wallet).createCPFPbumpFee(40);
      assert(tx);
      assert.strictEqual(fee, honestChild.fee);
      // package pays about the selected feerate, not way more
      const packageFeeRate = (3000 + fee) / (honest.virtualSize() + tx.virtualSize());
      assert.ok(packageFeeRate >= 40 && packageFeeRate < 42, `package feerate ${packageFeeRate}`);
    }
  });

  it('never estimates vsize above the real one, and uses real witness of our own (verified) inputs', async () => {
    const { wallet, tx1 } = setup();
    serve(tx1);
    const { vsize } = await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).getInfo();
    assert.strictEqual(vsize, tx1.virtualSize());

    // honest but big witness on an input we dont own (e.g. multisig): counted as a small one, feerate looks higher
    const { ourAddress } = setup();
    const foreignFunding = new bitcoin.Transaction();
    foreignFunding.version = 2;
    foreignFunding.addInput(new Uint8Array(32).fill(0x77), 0);
    foreignFunding.addOutput(bitcoin.address.toOutputScript(RECIPIENT), 200_000n);
    serve(foreignFunding);
    const multisigLike = new bitcoin.Transaction();
    multisigLike.version = 2;
    multisigLike.addInput(foreignFunding.getHash(), 0);
    multisigLike.ins[0].witness = [new Uint8Array(0), new Uint8Array(72), new Uint8Array(72), new Uint8Array(105)];
    multisigLike.addOutput(bitcoin.address.toOutputScript(ourAddress), 197_000n);
    serve(multisigLike);
    const info = await new HDSegwitBech32Transaction(null, multisigLike.getId(), wallet).getInfo();
    assert.ok(info.vsize < multisigLike.virtualSize());
    assert.ok(info.feeRate >= Math.floor(3000 / multisigLike.virtualSize()));
  });
});
