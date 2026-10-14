import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';
import crypto from 'crypto';
import { PayjoinClient } from '../../blue_modules/payjoin-client';

import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import PayjoinTransaction from '../../class/payjoin-transaction';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';

const utxos = [
  {
    height: 666,
    value: 100000,
    address: 'bc1q2j76s63hx6ue4hfklhtkny4fx822kzw2ycyn5r',
    vout: 0,
    txid: '8e8c982479c18b4331748c97c424891a4a474a61e5fdf6ac442c47cd44f13614',
    wif: '',
    confirmations: 666,
  },
];

const MNEMONIC = 'disease public annual property useless swamp display plastic meadow cross tongue pottery';
const RECEIVER = 'bc1qg3ke8dyyzheacqwm2mt7umvvk3rz2pvk6zpey9';

// receiver-side: add one finalized p2wpkh input, bump own output, round-trip through base64 like a real endpoint
function buildProposal(b64: string, recvScript: Uint8Array, receiverKeeps = 50000 - 300): string {
  const orig = bitcoin.Psbt.fromBase64(b64);
  const p = new bitcoin.Psbt();
  p.setVersion(orig.version);
  p.setLocktime(orig.locktime);
  for (const inp of orig.txInputs) p.addInput({ hash: inp.hash, index: inp.index, sequence: inp.sequence });
  const dummySig = Buffer.concat([
    Buffer.from('30440220', 'hex'),
    crypto.randomBytes(32),
    Buffer.from('0220', 'hex'),
    crypto.randomBytes(32),
    Buffer.from('01', 'hex'),
  ]);
  const pub = Buffer.from('02' + 'ab'.repeat(32), 'hex');
  const witness = Buffer.concat([Buffer.from([2, dummySig.length]), dummySig, Buffer.from([pub.length]), pub]);
  p.addInput({
    hash: crypto.randomBytes(32),
    index: 0,
    sequence: orig.txInputs[0].sequence,
    witnessUtxo: { script: recvScript, value: BigInt(50000) },
    finalScriptWitness: witness,
  });
  let bumped = false;
  for (const o of orig.txOutputs) {
    let value = o.value;
    if (!bumped && uint8ArrayToHex(o.script) === uint8ArrayToHex(recvScript)) {
      value = o.value + BigInt(receiverKeeps);
      bumped = true;
    }
    p.addOutput({ script: o.script, value });
  }
  assert.ok(bumped);
  return p.toBase64();
}

function setup() {
  const w = new HDSegwitBech32Wallet();
  w.setSecret(MNEMONIC);
  const address = w._getExternalAddressByIndex(0);
  const fakeUtxos = [
    {
      height: 919000,
      value: 100000,
      address,
      vout: 0,
      txid: 'aa'.repeat(32),
      wif: w._getWifForAddress(address),
      confirmations: 1000,
    },
  ];
  const { psbt } = w.createTransaction(fakeUtxos, [{ address: RECEIVER, value: 30000 }], 3, w._getInternalAddressByIndex(0));
  return { w, psbt, recvScript: bitcoin.address.toOutputScript(RECEIVER) };
}

describe('PayjoinTransaction', () => {
  it('completes a payjoin round trip through a base64 proposal', async () => {
    const { w, psbt, recvScript } = setup();
    const broadcasts: string[] = [];
    const wallet = new PayjoinTransaction(
      psbt,
      async txhex => {
        broadcasts.push(txhex);
        return true;
      },
      w,
    );
    wallet.scheduleBroadcastTx = async () => {};
    // proposal travels through the client's own requester/parser, like a real endpoint
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementationOnce(
      async (_url, init) =>
        new Response(buildProposal(init?.body as string, recvScript), {
          status: 200,
        }),
    );
    const client = wallet.createClient(recvScript, 'http://localhost/pj');

    await client.run();

    assert.strictEqual(fetchSpy.mock.calls[0][0], 'http://localhost/pj');
    jest.restoreAllMocks();
    assert.strictEqual(broadcasts.length, 1);
    const tx = bitcoin.Transaction.fromHex(broadcasts[0]);
    assert.strictEqual(tx.ins.length, 2);
    assert.strictEqual(tx.outs.length, 2);
    const pj = wallet.getPayjoinPsbt();
    assert.ok(pj);
    assert.strictEqual(pj.extractTransaction().getId(), tx.getId());
    assert.strictEqual(wallet.wasOriginalBroadcast(), false);
  });

  it('broadcasts original once when the endpoint rejects', async () => {
    const { w, psbt, recvScript } = setup();
    const broadcasts: string[] = [];
    const wallet = new PayjoinTransaction(
      psbt,
      async txhex => {
        broadcasts.push(txhex);
        return true;
      },
      w,
    );
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ errorCode: 'original-psbt-rejected' }), {
        status: 400,
      }),
    );
    const client = wallet.createClient(recvScript, 'http://localhost/pj');

    await assert.rejects(client.run(), /The receiver rejected the original PSBT/);

    assert.strictEqual(broadcasts.length, 1);
    assert.strictEqual(bitcoin.Transaction.fromHex(broadcasts[0]).ins.length, 1);
    assert.strictEqual(wallet.getPayjoinPsbt(), false);
    assert.strictEqual(wallet.wasOriginalBroadcast(), true);
    jest.restoreAllMocks();
  });

  it('falls back to original and exposes no payjoin psbt when the proposal fails after signing', async () => {
    const { w, psbt, recvScript } = setup();
    const broadcasts: string[] = [];
    const wallet = new PayjoinTransaction(
      psbt,
      async txhex => {
        broadcasts.push(txhex);
        return true;
      },
      w,
    );
    // receiver keeps 1 sat too much → fee decreased → rejected after signPsbt already ran
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async (_url, init) => new Response(buildProposal(init?.body as string, recvScript, 50001), { status: 200 }));
    const client = wallet.createClient(recvScript, 'http://localhost/pj');

    await assert.rejects(client.run(), /The receiver decreased absolute fee/);

    jest.restoreAllMocks();
    assert.strictEqual(broadcasts.length, 1);
    assert.strictEqual(bitcoin.Transaction.fromHex(broadcasts[0]).ins.length, 1);
    assert.strictEqual(wallet.getPayjoinPsbt(), false);
    assert.strictEqual(wallet.wasOriginalBroadcast(), true);
  });

  it('signPsbt throws when our input cannot be signed', async () => {
    const { w, psbt, recvScript } = setup();
    const wallet = new PayjoinTransaction(psbt, async () => true, w);
    const tampered = bitcoin.Psbt.fromBase64(buildProposal(psbt.toBase64(), recvScript));
    // our input (index 0) gets a witnessUtxo that does not belong to the wallet
    tampered.updateInput(0, {
      witnessUtxo: { script: recvScript, value: BigInt(100000) },
    });
    await assert.rejects(wallet.signPsbt(tampered));
  });

  it('passes the wallet adapter to the Payjoin client before a proposal is signed', () => {
    const wallet = new HDSegwitBech32Wallet();
    const payjoinWallet = new PayjoinTransaction(new bitcoin.Psbt(), async () => true, wallet);
    const paymentScript = bitcoin.address.toOutputScript('bc1qyvdzueznsh0rsyfqzdtj9ce7nlx4rlg2v93lcl');

    assert.strictEqual(payjoinWallet.getPayjoinPsbt(), false);
    const client = payjoinWallet.createClient(paymentScript, 'https://example.com/pj');

    assert.ok(client instanceof PayjoinClient);
    assert.strictEqual((client as unknown as { wallet: unknown }).wallet, payjoinWallet);
  });

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

    assert.ok(txOrig);
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
