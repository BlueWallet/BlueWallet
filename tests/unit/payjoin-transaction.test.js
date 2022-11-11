import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';
import { PayjoinClient } from 'payjoin-client';
import { HDSegwitBech32Wallet } from '../../class';
import PayjoinTransaction from '../../class/payjoin-transaction';

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

    // because `createTransaction()` has now readjusted coinselect algo, actual created psbt differs, and wont work
    // with hardcoded psbt from btcpayserver. so instead of redoing whole process to get fresh psbt, we hardcode
    // created cransaction:
    const psbtOrigin = bitcoin.Psbt.fromBase64(
      'cHNidP8BAHECAAAAARQ28UTNRyxErPb95WFKR0oaiSTEl4x0MUOLwXkkmIyOAAAAAAAAAACAAhAnAAAAAAAAFgAUI8jV3D2NNx8Fjv0Xz2pPgPG8OXtiWQEAAAAAABYAFF8XCHdkg2yGn81L+plhb9iWamgBAAAAAAABAR+ghgEAAAAAABYAFFS9qGo3Nrma3Tb912mSqTHUqwnKAQhsAkgwRQIhAKsmnGPh1vqoW5zlhjJUUs9rcdG9xMwtlf4Hoij7ul+XAiANlyXTuYshsmTIz6/734ChqQzAGp/HreRulypr0wevswEhAolzW1ViXE+a+hqxD825RNPNdq2Gd7dhUeJ4atRH12vaAAAiAgL1DWeV+AfIP5RRB5zHv5vuXsIt8+rF9rrsji3FhQlhzBgAAAAAVAAAgAAAAIAAAACAAQAAAAAAAAAA',
    );
    const txOrigin = bitcoin.Transaction.fromHex(
      '020000000001011436f144cd472c44acf6fde5614a474a1a8924c4978c7431438bc17924988c8e00000000000000008002102700000000000016001423c8d5dc3d8d371f058efd17cf6a4f80f1bc397b62590100000000001600145f17087764836c869fcd4bfa99616fd8966a680102483045022100ab269c63e1d6faa85b9ce586325452cf6b71d1bdc4cc2d95fe07a228fbba5f9702200d9725d3b98b21b264c8cfaffbdf80a1a90cc01a9fc7ade46e972a6bd307afb301210289735b55625c4f9afa1ab10fcdb944d3cd76ad8677b76151e2786ad447d76bda00000000',
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

    wallet.scheduleBroadcastTx = async function () {}; // mock so no real timers are called

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
