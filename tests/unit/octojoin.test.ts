import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';

import {
  decomposeAmount,
  distributeOutputs,
  estimateOctojoinFee,
  isOctojoinMemo,
  planOctojoin,
  selectOctojoinUtxos,
} from '../../class/octojoin';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';

describe('Octojoin protocol logic', () => {
  it('decomposeAmount chunks into standard denominations', () => {
    const denominations = decomposeAmount(300000);
    assert.strictEqual(denominations.length, 2);
    assert.ok(denominations.includes(200000));
    assert.ok(denominations.includes(100000));
  });

  it('decomposeAmount keeps a non-dust remainder as its own output', () => {
    assert.deepStrictEqual(decomposeAmount(101000), [100000, 1000]);
  });

  it('decomposeAmount folds a sub-dust remainder into the last output instead of losing it to fees', () => {
    // 500 sat remainder is below the 546 dust threshold but must not vanish
    assert.deepStrictEqual(decomposeAmount(100500), [100500]);
    assert.strictEqual(
      decomposeAmount(100500).reduce((s, v) => s + v, 0),
      100500,
    );
  });

  it('decomposeAmount conserves value for a sub-dust total (the 501-546 sat window)', () => {
    // whole payment is below the smallest denomination AND the dust threshold:
    // it cannot form a valid standard output, so it must not silently become a fee
    for (const amt of [501, 520, 546]) {
      assert.deepStrictEqual(decomposeAmount(amt), [], `expected empty decomposition for ${amt}`);
    }
    // just above dust it becomes a single output, with no value lost
    assert.deepStrictEqual(decomposeAmount(547), [547]);
  });

  it('planOctojoin rejects a sub-dust payment instead of donating it to fees', () => {
    const utxos = [
      { value: 100000, isOctojoin: true },
      { value: 100000, isOctojoin: true },
      { value: 100000, isOctojoin: false },
    ];
    assert.throws(
      () => planOctojoin({ utxos, paymentSats: 520, addresses: ['a', 'b'], isSilentPayment: false, numInputs: 3, feeRate: 1 }),
      /below the dust threshold/,
    );
  });

  it('isOctojoinMemo matches case-insensitively and within longer notes', () => {
    assert.strictEqual(isOctojoinMemo('Octojoin 1'), true);
    assert.strictEqual(isOctojoinMemo('octojoin 2'), true);
    assert.strictEqual(isOctojoinMemo('my OCTOJOIN swap'), true);
    assert.strictEqual(isOctojoinMemo('Normal TX'), false);
    assert.strictEqual(isOctojoinMemo(''), false);
    assert.strictEqual(isOctojoinMemo(undefined), false);
  });

  it('selectOctojoinUtxos isolates octojoin-tagged coins from the rest', () => {
    const utxos = [
      { value: 150000, isOctojoin: true },
      { value: 150000, isOctojoin: true },
      { value: 50000, isOctojoin: false },
    ];

    const selection = selectOctojoinUtxos(utxos, 3, 300000);

    assert.strictEqual(selection.swapped.length, 2);
    assert.strictEqual(selection.other.length, 1);
    assert.strictEqual(selection.all.length, 3);
    assert.strictEqual(selection.totalValue, 350000);
  });

  it('selectOctojoinUtxos uses exactly one non-octojoin sender coin and caps inputs at numInputs', () => {
    const utxos = [
      { value: 150000, isOctojoin: true },
      { value: 150000, isOctojoin: true },
      { value: 90000, isOctojoin: false },
      { value: 90000, isOctojoin: false },
      { value: 90000, isOctojoin: false },
    ];
    const selection = selectOctojoinUtxos(utxos, 3, 320000);
    assert.strictEqual(selection.other.length, 1, 'must spend exactly one sender coin');
    assert.strictEqual(selection.all.length, 3, 'total inputs must equal numInputs, not more');
    assert.strictEqual(
      selection.other.every(u => !u.isOctojoin),
      true,
    );
  });

  it('selectOctojoinUtxos picks the smallest single sender coin that covers the target', () => {
    const utxos = [
      { value: 100000, isOctojoin: true },
      { value: 100000, isOctojoin: true },
      { value: 50000, isOctojoin: false },
      { value: 130000, isOctojoin: false },
      { value: 900000, isOctojoin: false },
    ];
    // swapped = 200000, remaining = 120000 -> smallest covering coin is 130000, not 900000
    const selection = selectOctojoinUtxos(utxos, 3, 320000);
    assert.strictEqual(selection.other.length, 1);
    assert.strictEqual(selection.other[0].value, 130000);
    assert.strictEqual(selection.totalValue, 330000);
  });

  it('selectOctojoinUtxos throws when no single sender coin can cover the target (no hoarding)', () => {
    const utxos = [
      { value: 100000, isOctojoin: true },
      { value: 100000, isOctojoin: true },
      { value: 60000, isOctojoin: false },
      { value: 60000, isOctojoin: false },
    ];
    // swapped 200000 + any single 60000 = 260000 < 300000; must NOT combine both others
    assert.throws(() => selectOctojoinUtxos(utxos, 3, 300000), /Insufficient funds/);
  });

  it('selectOctojoinUtxos avoids the unnecessary input heuristic (change < smallest input)', () => {
    const utxos = [
      { value: 110000, isOctojoin: true },
      { value: 120000, isOctojoin: true },
      { value: 500000, isOctojoin: true },
      { value: 130000, isOctojoin: false },
      { value: 600000, isOctojoin: false },
    ];
    const sel = selectOctojoinUtxos(utxos, 3, 300000);
    assert.strictEqual(sel.all.length, 3);
    const change = sel.totalValue - 300000;
    const minInput = Math.min(...sel.all.map(u => u.value));
    assert.ok(change >= 0 && change < minInput, `change ${change} must be < smallest input ${minInput}`);
  });

  it('selectOctojoinUtxos prefers a UIH-clean selection over a smaller-change one with an unnecessary input', () => {
    const utxos = [
      { value: 5000, isOctojoin: true },
      { value: 110000, isOctojoin: true },
      { value: 110000, isOctojoin: true },
      { value: 152000, isOctojoin: true },
      { value: 110000, isOctojoin: false },
      { value: 153000, isOctojoin: false },
    ];
    const sel = selectOctojoinUtxos(utxos, 3, 300000);
    const change = sel.totalValue - 300000;
    const minInput = Math.min(...sel.all.map(u => u.value));
    assert.ok(change < minInput, 'selection must be UIH-clean');
    // the clean 110000+110000+110000 (change 30000), not the 5000+152000+153000 (change 10000 but unnecessary input)
    assert.strictEqual(sel.totalValue, 330000);
  });

  it('selectOctojoinUtxos throws when not enough octojoin coins', () => {
    const utxos = [
      { value: 150000, isOctojoin: true },
      { value: 50000, isOctojoin: false },
    ];
    assert.throws(() => selectOctojoinUtxos(utxos, 3, 100000), /Not enough 'octojoin' coins/);
  });

  it('selectOctojoinUtxos throws when no normal coin is available', () => {
    const utxos = [
      { value: 150000, isOctojoin: true },
      { value: 150000, isOctojoin: true },
    ];
    assert.throws(() => selectOctojoinUtxos(utxos, 3, 100000), /at least 1 non-octojoin coin/);
  });

  it('selectOctojoinUtxos throws on insufficient total funds', () => {
    const utxos = [
      { value: 10000, isOctojoin: true },
      { value: 10000, isOctojoin: true },
      { value: 10000, isOctojoin: false },
    ];
    assert.throws(() => selectOctojoinUtxos(utxos, 3, 1000000), /Insufficient funds/);
  });

  it('distributeOutputs maps decomposed denominations across addresses round-robin', () => {
    const outputs = distributeOutputs([200000, 100000, 1000], ['addr1', 'addr2']);
    assert.strictEqual(outputs.addr1, 201000);
    assert.strictEqual(outputs.addr2, 100000);
  });

  it('estimateOctojoinFee scales with size and fee rate', () => {
    assert.strictEqual(estimateOctojoinFee(3, 2, 1, 68), 11 + 3 * 68 + 2 * 34);
    assert.strictEqual(estimateOctojoinFee(3, 2, 2, 68), (11 + 3 * 68 + 2 * 34) * 2);
  });
});

describe('Octojoin planning', () => {
  const utxos = [
    { value: 100000, isOctojoin: true },
    { value: 100000, isOctojoin: true },
    { value: 800000, isOctojoin: false },
  ];

  it('produces one payment output per address and selects the forced inputs', () => {
    const plan = planOctojoin({
      utxos,
      paymentSats: 300000,
      addresses: ['addrA', 'addrB'],
      isSilentPayment: false,
      numInputs: 3,
      feeRate: 2,
    });

    assert.strictEqual(plan.paymentTargets.length, 2);
    assert.strictEqual(plan.inputs.length, 3);
    assert.strictEqual(
      plan.paymentTargets.reduce((s, t) => s + t.value, 0),
      300000,
    );
    assert.strictEqual(plan.totalInput, 1000000);
    // payment is decomposed across the addresses round-robin: 0.002 then 0.001
    assert.strictEqual(plan.paymentTargets[0].value, 200000);
    assert.strictEqual(plan.paymentTargets[1].value, 100000);
  });

  it('expands a silent payment address into one output per denomination', () => {
    const plan = planOctojoin({
      utxos,
      paymentSats: 300000,
      addresses: ['sp1qexample'],
      isSilentPayment: true,
      numInputs: 3,
      feeRate: 1,
    });
    // 300000 -> [200000, 100000] -> two sp outputs, both to the same sp address
    assert.strictEqual(plan.paymentTargets.length, 2);
    assert.ok(plan.paymentTargets.every(t => t.address === 'sp1qexample'));
  });

  it('silent payment honors numOutputs by bucketing denominations into that many outputs', () => {
    const spUtxos = [
      { value: 100000, isOctojoin: true },
      { value: 100000, isOctojoin: true },
      { value: 100000, isOctojoin: true },
      { value: 2000000, isOctojoin: false },
    ];
    // 700000 -> [500000, 200000, ... ] decomposes into several denominations;
    // with numOutputs = 2 the SP path must emit exactly 2 outputs, all to the sp address,
    // and conserve the total value.
    const plan = planOctojoin({
      utxos: spUtxos,
      paymentSats: 700000,
      addresses: ['sp1qexample'],
      isSilentPayment: true,
      numInputs: 4,
      numOutputs: 2,
      feeRate: 1,
    });
    assert.strictEqual(plan.paymentTargets.length, 2, 'numOutputs knob must control SP output count');
    assert.ok(plan.paymentTargets.every(t => t.address === 'sp1qexample'));
    assert.strictEqual(
      plan.paymentTargets.reduce((s, t) => s + t.value, 0),
      700000,
      'SP outputs must conserve the payment value',
    );
  });

  it('throws when inputs cannot cover payment plus fee', () => {
    const tiny = [
      { value: 100000, isOctojoin: true },
      { value: 100000, isOctojoin: true },
      { value: 50000, isOctojoin: false },
    ];
    assert.throws(() =>
      planOctojoin({ utxos: tiny, paymentSats: 305000, addresses: ['a', 'b'], isSilentPayment: false, numInputs: 3, feeRate: 10 }),
    );
  });
});

describe('Octojoin transaction building (integration)', () => {
  it('builds a valid, signed, changeless octojoin transaction with forced inputs', () => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    assert.ok(hd.validateMnemonic());

    // inputs at the wallet's own addresses so it can sign; tag two as octojoin
    const in0 = hd._getExternalAddressByIndex(0);
    const in1 = hd._getExternalAddressByIndex(1);
    const in2 = hd._getExternalAddressByIndex(2);
    const utxos = [
      { address: in0, txid: '1'.repeat(64), vout: 0, value: 100000, isOctojoin: true },
      { address: in1, txid: '2'.repeat(64), vout: 0, value: 100000, isOctojoin: true },
      { address: in2, txid: '3'.repeat(64), vout: 0, value: 800000, isOctojoin: false },
    ];

    const recipients = [hd._getExternalAddressByIndex(10), hd._getExternalAddressByIndex(11)];
    const plan = planOctojoin({
      utxos,
      paymentSats: 300000,
      addresses: recipients,
      isSilentPayment: false,
      numInputs: 3,
      feeRate: 2,
    });

    // payment outputs match the number of recipient addresses, and all 3 forced inputs are used
    assert.strictEqual(plan.paymentTargets.length, 2);
    assert.strictEqual(plan.inputs.length, 3);

    const changeAddress = hd._getInternalAddressByIndex(hd.next_free_change_address_index);
    const { tx, outputs, fee } = hd.createTransaction(plan.inputs as any, plan.paymentTargets, 2, changeAddress, undefined, false, 0, true);

    assert.ok(tx, 'transaction should be finalized');
    // all three forced inputs spent
    assert.strictEqual(tx!.ins.length, 3);
    // payment outputs (2) plus exactly one single change output, matching the canonical octojoin tx shape
    assert.strictEqual(outputs.length, 3);
    const changeOutputs = outputs.filter(o => o.address === changeAddress);
    assert.strictEqual(changeOutputs.length, 1, 'exactly one change output');
    for (const o of outputs) {
      assert.ok(o.value > 546, 'no dust output');
    }
    // recipients receive exactly the payment amount
    const paidToRecipients = outputs.filter(o => recipients.includes(o.address as string)).reduce((s, o) => s + o.value, 0);
    assert.strictEqual(paidToRecipients, 300000);
    // value is conserved: inputs === outputs + fee
    const totalIn = plan.inputs.reduce((s, u) => s + u.value, 0);
    const totalOut = outputs.reduce((s, o) => s + o.value, 0);
    assert.strictEqual(totalIn, totalOut + fee);
    // resulting fee rate is at least the requested 2 sat/vB
    const feerate = fee / tx!.virtualSize();
    assert.ok(feerate >= 1.9, `fee rate too low: ${feerate}`);
    // produces broadcastable hex
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
      { address: in0, txid: '1'.repeat(64), vout: 0, value: 100000, isOctojoin: true, wif: hd._getWIFbyAddress(in0) as string },
      { address: in1, txid: '2'.repeat(64), vout: 0, value: 100000, isOctojoin: true, wif: hd._getWIFbyAddress(in1) as string },
      { address: in2, txid: '3'.repeat(64), vout: 0, value: 800000, isOctojoin: false, wif: hd._getWIFbyAddress(in2) as string },
    ];

    // single silent-payment recipient; octojoin must expand it into numOutputs distinct outputs
    const spAddress =
      'sp1qqvvnsd3xnjpmx8hnn2ua0e9sllm34t9jydf8qfesgc7nhdxgzksjwqlrxx37nfzsg6rure5vwa92fksd6f5a6rk05kr07twhd55u3ahquy2v7t6s';
    const plan = planOctojoin({
      utxos,
      paymentSats: 300000,
      addresses: [spAddress],
      isSilentPayment: true,
      numInputs: 3,
      numOutputs: 2,
      feeRate: 2,
    });
    assert.strictEqual(plan.paymentTargets.length, 2);
    assert.ok(plan.paymentTargets.every(t => t.address === spAddress));

    const changeAddress = hd._getInternalAddressByIndex(hd.next_free_change_address_index);
    const { tx, fee } = hd.createTransaction(plan.inputs as any, plan.paymentTargets, 2, changeAddress, undefined, false, 0, true);

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

    // exactly one change output back to the wallet
    const changeOuts = decoded.filter(o => o.address === changeAddress);
    assert.strictEqual(changeOuts.length, 1, 'exactly one change output');

    // value is conserved: inputs === outputs + fee
    const totalIn = plan.inputs.reduce((s, u) => s + u.value, 0);
    const totalOut = decoded.reduce((s, o) => s + o.value, 0);
    assert.strictEqual(totalIn, totalOut + fee, 'inputs === outputs + fee');
    assert.ok(tx!.toHex().length > 0, 'produces broadcastable hex');
  });
});
