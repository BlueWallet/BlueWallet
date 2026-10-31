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

  describe('CPFP of a tx with a foreign input: size never comes from the witness the server sends', () => {
    const ECPair = ECPairFactory(ecc);
    const key = ECPair.fromPrivateKey(new Uint8Array(32).fill(0x42));
    const P2TR_SCRIPT = new Uint8Array([0x51, 0x20, ...key.publicKey.subarray(1, 33)]); // key used as output key
    const P2WPKH_SCRIPT = bitcoin.address.toOutputScript(RECIPIENT);
    const P2WSH_SCRIPT = new Uint8Array([0x00, 0x20, ...new Uint8Array(32).fill(0x33)]);
    const P2SH_SCRIPT = bitcoin.payments.p2sh({ hash: new Uint8Array(20).fill(0x44) }).output!;
    const MULTISIG_WITNESS = [new Uint8Array(0), new Uint8Array(72), new Uint8Array(72), new Uint8Array(105)];
    const INSCRIPTION_WITNESS = [new Uint8Array(64), new Uint8Array(50_000), new Uint8Array(33)];
    const isSizeError = (err: Error) => isTxNotReplaceableError(err) && !isTxVerificationError(err) && /size/.test(err.message);

    /**
     * Incoming tx (3000 sat fee) spending a foreign output with `prevScript`. `real` is the tx miners have, the server
     * can be told to send a copy of it with another witness (same txid).
     */
    const incoming = (prevScript: Uint8Array, input: { witness?: Uint8Array[]; scriptSig?: Uint8Array; p2trHashType?: number }) => {
      const { wallet, ourAddress } = setup();
      const foreignFunding = new bitcoin.Transaction();
      foreignFunding.version = 2;
      foreignFunding.addInput(new Uint8Array(32).fill(0x77), 0);
      foreignFunding.addOutput(prevScript, 200_000n);
      serve(foreignFunding);
      const real = new bitcoin.Transaction();
      real.version = 2;
      real.addInput(foreignFunding.getHash(), 0);
      real.addOutput(bitcoin.address.toOutputScript(ourAddress), 197_000n);
      if (input.scriptSig) real.ins[0].script = input.scriptSig;
      if (input.witness) real.ins[0].witness = input.witness;
      if (input.p2trHashType !== undefined) {
        const hash = real.hashForWitnessV1(0, [prevScript], [200_000n], input.p2trHashType);
        const sig = ecc.signSchnorr!(hash, key.privateKey!);
        real.ins[0].witness = [
          input.p2trHashType === bitcoin.Transaction.SIGHASH_DEFAULT ? sig : new Uint8Array([...sig, input.p2trHashType]),
        ];
      }
      serve(real);
      const withWitness = (witness: Uint8Array[]) => {
        const copy = bitcoin.Transaction.fromHex(real.toHex());
        copy.ins[0].witness = witness;
        assert.strictEqual(copy.getId(), real.getId());
        return copy;
      };
      const packageFeeRate = (childFee: number, child: bitcoin.Transaction) =>
        (3000 + childFee) / (real.virtualSize() + child.virtualSize());
      return { real, withWitness, packageFeeRate, t: () => new HDSegwitBech32Transaction(null, real.getId(), wallet) };
    };

    it.each([
      ['as it is', MULTISIG_WITNESS],
      ['shrunk', [new Uint8Array(64)]],
      ['shrunk to a p2wpkh-like witness', [new Uint8Array(72), new Uint8Array(33)]],
    ])('refuses a 2-of-3 P2WSH multisig spend, witness served %s', async (_, served) => {
      const { withWitness, t } = incoming(P2WSH_SCRIPT, { witness: MULTISIG_WITNESS });
      serve(withWitness(served));
      await assert.rejects(t().getInfo(), isSizeError);
      await assert.rejects(t().createCPFPbumpFee(50), isSizeError);
    });

    it.each([
      ['as it is', MULTISIG_WITNESS],
      ['shrunk to a p2wpkh-like witness', [new Uint8Array(72), new Uint8Array(33)]],
    ])('refuses a P2SH-P2WSH multisig spend, witness served %s', async (_, served) => {
      const p2shP2wsh = bitcoin.payments.p2sh({ redeem: { output: P2WSH_SCRIPT } });
      const scriptSig = bitcoin.script.compile([p2shP2wsh.redeem!.output!]);
      const { withWitness, t } = incoming(p2shP2wsh.output!, { scriptSig, witness: MULTISIG_WITNESS });
      serve(withWitness(served));
      await assert.rejects(t().getInfo(), isSizeError);
      await assert.rejects(t().createCPFPbumpFee(50), isSizeError);
    });

    it('refuses a P2SH spend with a p2wpkh redeem script that does not match the previous output', async () => {
      const scriptSig = bitcoin.script.compile([new Uint8Array([0x00, 0x14, ...new Uint8Array(20).fill(0x55)])]);
      const { t } = incoming(P2SH_SCRIPT, { scriptSig, witness: [new Uint8Array(72), new Uint8Array(33)] });
      await assert.rejects(t().createCPFPbumpFee(50), isSizeError);
    });

    it('sizes a P2SH-P2WPKH spend with the max witness size and exact scriptSig, whatever witness is served', async () => {
      const p2shP2wpkh = bitcoin.payments.p2sh({ redeem: bitcoin.payments.p2wpkh({ pubkey: key.publicKey }) });
      const scriptSig = bitcoin.script.compile([p2shP2wpkh.redeem!.output!]);
      const realWitness = [new Uint8Array(71), new Uint8Array(33)];
      const { real, withWitness, packageFeeRate, t } = incoming(p2shP2wpkh.output!, { scriptSig, witness: realWitness });
      const maxSize = withWitness([new Uint8Array(72), new Uint8Array(33)]).virtualSize();
      assert.ok(maxSize >= real.virtualSize() && maxSize - real.virtualSize() <= 1);

      const honestChild = await t().createCPFPbumpFee(50);
      assert(honestChild.tx);
      assert.ok(packageFeeRate(honestChild.fee, honestChild.tx) >= 50);
      for (const served of [realWitness, [new Uint8Array(64)], [], [new Uint8Array(200_000)], MULTISIG_WITNESS]) {
        serve(withWitness(served));
        const info = await t().getInfo();
        assert.strictEqual(info.witnessUnverifiable, false);
        assert.strictEqual(info.vsize, maxSize);
        const { tx, fee } = await t().createCPFPbumpFee(50);
        assert(tx);
        assert.strictEqual(fee, honestChild.fee);
      }
    });

    it.each([
      ['as it is', INSCRIPTION_WITNESS],
      ['shrunk to a fake key-path signature', [new Uint8Array(64)]],
      ['shrunk to a fake key-path signature with sighash byte', [new Uint8Array([...new Uint8Array(64), 0x01])]],
    ])('refuses a P2TR script-path spend (inscription), witness served %s', async (_, served) => {
      const { withWitness, t } = incoming(P2TR_SCRIPT, { witness: INSCRIPTION_WITNESS });
      serve(withWitness(served));
      await assert.rejects(t().getInfo(), isSizeError);
      await assert.rejects(t().createCPFPbumpFee(50), isSizeError);
    });

    it.each([
      ['without sighash byte', bitcoin.Transaction.SIGHASH_DEFAULT],
      ['with sighash byte', bitcoin.Transaction.SIGHASH_ALL],
    ])('sizes a valid P2TR key-path spend exactly (%s), CPFP pays the selected feerate', async (_, p2trHashType) => {
      const { real, packageFeeRate, t } = incoming(P2TR_SCRIPT, { p2trHashType });
      const info = await t().getInfo();
      assert.strictEqual(info.witnessUnverifiable, false);
      assert.strictEqual(info.vsize, real.virtualSize());
      assert.strictEqual(info.feeRate, Math.floor(3000 / real.virtualSize()));
      const { tx, fee } = await t().createCPFPbumpFee(50);
      assert(tx);
      const rate = packageFeeRate(fee, tx);
      assert.ok(rate >= 50, `package feerate ${rate}`); // size is exact (checked above), so no overpay from it
    });

    it('never overpays for a padded P2TR key-path spend: drops a padded cached copy, refuses if the server keeps padding', async () => {
      const { real, withWitness, packageFeeRate, t } = incoming(P2TR_SCRIPT, { p2trHashType: bitcoin.Transaction.SIGHASH_DEFAULT });
      const [sig] = real.ins[0].witness;
      const honestChild = await t().createCPFPbumpFee(50);
      for (const padded of [
        [sig, new Uint8Array([0x50, ...new Uint8Array(40)])], // annex
        [sig, new Uint8Array(40)],
        [new Uint8Array([...sig, 0x01])], // sighash byte the signature was not made with
        [new Uint8Array([...sig, ...new Uint8Array(40)])],
      ]) {
        // padded copy in cache, honest server: cache is dropped, CPFP is the same as for the honest copy
        serve(real);
        mockCachedHex[real.getId()] = withWitness(padded).toHex();
        const { tx, fee } = await t().createCPFPbumpFee(50);
        assert(tx);
        assert.strictEqual(fee, honestChild.fee);
        assert.strictEqual(mockCachedHex[real.getId()], real.toHex());
        assert.ok(packageFeeRate(fee, tx) >= 50);

        // server keeps padding: refused, nothing to sign
        delete mockCachedHex[real.getId()];
        serve(withWitness(padded));
        await assert.rejects(t().getInfo(), isSizeError);
        await assert.rejects(t().createCPFPbumpFee(50), isSizeError);
      }
    });

    it('sizes a P2WPKH spend with the max witness size, whatever witness is served (shrunk, padded, cached)', async () => {
      const realWitness = [new Uint8Array(71), new Uint8Array(33)]; // usual low-R signature, 1 byte less than max
      const { real, withWitness, packageFeeRate, t } = incoming(P2WPKH_SCRIPT, { witness: realWitness });
      const maxSize = withWitness([new Uint8Array(72), new Uint8Array(33)]).virtualSize();
      assert.ok(maxSize >= real.virtualSize() && maxSize - real.virtualSize() <= 1);

      const honest = await t().getInfo();
      assert.strictEqual(honest.witnessUnverifiable, false);
      assert.strictEqual(honest.vsize, maxSize);
      const honestChild = await t().createCPFPbumpFee(50);
      assert(honestChild.tx);
      assert.ok(packageFeeRate(honestChild.fee, honestChild.tx) >= 50);

      for (const served of [[new Uint8Array(64)], [], [new Uint8Array(200_000)], new Array(500).fill(new Uint8Array(1))]) {
        for (const cached of [false, true]) {
          delete mockCachedHex[real.getId()];
          serve(cached ? real : withWitness(served));
          if (cached) mockCachedHex[real.getId()] = withWitness(served).toHex();
          const info = await t().getInfo();
          assert.strictEqual(info.vsize, maxSize);
          assert.strictEqual(info.witnessUnverifiable, false);
          const { tx, fee } = await t().createCPFPbumpFee(50);
          assert(tx);
          assert.strictEqual(fee, honestChild.fee);
        }
      }
    });

    it('sizes a legacy (P2PKH) spend exactly, a witness served for it is ignored', async () => {
      const scriptSig = bitcoin.script.compile([new Uint8Array(72), key.publicKey]);
      const p2pkh = bitcoin.payments.p2pkh({ pubkey: key.publicKey }).output!;
      const { real, withWitness, packageFeeRate, t } = incoming(p2pkh, { scriptSig });
      assert.strictEqual(real.hasWitnesses(), false);
      for (const served of [[], [new Uint8Array(500)]]) {
        serve(withWitness(served));
        const info = await t().getInfo();
        assert.strictEqual(info.witnessUnverifiable, false);
        assert.strictEqual(info.vsize, real.virtualSize());
        const { tx, fee } = await t().createCPFPbumpFee(50);
        assert(tx);
        const rate = packageFeeRate(fee, tx);
        assert.ok(rate >= 50, `package feerate ${rate}`); // size is exact (checked above), so no overpay from it
      }
    });
  });

  it('size check does not affect our own txs: RBF bump, cancel and CPFP work, own vsize is exact', async () => {
    const { wallet, tx1 } = setup();
    serve(tx1);
    const t = () => new HDSegwitBech32Transaction(null, tx1.getId(), wallet);
    for (const info of [await t().getInfo(), await t().getInfo('bump'), await t().getInfo('cancel')]) {
      assert.strictEqual(info.witnessUnverifiable, false);
      assert.strictEqual(info.vsize, tx1.virtualSize());
    }
    assert((await t().createRBFbumpFee(10)).tx);
    assert((await t().createRBFcancelTx(10)).tx);
    assert((await t().createCPFPbumpFee(10)).tx);
  });

  it('canBumpTx() is false for a tx with an output this wallet cannot recreate (OP_RETURN), canCancelTx() is not affected', async () => {
    const { wallet, fundingTx, ourAddress, tx1 } = setup();
    jest.spyOn(wallet, 'getDerivedUtxoFromOurTransaction').mockReturnValue([{ txid: fundingTx.getId(), vout: 0 } as any]);
    const { tx } = wallet.createTransaction(
      [{ txid: fundingTx.getId(), vout: 0, value: 100_000, address: ourAddress }],
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
    serve(opReturnTx, { verbose: { txid: opReturnTx.getId(), confirmations: 0 } });
    serve(tx1);

    assert.strictEqual(await new HDSegwitBech32Transaction(null, opReturnTx.getId(), wallet).canBumpTx(), false);
    assert.strictEqual(await new HDSegwitBech32Transaction(null, opReturnTx.getId(), wallet).canCancelTx(), true);
    // usual tx still can be bumped and canceled
    assert.strictEqual(await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).canBumpTx(), true);
    assert.strictEqual(await new HDSegwitBech32Transaction(null, tx1.getId(), wallet).canCancelTx(), true);
  });
});
