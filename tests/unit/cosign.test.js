/* global it, describe */
import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';
import { HDLegacyP2PKHWallet, HDSegwitBech32Wallet, HDSegwitP2SHWallet } from '../../class';

describe('AbstractHDElectrumWallet.cosign', () => {
  it('different descendants of AbstractHDElectrumWallet can cosign one transaction', async () => {
    if (!process.env.HD_MNEMONIC || !process.env.HD_MNEMONIC_BIP49) {
      console.error('process.env.HD_MNEMONIC or HD_MNEMONIC_BIP49 not set, skipped');
      return;
    }

    const w1 = new HDLegacyP2PKHWallet();
    w1.setSecret(process.env.HD_MNEMONIC);
    assert.ok(w1.validateMnemonic());
    const w1Utxo = [
      {
        height: 554830,
        value: 10000,
        address: '186FBQmCV5W1xY7ywaWtTZPAQNciVN8Por',
        vout: 0,
        txid: '4f65c8cb159585c00d4deba9c5b36a2bcdfb1399a561114dcf6f2d0c1174bc5f',
        amount: 10000,
        confirmations: 1,
        txhex:
          '01000000000101e8d98effbb4fba4f0a89bcf217eb5a7e2f8efcae44f32ecacbc5d8cc3ce683c301000000171600148ba6d02e74c0a6e000e8b174eb2ed44e5ea211a6ffffffff0510270000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac204e0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac30750000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac409c0000000000001976a914bc2db6b74c8db9b188711dcedd511e6a305603f588ac204716000000000017a914e286d58e53f9247a4710e51232cce0686f16873c8702483045022100af3800cd8171f154785cf13f46c092f61c1668f97db432bb4e7ed7bc812a8c6d022051bddca1eaf1ad8b5f3bd0ccde7447e56fd3c8709e5906f02ec6326e9a5b2ff30121039a421d5eb7c9de6590ae2a471cb556b60de8c6b056beb907dbdc1f5e6092f58800000000',
      },
    ];

    const w2 = new HDSegwitBech32Wallet();
    w2.setSecret(process.env.HD_MNEMONIC);
    assert.ok(w2.validateMnemonic());
    const w2Utxo = [
      {
        height: 563077,
        value: 50000,
        address: 'bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh',
        vout: 1,
        txid: 'ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d',
        amount: 50000,
        confirmations: 1,
      },
    ];

    const w3 = new HDSegwitP2SHWallet();
    w3.setSecret(process.env.HD_MNEMONIC_BIP49);
    assert.ok(w3.validateMnemonic());
    const w3Utxo = [
      {
        height: 591862,
        value: 26000,
        address: '3C5iv2Hp6nfuhkfTZibb7GJPkXj367eurD',
        txid: 'fe9c4d1b240f270e9cda227c48e29b2983cb26aaab183b34454871d5d9acc987',
        vout: 0,
        amount: 26000,
        confirmations: 1,
      },
    ];

    // now let's create transaction with 3 different inputs for each wallet and one output
    // maybe in future bitcoin-js will support psbt.join() and this test can be simplified to:
    //  const { psbt } = w1.createTransaction(w1Utxo, [{address: w1._getExternalAddressByIndex(0)}], 1, w1._getInternalAddressByIndex(0), undefined, true)
    //  const { psbt:psbt2 } = w2.createTransaction(w2Utxo, [{address: w2._getExternalAddressByIndex(0)}], 1, w2._getInternalAddressByIndex(0), undefined, true)
    //  const { psbt:psbt3 } = w3.createTransaction(w3Utxo, [{address: w3._getExternalAddressByIndex(0)}], 1, w3._getInternalAddressByIndex(0), undefined, true)
    //  psbt.join(psbt2, psbt3)
    // but for now, we will construct psbt by hand

    const sequence = HDSegwitBech32Wallet.defaultRBFSequence;
    const masterFingerprintBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const psbt = new bitcoin.Psbt();

    // add one input from each wallet
    {
      // w1
      const input = w1Utxo[0];
      const pubkey = w1._getPubkeyByAddress(input.address);
      const path = w1._getDerivationPathByAddress(input.address);

      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        sequence,
        bip32Derivation: [
          {
            masterFingerprint: masterFingerprintBuffer,
            path,
            pubkey,
          },
        ],
        // non-segwit inputs now require passing the whole previous tx as Buffer
        nonWitnessUtxo: Buffer.from(input.txhex, 'hex'),
      });
    }

    {
      // w2
      const input = w2Utxo[0];
      const pubkey = w2._getPubkeyByAddress(input.address);
      const path = w2._getDerivationPathByAddress(input.address);
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey });

      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        sequence,
        bip32Derivation: [
          {
            masterFingerprint: masterFingerprintBuffer,
            path,
            pubkey,
          },
        ],
        witnessUtxo: {
          script: p2wpkh.output,
          value: input.value,
        },
      });
    }

    {
      // w3
      const input = w3Utxo[0];
      const pubkey = w3._getPubkeyByAddress(input.address);
      const path = w3._getDerivationPathByAddress(input.address);
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey });
      const p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh });

      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        sequence,
        bip32Derivation: [
          {
            masterFingerprint: masterFingerprintBuffer,
            path,
            pubkey,
          },
        ],
        witnessUtxo: {
          script: p2sh.output,
          value: input.amount || input.value,
        },
        redeemScript: p2wpkh.output,
      });
    }

    // send all to the one output
    psbt.addOutput({
      address: w1._getExternalAddressByIndex(0),
      value: 10000,
    });

    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAKcCAAAAA1+8dBEMLW/PTRFhpZkT+80rarPFqetNDcCFlRXLyGVPAAAAAAAAAACAbZP7eSKA4mMEs3Cr69I3Qwzt21Zwh38dKpjYCSSpAK0BAAAAAAAAAICHyazZ1XFIRTQ7GKuqJsuDKZviSHwi2pwOJw8kG02c/gAAAAAAAAAAgAEQJwAAAAAAABl2qRRNxsv2TfmrEGzugSx1AZYLk+khd4isAAAAAAABAP1gAQEAAAAAAQHo2Y7/u0+6TwqJvPIX61p+L478rkTzLsrLxdjMPOaDwwEAAAAXFgAUi6bQLnTApuAA6LF06y7UTl6iEab/////BRAnAAAAAAAAGXapFE3Gy/ZN+asQbO6BLHUBlguT6SF3iKwgTgAAAAAAABl2qRS8Lba3TI25sYhxHc7dUR5qMFYD9YisMHUAAAAAAAAZdqkUTcbL9k35qxBs7oEsdQGWC5PpIXeIrECcAAAAAAAAGXapFLwttrdMjbmxiHEdzt1RHmowVgP1iKwgRxYAAAAAABepFOKG1Y5T+SR6RxDlEjLM4GhvFoc8hwJIMEUCIQCvOADNgXHxVHhc8T9GwJL2HBZo+X20MrtOfte8gSqMbQIgUb3coerxrYtfO9DM3nRH5W/TyHCeWQbwLsYybppbL/MBIQOaQh1et8neZZCuKkcctVa2DejGsFa+uQfb3B9eYJL1iAAAAAAiBgMW6EolVvMKGZVBYz9d2meHcQzKsmdxtwhPTJ4RBPR2ZxgAAAAALAAAgAAAAIAAAACAAAAAAAAAAAAAAQEfUMMAAAAAAAAWABRdVlN9SNyYZGw0RlmtnzqBcHoXxSIGAnqv8b0nSBLQEkZL4l3AZYcoektXhnjljJSaEzufuTx/GAAAAABUAACAAAAAgAAAAIAAAAAAAQAAAAABASCQZQAAAAAAABepFHH8oGeDfo3SSYkgJqW15AVPiyXhhwEEFgAUojm2oMvHqtwud2Q942MGphZ/rRUiBgICrDvRWeVNwx5lhCrV+aELTrAk6DhkoxmyfeZe4IsqORgAAAAAMQAAgAAAAIAAAACAAAAAAAAAAAAAAA==',
    );

    // now signing this psbt usign wallets one by one
    // because BW users will pass psbt from one device to another base64 encoded, let's do the same

    let tx;

    assert.strictEqual(w1.calculateHowManySignaturesWeHaveFromPsbt(psbt), 0);
    tx = w1.cosignPsbt(psbt).tx;
    assert.strictEqual(w1.calculateHowManySignaturesWeHaveFromPsbt(psbt), 1);
    assert.strictEqual(tx, false); // not yet fully-signed

    tx = w2.cosignPsbt(psbt).tx;
    assert.strictEqual(w2.calculateHowManySignaturesWeHaveFromPsbt(psbt), 2);
    assert.strictEqual(tx, false); // not yet fully-signed

    tx = w3.cosignPsbt(psbt).tx; // GREAT SUCCESS!
    assert.strictEqual(w3.calculateHowManySignaturesWeHaveFromPsbt(psbt), 3);
    assert.ok(tx);

    assert.strictEqual(
      tx.toHex(),
      '020000000001035fbc74110c2d6fcf4d1161a59913fbcd2b6ab3c5a9eb4d0dc0859515cbc8654f000000006a473044022041df555e5f6a3769fafdbe23bfe29de84a1341b8fd85ffd279e238309c5df07702207cf1628b35ccacdb7d34e20fd46a3bc8adc0b1bd3b63249a3a4442b5a993d73501210316e84a2556f30a199541633f5dda6787710ccab26771b7084f4c9e1104f47667000000806d93fb792280e26304b370abebd237430ceddb5670877f1d2a98d80924a900ad01000000000000008087c9acd9d5714845343b18abaa26cb83299be2487c22da9c0e270f241b4d9cfe0000000017160014a239b6a0cbc7aadc2e77643de36306a6167fad15000000800110270000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac0002483045022100efe66403aba1441041dfdeff1f24b5e89ab5728ae7ceb9edb264eee004d5883c02207bf03cb611c9322086ac75fa97c374e9540c911359ede4f62de3c94c429ea2320121027aaff1bd274812d012464be25dc06587287a4b578678e58c949a133b9fb93c7f0247304402207a99c115f0b372d151caf991bb5af9f880e7d87625eeb4233fefa671489ed8e702200e5675b92e4e22b2fe37f563b2a0e75fb81def5a6efb431c7ca3b654ef63fe5801210202ac3bd159e54dc31e65842ad5f9a10b4eb024e83864a319b27de65ee08b2a3900000000',
    );
  });

  it('HDSegwitBech32Wallet can cosign psbt with correct fingerprint', async () => {
    if (!process.env.MNEMONICS_COBO) {
      console.error('process.env.HD_MNEMONIC or HD_MNEMONIC_BIP49 not set, skipped');
      return;
    }

    const w = new HDSegwitBech32Wallet();
    w.setSecret(process.env.MNEMONICS_COBO);
    assert.ok(w.validateMnemonic());

    const psbtWithCorrectFpBase64 =
      'cHNidP8BAFUCAAAAAfsmeQ1mJJqC9cD0DxDRFQoG2hvU6S4koB0jl+8TEDKjAAAAAAD/////AQpfAAAAAAAAGXapFBkSnVPmMZuvGdugWb6tFm35Crj1iKwAAAAAAAEBH8p3AAAAAAAAFgAUf8fcrCg92McSzWkmw+UAluC4IjsiBgLfsmddhS3oxlnlGrUPDBVoVHSMa8RcXlGsyhfc8CcGpRjTfq2IVAAAgAAAAIAAAACAAAAAAAQAAAAAAA==';
    const psbtWithCorrectFp = bitcoin.Psbt.fromBase64(psbtWithCorrectFpBase64);

    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbtWithCorrectFp), 0);

    const { tx } = w.cosignPsbt(psbtWithCorrectFp);
    assert.ok(tx && tx.toHex());
    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbtWithCorrectFp), 1);
  });
});
