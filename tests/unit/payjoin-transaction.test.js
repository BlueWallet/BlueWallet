import { HDSegwitBech32Wallet } from '../../class';
import PayjoinTransaction from '../../class/payjoin-transaction';
import { PayjoinClient } from 'payjoin-client';
const bitcoin = require('bitcoinjs-lib');
const assert = require('assert');
jest.useFakeTimers();

const utxos = [
  {
    height: 666,
    value: 100000,
    address: 'bc1q2j76s63hx6ue4hfklhtkny4fx822kzw2ycyn5r',
    txId: '8e8c982479c18b4331748c97c424891a4a474a61e5fdf6ac442c47cd44f13614',
    vout: 0,
    txid: '8e8c982479c18b4331748c97c424891a4a474a61e5fdf6ac442c47cd44f13614',
    amount: 100000,
    wif: '',
    confirmations: 666,
  },
];

describe('PayjoinTransaction', () => {
  it('throws if smth is wrong with pj transaction', async () => {
    if (!process.env.MNEMONICS_COLDCARD) {
      console.error('process.env.MNEMONICS_COLDCARD not set, skipped');
      return;
    }
    const w = new HDSegwitBech32Wallet();
    w.setSecret(process.env.MNEMONICS_COLDCARD);
    const { tx: txOrig, psbt: psbtOrig } = w.createTransaction(
      utxos,
      [{ address: 'bc1qyvdzueznsh0rsyfqzdtj9ce7nlx4rlg2v93lcl', value: 10000 }],
      6,
      w._getInternalAddressByIndex(0),
    );

    assert.strictEqual(txOrig.ins.length, 1);
    assert.strictEqual(txOrig.outs.length, 2);

    let broadcastWasCalled;
    const wallet = new PayjoinTransaction(
      psbtOrig,
      async txhex => {
        broadcastWasCalled = true;
        assert.strictEqual(txhex, txOrig.toHex());
        return true;
      },
      w,
    );

    const payjoinRequesterMock = {
      requestPayjoin: async function () {
        // should return payjoined PSBT, but we return original
        return psbtOrig;
      },
    };

    const payjoinClient = new PayjoinClient({
      paymentScript: bitcoin.address.toOutputScript('bc1qyvdzueznsh0rsyfqzdtj9ce7nlx4rlg2v93lcl'),
      wallet,
      payjoinRequester: payjoinRequesterMock,
    });

    await assert.rejects(payjoinClient.run());

    assert.ok(broadcastWasCalled);
    const payjoinPsbt = wallet.getPayjoinPsbt();
    assert.ok(!payjoinPsbt);
  });

  it('works', async () => {
    if (!process.env.MNEMONICS_COLDCARD) {
      console.error('process.env.MNEMONICS_COLDCARD not set, skipped');
      return;
    }
    const w = new HDSegwitBech32Wallet();
    w.setSecret(process.env.MNEMONICS_COLDCARD);
    // bitcoin:bc1qy0ydthpa35m37pvwl5tu76j0srcmcwtmaur3aw?amount=0.0001&pj=https://btc.donate.kukks.org/BTC/pj
    const { tx: txOrigin, psbt: psbtOrigin } = w.createTransaction(
      utxos,
      [{ address: 'bc1qy0ydthpa35m37pvwl5tu76j0srcmcwtmaur3aw', value: 10000 }],
      7,
      w._getInternalAddressByIndex(0),
    );
    assert.strictEqual(txOrigin.ins.length, 1);
    assert.strictEqual(txOrigin.outs.length, 2);

    let broadcastWasCalled = 0;
    const wallet = new PayjoinTransaction(
      psbtOrigin,
      async txhex => {
        broadcastWasCalled++;
        const tx2broadcast = bitcoin.Transaction.fromHex(txhex);
        assert.strictEqual(tx2broadcast.ins.length, 2);
        assert.strictEqual(tx2broadcast.outs.length, 2);

        assert.notStrictEqual(txhex, txOrigin.toHex());
        return true;
      },
      w,
    );

    const payjoinRequesterMock = {
      requestPayjoin: async function () {
        // should return payjoined PSBT (real result obtained from btcpayserver)
        return bitcoin.Psbt.fromBase64(
          'cHNidP8BAJoCAAAAAhQ28UTNRyxErPb95WFKR0oaiSTEl4x0MUOLwXkkmIyOAAAAAAAAAACA2IofvhtoPtrKvZJbyK/S++qLDDL/kE+U1yThC9QiYbIAAAAAAAAAAIACdcEAAAAAAAAWABQjyNXcPY03HwWO/RfPak+A8bw5e2JZAQAAAAAAFgAUXxcId2SDbIafzUv6mWFv2JZqaAEAAAAAAAABAR9lmgAAAAAAABYAFGNhu+9x0LmtgIqPMnlRqj/YHfrGAQhsAkgwRQIhALWjdkl7QZNh0rsgt9bAKfH5r157vzuTh7p/ZukdL9YYAiAFiWNrZ5Ui71PZ5xlofDhStKWmj3jtWG27R3mBKZ1tMwEhA0tfv49EbHkYaeNwx5XTF+PT8Jffba1qnn7GB5wR5dLWAAAA',
        );
      },
    };

    const payjoinClient = new PayjoinClient({
      paymentScript: bitcoin.address.toOutputScript('bc1qy0ydthpa35m37pvwl5tu76j0srcmcwtmaur3aw'),
      wallet,
      payjoinRequester: payjoinRequesterMock,
    });

    await payjoinClient.run();

    const payjoinPsbt = wallet.getPayjoinPsbt();
    assert.ok(payjoinPsbt);
    const txPayjoin = payjoinPsbt.extractTransaction();
    assert.strictEqual(txPayjoin.ins.length, 2);
    assert.strictEqual(txPayjoin.outs.length, 2);
    assert.strictEqual(broadcastWasCalled, 1);
  });
});
