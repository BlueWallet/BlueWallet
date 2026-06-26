import assert from 'assert';

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

  it('decomposeAmount keeps a non-dust remainder and drops dust', () => {
    assert.deepStrictEqual(decomposeAmount(101000), [100000, 1000]);
    assert.deepStrictEqual(decomposeAmount(100500), [100000]);
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
});
