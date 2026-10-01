import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as bitcoin from 'bitcoinjs-lib';

import {
  CHANGE_BESIDE_EQUAL_OUTPUTS,
  CHANGE_IDENTIFIABLE,
  equalSplit,
  estimateOctojoinFee,
  isOctojoinMemo,
  isRound,
  OctojoinRandomness,
  octojoinFeeAndChange,
  planOctojoin,
  smallestSplittable,
  splitAmount,
  splitRange,
  UNNECESSARY_INPUT,
} from '../../class/octojoin';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';

const rng = (seed: string) => new OctojoinRandomness(Buffer.from(seed));

const coin = (value: number, isOctojoin: boolean) => ({ value, isOctojoin });

const plan = (utxos: { value: number; isOctojoin: boolean }[], paymentSats: number, extra: Record<string, unknown> = {}) =>
  planOctojoin({
    utxos,
    paymentSats,
    addresses: ['addrA', 'addrB'],
    isSilentPayment: false,
    numInputs: 3,
    feeRate: 1,
    rng: rng('octojoin'),
    ...extra,
  });

const values = (p: { paymentTargets: { value: number }[] }) => p.paymentTargets.map(t => t.value);

describe('Octojoin protocol logic', () => {
  it('isOctojoinMemo matches case-insensitively and within longer notes', () => {
    assert.strictEqual(isOctojoinMemo('Octojoin 1'), true);
    assert.strictEqual(isOctojoinMemo('octojoin 2'), true);
    assert.strictEqual(isOctojoinMemo('my OCTOJOIN swap'), true);
    assert.strictEqual(isOctojoinMemo('Normal TX'), false);
    assert.strictEqual(isOctojoinMemo(''), false);
    assert.strictEqual(isOctojoinMemo(undefined), false);
  });

  it('randomness repeats for a seed and stays in range', () => {
    const draw = (seed: string) => {
      const r = rng(seed);
      return Array.from({ length: 200 }, () => r.below(1000));
    };
    assert.deepStrictEqual(draw('seed'), draw('seed'));
    assert.notDeepStrictEqual(draw('seed'), draw('other'));
    assert.ok(draw('seed').every(d => d >= 0 && d < 1000));
  });

  it('the split range is half to one and a half shares above dust', () => {
    assert.deepStrictEqual(splitRange(300000, 2), [75000, 225000]);
    assert.deepStrictEqual(splitRange(300000, 3), [50000, 150000]);
    assert.deepStrictEqual(splitRange(1200, 2), [547, 900]);
    assert.strictEqual(smallestSplittable(2), 547 + 548);
    assert.strictEqual(smallestSplittable(2, 546, true), 2 * 547);
  });

  it('a split adds up and has different values that are not round', () => {
    for (const k of [2, 3, 4, 5]) {
      for (const paymentSats of [5000, 80000, 200000, 300000, 1000000, 123456789]) {
        const r = rng(`${paymentSats}/${k}`);
        const [lo, hi] = splitRange(paymentSats, k);
        for (let i = 0; i < 20; i++) {
          const parts = splitAmount(paymentSats, k, 546, r) as number[];
          assert.strictEqual(parts.length, k);
          assert.strictEqual(
            parts.reduce((a, b) => a + b, 0),
            paymentSats,
          );
          assert.ok(parts.every(v => v >= lo && v <= hi));
          assert.strictEqual(new Set(parts).size, k);
          assert.ok(!parts.some(isRound));
        }
      }
    }
  });

  it('equal amounts split the payment evenly', () => {
    assert.deepStrictEqual(equalSplit(300000, 2), [150000, 150000]);
    assert.deepStrictEqual(equalSplit(300001, 2), [150001, 150000]);
    assert.deepStrictEqual(equalSplit(100000, 3), [33334, 33333, 33333]);
  });

  it('round change gives 1 sat to the fee, and change at or below dust goes to the fee', () => {
    const fee = estimateOctojoinFee(3, 3, 1);
    assert.deepStrictEqual(octojoinFeeAndChange(390000 + fee, 300000, 3, 2, { feeRate: 1 }), { change: 89999, fee: fee + 1 });
    assert.deepStrictEqual(octojoinFeeAndChange(300400, 300000, 3, 2, { feeRate: 1 }), { change: 0, fee: 400 });
    assert.strictEqual(octojoinFeeAndChange(300100, 300000, 3, 2, { feeRate: 1 }), null);
  });

  it('estimateOctojoinFee scales with size and fee rate', () => {
    assert.strictEqual(estimateOctojoinFee(3, 2, 1, 68), 11 + 3 * 68 + 2 * 34);
    assert.strictEqual(estimateOctojoinFee(3, 2, 2, 68), (11 + 3 * 68 + 2 * 34) * 2);
  });
});

describe('Octojoin planning', () => {
  it('spends numInputs - 1 swapped coins and exactly one sender coin', () => {
    const p = plan([coin(200000, true), coin(300000, true), coin(400000, true), coin(500000, false), coin(900000, false)], 600000);
    assert.strictEqual(p.inputs.length, 3);
    assert.strictEqual(p.inputs.filter(u => u.isOctojoin).length, 2);
    assert.strictEqual(p.totalInput, 600000 + p.change + p.fee);
  });

  it('prefers a selection without an unnecessary input', () => {
    const utxos = [coin(100000, true), coin(100000, true), coin(900000, true), coin(100000, false), coin(1000000, false)];
    for (let seed = 0; seed < 20; seed++) {
      const p = plan(utxos, 290000, { rng: rng(`s${seed}`) });
      assert.ok(p.uihClean);
      assert.ok(p.change < Math.min(...p.inputs.map(u => u.value)));
    }
  });

  it('prefers a selection without change, then change that looks like a payment output', () => {
    const swapped = [coin(120000, true), coin(130000, true)];
    for (let seed = 0; seed < 20; seed++) {
      const changeless = plan([...swapped, coin(140000, false), coin(50450, false)], 300000, { rng: rng(`s${seed}`) });
      assert.strictEqual(changeless.change, 0);
      assert.deepStrictEqual(changeless.warnings, []);
      const blending = plan([...swapped, coin(100000, false), coin(140000, false)], 300000, { rng: rng(`s${seed}`) });
      assert.strictEqual(blending.inputs[2].value, 140000);
      assert.deepStrictEqual(blending.warnings, []);
    }
  });

  it('puts a payment output below every input when the change is below every input', () => {
    const utxos = [coin(120000, true), coin(130000, true), coin(140000, false)];
    const ranks = new Set<number>();
    for (let seed = 0; seed < 100; seed++) {
      const p = plan(utxos, 300000, { rng: rng(`s${seed}`) });
      const smallestInput = Math.min(...p.inputs.map(u => u.value));
      assert.ok(p.change < smallestInput);
      assert.ok(Math.min(...values(p)) < smallestInput, 'the change is not the only output below every input');
      ranks.add([...values(p), p.change].sort((a, b) => a - b).indexOf(p.change));
    }
    assert.deepStrictEqual(ranks, new Set([0, 1]), 'the change is not always in the same place');
  });

  it('warns about what an observer could notice', () => {
    const large = plan([coin(500000, true), coin(500000, true), coin(500000, false)], 300000);
    assert.ok(large.warnings.includes(UNNECESSARY_INPUT));
    const small = plan([coin(100000, true), coin(100000, true), coin(110000, false)], 300000);
    assert.deepStrictEqual(small.warnings, [CHANGE_IDENTIFIABLE]);
    const equal = plan([coin(120000, true), coin(130000, true), coin(140000, false)], 300000, { equalOutputs: true });
    assert.deepStrictEqual(values(equal), [150000, 150000]);
    assert.deepStrictEqual(equal.warnings, [CHANGE_BESIDE_EQUAL_OUTPUTS]);
  });

  it('expands a silent payment address into numOutputs outputs', () => {
    const p = planOctojoin({
      utxos: [coin(250000, true), coin(250000, true), coin(250000, true), coin(260000, false)],
      paymentSats: 700000,
      addresses: ['sp1qexample'],
      isSilentPayment: true,
      numInputs: 4,
      numOutputs: 2,
      feeRate: 1,
      rng: rng('sp'),
    });
    assert.strictEqual(p.paymentTargets.length, 2, 'numOutputs controls the SP output count');
    assert.ok(p.paymentTargets.every(t => t.address === 'sp1qexample'));
    assert.strictEqual(
      values(p).reduce((s, v) => s + v, 0),
      700000,
    );
  });

  it('rejects amounts it cannot split and shapes it cannot build', () => {
    const utxos = [coin(300000, true), coin(300000, true), coin(300000, false)];
    assert.throws(() => plan(utxos, 520), /below the dust threshold/);
    assert.throws(() => plan(utxos, 1094), /cannot be split into 2 different outputs/);
    assert.deepStrictEqual(values(plan(utxos, 1095)).sort(), [547, 548]);
    assert.throws(() => plan([coin(150000, true), coin(50000, false)], 100000), /Not enough 'octojoin' coins/);
    assert.throws(() => plan([coin(150000, true), coin(150000, true)], 100000), /at least 1 non-octojoin coin/);
    assert.throws(() => plan([coin(100000, true), coin(100000, true), coin(50000, false)], 305000, { feeRate: 10 }), /Insufficient funds/);
  });

  // The same vectors run against the planners of the reference implementation and the
  // Electrum plugin, so all of them make the same choices from the same random stream.
  it('matches the shared test vectors', () => {
    const vectors = JSON.parse(fs.readFileSync(path.join(__dirname, 'octojoin-vectors.json'), 'utf8'));
    const errors: Record<string, RegExp> = {
      amountBelowDust: /below the dust threshold/,
      outputBelowDust: /cannot be split/,
      notEnoughSwappedCoins: /Not enough 'octojoin' coins/,
      noSenderCoin: /non-octojoin coin/,
      insufficientFunds: /Insufficient funds/,
    };
    for (const v of vectors) {
      const utxos: { value: number; isOctojoin: boolean; index: number }[] = v.coins.map(
        (c: { valueSats: number; isSwapped: boolean }, index: number) => ({
          value: c.valueSats,
          isOctojoin: c.isSwapped,
          index,
        }),
      );
      const run = () =>
        planOctojoin({
          utxos,
          paymentSats: v.paymentSats,
          addresses: v.outputs.map((_: string, i: number) => `recipient${i}`),
          isSilentPayment: false,
          numInputs: v.numInputs,
          feeRate: v.feeRate,
          inputVbytes: 68,
          outputVbytes: 31,
          dust: 294,
          rng: new OctojoinRandomness(Buffer.from(v.seed, 'hex')),
          equalOutputs: v.equalOutputs,
        });
      if (v.expected.error) {
        assert.throws(run, errors[v.expected.error], v.name);
        continue;
      }
      const p = run();
      assert.deepStrictEqual(
        {
          inputs: p.inputs.map(u => u.index),
          payments: values(p),
          changeSats: p.change,
          feeSats: p.fee,
          uihClean: p.uihClean,
          changeHidden: p.changeHidden,
        },
        v.expected,
        v.name,
      );
    }
  });
});

describe('Octojoin transaction building (integration)', () => {
  it('builds and signs the planned octojoin transaction with forced inputs', () => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    assert.ok(hd.validateMnemonic());

    // inputs at the wallet's own addresses so it can sign; tag two as octojoin
    const in0 = hd._getExternalAddressByIndex(0);
    const in1 = hd._getExternalAddressByIndex(1);
    const in2 = hd._getExternalAddressByIndex(2);
    const utxos = [
      { address: in0, txid: '1'.repeat(64), vout: 0, value: 120000, isOctojoin: true },
      { address: in1, txid: '2'.repeat(64), vout: 0, value: 130000, isOctojoin: true },
      { address: in2, txid: '3'.repeat(64), vout: 0, value: 140000, isOctojoin: false },
    ];

    const recipients = [hd._getExternalAddressByIndex(10), hd._getExternalAddressByIndex(11)];
    const p = planOctojoin({
      utxos,
      paymentSats: 300000,
      addresses: recipients,
      isSilentPayment: false,
      numInputs: 3,
      feeRate: 2,
      rng: rng('integration'),
    });
    assert.deepStrictEqual(p.warnings, []);

    const changeAddress = hd._getInternalAddressByIndex(hd.next_free_change_address_index);
    const { tx, outputs, fee } = hd.createTransaction(p.inputs as any, p.paymentTargets, 2, changeAddress, undefined, false, 0, true);

    assert.ok(tx, 'transaction should be finalized');
    assert.strictEqual(tx!.ins.length, 3, 'all three forced inputs spent');
    assert.strictEqual(outputs.length, 3, 'two payment outputs and one change output');
    const changeOutputs = outputs.filter(o => o.address === changeAddress);
    assert.strictEqual(changeOutputs.length, 1, 'exactly one change output');
    assert.strictEqual(changeOutputs[0].value, p.change, 'the wallet builds the planned change');
    assert.strictEqual(fee, p.fee, 'the wallet pays the planned fee');
    const paid = outputs.filter(o => recipients.includes(o.address as string)).map(o => o.value);
    assert.strictEqual(
      paid.reduce((s, v) => s + v, 0),
      300000,
    );
    const all = outputs.map(o => o.value);
    assert.strictEqual(new Set(all).size, 3, 'no two outputs have the same value');
    assert.ok(!all.some(isRound), 'no output is round');
    const totalIn = p.inputs.reduce((s, u) => s + u.value, 0);
    assert.strictEqual(totalIn, all.reduce((s, v) => s + v, 0) + fee);
    const feerate = fee / tx!.virtualSize();
    assert.ok(feerate >= 1.9, `fee rate too low: ${feerate}`);
    assert.ok(tx!.toHex().length > 0);
  });

  it('builds and signs a silent-payment octojoin transaction honoring numOutputs', () => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    assert.ok(hd.validateMnemonic());
    assert.ok(hd.allowSilentPaymentSend());

    const in0 = hd._getExternalAddressByIndex(0);
    const in1 = hd._getExternalAddressByIndex(1);
    const in2 = hd._getExternalAddressByIndex(2);
    const utxos = [
      { address: in0, txid: '1'.repeat(64), vout: 0, value: 120000, isOctojoin: true, wif: hd._getWIFbyAddress(in0) as string },
      { address: in1, txid: '2'.repeat(64), vout: 0, value: 130000, isOctojoin: true, wif: hd._getWIFbyAddress(in1) as string },
      { address: in2, txid: '3'.repeat(64), vout: 0, value: 140000, isOctojoin: false, wif: hd._getWIFbyAddress(in2) as string },
    ];

    // single silent-payment recipient; octojoin must expand it into numOutputs distinct outputs
    const spAddress =
      'sp1qqvvnsd3xnjpmx8hnn2ua0e9sllm34t9jydf8qfesgc7nhdxgzksjwqlrxx37nfzsg6rure5vwa92fksd6f5a6rk05kr07twhd55u3ahquy2v7t6s';
    const p = planOctojoin({
      utxos,
      paymentSats: 300000,
      addresses: [spAddress],
      isSilentPayment: true,
      numInputs: 3,
      numOutputs: 2,
      feeRate: 2,
      rng: rng('silent payment'),
    });
    assert.strictEqual(p.paymentTargets.length, 2);
    assert.ok(p.paymentTargets.every(t => t.address === spAddress));

    const changeAddress = hd._getInternalAddressByIndex(hd.next_free_change_address_index);
    const { tx, fee } = hd.createTransaction(p.inputs as any, p.paymentTargets, 2, changeAddress, undefined, false, 0, true);

    assert.ok(tx, 'transaction should be finalized');
    assert.strictEqual(tx!.ins.length, 3, 'all three forced inputs spent');

    const decoded = tx!.outs.map(o => ({ address: bitcoin.address.fromOutputScript(o.script), value: Number(o.value) }));
    // the single sp1 recipient resolves into two distinct taproot outputs (BIP-352)
    const spOuts = decoded.filter(o => o.address.startsWith('bc1p'));
    assert.strictEqual(spOuts.length, 2, 'numOutputs distinct SP outputs');
    assert.notStrictEqual(spOuts[0].address, spOuts[1].address, 'SP outputs are unique addresses');
    assert.strictEqual(
      spOuts.reduce((s, o) => s + o.value, 0),
      300000,
      'payment value conserved across SP outputs',
    );

    const changeOuts = decoded.filter(o => o.address === changeAddress);
    assert.strictEqual(changeOuts.length, 1, 'exactly one change output');
    assert.strictEqual(changeOuts[0].value, p.change);

    const totalIn = p.inputs.reduce((s, u) => s + u.value, 0);
    const totalOut = decoded.reduce((s, o) => s + o.value, 0);
    assert.strictEqual(totalIn, totalOut + fee, 'inputs === outputs + fee');
    assert.ok(tx!.toHex().length > 0, 'produces broadcastable hex');
  });
});
