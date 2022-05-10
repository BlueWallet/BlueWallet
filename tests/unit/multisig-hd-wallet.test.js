import assert from 'assert';
import { MultisigHDWallet } from '../../class/';
import { decodeUR, encodeUR } from '../../blue_modules/ur';
import { MultisigCosigner } from '../../class/multisig-cosigner';
const bitcoin = require('bitcoinjs-lib');
const Base43 = require('../../blue_modules/base43');

const fp1cobo = 'D37EAD88';
const Zpub1 = 'Zpub74ijpfhERJNjhCKXRspTdLJV5eoEmSRZdHqDvp9kVtdVEyiXk7pXxRbfZzQvsDFpfDHEHVtVpx4Dz9DGUWGn2Xk5zG5u45QTMsYS2vjohNQ';

const fp2coldcard = '168DD603';
const Zpub2 = 'Zpub75mAE8EjyxSzoyPmGnd5E6MyD7ALGNndruWv52xpzimZQKukwvEfXTHqmH8nbbc6ccP5t2aM3mws3pKYSnKpKMMytdbNEZFUxKzztYFM8Pn';

const txtFileFormatMultisigLegacy =
  'UR:BYTES/TYQHZGEQGDHKYM6KV96KCAPQF46KCARFWD5KWGRNV4682UPQVE5KCEFQ9P3HYETPW3JKGGR0DCSYGVEHG4Q5GWPC9Y9ZXZJWV9KK2W3QGDT97DPNGVER2VEJGF0NYTFJPFGX7MRFVDUN5GPJYPHKVGPJPFZX2UNFWESHG6T0DCAZQMF0XS6JWZJXDAEX6CT58GS9QVJNFQ9Q53PNXAZ5Z3PC8QAZQ7RSW43RVW2NVERXS3E4V4QNJCM30PYYKNFKVGC5S6ZCF4CYG7NFWP24Q3ZZFEX5YUN2FEN4W4MZVFAYKUTWW9MHSVNDWEXHJS34VFFXWM2VG95NWC6ZVAERSET4W4ARGNRK0GEK6C2H0PCXV4TDV3XNWVTY09GH2AN3XCUX64ZPGU6YXUQ2XYMRS3ZYXCCRXW3Q0PC82C3K8Q6RW4EKVDV42UT3X35HSCMDGE3RSVMFW9G8GJJ6VEHY65Z5DDC9J62RWD6427TZ0FR8QUZ2WQE8Z7NGXD95X4JGWDXYW5TEX3TKSCTCGACKKJEEV9ZYGKNW2DNXSS3EXFGXKJZYFD5KSCJGXET5C7N50FK5UD6H2UU5WKTS2G9QHU0U3D';
const txtFileFormatMultisigWrappedSegwit =
  'UR:BYTES/TYQCQGEQGDHKYM6KV96KCAPQF46KCARFWD5KWGRNV4682UPQVE5KCEFQ9P3HYETPW3JKGGR0DCSYGVEHG4Q5GWPC9Y9ZXZJWV9KK2W3QGDT97S6PXU6YV32ZGE0NYTFJPFGX7MRFVDUN5GPJYPHKVGPJPFZX2UNFWESHG6T0DCAZQMF0XSUZWTESYUHNQFE0XYNS53N0WFKKZAP6YPGRY46NFQK4QVJNFQ9Q53PNXAZ5Z3PC8QAZQKTSW43RV6N524VRZVJTGA3HZ3N0WDD9W5P5T935SCEEW93YK5J5WEN5YURZ8PS52DFCDPE4JUTZ0YE4X52K23ER2J68VEXK6EZDVUENSETTD4GNJ62VDPPKGEMZG93X56TGXAQ4W5MTGYMHQE6JDP55CENPDQEH54PKW5C4Q3NK2EZKYCC2XYMRS3ZYXCCRXW3QT9C82C3KDDM8GAJ5TFC8Z3M42A69ZEN8893YCDTCV568V3ZHW3MHX6TJ2GUYC7JYWEE4JVMKVAV8V7TWVDTNZNJ8TPP42J3E2PENWSMFD9A9X56V2CMYUMNWTPF4J72KG3H8SSM4XGM9ZSMG2AA9WNR8X4V5XS2GV9KNVC6EDFRHG7JJ0G9QPZ2FEZ';
const txtFileFormatMultisigNativeSegwit =
  'UR:BYTES/TYQHKGEQGDHKYM6KV96KCAPQF46KCARFWD5KWGRNV4682UPQVE5KCEFQ9P3HYETPW3JKGGR0DCSYGVEHG4Q5GWPC9Y9ZXZJWV9KK2W3QGDT97VENGG65YWF3G90NYTFJPFGX7MRFVDUN5GPJYPHKVGPJPFZX2UNFWESHG6T0DCAZQMF0XSUZWTESYUHNQFE0XGNS53N0WFKKZAP6YPGRY46NFQ9Q53PNXAZ5Z3PC8QAZQKNSW43RWDRFDFCXV6Z92F9YU6NGGD94S5NNWP2XGNZ22C6K2M69D4F4YKNYFPC5GANS8944VARY2EZHJ62CDVMHQKRC2F3XVKN629M8X3ZXWPNYGJZ9FPT8G4NS0Q6YG73EG3R42468DCE9S6E40FRN2AF5X4G4GNTNT9FNYAN2DA5YU5G2XYMRS3ZYXCCRXW3QTFC82C3HX4K5Z3FCG448J7ZN0FHHJ5RDGAHXGD29XEXHJ3PHG9XYWNNWV3E824MKX5E8SUR6D9K4552TW44HWAJ9VEV9GJR3D4YRSMNZVF3NVCMR2Q6HGVNPF5EK6AMNXDCYKK2NDE9HQJ6DF4UHGERZFEZ453J40P9H57N5T9RY6WZSDC9QWZ5LU2';
const coldcardExport =
  '{"p2sh_deriv":"m/45\'","p2sh":"xpub6847W6cYUqq4ixcmFb83iqPtJZfnMPTkpYiCsuUybzFppJp2qzh3KCVHsLGQy4WhaxGqkK9aDDZnSfhB92PkHDKihbH6WLztzmN7WW9GYpR","p2wsh_p2sh_deriv":"m/48\'/0\'/0\'/1\'","p2wsh_p2sh":"Ypub6kvtvTZpqGuWtQfg9bL5xe4vDWtwsirR8LzDvsY3vgXvyncW1NGXCUJ9Ps7CiizSSLV6NnnXSYyVDnxCu26QChWzWLg5YCAHam6cYjGtzRz","p2wsh_deriv":"m/48\'/0\'/0\'/2\'","p2wsh":"Zpub75mAE8EjyxSzoyPmGnd5E6MyD7ALGNndruWv52xpzimZQKukwvEfXTHqmH8nbbc6ccP5t2aM3mws3pKYSnKpKMMytdbNEZFUxKzztYFM8Pn","xfp":"168DD603"}';
const electumJson =
  '{"x2/": {"xpub": "Zpub75mAE8EjyxSzoyPmGnd5E6MyD7ALGNndruWv52xpzimZQKukwvEfXTHqmH8nbbc6ccP5t2aM3mws3pKYSnKpKMMytdbNEZFUxKzztYFM8Pn", "hw_type": "coldcard", "ckcc_xfp": 64392470, "label": "Coldcard", "derivation": "m/48\'/1\'/0\'/1\'", "type": "hardware"}, "x1/": {"xpub": "Zpub74ijpfhERJNjhCKXRspTdLJV5eoEmSRZdHqDvp9kVtdVEyiXk7pXxRbfZzQvsDFpfDHEHVtVpx4Dz9DGUWGn2Xk5zG5u45QTMsYS2vjohNQ", "hw_type": "coldcard", "ckcc_xfp": 2293071571, "label": "Coldcard", "derivation": "m/48\'/1\'/0\'/1\'", "type": "hardware"}, "wallet_type": "2of2", "use_encryption": false, "seed_version": 17}';

describe('multisig-wallet (p2sh)', () => {
  if (!process.env.MNEMONICS_COBO) {
    console.error('process.env.MNEMONICS_COBO not set, skipped');
    return;
  }
  if (!process.env.MNEMONICS_COLDCARD) {
    console.error('process.env.MNEMONICS_COLDCARD not set, skipped');
    return;
  }

  it('basic operations work', async () => {
    const w = new MultisigHDWallet();
    w.setSecret(txtFileFormatMultisigLegacy);

    assert.strictEqual(w.getDerivationPath(), "m/45'");
    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 2);
    assert.strictEqual(w.howManySignaturesCanWeMake(), 0);
    assert.strictEqual(
      w.getCosigner(1),
      'xpub69SfFhG5eA9cqxHKM6b1HhXMpDzipUPDBNMBrjNgWWbbzKqnqwx2mvMyB5bRgmLAi7cBgr8euuz4Lvz3maWxpfUmdM71dyQuvq68mTAG4Cp',
    );
    assert.strictEqual(
      w.getCosigner(2),
      'xpub6847W6cYUqq4ixcmFb83iqPtJZfnMPTkpYiCsuUybzFppJp2qzh3KCVHsLGQy4WhaxGqkK9aDDZnSfhB92PkHDKihbH6WLztzmN7WW9GYpR',
    );
    assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), w.getCosigner(1));
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), w.getCosigner(2));
    assert.strictEqual(w.getFingerprint(1), fp1cobo);
    assert.strictEqual(w.getFormat(), MultisigHDWallet.FORMAT_P2SH);

    assert.strictEqual(w._getExternalAddressByIndex(0), '3J5xQcgBqoykSHhmDJLYp87SgVSNhYrvnz');
    assert.strictEqual(w._getExternalAddressByIndex(1), '3GkEXFYUifSmQ9SgzJDWL37pjMj4LT6vbq');
    assert.strictEqual(w._getInternalAddressByIndex(0), '365MagKko4t7L9XPXSYGkFj23dknTCx4UW');
    assert.strictEqual(w._getInternalAddressByIndex(1), '36j8Qx6vxUknTxGFa5yYuxifEK9PGPEKso');
    assert.ok(!w.isWrappedSegwit());
    assert.ok(!w.isNativeSegwit());
    assert.ok(w.isLegacy());
  });

  it('can coordinate tx creation', async () => {
    const utxos = [
      {
        height: 666,
        value: 100000,
        address: '3J5xQcgBqoykSHhmDJLYp87SgVSNhYrvnz',
        txId: '630a227c0b4ca30bc98689d40d31e0407fcc5d61730ce1fa548b26630efddeec',
        vout: 0,
        txid: '630a227c0b4ca30bc98689d40d31e0407fcc5d61730ce1fa548b26630efddeec',
        amount: 100000,
        wif: false,
        confirmations: 666,
        script: { length: 107 }, // incorrect value so old tests pass. in reality its calculated on the fly
        txhex:
          '0200000000010211f8cdc7b1255b8d3eb951db2fc6964766aaf6e6d1b42e777c90a52977b3e8e50000000000ffffffff00696f18c09d884c100254825f3ca4f41ca35fbb5e988d3526cbdcfcb30c335b0000000000ffffffff02a08601000000000017a914b3d8a5081a9477dd5d354d4c8a7efc0e64689d1087e8340f0000000000160014eef1091149ba3658a5dfe9c8a8924b3a4f0e1baa02473044022068548d4369730e90f33d4243420b40d4c7ef240bbac1db33354c0e108d503f24022062adcc1d19756bcb3ecae9fe988af7c3147ba7df5ff6b26f4a135037669fcef001210211edf8b518a1ac28d1f9a956a5ddeddaea0df435f2386e7fb86f0e9fde818dda0247304402203140f8ee8311562f15eb1f062f3be98fbe41615262491ad5625d8541ce2e4386022077343891d341112a2b75647d5a1faec0f0a79dac8052249e22eb39591a4bb70c0121023f05c145e61311eb725fdea9834fe20c4e7bbb639def8e47137a2696001f9e9d00000000',
      },
    ];

    const w = new MultisigHDWallet();
    w.setSecret(txtFileFormatMultisigLegacy);

    assert.strictEqual(w.getDerivationPath(), "m/45'");
    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 2);
    assert.strictEqual(w.howManySignaturesCanWeMake(), 0);
    assert.strictEqual(
      w.getCosigner(1),
      'xpub69SfFhG5eA9cqxHKM6b1HhXMpDzipUPDBNMBrjNgWWbbzKqnqwx2mvMyB5bRgmLAi7cBgr8euuz4Lvz3maWxpfUmdM71dyQuvq68mTAG4Cp',
    );
    assert.strictEqual(
      w.getCosigner(2),
      'xpub6847W6cYUqq4ixcmFb83iqPtJZfnMPTkpYiCsuUybzFppJp2qzh3KCVHsLGQy4WhaxGqkK9aDDZnSfhB92PkHDKihbH6WLztzmN7WW9GYpR',
    );
    assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), w.getCosigner(1));
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), w.getCosigner(2));
    assert.strictEqual(w.getFingerprint(1), fp1cobo);
    assert.strictEqual(w.getFingerprint(2), fp2coldcard);

    assert.strictEqual(w._getExternalAddressByIndex(0), '3J5xQcgBqoykSHhmDJLYp87SgVSNhYrvnz');
    assert.strictEqual(w._getExternalAddressByIndex(1), '3GkEXFYUifSmQ9SgzJDWL37pjMj4LT6vbq');
    assert.strictEqual(w._getInternalAddressByIndex(0), '365MagKko4t7L9XPXSYGkFj23dknTCx4UW');
    assert.strictEqual(w._getInternalAddressByIndex(1), '36j8Qx6vxUknTxGFa5yYuxifEK9PGPEKso');
    assert.ok(!w.isWrappedSegwit());
    assert.ok(!w.isNativeSegwit());
    assert.ok(w.isLegacy());

    // transaction is gona be UNsigned because we have no keys
    const { psbt, tx } = w.createTransaction(
      utxos,
      [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', value: 10000 }],
      10,
      w._getInternalAddressByIndex(3),
      false,
      false,
    );
    assert.ok(!tx, 'tx should not be provided when PSBT is only partially signed');
    assert.throws(() => psbt.finalizeAllInputs().extractTransaction());

    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbt), 0);
    assert.ok(w.calculateFeeFromPsbt(psbt) < 3000);
    assert.ok(w.calculateFeeFromPsbt(psbt) > 0);

    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAHUCAAAAAeze/Q5jJotU+uEMc2FdzH9A4DEN1ImGyQujTAt8IgpjAAAAAAAAAACAAhAnAAAAAAAAGXapFBkSnVPmMZuvGdugWb6tFm35Crj1iKy8VgEAAAAAABepFPI8FESPOvVVeCas7ULqnnFYnc5JhwAAAAAAAQD9cwECAAAAAAECEfjNx7ElW40+uVHbL8aWR2aq9ubRtC53fJClKXez6OUAAAAAAP////8AaW8YwJ2ITBACVIJfPKT0HKNfu16YjTUmy9z8swwzWwAAAAAA/////wKghgEAAAAAABepFLPYpQgalHfdXTVNTIp+/A5kaJ0Qh+g0DwAAAAAAFgAU7vEJEUm6Nlil3+nIqJJLOk8OG6oCRzBEAiBoVI1DaXMOkPM9QkNCC0DUx+8kC7rB2zM1TA4QjVA/JAIgYq3MHRl1a8s+yun+mIr3wxR7p99f9rJvShNQN2afzvABIQIR7fi1GKGsKNH5qVal3e3a6g30NfI4bn+4bw6f3oGN2gJHMEQCIDFA+O6DEVYvFesfBi876Y++QWFSYkka1WJdhUHOLkOGAiB3NDiR00ERKit1ZH1aH67A8KedrIBSJJ4i6zlZGku3DAEhAj8FwUXmExHrcl/eqYNP4gxOe7tjne+ORxN6JpYAH56dAAAAAAEER1IhAuKpQFZsreTHbjczMj+gmPaW2MpWjN/NE9t30TCFV6boIQMM4zcNTGSH1VK788aPJgBwsMhTJ20S4lg/3JkC8mJIjVKuIgYC4qlAVmyt5MduNzMyP6CY9pbYylaM380T23fRMIVXpugQFo3WAy0AAIAAAAAAAAAAACIGAwzjNw1MZIfVUrvzxo8mAHCwyFMnbRLiWD/cmQLyYkiNENN+rYgtAACAAAAAAAAAAAAAAAEAR1IhAoJkVao8TQcPGdH2rhAUNLNEoDTaWVlIZXZEEk77O3NoIQOJYtHCrnVaHKX4kVFrtjn9dVGJENMKTTOYLAY/aCS3rFKuIgICgmRVqjxNBw8Z0fauEBQ0s0SgNNpZWUhldkQSTvs7c2gQ036tiC0AAIABAAAAAwAAACICA4li0cKudVocpfiRUWu2Of11UYkQ0wpNM5gsBj9oJLesEBaN1gMtAACAAQAAAAMAAAAA',
    );

    // signed it on real coldcard device:
    const partSignedFromColdcard =
      'cHNidP8BAHUCAAAAAeze/Q5jJotU+uEMc2FdzH9A4DEN1ImGyQujTAt8IgpjAAAAAAAAAACAAhAnAAAAAAAAGXapFBkSnVPmMZuvGdugWb6tFm35Crj1iKy8VgEAAAAAABepFPI8FESPOvVVeCas7ULqnnFYnc5JhwAAAAAAAQD9cwECAAAAAAECEfjNx7ElW40+uVHbL8aWR2aq9ubRtC53fJClKXez6OUAAAAAAP////8AaW8YwJ2ITBACVIJfPKT0HKNfu16YjTUmy9z8swwzWwAAAAAA/////wKghgEAAAAAABepFLPYpQgalHfdXTVNTIp+/A5kaJ0Qh+g0DwAAAAAAFgAU7vEJEUm6Nlil3+nIqJJLOk8OG6oCRzBEAiBoVI1DaXMOkPM9QkNCC0DUx+8kC7rB2zM1TA4QjVA/JAIgYq3MHRl1a8s+yun+mIr3wxR7p99f9rJvShNQN2afzvABIQIR7fi1GKGsKNH5qVal3e3a6g30NfI4bn+4bw6f3oGN2gJHMEQCIDFA+O6DEVYvFesfBi876Y++QWFSYkka1WJdhUHOLkOGAiB3NDiR00ERKit1ZH1aH67A8KedrIBSJJ4i6zlZGku3DAEhAj8FwUXmExHrcl/eqYNP4gxOe7tjne+ORxN6JpYAH56dAAAAACICAuKpQFZsreTHbjczMj+gmPaW2MpWjN/NE9t30TCFV6boRzBEAiA7xMszlRAzEJDo++ZfweUQ1qQS+N7hCHnuZe9ifT11swIgFzcqL0y6iTN9OqIIfLLYA7aydcK3EgtCIpjPl+u//kQBAQMEAQAAACIGAwzjNw1MZIfVUrvzxo8mAHCwyFMnbRLiWD/cmQLyYkiNENN+rYgtAACAAAAAAAAAAAAiBgLiqUBWbK3kx243MzI/oJj2ltjKVozfzRPbd9EwhVem6BAWjdYDLQAAgAAAAAAAAAAAAQRHUiEC4qlAVmyt5MduNzMyP6CY9pbYylaM380T23fRMIVXpughAwzjNw1MZIfVUrvzxo8mAHCwyFMnbRLiWD/cmQLyYkiNUq4AACICAoJkVao8TQcPGdH2rhAUNLNEoDTaWVlIZXZEEk77O3NoENN+rYgtAACAAQAAAAMAAAAiAgOJYtHCrnVaHKX4kVFrtjn9dVGJENMKTTOYLAY/aCS3rBAWjdYDLQAAgAEAAAADAAAAAQBHUiECgmRVqjxNBw8Z0fauEBQ0s0SgNNpZWUhldkQSTvs7c2ghA4li0cKudVocpfiRUWu2Of11UYkQ0wpNM5gsBj9oJLesUq4A\n';
    const psbtFromColdcard = bitcoin.Psbt.fromBase64(partSignedFromColdcard);

    assert.throws(() => psbt.finalizeAllInputs().extractTransaction());
    psbt.combine(psbtFromColdcard); // should not throw an exception

    // signed on real Cobo device:
    const psbtFromCobo = bitcoin.Psbt.fromHex(
      decodeUR([
        'UR:BYTES/2OF2/HLCR0ERXVY0S4LY2V6EQUVEXL5XHRNEYC09GZVDX3T7H2KKLX5ASZWFVZJ/Q80ZVKVU4ZQE3PY8GL0N9LS09ZRT2GYHCMMSSS70WVHHKYLFAWKESYGQHXU4Z7N963YEH6W4ZPP7T9KQRK6E8TS4HZG95YG5CE7T7H0L7GSQJYQSRPN3NWR2VVJRA254M70RG7FSQWZCVS5E8D5FWYKPLMJVS9UNZFZX5WVZYQGSZ43YDGF3RAXYWQWRZWYF4JN3KC0QWN3QXJ7FW7WZH8YG9E7ZRE8GZYPEZ7VKKF4HERFVNYHGUF9XVF5X03TJSDSXTYHZXGSKM589KTC2K6QGPQVZQZQQQQQQSG36JYYPW922Q2EK2MEX8DCMNXV3L5ZV0D9KCEFTGEH7DZ0DH05FSS4T6D6PPQVXWXDCDF3JG042JH0EUDREXQPCTPJZNYAK39CJC8LWFJQHJVFYG654WYGRQ9C4FGPTXET0YCAHRWVEJ87SF3A5KMR99DRXLE5FAKA73XZZ40FHGZQTGM4SR95QQPQQQQQQQQQQQQQQZYPSRPN3NWR2VVJRA254M70RG7FSQWZCVS5E8D5FWYKPLMJVS9UNZFZX3P5M74KYZ6QQQSQQQQQQQQQQQQQQQQQQSQ36JYYPGYEZ44G7Y6PC0R8GLDTSSZS6TX39QXND9JK2GV4MYGYJWLVAHX6PPQWYK95WZ4E645899LZG4Z6AK887H25VFZRFS5NFNNQKQV0MGYJM6C54WYGPQ9QNY2K4RCNG8PUVARA4WZQ2RFV6Y5Q6D5K2EFPJHV3QJFMANKUMGZRFHATVG95QQPQQPQQQQQQCQQQQZYQSR393DRS4WW4DPEF0CJ9GKHD3EL464RZGS6V9Y6VUC9SRR76PYK7KPQ95D6CPJ6QQQSQQSQQQQQVQQQQQQ7C43S3',
        'UR:BYTES/1OF2/HLCR0ERXVY0S4LY2V6EQUVEXL5XHRNEYC09GZVDX3T7H2KKLX5ASZWFVZJ/TYZR5URNVF607QGQW5PQQQQQQ8KDALGWVVNGK486UYX8XC2AE3L5PCP3PH2GNPKFPW35CZMUYG9XXQQQQQQQQQQQQZQQYYP8QQQQQQQQQQVHD2G5RYFF65LXXXD67XWM5PVMATGKDHUS4W843ZKTC4SPQQQQQQQQZ753FU3UZ3ZG7WH424UZDT8DGT4FUU2CNH8YNPCQQQQQQQQPQR7HXQGZQQQQQQQPQGGL3NW8KYJ4HRF7H9GAKT7XJERKD2HKUMGMGTNH0JG222THK05W2QQQQQQQPLLLLLLSQ6T0RRQFMZZVZQP9FQJL8JJ0G89RT7A4AXYDX5NVHH8UKVXRXKCQQQQQQQ8LLLLL7Q4QSCQSQQQQQQQP02G5K0V22ZQ6J3MA6HF4F4XG5LHUPEJX38GSSL5RGRCQQQQQQQQKQQ2WAUGFZ9YM5DJC5H07NJ9GJF9N5NCWRW4QY3ESGSPZQ6Z534PKJUCWJREN6SJRGG95P4X8AUJQHWKPMVEN2NQWZZX4Q0EYQGSX9TWVR5VH267T8M9WNL5C3TMUX9RM5L04LA4JDA9PX5PHV60UAUQPYYPPRM0CK5V2RTPG68U6J449MHKA46SD7S6LYWRW07UX7R5LM6QCMKSZGUCYGQ3QX9Q03M5RZ9TZ790TRURZ7WLF37LYZC2JVFY344TZTKZ5RN3WGWRQYGRHXSUFR56PZY4ZKATY04DPLTKQ7ZNEMTYQ2GJFUGHT89V35JAHPSQJZQ3LQHQ5TESNZ84HYH774XP5LCSVFEAMKCUAA78YWYM6Y6TQQ8U7N5QQQQQQYGPQ9C4FGPTXET0YCAHRWVEJ87SF3A5KMR99DRXLE5FAKA73XZZ40FHGGUCYGQ3',
      ]),
    );

    psbt.combine(psbtFromCobo);
    const txhex = psbt.finalizeAllInputs().extractTransaction().toHex();
    assert.strictEqual(
      txhex,
      '0200000001ecdefd0e63268b54fae10c73615dcc7f40e0310dd48986c90ba34c0b7c220a6300000000d90047304402203bc4cb339510331090e8fbe65fc1e510d6a412f8dee10879ee65ef627d3d75b3022017372a2f4cba89337d3aa2087cb2d803b6b275c2b7120b422298cf97ebbffe440147304402202ac48d42623e988e038627113594e36c3c0e9c4069792ef385739105cf843c9d0220722f32d64d6f91a59325d1c494cc4d0cf8ae506c0cb25c46442dba1cb65e156d0147522102e2a940566cade4c76e3733323fa098f696d8ca568cdfcd13db77d1308557a6e821030ce3370d4c6487d552bbf3c68f260070b0c853276d12e2583fdc9902f262488d52ae000000800210270000000000001976a91419129d53e6319baf19dba059bead166df90ab8f588acbc5601000000000017a914f23c14448f3af5557826aced42ea9e71589dce498700000000',
    );
  });

  it('can coordinate tx creation and sign 1 of 2', async () => {
    const path = "m/45'";

    const utxos = [
      {
        height: 666,
        value: 100000,
        address: '3J5xQcgBqoykSHhmDJLYp87SgVSNhYrvnz',
        txId: '630a227c0b4ca30bc98689d40d31e0407fcc5d61730ce1fa548b26630efddeec',
        vout: 0,
        txid: '630a227c0b4ca30bc98689d40d31e0407fcc5d61730ce1fa548b26630efddeec',
        amount: 100000,
        wif: false,
        confirmations: 666,
        script: { length: 107 }, // incorrect value so old tests pass. in reality its calculated on the fly
        txhex:
          '0200000000010211f8cdc7b1255b8d3eb951db2fc6964766aaf6e6d1b42e777c90a52977b3e8e50000000000ffffffff00696f18c09d884c100254825f3ca4f41ca35fbb5e988d3526cbdcfcb30c335b0000000000ffffffff02a08601000000000017a914b3d8a5081a9477dd5d354d4c8a7efc0e64689d1087e8340f0000000000160014eef1091149ba3658a5dfe9c8a8924b3a4f0e1baa02473044022068548d4369730e90f33d4243420b40d4c7ef240bbac1db33354c0e108d503f24022062adcc1d19756bcb3ecae9fe988af7c3147ba7df5ff6b26f4a135037669fcef001210211edf8b518a1ac28d1f9a956a5ddeddaea0df435f2386e7fb86f0e9fde818dda0247304402203140f8ee8311562f15eb1f062f3be98fbe41615262491ad5625d8541ce2e4386022077343891d341112a2b75647d5a1faec0f0a79dac8052249e22eb39591a4bb70c0121023f05c145e61311eb725fdea9834fe20c4e7bbb639def8e47137a2696001f9e9d00000000',
      },
    ];

    const w = new MultisigHDWallet();
    w.addCosigner(
      'xpub69SfFhG5eA9cqxHKM6b1HhXMpDzipUPDBNMBrjNgWWbbzKqnqwx2mvMyB5bRgmLAi7cBgr8euuz4Lvz3maWxpfUmdM71dyQuvq68mTAG4Cp',
      fp1cobo,
    );
    w.addCosigner(process.env.MNEMONICS_COLDCARD);
    w.setDerivationPath(path);
    w.setM(2);

    assert.strictEqual(w.getDerivationPath(), "m/45'");
    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 2);
    assert.strictEqual(w.howManySignaturesCanWeMake(), 1);
    assert.strictEqual(
      w.getCosigner(1),
      'xpub69SfFhG5eA9cqxHKM6b1HhXMpDzipUPDBNMBrjNgWWbbzKqnqwx2mvMyB5bRgmLAi7cBgr8euuz4Lvz3maWxpfUmdM71dyQuvq68mTAG4Cp',
    );
    assert.strictEqual(w.getFingerprint(1), fp1cobo);
    assert.strictEqual(w.getFingerprint(2), fp2coldcard);

    assert.strictEqual(w._getExternalAddressByIndex(0), '3J5xQcgBqoykSHhmDJLYp87SgVSNhYrvnz');
    assert.strictEqual(w._getExternalAddressByIndex(1), '3GkEXFYUifSmQ9SgzJDWL37pjMj4LT6vbq');
    assert.strictEqual(w._getInternalAddressByIndex(0), '365MagKko4t7L9XPXSYGkFj23dknTCx4UW');
    assert.strictEqual(w._getInternalAddressByIndex(1), '36j8Qx6vxUknTxGFa5yYuxifEK9PGPEKso');
    assert.ok(!w.isWrappedSegwit());
    assert.ok(!w.isNativeSegwit());
    assert.ok(w.isLegacy());

    // transaction is gona be signed with one key
    const { tx, psbt } = w.createTransaction(
      utxos,
      [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', value: 10000 }],
      10,
      w._getInternalAddressByIndex(3),
      false,
      false,
    );
    assert.ok(!tx, 'tx should not be provided when PSBT is only partially signed');

    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbt), 1);
    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAHUCAAAAAeze/Q5jJotU+uEMc2FdzH9A4DEN1ImGyQujTAt8IgpjAAAAAAAAAACAAhAnAAAAAAAAGXapFBkSnVPmMZuvGdugWb6tFm35Crj1iKy8VgEAAAAAABepFPI8FESPOvVVeCas7ULqnnFYnc5JhwAAAAAAAQD9cwECAAAAAAECEfjNx7ElW40+uVHbL8aWR2aq9ubRtC53fJClKXez6OUAAAAAAP////8AaW8YwJ2ITBACVIJfPKT0HKNfu16YjTUmy9z8swwzWwAAAAAA/////wKghgEAAAAAABepFLPYpQgalHfdXTVNTIp+/A5kaJ0Qh+g0DwAAAAAAFgAU7vEJEUm6Nlil3+nIqJJLOk8OG6oCRzBEAiBoVI1DaXMOkPM9QkNCC0DUx+8kC7rB2zM1TA4QjVA/JAIgYq3MHRl1a8s+yun+mIr3wxR7p99f9rJvShNQN2afzvABIQIR7fi1GKGsKNH5qVal3e3a6g30NfI4bn+4bw6f3oGN2gJHMEQCIDFA+O6DEVYvFesfBi876Y++QWFSYkka1WJdhUHOLkOGAiB3NDiR00ERKit1ZH1aH67A8KedrIBSJJ4i6zlZGku3DAEhAj8FwUXmExHrcl/eqYNP4gxOe7tjne+ORxN6JpYAH56dAAAAACICAuKpQFZsreTHbjczMj+gmPaW2MpWjN/NE9t30TCFV6boRzBEAiA7xMszlRAzEJDo++ZfweUQ1qQS+N7hCHnuZe9ifT11swIgFzcqL0y6iTN9OqIIfLLYA7aydcK3EgtCIpjPl+u//kQBAQRHUiEC4qlAVmyt5MduNzMyP6CY9pbYylaM380T23fRMIVXpughAwzjNw1MZIfVUrvzxo8mAHCwyFMnbRLiWD/cmQLyYkiNUq4iBgLiqUBWbK3kx243MzI/oJj2ltjKVozfzRPbd9EwhVem6BAWjdYDLQAAgAAAAAAAAAAAIgYDDOM3DUxkh9VSu/PGjyYAcLDIUydtEuJYP9yZAvJiSI0Q036tiC0AAIAAAAAAAAAAAAAAAQBHUiECgmRVqjxNBw8Z0fauEBQ0s0SgNNpZWUhldkQSTvs7c2ghA4li0cKudVocpfiRUWu2Of11UYkQ0wpNM5gsBj9oJLesUq4iAgKCZFWqPE0HDxnR9q4QFDSzRKA02llZSGV2RBJO+ztzaBDTfq2ILQAAgAEAAAADAAAAIgIDiWLRwq51Whyl+JFRa7Y5/XVRiRDTCk0zmCwGP2gkt6wQFo3WAy0AAIABAAAAAwAAAAA=',
    );

    const psbtSignedOnCobo = bitcoin.Psbt.fromHex(
      decodeUR([
        'UR:BYTES/2OF2/HKFUJ0HDC2GXTAJDW99S7D7KJF9HREVM33DN756FEJJ04MEN2WZSZX97JS/CYGQ3Q80ZVKVU4ZQE3PY8GL0N9LS09ZRT2GYHCMMSSS70WVHHKYLFAWKESYGQHXU4Z7N963YEH6W4ZPP7T9KQRK6E8TS4HZG95YG5CE7T7H0L7GSQJYQSRPN3NWR2VVJRA254M70RG7FSQWZCVS5E8D5FWYKPLMJVS9UNZFZX5WVZYQGSXMGM4P97RM7D5JFLH2EGCKQD74NUGDJMH42JYYXN8TQFPWNSLF6QZYPHVKP7SK456TVRPKALFGDDYHJW7UTVRWELCVTUWJW5GJ8H8E8G57QGPQ3R4YGGZU255Q4NV4HJVWM3HXVERLGYC76TD3JJK3N0U6Y7MWLGNPP2H5M5ZZQCVUVMS6NRYSL249WLNC68JVQRSKRY9XFMDZT39S07UNYP0YCJG34F2UGSXQT32JSZKDJK7F3MWXUENY0AQNRMFDKX226XDLNGNMDMAZVY927NWSYQK3HTQXTGQQZQQQQQQQQQQQQQQYGRQXR8RXUX5CEY864FTHU7X3UNQQU9SEPFJWMGJUFVRLHYEQTEXYJYDZRFHATVG95QQPQQQQQQQQQQQQQQQQQQPQPR4YGGZSFJ9T23UF5RS7XW376HPQ9P5KDZ2QDX6T9V5SETKGSFYA7EMWD5ZZQUFVTGU9TN4TGW2T7Y3294MVW0AW4GCJYXNPFXN8XPVQCLKSF9H43F2UGSZQ2PXG4D283XSWRCE68M2UYQ5XJE5FGP5MFV4JJR9WEZPYNHM8DEKSYXN06KCSTGQQZQQZQQQQQPSQQQQYGPQ8ZTZ68P2UA26RJJL3Y23DWMRNLT42XY3P5C2F5EESTQX8A5ZFDAVZQTGM4SR95QQPQQPQQQQQQCQQQQQQ55FRG0',
        'UR:BYTES/1OF2/HKFUJ0HDC2GXTAJDW99S7D7KJF9HREVM33DN756FEJJ04MEN2WZSZX97JS/TYZRXURNVF607QGQW5PQQQQQQ8KDALGWVVNGK486UYX8XC2AE3L5PCP3PH2GNPKFPW35CZMUYG9XXQQQQQQQQQQQQZQQYYP8QQQQQQQQQQVHD2G5RYFF65LXXXD67XWM5PVMATGKDHUS4W843ZKTC4SPQQQQQQQQZ753FU3UZ3ZG7WH424UZDT8DGT4FUU2CNH8YNPCQQQQQQQQPQR7HXQGZQQQQQQQPQGGL3NW8KYJ4HRF7H9GAKT7XJERKD2HKUMGMGTNH0JG222THK05W2QQQQQQQPLLLLLLSQ6T0RRQFMZZVZQP9FQJL8JJ0G89RT7A4AXYDX5NVHH8UKVXRXKCQQQQQQQ8LLLLL7Q4QSCQSQQQQQQQP02G5K0V22ZQ6J3MA6HF4F4XG5LHUPEJX38GSSL5RGRCQQQQQQQQKQQ2WAUGFZ9YM5DJC5H07NJ9GJF9N5NCWRW4QY3ESGSPZQ6Z534PKJUCWJREN6SJRGG95P4X8AUJQHWKPMVEN2NQWZZX4Q0EYQGSX9TWVR5VH267T8M9WNL5C3TMUX9RM5L04LA4JDA9PX5PHV60UAUQPYYPPRM0CK5V2RTPG68U6J449MHKA46SD7S6LYWRW07UX7R5LM6QCMKSZGUCYGQ3QX9Q03M5RZ9TZ790TRURZ7WLF37LYZC2JVFY344TZTKZ5RN3WGWRQYGRHXSUFR56PZY4ZKATY04DPLTKQ7ZNEMTYQ2GJFUGHT89V35JAHPSQJZQ3LQHQ5TESNZ84HYH774XP5LCSVFEAMKCUAA78YWYM6Y6TQQ8U7N5QQQQQQYGPQ9C4FGPTXET0YCAHRWVEJ87SF3A5KMR99DRXLE5FAKA73XZZ40FHGGU',
      ]),
    );

    psbt.combine(psbtSignedOnCobo);

    const hex = psbt.finalizeAllInputs().extractTransaction().toHex();
    assert.strictEqual(
      hex,
      '0200000001ecdefd0e63268b54fae10c73615dcc7f40e0310dd48986c90ba34c0b7c220a6300000000d90047304402203bc4cb339510331090e8fbe65fc1e510d6a412f8dee10879ee65ef627d3d75b3022017372a2f4cba89337d3aa2087cb2d803b6b275c2b7120b422298cf97ebbffe440147304402206da375097c3df9b4927f756518b01beacf886cb77aaa4421a675812174e1f4e802206ecb07d0b569a5b061b77e9435a4bc9dee2d83767f862f8e93a8891ee7c9d14f0147522102e2a940566cade4c76e3733323fa098f696d8ca568cdfcd13db77d1308557a6e821030ce3370d4c6487d552bbf3c68f260070b0c853276d12e2583fdc9902f262488d52ae000000800210270000000000001976a91419129d53e6319baf19dba059bead166df90ab8f588acbc5601000000000017a914f23c14448f3af5557826aced42ea9e71589dce498700000000',
    );
  });

  it('can do both signatures', () => {
    const path = "m/45'";

    const utxos = [
      {
        height: 666,
        value: 87740,
        address: '3PmqRLiPnBXhdYGN6mAHChXLPvw8wb3Yt8',
        txId: '33eaa5193c71519deb968852c9938824d14504a785479a051ea07cc68400ee23',
        vout: 1,
        txid: '33eaa5193c71519deb968852c9938824d14504a785479a051ea07cc68400ee23',
        amount: 87740,
        wif: false,
        confirmations: 666,
        script: { length: 107 }, // incorrect value so old tests pass. in reality its calculated on the fly
        txhex:
          '0200000001ecdefd0e63268b54fae10c73615dcc7f40e0310dd48986c90ba34c0b7c220a6300000000d90047304402203bc4cb339510331090e8fbe65fc1e510d6a412f8dee10879ee65ef627d3d75b3022017372a2f4cba89337d3aa2087cb2d803b6b275c2b7120b422298cf97ebbffe440147304402202ac48d42623e988e038627113594e36c3c0e9c4069792ef385739105cf843c9d0220722f32d64d6f91a59325d1c494cc4d0cf8ae506c0cb25c46442dba1cb65e156d0147522102e2a940566cade4c76e3733323fa098f696d8ca568cdfcd13db77d1308557a6e821030ce3370d4c6487d552bbf3c68f260070b0c853276d12e2583fdc9902f262488d52ae000000800210270000000000001976a91419129d53e6319baf19dba059bead166df90ab8f588acbc5601000000000017a914f23c14448f3af5557826aced42ea9e71589dce498700000000',
      },
    ];

    const w = new MultisigHDWallet();
    w.addCosigner(process.env.MNEMONICS_COBO);
    w.addCosigner(process.env.MNEMONICS_COLDCARD);
    w.setDerivationPath(path);
    w.setM(2);

    assert.strictEqual(w.getDerivationPath(), "m/45'");
    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 2);
    assert.strictEqual(w.howManySignaturesCanWeMake(), 2);
    assert.strictEqual(w.getFingerprint(1), fp1cobo);
    assert.strictEqual(w.getFingerprint(2), fp2coldcard);

    assert.strictEqual(w._getExternalAddressByIndex(0), '3J5xQcgBqoykSHhmDJLYp87SgVSNhYrvnz');
    assert.strictEqual(w._getExternalAddressByIndex(1), '3GkEXFYUifSmQ9SgzJDWL37pjMj4LT6vbq');
    assert.strictEqual(w._getInternalAddressByIndex(0), '365MagKko4t7L9XPXSYGkFj23dknTCx4UW');
    assert.strictEqual(w._getInternalAddressByIndex(1), '36j8Qx6vxUknTxGFa5yYuxifEK9PGPEKso');
    assert.strictEqual(w._getInternalAddressByIndex(3), '3PmqRLiPnBXhdYGN6mAHChXLPvw8wb3Yt8');
    assert.ok(!w.isWrappedSegwit());
    assert.ok(!w.isNativeSegwit());
    assert.ok(w.isLegacy());

    // transaction is gona be signed with both keys
    const { tx, psbt } = w.createTransaction(
      utxos,
      [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS' }], // no change
      10,
      w._getInternalAddressByIndex(3),
      false,
      false,
    );
    assert.ok(tx);
    assert.ok(psbt);

    assert.throws(() => psbt.finalizeAllInputs()); // throws as it is already finalized
    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbt), 2);

    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAFUCAAAAASPuAITGfKAeBZpHhacERdEkiJPJUoiW651RcTwZpeozAQAAAAAAAACAATxPAQAAAAAAGXapFBkSnVPmMZuvGdugWb6tFm35Crj1iKwAAAAAAAEA/U4BAgAAAAHs3v0OYyaLVPrhDHNhXcx/QOAxDdSJhskLo0wLfCIKYwAAAADZAEcwRAIgO8TLM5UQMxCQ6PvmX8HlENakEvje4Qh57mXvYn09dbMCIBc3Ki9MuokzfTqiCHyy2AO2snXCtxILQiKYz5frv/5EAUcwRAIgKsSNQmI+mI4DhicRNZTjbDwOnEBpeS7zhXORBc+EPJ0CIHIvMtZNb5GlkyXRxJTMTQz4rlBsDLJcRkQtuhy2XhVtAUdSIQLiqUBWbK3kx243MzI/oJj2ltjKVozfzRPbd9EwhVem6CEDDOM3DUxkh9VSu/PGjyYAcLDIUydtEuJYP9yZAvJiSI1SrgAAAIACECcAAAAAAAAZdqkUGRKdU+Yxm68Z26BZvq0WbfkKuPWIrLxWAQAAAAAAF6kU8jwURI869VV4JqztQuqecVidzkmHAAAAAAEH2gBIMEUCIQDiNd/+7jidaMNr62dXs0PaHebV/u/XeOin63Jvb8r0vQIgc48RIH515lkuia5Mo6cgSBJzhSCDX8EJqE8jjrFbiaYBRzBEAiBhF7Q0mzTS/KF9YAvGbnWpwOjFot1cwjITOS8GkWk1wQIgWvvztERtgktCQIAy1qm3ON7iknfmCuXLiwheD/xZeVcBR1IhAoJkVao8TQcPGdH2rhAUNLNEoDTaWVlIZXZEEk77O3NoIQOJYtHCrnVaHKX4kVFrtjn9dVGJENMKTTOYLAY/aCS3rFKuAAA=',
    );

    assert.strictEqual(
      psbt.extractTransaction().toHex(),
      '020000000123ee0084c67ca01e059a4785a70445d1248893c9528896eb9d51713c19a5ea3301000000da00483045022100e235dffeee389d68c36beb6757b343da1de6d5feefd778e8a7eb726f6fcaf4bd0220738f11207e75e6592e89ae4ca3a7204812738520835fc109a84f238eb15b89a60147304402206117b4349b34d2fca17d600bc66e75a9c0e8c5a2dd5cc23213392f06916935c102205afbf3b4446d824b42408032d6a9b738dee29277e60ae5cb8b085e0ffc5979570147522102826455aa3c4d070f19d1f6ae101434b344a034da595948657644124efb3b736821038962d1c2ae755a1ca5f891516bb639fd75518910d30a4d33982c063f6824b7ac52ae00000080013c4f0100000000001976a91419129d53e6319baf19dba059bead166df90ab8f588ac00000000',
    );
  });

  it('can do both signatures, and create correct feerate tx', () => {
    const path = "m/45'";

    const utxos = [
      {
        height: 666,
        value: 87740,
        address: '3PmqRLiPnBXhdYGN6mAHChXLPvw8wb3Yt8',
        txId: '33eaa5193c71519deb968852c9938824d14504a785479a051ea07cc68400ee23',
        vout: 1,
        txid: '33eaa5193c71519deb968852c9938824d14504a785479a051ea07cc68400ee23',
        amount: 87740,
        wif: false,
        confirmations: 666,
        txhex:
          '0200000001ecdefd0e63268b54fae10c73615dcc7f40e0310dd48986c90ba34c0b7c220a6300000000d90047304402203bc4cb339510331090e8fbe65fc1e510d6a412f8dee10879ee65ef627d3d75b3022017372a2f4cba89337d3aa2087cb2d803b6b275c2b7120b422298cf97ebbffe440147304402202ac48d42623e988e038627113594e36c3c0e9c4069792ef385739105cf843c9d0220722f32d64d6f91a59325d1c494cc4d0cf8ae506c0cb25c46442dba1cb65e156d0147522102e2a940566cade4c76e3733323fa098f696d8ca568cdfcd13db77d1308557a6e821030ce3370d4c6487d552bbf3c68f260070b0c853276d12e2583fdc9902f262488d52ae000000800210270000000000001976a91419129d53e6319baf19dba059bead166df90ab8f588acbc5601000000000017a914f23c14448f3af5557826aced42ea9e71589dce498700000000',
      },
    ];

    const w = new MultisigHDWallet();
    w.addCosigner(process.env.MNEMONICS_COBO);
    w.addCosigner(process.env.MNEMONICS_COLDCARD);
    w.setDerivationPath(path);
    w.setM(2);

    // transaction is gona be signed with both keys
    const { tx, psbt } = w.createTransaction(
      utxos,
      [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS' }], // no change
      10,
      w._getInternalAddressByIndex(3),
      false,
      false,
    );
    assert.ok(tx);
    assert.ok(psbt);

    assert.throws(() => psbt.finalizeAllInputs()); // throws as it is already finalized
    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbt), 2);
    assert.ok(psbt.extractTransaction().toHex());
    assert.strictEqual(Math.round(psbt.getFeeRate()), 10);
  });
});

describe('multisig-wallet (wrapped segwit)', () => {
  if (!process.env.MNEMONICS_COBO) {
    console.error('process.env.MNEMONICS_COBO not set, skipped');
    return;
  }
  if (!process.env.MNEMONICS_COLDCARD) {
    console.error('process.env.MNEMONICS_COLDCARD not set, skipped');
    return;
  }

  it('basic operations work', async () => {
    const w = new MultisigHDWallet();
    w.setSecret(txtFileFormatMultisigWrappedSegwit);
    assert.strictEqual(w.getDerivationPath(), "m/48'/0'/0'/1'");
    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 2);
    assert.strictEqual(w.howManySignaturesCanWeMake(), 0);
    assert.strictEqual(
      w.getCosigner(1),
      'Ypub6jtUX12KGcqFosZWP4YcHc9qbKRTvgBpb8aE58hsYqby3SQVTr5KGfMmdMg38ekmQ9iLhCdgbAbjih7AWSkA7pgRhiLfah3zT6u1PFvVEbc',
    );
    assert.strictEqual(
      w.getCosigner(2),
      'Ypub6kvtvTZpqGuWtQfg9bL5xe4vDWtwsirR8LzDvsY3vgXvyncW1NGXCUJ9Ps7CiizSSLV6NnnXSYyVDnxCu26QChWzWLg5YCAHam6cYjGtzRz',
    );
    assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), w.getCosigner(1));
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), w.getCosigner(2));
    assert.strictEqual(w.getFingerprint(1), fp1cobo);
    assert.strictEqual(w.getFingerprint(2), fp2coldcard);
    assert.strictEqual(w.getFormat(), MultisigHDWallet.FORMAT_P2SH_P2WSH);

    assert.strictEqual(w._getExternalAddressByIndex(0), '38xA38nfy649CC2JjjZj1CYAhtrcRc67dk');
    assert.strictEqual(w._getExternalAddressByIndex(1), '35ixkuzbrLb7Pr3j89uVYvYPe3jKSrbeB3');
    assert.strictEqual(w._getInternalAddressByIndex(0), '35yBZiSz9aBCz7HcobJzYpsuKhcgJ1Vrnd');
    assert.strictEqual(w._getInternalAddressByIndex(1), '36uoZnudzSSUryHmWyNy3xfChmzvK35AL9');
    assert.ok(w.isWrappedSegwit());
    assert.ok(!w.isNativeSegwit());
    assert.ok(!w.isLegacy());
  });

  it('can coordinate tx creation', async () => {
    const utxos = [
      {
        height: 666,
        value: 100000,
        address: '38xA38nfy649CC2JjjZj1CYAhtrcRc67dk',
        txId: 'e36f630517f5b094a9287e73bdb443792088255c50d74414c7f25bd7fbdcf18e',
        vout: 0,
        txid: 'e36f630517f5b094a9287e73bdb443792088255c50d74414c7f25bd7fbdcf18e',
        amount: 100000,
        wif: false,
        confirmations: 666,
        script: { length: 107 }, // incorrect value so old tests pass. in reality its calculated on the fly
        txhex:
          '0200000000010196d35e9f8f176e83895a3fe9595a6245dfbab28d6ab67b3792fd5de22e1f6b6601000000000000008002a08601000000000017a9144fa5e491491e9ff7a4a1acfad13b1f40394a807587cc1e040000000000160014266425288c8b2b0ff90f2cffb630f174b1e1915602473044022027a467bd3d4aeb3d7e37d9e1218016e06ad0d5d55ce36f2852dc685e4261d5fb022006acb3e4ecb6c8b887ad94893a8b447a7003a34c0422864d2403493d8ab07fd60121022974397dca958232181a717400dc31629b4daad87e1e314e3b02dd059e88141000000000',
      },
    ];

    const w = new MultisigHDWallet();
    w.setSecret(txtFileFormatMultisigWrappedSegwit);

    // transaction is gona be UNsigned because we have no keys
    const { psbt, tx } = w.createTransaction(
      utxos,
      [{ address: 'bc1qlhpaukt44ru7044uqdf0hp2qs0ut0p93g66k8h', value: 10000 }],
      10,
      w._getInternalAddressByIndex(3),
      false,
      false,
    );
    assert.ok(!tx, 'tx should not be provided when PSBT is only partially signed');

    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbt), 0);
    assert.ok(w.calculateFeeFromPsbt(psbt) < 3000);
    assert.ok(w.calculateFeeFromPsbt(psbt) > 0);

    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAHICAAAAAY7x3PvXW/LHFETXUFwliCB5Q7S9c34oqZSw9RcFY2/jAAAAAAAAAACAAhAnAAAAAAAAFgAU/cPeWXWo+efWvANS+4VAg/i3hLG8VgEAAAAAABepFO7ireZCjVtHj35I/Nl7BehvwLUehwAAAAAAAQDfAgAAAAABAZbTXp+PF26DiVo/6VlaYkXfurKNarZ7N5L9XeIuH2tmAQAAAAAAAACAAqCGAQAAAAAAF6kUT6XkkUken/ekoaz60TsfQDlKgHWHzB4EAAAAAAAWABQmZCUojIsrD/kPLP+2MPF0seGRVgJHMEQCICekZ709Sus9fjfZ4SGAFuBq0NXVXONvKFLcaF5CYdX7AiAGrLPk7LbIuIetlIk6i0R6cAOjTAQihk0kA0k9irB/1gEhAil0OX3KlYIyGBpxdADcMWKbTarYfh4xTjsC3QWeiBQQAAAAAAEBIKCGAQAAAAAAF6kUT6XkkUken/ekoaz60TsfQDlKgHWHAQQiACDPTtxNIhrXXpN96Ge4RqNg6G5S2ekVWeRIxC6lrW7xpgEFR1IhAs4nrGikNjRB6wBod7xyiPlsajHLe784+TGSBSn1La1FIQNdxFn6ZgrWx54rXwjY8th8oxuC1GGaYJuwUCPwiHLvMlKuIgYCziesaKQ2NEHrAGh3vHKI+WxqMct7vzj5MZIFKfUtrUUcFo3WAzAAAIAAAACAAAAAgAEAAIAAAAAAAAAAACIGA13EWfpmCtbHnitfCNjy2HyjG4LUYZpgm7BQI/CIcu8yHNN+rYgwAACAAAAAgAAAAIABAACAAAAAAAAAAAAAAAEAIgAgmEK/lrkZU6YPI0E7hA3gl4FCIJrzjUCO1HWnberBUHMBAUdSIQJiYhkhelPzRR4CoVURPwwFCiw4bloiKfu5PeiBcpsoBiEDu+RSG3dUJUlQnENUxiTZbrK1Nfe7LV+YDo2tmbD+GOBSriICAmJiGSF6U/NFHgKhVRE/DAUKLDhuWiIp+7k96IFymygGHNN+rYgwAACAAAAAgAAAAIABAACAAQAAAAMAAAAiAgO75FIbd1QlSVCcQ1TGJNlusrU197stX5gOja2ZsP4Y4BwWjdYDMAAAgAAAAIAAAACAAQAAgAEAAAADAAAAAA==',
    );

    // now, signing it on coldcard.

    const signedOnColdcard =
      'cHNidP8BAHICAAAAAY7x3PvXW/LHFETXUFwliCB5Q7S9c34oqZSw9RcFY2/jAAAAAAAAAACAAhAnAAAAAAAAFgAU/cPeWXWo+efWvANS+4VAg/i3hLG8VgEAAAAAABepFO7ireZCjVtHj35I/Nl7BehvwLUehwAAAAAAAQDfAgAAAAABAZbTXp+PF26DiVo/6VlaYkXfurKNarZ7N5L9XeIuH2tmAQAAAAAAAACAAqCGAQAAAAAAF6kUT6XkkUken/ekoaz60TsfQDlKgHWHzB4EAAAAAAAWABQmZCUojIsrD/kPLP+2MPF0seGRVgJHMEQCICekZ709Sus9fjfZ4SGAFuBq0NXVXONvKFLcaF5CYdX7AiAGrLPk7LbIuIetlIk6i0R6cAOjTAQihk0kA0k9irB/1gEhAil0OX3KlYIyGBpxdADcMWKbTarYfh4xTjsC3QWeiBQQAAAAAAEBIKCGAQAAAAAAF6kUT6XkkUken/ekoaz60TsfQDlKgHWHIgICziesaKQ2NEHrAGh3vHKI+WxqMct7vzj5MZIFKfUtrUVHMEQCIGpbamFnic4XMuNHOC8AulQmuUzVdE+67aWOZC0lwwQJAiB1LID+LeJC87bL7U0wGtAfzLah8iScywpIhzVrVIrofwEBAwQBAAAAIgYCziesaKQ2NEHrAGh3vHKI+WxqMct7vzj5MZIFKfUtrUUcFo3WAzAAAIAAAACAAAAAgAEAAIAAAAAAAAAAACIGA13EWfpmCtbHnitfCNjy2HyjG4LUYZpgm7BQI/CIcu8yHNN+rYgwAACAAAAAgAAAAIABAACAAAAAAAAAAAABBCIAIM9O3E0iGtdek33oZ7hGo2DoblLZ6RVZ5EjELqWtbvGmAQVHUiECziesaKQ2NEHrAGh3vHKI+WxqMct7vzj5MZIFKfUtrUUhA13EWfpmCtbHnitfCNjy2HyjG4LUYZpgm7BQI/CIcu8yUq4AACICA7vkUht3VCVJUJxDVMYk2W6ytTX3uy1fmA6NrZmw/hjgHBaN1gMwAACAAAAAgAAAAIABAACAAQAAAAMAAAAiAgJiYhkhelPzRR4CoVURPwwFCiw4bloiKfu5PeiBcpsoBhzTfq2IMAAAgAAAAIAAAACAAQAAgAEAAAADAAAAAQAiACCYQr+WuRlTpg8jQTuEDeCXgUIgmvONQI7Udadt6sFQcwEBR1IhAmJiGSF6U/NFHgKhVRE/DAUKLDhuWiIp+7k96IFymygGIQO75FIbd1QlSVCcQ1TGJNlusrU197stX5gOja2ZsP4Y4FKuAA==';
    const psbtSignedOnColdcard = bitcoin.Psbt.fromBase64(signedOnColdcard);

    psbt.combine(psbtSignedOnColdcard); // should not throw

    // signed on real Cobo device:
    const psbtFromCobo = bitcoin.Psbt.fromHex(
      decodeUR([
        'UR:BYTES/1OF2/C3YV8V6ZLYC0XV3KCL3TLTYVJAMVAV2EGUKEA5XRPHHSTRFWR67QD0422H/TYZPJURNVF607QGQWGPQQQQQQX80RH8M6ADL93C5GNT4QHP93QS8JSA5H4EHU29FJJC029C9VDH7XQQQQQQQQQQQQZQQYYP8QQQQQQQQQQTQQ98AC009JADGL8NAD0QR2TAC2SYRLZMCFVDU2CQSQQQQQQQP02G5AM32MEJZ34D50RM7FR7DJ7C9APHUPDG7SUQQQQQQQQQSPHCZQQQQQQQPQXTDXH5L3UTKAQUFTGL7JK26VFZALW4J344TV7EHJT74MC3WRA4KVQGQQQQQQQQQQZQQ9GYXQYQQQQQQQQT6J9Z05HJFZJG7NLM6FGDVLTGNK86Q899GQAV8ES0QGQQQQQQQQ9SQZSNXGFFG3J9JKRLEPUK0LD3S796TRCV32CPYWVZYQGSZ0FR8H57546EA0CMANCFPSQTWQ6KS6H24ECM09PFDC6Z7GFSAT7CZYQR2EVLYAJMV3WY84K2GJW5TG3A8QQARFSZZ9PJDYSP5J0V2KPLAVQFPQG5HGWTAE22CYVSCRFCHGQXUX93FKND2MPLPUV2W8VPD6PV73Q2PQQQQQQQQZQFQ5ZRQZQQQQQQQQ9AFZ386TEY3FY0FLAAY5XK045FMRAQRJJ5QWKRJYQSZECN6C69YXC6YR6CQDPMMCU5GL9KX5VWT0WLN37F3JGZJNAFD44Z5WVZYQGSX5KM2V9NCNNSHXT35WWP0QZA9GF4EFN2HGNA6AKJCUEPDYHPSGZGZYP6JEQ879H3Y9UAKE0K56VQ66Q0UED4P7GJFEJC2FZRN26653T587QFZQGP4M3ZELFNQ44K8NC447ZXC7TV8EGCMST2XRXNQNWC9QGLS3PEW7',
        'UR:BYTES/2OF2/C3YV8V6ZLYC0XV3KCL3TLTYVJAMVAV2EGUKEA5XRPHHSTRFWR67QD0422H/VJ8XPZQYGZDUG0080MKV7J470KZDUQ6P059YR8WPJ0U86369FJVRAVV0W0CHSPZQH6RPNTKY4SU6TYH899522UP5U57DPPSG6P3D5F0AAH82C0X8MGGQYQSXPQPQQQQQQGYYGQZPN6WM3XJYXKHT6FHM6R8HPR2XC8GDEFDN6G4T8JY33PW5KKKAUDXQYZ5W53PQT8Z0TRG5SMRGS0TQP5800RJ3RUKC633EDAM7W8EXXFQ22049KK52GGRTHZ9N7NXPTTV083TTUYD3UKC0J33HQK5VXDXPXAS2Q3LPZRJAUE99T3ZQCPVUFAVDZJRVDZPAVQXSAAUW2Y0JMR2X89HH0ECLYCEYPFF75K663GUZ6XAVQESQQQGQQQQQZQQQQQQSQQSQQYQQQQQQQQQQQQQQGSXQDWUGK06VC9DD3U79D0S3K8JMP72XXUZ63SE5CYMKPGZ8UYGWTHNY8XN06KCSVQQQZQQQQQQSQQQQQYQQYQQPQQQQQQQQQQQQQQQQQQPQ9R4YGGZVF3PJGT620E528SZ5923Z0CVQ59ZCWRWTG3ZN7AE8H5GZU5M9QRZZQAMU3FPKA65Y4Y4P8ZR2NRZFKTWK26NTAAM940ESR5D4KVMPLSCUPF2UGSZQF3XYXFP0FFLX3G7Q2S42YFLPSZS5TPCDEDZY20MHY773QTJNV5QV8XN06KCSVQQQZQQQQQQSQQQQQYQQYQQPQQPQQQQQQCQQQQZYQSRH0J9YXMH2SJ5J5YUGD2VVFXED6ET2D0HHVK4LXQW3KKENV87RRSPC95D6CPNQQQQSQQQQQYQQQQQPQQPQQQGQQGQQQQQXQQQQQQQ2VFE47',
      ]),
    );

    psbt.combine(psbtFromCobo);
    const txhex = psbt.finalizeAllInputs().extractTransaction().toHex();
    assert.strictEqual(
      txhex,
      '020000000001018ef1dcfbd75bf2c71444d7505c2588207943b4bd737e28a994b0f51705636fe30000000023220020cf4edc4d221ad75e937de867b846a360e86e52d9e91559e448c42ea5ad6ef1a600000080021027000000000000160014fdc3de5975a8f9e7d6bc0352fb854083f8b784b1bc5601000000000017a914eee2ade6428d5b478f7e48fcd97b05e86fc0b51e87040047304402206a5b6a616789ce1732e347382f00ba5426b94cd5744fbaeda58e642d25c304090220752c80fe2de242f3b6cbed4d301ad01fccb6a1f2249ccb0a4887356b548ae87f0147304402204de21ef3bf7667a55f3ec26f01a0be8520cee0c9fc3ea3a2a64c1f58c7b9f8bc02205f430cd762561cd2c97394b452b81a729e68430468316d12fef6e7561e63ed080147522102ce27ac68a4363441eb006877bc7288f96c6a31cb7bbf38f931920529f52dad4521035dc459fa660ad6c79e2b5f08d8f2d87ca31b82d4619a609bb05023f08872ef3252ae00000000',
    );
  });

  it('can coordinate tx creation and sign 1 of 2', async () => {
    const path = "m/48'/0'/0'/1'";
    const Ypub1 = 'Ypub6jtUX12KGcqFosZWP4YcHc9qbKRTvgBpb8aE58hsYqby3SQVTr5KGfMmdMg38ekmQ9iLhCdgbAbjih7AWSkA7pgRhiLfah3zT6u1PFvVEbc';

    const utxos = [
      {
        height: 666,
        value: 100000,
        address: '38xA38nfy649CC2JjjZj1CYAhtrcRc67dk',
        txId: 'e36f630517f5b094a9287e73bdb443792088255c50d74414c7f25bd7fbdcf18e',
        vout: 0,
        txid: 'e36f630517f5b094a9287e73bdb443792088255c50d74414c7f25bd7fbdcf18e',
        amount: 100000,
        wif: false,
        script: { length: 107 }, // incorrect value so old tests pass. in reality its calculated on the fly
        confirmations: 666,
        txhex:
          '0200000000010196d35e9f8f176e83895a3fe9595a6245dfbab28d6ab67b3792fd5de22e1f6b6601000000000000008002a08601000000000017a9144fa5e491491e9ff7a4a1acfad13b1f40394a807587cc1e040000000000160014266425288c8b2b0ff90f2cffb630f174b1e1915602473044022027a467bd3d4aeb3d7e37d9e1218016e06ad0d5d55ce36f2852dc685e4261d5fb022006acb3e4ecb6c8b887ad94893a8b447a7003a34c0422864d2403493d8ab07fd60121022974397dca958232181a717400dc31629b4daad87e1e314e3b02dd059e88141000000000',
      },
    ];

    const w = new MultisigHDWallet();
    w.addCosigner(Ypub1, fp1cobo);
    w.addCosigner(process.env.MNEMONICS_COLDCARD);
    w.setDerivationPath(path);
    w.setM(2);

    assert.strictEqual(
      w.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(process.env.MNEMONICS_COLDCARD, path)),
      'Ypub6kvtvTZpqGuWtQfg9bL5xe4vDWtwsirR8LzDvsY3vgXvyncW1NGXCUJ9Ps7CiizSSLV6NnnXSYyVDnxCu26QChWzWLg5YCAHam6cYjGtzRz',
    );
    assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), w.getCosigner(1));
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), w.getCosigner(2));
    assert.strictEqual(w._getExternalAddressByIndex(0), '38xA38nfy649CC2JjjZj1CYAhtrcRc67dk');
    assert.strictEqual(w._getExternalAddressByIndex(1), '35ixkuzbrLb7Pr3j89uVYvYPe3jKSrbeB3');
    assert.strictEqual(w._getInternalAddressByIndex(0), '35yBZiSz9aBCz7HcobJzYpsuKhcgJ1Vrnd');
    assert.strictEqual(w._getInternalAddressByIndex(1), '36uoZnudzSSUryHmWyNy3xfChmzvK35AL9');
    assert.strictEqual(w._getInternalAddressByIndex(3), '3PU8J9pdiKAMsLnrhyrG7RZ4LZiTURQp5r');
    assert.strictEqual(w.howManySignaturesCanWeMake(), 1);
    assert.ok(w.isWrappedSegwit());
    assert.ok(!w.isNativeSegwit());
    assert.ok(!w.isLegacy());

    // transaction is gona be partially signed because we have one of two signing keys
    const { psbt, tx } = w.createTransaction(
      utxos,
      [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', value: 10000 }],
      10,
      w._getInternalAddressByIndex(3),
      false,
      false,
    );
    assert.ok(!tx, 'tx should not be provided when PSBT is only partially signed');
    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbt), 1);

    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAHUCAAAAAY7x3PvXW/LHFETXUFwliCB5Q7S9c34oqZSw9RcFY2/jAAAAAAAAAACAAhAnAAAAAAAAGXapFBkSnVPmMZuvGdugWb6tFm35Crj1iKy8VgEAAAAAABepFO7ireZCjVtHj35I/Nl7BehvwLUehwAAAAAAAQDfAgAAAAABAZbTXp+PF26DiVo/6VlaYkXfurKNarZ7N5L9XeIuH2tmAQAAAAAAAACAAqCGAQAAAAAAF6kUT6XkkUken/ekoaz60TsfQDlKgHWHzB4EAAAAAAAWABQmZCUojIsrD/kPLP+2MPF0seGRVgJHMEQCICekZ709Sus9fjfZ4SGAFuBq0NXVXONvKFLcaF5CYdX7AiAGrLPk7LbIuIetlIk6i0R6cAOjTAQihk0kA0k9irB/1gEhAil0OX3KlYIyGBpxdADcMWKbTarYfh4xTjsC3QWeiBQQAAAAAAEBIKCGAQAAAAAAF6kUT6XkkUken/ekoaz60TsfQDlKgHWHIgICziesaKQ2NEHrAGh3vHKI+WxqMct7vzj5MZIFKfUtrUVHMEQCIHgfpvZsDT4VkHSxGL5nGcRpP55V4r7jmNRj4vr85NNXAiBio79Ta0Tr9skEiLJ/hXnNFR+3ZdRcpFRX59HIqGmorQEBBCIAIM9O3E0iGtdek33oZ7hGo2DoblLZ6RVZ5EjELqWtbvGmAQVHUiECziesaKQ2NEHrAGh3vHKI+WxqMct7vzj5MZIFKfUtrUUhA13EWfpmCtbHnitfCNjy2HyjG4LUYZpgm7BQI/CIcu8yUq4iBgLOJ6xopDY0QesAaHe8coj5bGoxy3u/OPkxkgUp9S2tRRwWjdYDMAAAgAAAAIAAAACAAQAAgAAAAAAAAAAAIgYDXcRZ+mYK1seeK18I2PLYfKMbgtRhmmCbsFAj8Ihy7zIc036tiDAAAIAAAACAAAAAgAEAAIAAAAAAAAAAAAAAAQAiACCYQr+WuRlTpg8jQTuEDeCXgUIgmvONQI7Udadt6sFQcwEBR1IhAmJiGSF6U/NFHgKhVRE/DAUKLDhuWiIp+7k96IFymygGIQO75FIbd1QlSVCcQ1TGJNlusrU197stX5gOja2ZsP4Y4FKuIgICYmIZIXpT80UeAqFVET8MBQosOG5aIin7uT3ogXKbKAYc036tiDAAAIAAAACAAAAAgAEAAIABAAAAAwAAACICA7vkUht3VCVJUJxDVMYk2W6ytTX3uy1fmA6NrZmw/hjgHBaN1gMwAACAAAAAgAAAAIABAACAAQAAAAMAAAAA',
    );

    // got that from real Cobo vault device:
    const ur1 =
      'UR:BYTES/2OF2/TJX8DNDQAX50U29GZNW7RWEQ7JNZLLS6U2NKPKP35N4XX80J2WTQYYVK7D/76D7H8DNNFD6R4D79DKKC0Z8FP2E8ESHNQHUL4ASZYQ9SDTHMKAQG2FJM2YP6P7YXK72J77CJW7C3RSJ9YC594FHPY44UGQGPQS3QQGX0FMWY6GS66A0FXL0GV7UYDGMQAPH99K0FZ4V7GJXY96J66MH35CQS236JYYPVUFAVDZJRVDZPAVQXSAAUW2Y0JMR2X89HH0ECLYCEYPFF75K663FPQDWUGK06VC9DD3U79D0S3K8JMP72XXUZ63SE5CYMKPGZ8UYGWTHNY54WYGRQ9N384352GD35G84SQ6RHH3EG37TVDGCUK7AL8RUNRYS9986JMT29RSTGM4SRXQQQPQQQQQQGQQQQQZQQZQQQSQQQQQQQQQQQQQPZQCP4M3ZELFNQ44K8NC447ZXC7TV8EGCMST2XRXNQNWC9QGLS3PEW7VSU6DL2MZPSQQQGQQQQQZQQQQQQSQQSQQYQQQQQQQQQQQQQQQQQQYQZYQPQNPPTL94ER9F6VRERGYACGR0QJ7Q5YGY67WX5PRK5WKNKM6KP2PESZQ282GSSYCNZRYSH55LNG50Q9G24ZYLSCPG29SUXUK3Z98AMJ00GS9EFK2QXYYPMHEZJRDM4GF2F2ZWYX4XXYNVKAV44XHMMKT2LNQ8GMTVEKRLP3CZJ4C3QYQNZVGVJZ7JN7DZ3UQ4P25GN7RQ9PGKRSMJ6YG5LHWFAAZQH9XEGQCWDXL4D3QCQQQYQQQQQPQQQQQQGQQGQQZQQZQQQQQPSQQQQYGPQ8WLY2GDHW4P9F9GFCS65CCJDJM4JK56L0WEDT7VQARDDNXC0UX8QRSTGM4SRXQQQPQQQQQQGQQQQQZQQZQQQSQQSQQQQQVQQQQQQRSVZ9T';
    const ur2 =
      'UR:BYTES/1OF2/TJX8DNDQAX50U29GZNW7RWEQ7JNZLLS6U2NKPKP35N4XX80J2WTQYYVK7D/TYZR5URNVF607QGQW5PQQQQQQX80RH8M6ADL93C5GNT4QHP93QS8JSA5H4EHU29FJJC029C9VDH7XQQQQQQQQQQQQZQQYYP8QQQQQQQQQQVHD2G5RYFF65LXXXD67XWM5PVMATGKDHUS4W843ZKTC4SPQQQQQQQQZ753FMHZ4HNY9R2MG78HUJ8UM9AST6R0CZ63APCQQQQQQQQPQR0SYQQQQQQQZQVK6D0FLRCHD6PCJK3LA9V45CJ9M7AT9RT2KEAN0YHATH3ZU8MTVCQSQQQQQQQQQQYQQ2SGVQGQQQQQQQQH4Y2YLF0YJ9Y3A8LH5JS6E7K38V05QW22SP6C0NQ7QSQQQQQQQQTQQ9PXVSJJ3RYT9V8LJREVL7MRPUT5K8SEZ4SZGUCYGQ3QY7JX00FAFT4N6L3HM8SJRQQKUP4DP4W4TN3K72ZJM359USNP6HASYGQX4JE7FM9KEZUG0TV53YAGK3R6WQP6XNQYY2RY6FQRFY7C4VRL6CQJZQ3FWSUHMJ54SGEPSXN3WSQDCVTZNDX64KR7RCC5UWCZM5ZEAZQ5ZQQQQQQQQYQJPGYXQYQQQQQQQQT6J9Z05HJFZJG7NLM6FGDVLTGNK86Q899GQAV8YGPQ9N384352GD35G84SQ6RHH3EG37TVDGCUK7AL8RUNRYS9986JMT29GUCYGQ3Q0Q06DANVP5LPTYR5KYVTUECEC35NL8J4U2LW8XX5V0304L8Y6DTSYGRZ5WL4X66YA0MVJPYGKFLC27WDZ50MWEW5TJJ9G4L868Y2S6DG45QJYQSRTHZ9N7NXPTTV083TTUYD3UKC0J33HQK5VXDXPXAS2Q3LPZRJAUEYWVZYQGS929YQ92ZV8XF';
    const payload = decodeUR([ur1, ur2]);

    const psbtFromCobo = bitcoin.Psbt.fromHex(payload);
    psbt.combine(psbtFromCobo);
    const tx2 = psbt.finalizeAllInputs().extractTransaction();
    assert.strictEqual(
      tx2.toHex(),
      '020000000001018ef1dcfbd75bf2c71444d7505c2588207943b4bd737e28a994b0f51705636fe30000000023220020cf4edc4d221ad75e937de867b846a360e86e52d9e91559e448c42ea5ad6ef1a6000000800210270000000000001976a91419129d53e6319baf19dba059bead166df90ab8f588acbc5601000000000017a914eee2ade6428d5b478f7e48fcd97b05e86fc0b51e8704004730440220781fa6f66c0d3e159074b118be6719c4693f9e55e2bee398d463e2fafce4d357022062a3bf536b44ebf6c90488b27f8579cd151fb765d45ca45457e7d1c8a869a8ad0147304402205514802a84c3993ed37d73b6734b743ab7c56dad8788e90ab27cc2f305f9faf602200b06aefbb74085265b5103a0f886b7952f7b1277b111c24526285aa6e1256bc40147522102ce27ac68a4363441eb006877bc7288f96c6a31cb7bbf38f931920529f52dad4521035dc459fa660ad6c79e2b5f08d8f2d87ca31b82d4619a609bb05023f08872ef3252ae00000000',
    );
  });

  it('can coordinate tx creation and sign 1 of 2 (spend from change)', async () => {
    const path = "m/48'/0'/0'/1'";
    const Ypub1 = 'Ypub6jtUX12KGcqFosZWP4YcHc9qbKRTvgBpb8aE58hsYqby3SQVTr5KGfMmdMg38ekmQ9iLhCdgbAbjih7AWSkA7pgRhiLfah3zT6u1PFvVEbc';

    const utxos = [
      {
        height: 666,
        value: 87740,
        address: '3PU8J9pdiKAMsLnrhyrG7RZ4LZiTURQp5r',
        txId: '31d614bc1d6fcbcb273f585f87d2e619784920f8cb0c2396e4a03f1bb86fed64',
        vout: 1,
        txid: '31d614bc1d6fcbcb273f585f87d2e619784920f8cb0c2396e4a03f1bb86fed64',
        amount: 87740,
        wif: false,
        script: { length: 107 }, // incorrect value so old tests pass. in reality its calculated on the fly
        confirmations: 666,
        txhex:
          '020000000001018ef1dcfbd75bf2c71444d7505c2588207943b4bd737e28a994b0f51705636fe30000000023220020cf4edc4d221ad75e937de867b846a360e86e52d9e91559e448c42ea5ad6ef1a6000000800210270000000000001976a91419129d53e6319baf19dba059bead166df90ab8f588acbc5601000000000017a914eee2ade6428d5b478f7e48fcd97b05e86fc0b51e8704004730440220781fa6f66c0d3e159074b118be6719c4693f9e55e2bee398d463e2fafce4d357022062a3bf536b44ebf6c90488b27f8579cd151fb765d45ca45457e7d1c8a869a8ad0147304402207e13fe2321ab8b80f3d415b28e37a11224ff9b9caf8be710d0f30f41939ab3df0220031da773d0dd13f99b0c7e33e7cb2dbc5af480cf219e7933c092eeb354787f780147522102ce27ac68a4363441eb006877bc7288f96c6a31cb7bbf38f931920529f52dad4521035dc459fa660ad6c79e2b5f08d8f2d87ca31b82d4619a609bb05023f08872ef3252ae00000000',
      },
    ];

    const w = new MultisigHDWallet();
    w.addCosigner(Ypub1, fp1cobo);
    w.addCosigner(process.env.MNEMONICS_COLDCARD);
    w.setDerivationPath(path);
    w.setM(2);

    assert.strictEqual(
      w.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(process.env.MNEMONICS_COLDCARD, path)),
      'Ypub6kvtvTZpqGuWtQfg9bL5xe4vDWtwsirR8LzDvsY3vgXvyncW1NGXCUJ9Ps7CiizSSLV6NnnXSYyVDnxCu26QChWzWLg5YCAHam6cYjGtzRz',
    );
    assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), w.getCosigner(1));
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), w.getCosigner(2));
    assert.strictEqual(w._getExternalAddressByIndex(0), '38xA38nfy649CC2JjjZj1CYAhtrcRc67dk');
    assert.strictEqual(w._getExternalAddressByIndex(1), '35ixkuzbrLb7Pr3j89uVYvYPe3jKSrbeB3');
    assert.strictEqual(w._getInternalAddressByIndex(0), '35yBZiSz9aBCz7HcobJzYpsuKhcgJ1Vrnd');
    assert.strictEqual(w._getInternalAddressByIndex(1), '36uoZnudzSSUryHmWyNy3xfChmzvK35AL9');
    assert.strictEqual(w._getInternalAddressByIndex(3), '3PU8J9pdiKAMsLnrhyrG7RZ4LZiTURQp5r');
    assert.strictEqual(w.howManySignaturesCanWeMake(), 1);
    assert.ok(w.isWrappedSegwit());
    assert.ok(!w.isNativeSegwit());
    assert.ok(!w.isLegacy());

    // transaction is gona be partially signed because we have one of two signing keys
    const { psbt, tx } = w.createTransaction(
      utxos,
      [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS' }],
      10,
      w._getInternalAddressByIndex(3),
      false,
      false,
    );
    assert.ok(!tx, 'tx should not be provided when PSBT is only partially signed');

    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAFUCAAAAAWTtb7gbP6DkliMMy/ggSXgZ5tKHX1g/J8vLbx28FNYxAQAAAAAAAACAATxPAQAAAAAAGXapFBkSnVPmMZuvGdugWb6tFm35Crj1iKwAAAAAAAEA/XQBAgAAAAABAY7x3PvXW/LHFETXUFwliCB5Q7S9c34oqZSw9RcFY2/jAAAAACMiACDPTtxNIhrXXpN96Ge4RqNg6G5S2ekVWeRIxC6lrW7xpgAAAIACECcAAAAAAAAZdqkUGRKdU+Yxm68Z26BZvq0WbfkKuPWIrLxWAQAAAAAAF6kU7uKt5kKNW0ePfkj82XsF6G/AtR6HBABHMEQCIHgfpvZsDT4VkHSxGL5nGcRpP55V4r7jmNRj4vr85NNXAiBio79Ta0Tr9skEiLJ/hXnNFR+3ZdRcpFRX59HIqGmorQFHMEQCIH4T/iMhq4uA89QVso43oRIk/5ucr4vnENDzD0GTmrPfAiADHadz0N0T+ZsMfjPnyy28WvSAzyGeeTPAku6zVHh/eAFHUiECziesaKQ2NEHrAGh3vHKI+WxqMct7vzj5MZIFKfUtrUUhA13EWfpmCtbHnitfCNjy2HyjG4LUYZpgm7BQI/CIcu8yUq4AAAAAAQEgvFYBAAAAAAAXqRTu4q3mQo1bR49+SPzZewXob8C1HociAgO75FIbd1QlSVCcQ1TGJNlusrU197stX5gOja2ZsP4Y4EgwRQIhAP3v+3DseVI63T8N9TGi3j9mQvjkIFZTUu0aeQbRhm+NAiASJatbXcK+36jF34Eeg5Hvy+vx+Q5bNB3tJWWBS3tqDAEBBCIAIJhCv5a5GVOmDyNBO4QN4JeBQiCa841AjtR1p23qwVBzAQVHUiECYmIZIXpT80UeAqFVET8MBQosOG5aIin7uT3ogXKbKAYhA7vkUht3VCVJUJxDVMYk2W6ytTX3uy1fmA6NrZmw/hjgUq4iBgJiYhkhelPzRR4CoVURPwwFCiw4bloiKfu5PeiBcpsoBhzTfq2IMAAAgAAAAIAAAACAAQAAgAEAAAADAAAAIgYDu+RSG3dUJUlQnENUxiTZbrK1Nfe7LV+YDo2tmbD+GOAcFo3WAzAAAIAAAACAAAAAgAEAAIABAAAAAwAAAAAA',
    );

    // got that from real Cobo vault device:
    const payload = decodeUR([
      'UR:BYTES/2OF2/645VJ6CR74M52HV073W978F7QQ09MQGKMK9RECKH9R4W047TMWKQKHL9CD/QZ753FMHZ4HNY9R2MG78HUJ8UM9AST6R0CZ63APEZQGPXYCSEY9A98U69RCP2Z4G38UXQ2Z3V8PH95G3FLWUNM6YPW2DJSPJ8XPZQYGZ9MR2S3AG7D7H2A0SKF5NEHTAWKQXAJ5U3WAH6GNUKH0JC0M2795PZQANMMTXYKFW30745FSYMGH850MF4SQU82TZF4U6XJS8L27545AYRQY3QYQAMU3FPKA65Y4Y4P8ZR2NRZFKTWK26NTAAM940ESR5D4KVMPLSCUPYRQ3GZYYQ0MMLMWRK8J536M5LSMAF35T0R7EJZLRJZQ4JN2TK357GX6XRXLRGZYQFZT26MTHPTAHAGCH0CZ85RJ8HUH6L3LY89KDQAA5JKTQ2T0D4QCQGPQS3QQGYCG2LEDWGE2WNQ7G6P8WZQMCYHS9PZPXHN34QGA4R45AK74S2SWVQS236JYYPXYCSEY9A98U69RCP2Z4G38UXQ2Z3V8PH95G3FLWUNM6YPW2DJSP3PQWA7G5SMWA2Z2J2SN3P4F33YM9HT9DF477AJ6HUCP6X6MXDSLCVWQ54WYGRQYCNZRYSH55LNG50Q9G24ZYLSCPG29SUXUK3Z98AMJ00GS9EFK2QXRNFHATVGXQQQPQQQQQQGQQQQQZQQZQQQSQQSQQQQQVQQQQPZQCPMHEZJRDM4GF2F2ZWYX4XXYNVKAV44XHMMKT2LNQ8GMTVEKRLP3CQUZ6XAVQESQQQGQQQQQZQQQQQQSQQSQQYQQYQQQQQRQQQQQQQQTQLHYU',
      'UR:BYTES/1OF2/645VJ6CR74M52HV073W978F7QQ09MQGKMK9RECKH9R4W047TMWKQKHL9CD/TYPUYURNVF607QGQ25PQQQQQQ9JW6MACRVL6PEYKYVXVH7PQF9UPNEKJSA04S0E8E09K78DUZNTRZQGQQQQQQQQQQZQQZ0Z0QYQQQQQQQQVHD2G5RYFF65LXXXD67XWM5PVMATGKDHUS4W843ZKQQQQQQQQQZQ8AWSQSYQQQQQQQZQVW78W0H46M7TR3G3XH2PWZTZPQ09PMF0TN0C52N99S75TS2CM0UVQQQQQQYV3QQGX0FMWY6GS66A0FXL0GV7UYDGMQAPH99K0FZ4V7GJXY96J66MH35CQQQQYQQGGZWQQQQQQQQQQEW653GXGJN4F7VVVM4UVAHGZEH6K3VM0EP2U0TZ9VH3TQZQQQQQQQQ9AFZNHW9T0XG2X4K3U00EY0EKTMQH5XLS94R6RSGQZ8XPZQYGRCR7N0VMQD8C2EQA93RZLXWXWYDYLEU40ZHM3E34RRUTA0EEXN2UPZQC4RHAFKK38T7MYSFZ9J07ZHNNG4R7MKT4ZU53290E73EZ5XN29DQ9RNQ3QZYPLP8L3RYX4CHQ8N6S2M9R3H5YFZFLUMNJHCHECS6RES7SVNN2EA7Q3QQVW6WU7SM5FLNXCV0CE70JEDH3D0FQX0YX08JV7QJTHTX4RC0AUQZ36JYYPVUFAVDZJRVDZPAVQXSAAUW2Y0JMR2X89HH0ECLYCEYPFF75K663FPQDWUGK06VC9DD3U79D0S3K8JMP72XXUZ63SE5CYMKPGZ8UYGWTHNY54WQQQQQQQPQYSTC4SPQQQQQQQ',
    ]);

    const psbtFromCobo = bitcoin.Psbt.fromHex(payload);
    psbt.combine(psbtFromCobo);
    const tx2 = psbt.finalizeAllInputs().extractTransaction();
    assert.strictEqual(
      tx2.toHex(),
      '0200000000010164ed6fb81b3fa0e496230ccbf820497819e6d2875f583f27cbcb6f1dbc14d63101000000232200209842bf96b91953a60f23413b840de0978142209af38d408ed475a76deac1507300000080013c4f0100000000001976a91419129d53e6319baf19dba059bead166df90ab8f588ac0400473044022045d8d508f51e6faeaebe164d279bafaeb00dd95391776fa44f96bbe587ed5e2d0220767bdacc4b25d17fab44c09b45cf47ed358038752c49af346940ff57a95a748301483045022100fdeffb70ec79523add3f0df531a2de3f6642f8e420565352ed1a7906d1866f8d02201225ab5b5dc2bedfa8c5df811e8391efcbebf1f90e5b341ded2565814b7b6a0c0147522102626219217a53f3451e02a155113f0c050a2c386e5a2229fbb93de881729b28062103bbe4521b77542549509c4354c624d96eb2b535f7bb2d5f980e8dad99b0fe18e052ae00000000',
    );
  });
});

describe('multisig-wallet (native segwit)', () => {
  if (!process.env.MNEMONICS_COBO) {
    console.error('process.env.MNEMONICS_COBO not set, skipped');
    return;
  }
  if (!process.env.MNEMONICS_COLDCARD) {
    console.error('process.env.MNEMONICS_COLDCARD not set, skipped');
    return;
  }

  it('can sort buffers', async () => {
    let sorted;
    sorted = MultisigHDWallet.sortBuffers([Buffer.from('10', 'hex'), Buffer.from('0011', 'hex')]);
    assert.strictEqual(sorted[0].toString('hex'), '0011');
    assert.strictEqual(sorted[1].toString('hex'), '10');

    sorted = MultisigHDWallet.sortBuffers([
      Buffer.from('022df8750480ad5b26950b25c7ba79d3e37d75f640f8e5d9bcd5b150a0f85014da', 'hex'),
      Buffer.from('03e3818b65bcc73a7d64064106a859cc1a5a728c4345ff0b641209fba0d90de6e9', 'hex'),
      Buffer.from('021f2f6e1e50cb6a953935c3601284925decd3fd21bc445712576873fb8c6ebc18', 'hex'),
    ]);
    assert.strictEqual(sorted[0].toString('hex'), '021f2f6e1e50cb6a953935c3601284925decd3fd21bc445712576873fb8c6ebc18');
    assert.strictEqual(sorted[1].toString('hex'), '022df8750480ad5b26950b25c7ba79d3e37d75f640f8e5d9bcd5b150a0f85014da');
    assert.strictEqual(sorted[2].toString('hex'), '03e3818b65bcc73a7d64064106a859cc1a5a728c4345ff0b641209fba0d90de6e9');

    sorted = MultisigHDWallet.sortBuffers([
      Buffer.from('02632b12f4ac5b1d1b72b2a3b508c19172de44f6f46bcee50ba33f3f9291e47ed0', 'hex'),
      Buffer.from('027735a29bae7780a9755fae7a1c4374c656ac6a69ea9f3697fda61bb99a4f3e77', 'hex'),
      Buffer.from('02e2cc6bd5f45edd43bebe7cb9b675f0ce9ed3efe613b177588290ad188d11b404', 'hex'),
    ]);
    assert.strictEqual(sorted[0].toString('hex'), '02632b12f4ac5b1d1b72b2a3b508c19172de44f6f46bcee50ba33f3f9291e47ed0');
    assert.strictEqual(sorted[1].toString('hex'), '027735a29bae7780a9755fae7a1c4374c656ac6a69ea9f3697fda61bb99a4f3e77');
    assert.strictEqual(sorted[2].toString('hex'), '02e2cc6bd5f45edd43bebe7cb9b675f0ce9ed3efe613b177588290ad188d11b404');

    sorted = MultisigHDWallet.sortBuffers([
      Buffer.from('030000000000000000000000000000000000004141414141414141414141414141', 'hex'),
      Buffer.from('020000000000000000000000000000000000004141414141414141414141414141', 'hex'),
      Buffer.from('020000000000000000000000000000000000004141414141414141414141414140', 'hex'),
      Buffer.from('030000000000000000000000000000000000004141414141414141414141414140', 'hex'),
    ]);
    assert.strictEqual(sorted[0].toString('hex'), '020000000000000000000000000000000000004141414141414141414141414140');
    assert.strictEqual(sorted[1].toString('hex'), '020000000000000000000000000000000000004141414141414141414141414141');
    assert.strictEqual(sorted[2].toString('hex'), '030000000000000000000000000000000000004141414141414141414141414140');
    assert.strictEqual(sorted[3].toString('hex'), '030000000000000000000000000000000000004141414141414141414141414141');

    sorted = MultisigHDWallet.sortBuffers([
      Buffer.from('02ff12471208c14bd580709cb2358d98975247d8765f92bc25eab3b2763ed605f8', 'hex'),
      Buffer.from('02fe6f0a5a297eb38c391581c4413e084773ea23954d93f7753db7dc0adc188b2f', 'hex'),
    ]);
    assert.strictEqual(
      sorted[0].toString('hex'),
      '02fe6f0a5a297eb38c391581c4413e084773ea23954d93f7753db7dc0adc188b2f',
      JSON.stringify(sorted),
    );
    assert.strictEqual(sorted[1].toString('hex'), '02ff12471208c14bd580709cb2358d98975247d8765f92bc25eab3b2763ed605f8');
  });

  it('some validations work', () => {
    assert.ok(MultisigHDWallet.isXpubValid(Zpub1));
    assert.ok(!MultisigHDWallet.isXpubValid('invalid'));
    assert.ok(!MultisigHDWallet.isXpubValid('xpubinvalid'));
    assert.ok(!MultisigHDWallet.isXpubValid('ypubinvalid'));
    assert.ok(!MultisigHDWallet.isXpubValid('Zpubinvalid'));

    assert.ok(MultisigHDWallet.isPathValid("m/45'"));
    assert.ok(MultisigHDWallet.isPathValid("m/48'/0'/0'/2'"));
    assert.ok(!MultisigHDWallet.isPathValid('ROFLBOATS'));
    assert.ok(!MultisigHDWallet.isPathValid(''));

    assert.ok(
      MultisigHDWallet.isXprvValid(
        'ZprvAkUsoZMLiqxrhaM8VpmVJ6QhjH4dZnYpTNNHGMZ3VoE6vRv7xfDeMEiKAeH1eUcN3CFUP87CgM1anM2UytMkykUMtVmXkkohRsiVGth1VMG',
      ),
    );
    assert.ok(!MultisigHDWallet.isXprvValid(''));
    assert.ok(!MultisigHDWallet.isXprvValid('Zprvlabla'));
    assert.ok(!MultisigHDWallet.isXprvValid('xprvblabla'));
    assert.ok(
      !MultisigHDWallet.isXprvValid(
        'xprv9tpBCBeAwBnVgYroSvicqDR2XhAj6sth3idqBWhRqnrq99x17WZvZHQup679rXc3ndPLN3fwbpLkv4WTQhfhZN89B2NbTMmYFePPPHJ5jVP',
      ),
    ); // invalid fp

    assert.ok(MultisigHDWallet.isFpValid(fp1cobo));
    assert.ok(MultisigHDWallet.isFpValid(fp2coldcard));
    assert.ok(MultisigHDWallet.isFpValid('00000000'));
    assert.ok(MultisigHDWallet.isFpValid('DEADFEEF'));
    assert.ok(MultisigHDWallet.isFpValid('deadbeef'));
    assert.ok(MultisigHDWallet.isFpValid('dEaDbeEF'));
    assert.ok(!MultisigHDWallet.isFpValid('rmjiweg3'));
    assert.ok(!MultisigHDWallet.isFpValid('bruh'));
    assert.ok(!MultisigHDWallet.isFpValid('0'));
    assert.ok(!MultisigHDWallet.isFpValid('0'));
  });

  it('basic operations work', async () => {
    const path = "m/48'/0'/0'/2'";

    let w = new MultisigHDWallet();
    w.addCosigner(Zpub1, fp1cobo);
    w.addCosigner(Zpub2, fp2coldcard);
    w.setDerivationPath(path);
    w.setM(2);
    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1qtah0p50d4qlftn049k7lldcwh7cs3zkjy9g8xegv63p308hsh9zsf5567q');
    assert.strictEqual(
      w._getDerivationPathByAddressWithCustomPath(w._getExternalAddressByIndex(2), w.getDerivationPath()),
      "m/48'/0'/0'/2'/0/2",
    );
    assert.strictEqual(
      w._getDerivationPathByAddressWithCustomPath(w._getInternalAddressByIndex(3), w.getDerivationPath()),
      "m/48'/0'/0'/2'/1/3",
    );
    assert.strictEqual(
      MultisigHDWallet.seedToXpub(process.env.MNEMONICS_COLDCARD, path),
      'xpub6FCYVZAU7dofgor9fQaqyqqA9NqBAn83iQpoayuWrwBPfwiPgCXGCD7dvAG93M5MZs5VWVP7FErGA5UeiALqaPt7KV67fL9WX9bqXTyeWxb',
    );
    assert.strictEqual(
      w.convertXpubToMultisignatureXpub(
        'xpub6FCYVZAU7dofgor9fQaqyqqA9NqBAn83iQpoayuWrwBPfwiPgCXGCD7dvAG93M5MZs5VWVP7FErGA5UeiALqaPt7KV67fL9WX9bqXTyeWxb',
      ),
      Zpub2,
    );
    assert.throws(() => w.addCosigner('invalid'));
    assert.throws(() => w.addCosigner('xpubinvalid'));
    assert.throws(() => w.addCosigner('ypubinvalid'));
    assert.throws(() => w.addCosigner('Zpubinvalid'));
    assert.throws(() => w.addCosigner(Zpub1, fp1cobo, 'ROFLBOATS')); // invalid path
    assert.throws(() => w.addCosigner(Zpub1, fp1cobo)); // duplicates are not allowed
    assert.throws(() => w.addCosigner(Zpub2, fp2coldcard)); // duplicates are not allowed
    assert.throws(() => w.addCosigner(process.env.MNEMONICS_COBO)); // duplicates are not allowed
    assert.throws(() => w.addCosigner(process.env.MNEMONICS_COLDCARD)); // duplicates are not allowed

    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 2);
    assert.strictEqual(w.getDerivationPath(), path);
    assert.strictEqual(w.getCosigner(1), Zpub1);
    assert.strictEqual(w.getCosigner(2), Zpub2);
    assert.strictEqual(w.getFingerprint(1), fp1cobo);
    assert.strictEqual(w.getFingerprint(2), fp2coldcard);
    assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), Zpub1);
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), Zpub2);
    assert.strictEqual(w.howManySignaturesCanWeMake(), 0);
    assert.ok(!w.isWrappedSegwit());
    assert.ok(w.isNativeSegwit());
    assert.ok(!w.isLegacy());
    assert.strictEqual(w.getFormat(), MultisigHDWallet.FORMAT_P2WSH);

    // now, one of cosigners is mnemonics

    w = new MultisigHDWallet();
    w.addCosigner(Zpub1, fp1cobo);
    w.addCosigner(process.env.MNEMONICS_COLDCARD);
    w.setDerivationPath(path);
    w.setM(2);
    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85');
    assert.strictEqual(w._getExternalAddressByIndex(1), 'bc1qvwd2d7r46j7u9qyxpedfhe5p075sxuhzd0n6napuvvhq2u5nrmqs9ex90q');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1qtah0p50d4qlftn049k7lldcwh7cs3zkjy9g8xegv63p308hsh9zsf5567q');
    assert.strictEqual(w._getInternalAddressByIndex(1), 'bc1qv84pedzkqz2p4sd2dxm9krs0tcfatqcn73nndycaky9qttczj9qq3az9ma');

    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 2);
    assert.strictEqual(w.getDerivationPath(), path);
    assert.strictEqual(w.getCosigner(1), Zpub1);
    assert.strictEqual(w.getCosigner(2), process.env.MNEMONICS_COLDCARD);
    assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), Zpub1);
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), process.env.MNEMONICS_COLDCARD);
    assert.strictEqual(w.howManySignaturesCanWeMake(), 1);

    // now, provide fp with mnemonics and expect that wallet wont recalculate fp, and will use provided
    w = new MultisigHDWallet();
    w.addCosigner(process.env.MNEMONICS_COLDCARD, 'DEADBABE');
    w.addCosigner(process.env.MNEMONICS_COBO);
    assert.strictEqual(w.getFingerprint(1), 'DEADBABE');
    assert.strictEqual(w.getCosignerForFingerprint('DEADBABE'), process.env.MNEMONICS_COLDCARD);
  });

  it('basic operations work for 2-of-3', async () => {
    const path = "m/48'/0'/0'/2'";

    const w = new MultisigHDWallet();
    w.addCosigner(Zpub1, fp1cobo);
    w.addCosigner(Zpub2, fp2coldcard);
    w.addCosigner(
      'accident olympic spawn spider cable track pluck fat code grab fine salt garment kidney crime old often worth member impulse brother smoke garden trash',
    );
    w.setDerivationPath(path);
    w.setM(2);

    assert.strictEqual(
      w.convertXpubToMultisignatureXpub(
        MultisigHDWallet.seedToXpub(
          'accident olympic spawn spider cable track pluck fat code grab fine salt garment kidney crime old often worth member impulse brother smoke garden trash',
          path,
        ),
      ),
      'Zpub74k35j5DkSA6t6SFhPeHv8ENBHdNgAPALWodSWoWxsHo6vbAu2FUGq9QmUEvdEPzBoMswizfsAbTWQYU2ZnvCjdKsFje5TEfjLxuH8arBtp',
    );

    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qnpy7c7wz6tvmhdwgyk8ka4du3s9x6uhgjal305xdatmwfa538zxsys5l0t');
    assert.strictEqual(w._getExternalAddressByIndex(1), 'bc1qvuum7egsw4r4utzart88pergghy9rp8m4j5m4s464lz6u39sn6usn89w7c');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1qatmvfj5nzh4z3njxeg8z86y592clqe7sfgvp5cpund47knnm6pxsswl2lr');
    assert.strictEqual(w._getInternalAddressByIndex(1), 'bc1qpqa9c6nkqgcruegnh8wcsr0gzc4x9y90v9k0nxr6lww0gts430zqp7wm86');

    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 3);
    assert.strictEqual(w.howManySignaturesCanWeMake(), 1);
    assert.ok(!w.isWrappedSegwit());
    assert.ok(w.isNativeSegwit());
    assert.ok(!w.isLegacy());
  });

  it('can coordinate tx creation', async () => {
    const path = "m/48'/0'/0'/2'";

    const utxos = [
      {
        height: 666,
        value: 100000,
        address: 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85',
        txId: '666b1f2ee25dfd92377bb66a8db2badf45625a59e93f5a89836e178f9f5ed396',
        vout: 0,
        txid: '666b1f2ee25dfd92377bb66a8db2badf45625a59e93f5a89836e178f9f5ed396',
        amount: 100000,
        wif: false,
        script: { length: 107 }, // incorrect value so old tests pass. in reality its calculated on the fly
        confirmations: 0,
        txhex:
          '02000000000101b67e455069a0f44c9df4849ee1167b06c26f8478daefa9c8aeedf1da3d7d81860f000000000000008002a08601000000000022002030862bd71d77b314666e5fdab34d6293ecb4ffdbba55fbd5323dfd79d98b662b04b005000000000016001461e37702582ecf8c87c1eb5008f2afb17acc9d3c02473044022077268bb0f3060b737b657c3c990107be5db41fd311cc64abeab96cff621146fc0220766e2409c0669020ea2160b358037fdb17f49e59faf8e9c50ac946019be079e6012103c3ed17035033b2cb0ce03694d402c37a307f0eea2b909b0272816bfcea83714f00000000',
      },
    ];

    const w = new MultisigHDWallet();
    w.addCosigner(Zpub1, fp1cobo);
    w.addCosigner(Zpub2, fp2coldcard);
    w.setDerivationPath(path);
    w.setM(2);

    assert.strictEqual(w.getCustomDerivationPathForCosigner(1), path); // not provided, so should be default
    assert.strictEqual(w.getCustomDerivationPathForCosigner(1), w.getDerivationPath()); // not provided, so should be default
    assert.strictEqual(w.getCustomDerivationPathForCosigner(2), w.getDerivationPath()); // not provided, so should be default

    const { psbt } = w.createTransaction(
      utxos,
      [{ address: 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85' }], // sendMax
      1,
      w._getInternalAddressByIndex(0), // there should be no change in this tx
      false,
      false,
    );

    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAF4CAAAAAZbTXp+PF26DiVo/6VlaYkXfurKNarZ7N5L9XeIuH2tmAAAAAAAAAACAAeCFAQAAAAAAIgAgMIYr1x13sxRmbl/as01ik+y0/9u6VfvVMj39edmLZisAAAAAAAEA6gIAAAAAAQG2fkVQaaD0TJ30hJ7hFnsGwm+EeNrvqciu7fHaPX2Bhg8AAAAAAAAAgAKghgEAAAAAACIAIDCGK9cdd7MUZm5f2rNNYpPstP/bulX71TI9/XnZi2YrBLAFAAAAAAAWABRh43cCWC7PjIfB61AI8q+xesydPAJHMEQCIHcmi7DzBgtze2V8PJkBB75dtB/TEcxkq+q5bP9iEUb8AiB2biQJwGaQIOohYLNYA3/bF/SeWfr46cUKyUYBm+B55gEhA8PtFwNQM7LLDOA2lNQCw3owfw7qK5CbAnKBa/zqg3FPAAAAAAEBK6CGAQAAAAAAIgAgMIYr1x13sxRmbl/as01ik+y0/9u6VfvVMj39edmLZisBBUdSIQL3PcZ3OXAqrpAGpxAfeH8tGlIosSQDQjFhbP8RIOZRyyED1Ql1CX8NiH3x6Uj22iu8SEwewHmhRSyqJtbmfw+g11pSriIGAvc9xnc5cCqukAanEB94fy0aUiixJANCMWFs/xEg5lHLHNN+rYgwAACAAAAAgAAAAIACAACAAAAAAAAAAAAiBgPVCXUJfw2IffHpSPbaK7xITB7AeaFFLKom1uZ/D6DXWhwWjdYDMAAAgAAAAIAAAACAAgAAgAAAAAAAAAAAAAA=',
    );

    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbt), 0);

    const signedOnColdcard =
      'cHNidP8BAF4CAAAAAZbTXp+PF26DiVo/6VlaYkXfurKNarZ7N5L9XeIuH2tmAAAAAAAAAACAAeCFAQAAAAAAIgAgMIYr1x13sxRmbl/as01ik+y0/9u6VfvVMj39edmLZisAAAAAAAEA6gIAAAAAAQG2fkVQaaD0TJ30hJ7hFnsGwm+EeNrvqciu7fHaPX2Bhg8AAAAAAAAAgAKghgEAAAAAACIAIDCGK9cdd7MUZm5f2rNNYpPstP/bulX71TI9/XnZi2YrBLAFAAAAAAAWABRh43cCWC7PjIfB61AI8q+xesydPAJHMEQCIHcmi7DzBgtze2V8PJkBB75dtB/TEcxkq+q5bP9iEUb8AiB2biQJwGaQIOohYLNYA3/bF/SeWfr46cUKyUYBm+B55gEhA8PtFwNQM7LLDOA2lNQCw3owfw7qK5CbAnKBa/zqg3FPAAAAAAEBK6CGAQAAAAAAIgAgMIYr1x13sxRmbl/as01ik+y0/9u6VfvVMj39edmLZisiAgPVCXUJfw2IffHpSPbaK7xITB7AeaFFLKom1uZ/D6DXWkcwRAIgfydmSzg/YjlUZDjgfrZGPKOXv5z7do3r5L8YePt5srYCIAD0JWkLVVPeeMsLOUHngsTd01Dx8OezzEmzRGYg9I+2AQEDBAEAAAAiBgPVCXUJfw2IffHpSPbaK7xITB7AeaFFLKom1uZ/D6DXWhwWjdYDMAAAgAAAAIAAAACAAgAAgAAAAAAAAAAAIgYC9z3GdzlwKq6QBqcQH3h/LRpSKLEkA0IxYWz/ESDmUcsc036tiDAAAIAAAACAAAAAgAIAAIAAAAAAAAAAAAEFR1IhAvc9xnc5cCqukAanEB94fy0aUiixJANCMWFs/xEg5lHLIQPVCXUJfw2IffHpSPbaK7xITB7AeaFFLKom1uZ/D6DXWlKuAAA=';
    const psbtSignedOnColdcard = bitcoin.Psbt.fromBase64(signedOnColdcard);
    psbt.combine(psbtSignedOnColdcard); // should not throw
    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbt), 1);

    // signed on real Cobo device:
    const psbtFromCobo = bitcoin.Psbt.fromHex(
      decodeUR([
        'UR:BYTES/2OF2/KP2PVX8V4F6ERP7X6ZZC9TDQ8VQQVASXMM4EUF9TL5AST2HDXSVS30JH3S/J9ZCJGQ6ZX9SKELC3YRN9RJ68XPZQYGQVTXZCWR85MH933S8YXJVVEA7M6G262E4ADTRJR5ZTXJWEKMCLPYPZQ3FDYRG9ZJEUZMM5Q5KFM6SV3VXCHZY3FEPGV0T40ULWX2SXGF2ZQY3QYQ74P96SJLCD3P7LR62G7MDZH0ZGFS0VQ7DPG5K25FKKUELSLGXHTFRNQ3QZYPLJWEJT8QLKYW25VSUWQL4KGC7289ALNNAHDR0TUJL3S78M0XETVQ3QQR6Z26GT24FAU7XTPVU5REUZCNWAX5837RNM8NZFKDZXVG8537MQZQGRQSQSQQQQQYZ5W53PQTMNM3NH89CZ4T5SQ6N3Q8MC0UK3553GKYJQXS33V9K07YFQUEGUKGGR65YH2ZTLPKY8MU0FFRMD52AUFPXPASRE59ZJE23X6MN87RAQ6AD99T3ZQCP0W0WXWUUHQ24WJQR2WYQL0PLJ6XJJ9ZCJGQ6ZX9SKELC3YRN9RJCU6DL2MZPSQQQGQQQQQZQQQQQQSQPQQQYQQQQQQQQQQQQQQGSXQ02SJAGF0UXCSL03A9Y0DK3TH3YYC8KQ0XS52T92YMTWVLC05RT458QK3HTQXVQQQZQQQQQQSQQQQQYQQGQQPQQQQQQQQQQQQQQQQQQZR7R39',
        'UR:BYTES/1OF2/KP2PVX8V4F6ERP7X6ZZC9TDQ8VQQVASXMM4EUF9TL5AST2HDXSVS30JH3S/TYPJKURNVF607QGQTCPQQQQQQXTDXH5L3UTKAQUFTGL7JK26VFZALW4J344TV7EHJT74MC3WRA4KVQQQQQQQQQQQQZQQRCY9QYQQQQQQQQ3QQGPSSC4AW8THKV2XVMJLM2E56C5NAJ60LKA62HAA2V3AL4UANZMX9VQQQQQQQQQSP6SZQQQQQQQPQXM8U32SDXS0GNYA7JZFACGK0VRVYMUY0RDWL2WG4MKLRK3A0KQCVRCQQQQQQQQQQZQQ9GYXQYQQQQQQQQ3QQGPSSC4AW8THKV2XVMJLM2E56C5NAJ60LKA62HAA2V3AL4UANZMX9VZTQPGQQQQQQQQKQQ2XRCMHQFVZANUVSLQ7K5QG72HMZ7KVN57QY3ESGSPZQAEX3WC0XPSTWDAK2LPUNYQS00JAKS0AXYWVVJ474WTVLA3PZ3HUQGS8VM3YP8QXDYPQAGSKPV6CQDLAK9L5NEVL478FC59VJ3SPN0S8NESPYYPU8MGHQDGR8VKTPNSRD9X5QTPH5VRLPM4ZHYYMQFEGZ6LUA2PHZNCQQQQQQQGP9WSGVQGQQQQQQQPZQQSRPP3T6UWH0VC5VEH9LK4NF43F8M95LLDM540M65ERMLTEMX9KV2EZQGP0W0WXWUUHQ24WJQR2WYQL0PLJ6XJ',
      ]),
    );

    psbt.combine(psbtFromCobo);
    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbt), 2);
    const txhex = psbt.finalizeAllInputs().extractTransaction().toHex();
    assert.strictEqual(
      txhex,
      '0200000000010196d35e9f8f176e83895a3fe9595a6245dfbab28d6ab67b3792fd5de22e1f6b6600000000000000008001e08501000000000022002030862bd71d77b314666e5fdab34d6293ecb4ffdbba55fbd5323dfd79d98b662b040047304402200c5985870cf4ddcb18c0e43498ccf7dbd215a566bd6ac721d04b349d9b6f1f090220452d20d0514b3c16f74052c9dea0c8b0d8b88914e42863d757f3ee32a06425420147304402207f27664b383f6239546438e07eb6463ca397bf9cfb768debe4bf1878fb79b2b6022000f425690b5553de78cb0b3941e782c4ddd350f1f0e7b3cc49b3446620f48fb60147522102f73dc67739702aae9006a7101f787f2d1a5228b124034231616cff1120e651cb2103d50975097f0d887df1e948f6da2bbc484c1ec079a1452caa26d6e67f0fa0d75a52ae00000000',
    );

    // now, tx with change and weird paths for keys:

    const w2 = new MultisigHDWallet();
    w2.addCosigner(Zpub1, fp1cobo, "m/6'/7'/8'/2'");
    w2.addCosigner(Zpub2, fp2coldcard, "m/5'/4'/3'/2'");
    w2.setDerivationPath(path);
    w2.setM(2);

    assert.strictEqual(w2.getCustomDerivationPathForCosigner(1), "m/6'/7'/8'/2'");
    assert.strictEqual(w2.getCustomDerivationPathForCosigner(2), "m/5'/4'/3'/2'");

    const { psbt: psbt2 } = w2.createTransaction(
      utxos,
      [{ address: 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85', value: 10000 }],
      1,
      w2._getInternalAddressByIndex(3),
      false,
      false,
    );

    assert.ok(w2.calculateFeeFromPsbt(psbt2) < 300);
    assert.ok(w2.calculateFeeFromPsbt(psbt2) > 0);

    assert.strictEqual(psbt2.data.outputs[1].bip32Derivation[0].masterFingerprint.toString('hex').toUpperCase(), fp1cobo);
    assert.strictEqual(psbt2.data.outputs[1].bip32Derivation[1].masterFingerprint.toString('hex').toUpperCase(), fp2coldcard);
    assert.strictEqual(psbt2.data.outputs[1].bip32Derivation[0].path, "m/6'/7'/8'/2'" + '/1/3');
    assert.strictEqual(psbt2.data.outputs[1].bip32Derivation[1].path, "m/5'/4'/3'/2'" + '/1/3');

    assert.strictEqual(psbt2.data.inputs[0].bip32Derivation[0].path, "m/6'/7'/8'/2'/0/0");
    assert.strictEqual(psbt2.data.inputs[0].bip32Derivation[1].path, "m/5'/4'/3'/2'/0/0");

    assert.strictEqual(psbt2.data.inputs[0].bip32Derivation[0].masterFingerprint.toString('hex').toUpperCase(), fp1cobo);
    assert.strictEqual(
      psbt2.data.inputs[0].bip32Derivation[0].pubkey.toString('hex').toUpperCase(),
      '02F73DC67739702AAE9006A7101F787F2D1A5228B124034231616CFF1120E651CB',
    );
    assert.strictEqual(psbt2.data.inputs[0].bip32Derivation[1].masterFingerprint.toString('hex').toUpperCase(), fp2coldcard);
    assert.strictEqual(
      psbt2.data.inputs[0].bip32Derivation[1].pubkey.toString('hex').toUpperCase(),
      '03D50975097F0D887DF1E948F6DA2BBC484C1EC079A1452CAA26D6E67F0FA0D75A',
    );
  });

  it('can export/import wallet with all seeds in place, and also export coordination setup', () => {
    const path = "m/48'/0'/0'/2'";

    const w = new MultisigHDWallet();
    w.addCosigner(process.env.MNEMONICS_COBO, false, path);
    w.addCosigner(process.env.MNEMONICS_COLDCARD, false, path);
    w.setDerivationPath(path);
    w.setM(2);

    const ww = new MultisigHDWallet();
    ww.setSecret(w.getSecret());

    assert.strictEqual(ww._getExternalAddressByIndex(0), 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85');
    assert.strictEqual(ww._getInternalAddressByIndex(0), 'bc1qtah0p50d4qlftn049k7lldcwh7cs3zkjy9g8xegv63p308hsh9zsf5567q');

    assert.strictEqual(ww.getM(), 2);
    assert.strictEqual(ww.getN(), 2);
    assert.strictEqual(ww.howManySignaturesCanWeMake(), 2);
    assert.ok(!ww.isWrappedSegwit());
    assert.ok(ww.isNativeSegwit());
    assert.ok(!ww.isLegacy());

    assert.strictEqual(w.getID(), ww.getID());
    assert.ok(w.getID() !== new MultisigHDWallet().getID());

    // now, exporting coordination setup:

    const w3 = new MultisigHDWallet();
    w3.setSecret(ww.getXpub());
    assert.strictEqual(w3._getExternalAddressByIndex(0), ww._getExternalAddressByIndex(0));
    assert.strictEqual(w3._getInternalAddressByIndex(0), ww._getInternalAddressByIndex(0));
    assert.strictEqual(w3.getM(), 2);
    assert.strictEqual(w3.getN(), 2);
    assert.strictEqual(w3.howManySignaturesCanWeMake(), 0);
    assert.ok(!w3.isWrappedSegwit());
    assert.ok(w3.isNativeSegwit());
    assert.ok(!w3.isLegacy());
    assert.ok(MultisigHDWallet.isXpubString(w3.getCosigner(1)) && MultisigHDWallet.isXpubValid(w3.getCosigner(1)));
    assert.ok(MultisigHDWallet.isXpubString(w3.getCosigner(2)) && MultisigHDWallet.isXpubValid(w3.getCosigner(2)));
  });

  it('can coordinate tx creation and cosign 1 of 2', async () => {
    const path = "m/48'/0'/0'/2'";

    const utxos = [
      {
        height: 666,
        value: 100000,
        address: 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85',
        txId: '666b1f2ee25dfd92377bb66a8db2badf45625a59e93f5a89836e178f9f5ed396',
        vout: 0,
        txid: '666b1f2ee25dfd92377bb66a8db2badf45625a59e93f5a89836e178f9f5ed396',
        amount: 100000,
        wif: false,
        script: { length: 107 }, // incorrect value so old tests pass. in reality its calculated on the fly
        confirmations: 0,
        txhex:
          '02000000000101b67e455069a0f44c9df4849ee1167b06c26f8478daefa9c8aeedf1da3d7d81860f000000000000008002a08601000000000022002030862bd71d77b314666e5fdab34d6293ecb4ffdbba55fbd5323dfd79d98b662b04b005000000000016001461e37702582ecf8c87c1eb5008f2afb17acc9d3c02473044022077268bb0f3060b737b657c3c990107be5db41fd311cc64abeab96cff621146fc0220766e2409c0669020ea2160b358037fdb17f49e59faf8e9c50ac946019be079e6012103c3ed17035033b2cb0ce03694d402c37a307f0eea2b909b0272816bfcea83714f00000000',
      },
    ];

    const w = new MultisigHDWallet();
    w.addCosigner(Zpub1, fp1cobo);
    w.addCosigner(process.env.MNEMONICS_COLDCARD, false, path);
    w.setDerivationPath(path);
    w.setM(2);

    // transaction is gona be partially signed because we have one of two signing keys
    const { psbt, tx } = w.createTransaction(
      utxos,
      [{ address: 'bc1qlhpaukt44ru7044uqdf0hp2qs0ut0p93g66k8h' }], // sendMax
      10,
      w._getInternalAddressByIndex(0), // there should be no change in this tx
      false,
      false,
    );

    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbt), 1);

    assert.strictEqual(psbt.data.inputs[0].partialSig.length, 1);
    assert.ok(!tx, 'tx should not be provided when PSBT is only partially signed');
    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAFICAAAAAZbTXp+PF26DiVo/6VlaYkXfurKNarZ7N5L9XeIuH2tmAAAAAAAAAACAASB/AQAAAAAAFgAU/cPeWXWo+efWvANS+4VAg/i3hLEAAAAAAAEA6gIAAAAAAQG2fkVQaaD0TJ30hJ7hFnsGwm+EeNrvqciu7fHaPX2Bhg8AAAAAAAAAgAKghgEAAAAAACIAIDCGK9cdd7MUZm5f2rNNYpPstP/bulX71TI9/XnZi2YrBLAFAAAAAAAWABRh43cCWC7PjIfB61AI8q+xesydPAJHMEQCIHcmi7DzBgtze2V8PJkBB75dtB/TEcxkq+q5bP9iEUb8AiB2biQJwGaQIOohYLNYA3/bF/SeWfr46cUKyUYBm+B55gEhA8PtFwNQM7LLDOA2lNQCw3owfw7qK5CbAnKBa/zqg3FPAAAAAAEBK6CGAQAAAAAAIgAgMIYr1x13sxRmbl/as01ik+y0/9u6VfvVMj39edmLZisiAgPVCXUJfw2IffHpSPbaK7xITB7AeaFFLKom1uZ/D6DXWkgwRQIhAMlUC0EwNieytD8U9AUITLBvorNMUfWwJqsGJXRdZA2TAiA7k6ddbqnLKPwswk/D9ehGBIMNzKEfJYW7DkGGYRJdYAEBBUdSIQL3PcZ3OXAqrpAGpxAfeH8tGlIosSQDQjFhbP8RIOZRyyED1Ql1CX8NiH3x6Uj22iu8SEwewHmhRSyqJtbmfw+g11pSriIGAvc9xnc5cCqukAanEB94fy0aUiixJANCMWFs/xEg5lHLHNN+rYgwAACAAAAAgAAAAIACAACAAAAAAAAAAAAiBgPVCXUJfw2IffHpSPbaK7xITB7AeaFFLKom1uZ/D6DXWhwWjdYDMAAAgAAAAIAAAACAAgAAgAAAAAAAAAAAAAA=',
    );

    // got that from real Cobo vault device:
    const payload = decodeUR([
      'UR:BYTES/1OF2/WDZ4928G5MLENN8JFGWM988QCZPUZQ8P64N34EWP3C3TTQRR4C7QH86JMF/TYP3JURNVF607QGQ2GPQQQQQQXTDXH5L3UTKAQUFTGL7JK26VFZALW4J344TV7EHJT74MC3WRA4KVQQQQQQQQQQQQZQQZGRLQYQQQQQQQQTQQ98AC009JADGL8NAD0QR2TAC2SYRLZMCFVGQQQQQQQQPQR4QYQQQQQQQZQDK0EZ4Q6DQ73XFMAYYNMS3V7CXCFHCG7X6A75U3THD78DR6LVPSC8SQQQQQQQQQQYQQ2SGVQGQQQQQQQPZQQSRPP3T6UWH0VC5VEH9LK4NF43F8M95LLDM540M65ERMLTEMX9KV2CYKQZSQQQQQQQPVQQ5V83HWQJC9M8CEP7PADGQ3U40K9AVE8FUQFRNQ3QZYPMJDZAS7VRQKUMMV47REXGPQ7L9MDQL6VGUCE9TA2UKELMZZ9R0CQ3QWEHZGZWQV6GZP63PVZE4SQMLMVTLF8JELTUWN3G2E9RQRXLQ08NQZGGRC0K3WQ6SXWEVKR8QX62DGQKR0GC87RH29WGFKQNJS94LE65RW98SQQQQQQQSZ2AQSCQSQQQQQQQZYQPQXZRZH4CAW7E3GENWTLDTXNTZJ0KTFL7MHF2LH4FJ8H7HNKVTVC4JYQSZ7U7UVAEEWQ42AYQX5UGP77RL95D9Y293',
      'UR:BYTES/2OF2/WDZ4928G5MLENN8JFGWM988QCZPUZQ8P64N34EWP3C3TTQRR4C7QH86JMF/YSP5YVTPDNL3ZG8X2895WVZYQGS9980HLVW7QEG5V8YHAJLZJ5TDHWNSH6HRZ34QHQHJSYSL0E23G7GZYPAXMSVNDXD2GYE597LSU89DYW2RYTTLXP0H4UR4VTMPQHPH3AHTYQFZQGPA2ZT4P9LSMZRA78553AK69W7YSNQ7CPU6Z3FV4GNDDENLP7SDWKJGXPZSYGGQE92QKSFSXCNM9DPLZN6Q2ZZVKPH69V6V286MQF4TQCJHGHTYPKFSYGPMJWN46M4FEV50CTXZFLPLT6ZXQJPSMN9PRUJCTWCWGXRXZYJAVQQSZP282GSS9AEACEMNJUP246GQDFCSRAU87TG62G5TZFQRGGCKZM8LZYSWV5WTYYPA2ZT4P9LSMZRA78553AK69W7YSNQ7CPU6Z3FV4GNDDENLP7SDWKJJ4C3QVQHH8HR8WWTS92HFQP48ZQ0HSLEDRFFZ3VFYQDPRZCTVLUGJPEJ3EVWDXL4D3QCQQQYQQQQQPQQQQQQGQQSQQZQQQQQQQQQQQQQQYGRQ84GFW5YH7RVG0HC7JJ8KMG4MCJZVRMQ8NG299J4ZD4HX0U86P466RSTGM4SRXQQQPQQQQQQGQQQQQZQQYQQQSQQQQQQQQQQQQQQQQQK820JL',
    ]);

    const psbtFromCobo = bitcoin.Psbt.fromHex(payload);
    psbt.combine(psbtFromCobo);
    assert.strictEqual(psbt.data.inputs[0].partialSig.length, 2);

    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbt), 2);

    const tx2 = psbt.finalizeAllInputs().extractTransaction();
    assert.strictEqual(
      tx2.toHex(),
      '0200000000010196d35e9f8f176e83895a3fe9595a6245dfbab28d6ab67b3792fd5de22e1f6b6600000000000000008001207f010000000000160014fdc3de5975a8f9e7d6bc0352fb854083f8b784b104004730440220529df7fb1de0651461c97ecbe29516dbba70beae3146a0b82f28121f7e55147902207a6dc193699aa413342fbf0e1cad2394322d7f305f7af07562f6105c378f6eb201483045022100c9540b41303627b2b43f14f405084cb06fa2b34c51f5b026ab0625745d640d9302203b93a75d6ea9cb28fc2cc24fc3f5e84604830dcca11f2585bb0e418661125d600147522102f73dc67739702aae9006a7101f787f2d1a5228b124034231616cff1120e651cb2103d50975097f0d887df1e948f6da2bbc484c1ec079a1452caa26d6e67f0fa0d75a52ae00000000',
    );

    // to be precise in that case we dont need combine, we could just do:
    // psbtFromCobo.finalizeAllInputs().extractTransaction().toHex()
  });

  it('can cosign PSBT that was created somewhere else (1 sig)', async () => {
    const path = "m/48'/0'/0'/2'";
    const walletWithNoKeys = new MultisigHDWallet();
    walletWithNoKeys.addCosigner(Zpub1, fp1cobo);
    walletWithNoKeys.addCosigner(Zpub2, fp2coldcard);
    walletWithNoKeys.setDerivationPath(path);
    walletWithNoKeys.setM(2);

    const utxos = [
      {
        height: 666,
        value: 100000,
        address: 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85',
        txId: '666b1f2ee25dfd92377bb66a8db2badf45625a59e93f5a89836e178f9f5ed396',
        vout: 0,
        txid: '666b1f2ee25dfd92377bb66a8db2badf45625a59e93f5a89836e178f9f5ed396',
        amount: 100000,
        wif: false,
        confirmations: 0,
        script: { length: 107 }, // incorrect value so old tests pass. in reality its calculated on the fly
        txhex:
          '02000000000101b67e455069a0f44c9df4849ee1167b06c26f8478daefa9c8aeedf1da3d7d81860f000000000000008002a08601000000000022002030862bd71d77b314666e5fdab34d6293ecb4ffdbba55fbd5323dfd79d98b662b04b005000000000016001461e37702582ecf8c87c1eb5008f2afb17acc9d3c02473044022077268bb0f3060b737b657c3c990107be5db41fd311cc64abeab96cff621146fc0220766e2409c0669020ea2160b358037fdb17f49e59faf8e9c50ac946019be079e6012103c3ed17035033b2cb0ce03694d402c37a307f0eea2b909b0272816bfcea83714f00000000',
      },
    ];

    const { psbt } = walletWithNoKeys.createTransaction(
      utxos,
      [{ address: 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85' }], // sendMax
      1,
      walletWithNoKeys._getInternalAddressByIndex(0), // there should be no change in this tx
      false,
      false,
    );
    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAF4CAAAAAZbTXp+PF26DiVo/6VlaYkXfurKNarZ7N5L9XeIuH2tmAAAAAAAAAACAAeCFAQAAAAAAIgAgMIYr1x13sxRmbl/as01ik+y0/9u6VfvVMj39edmLZisAAAAAAAEA6gIAAAAAAQG2fkVQaaD0TJ30hJ7hFnsGwm+EeNrvqciu7fHaPX2Bhg8AAAAAAAAAgAKghgEAAAAAACIAIDCGK9cdd7MUZm5f2rNNYpPstP/bulX71TI9/XnZi2YrBLAFAAAAAAAWABRh43cCWC7PjIfB61AI8q+xesydPAJHMEQCIHcmi7DzBgtze2V8PJkBB75dtB/TEcxkq+q5bP9iEUb8AiB2biQJwGaQIOohYLNYA3/bF/SeWfr46cUKyUYBm+B55gEhA8PtFwNQM7LLDOA2lNQCw3owfw7qK5CbAnKBa/zqg3FPAAAAAAEBK6CGAQAAAAAAIgAgMIYr1x13sxRmbl/as01ik+y0/9u6VfvVMj39edmLZisBBUdSIQL3PcZ3OXAqrpAGpxAfeH8tGlIosSQDQjFhbP8RIOZRyyED1Ql1CX8NiH3x6Uj22iu8SEwewHmhRSyqJtbmfw+g11pSriIGAvc9xnc5cCqukAanEB94fy0aUiixJANCMWFs/xEg5lHLHNN+rYgwAACAAAAAgAAAAIACAACAAAAAAAAAAAAiBgPVCXUJfw2IffHpSPbaK7xITB7AeaFFLKom1uZ/D6DXWhwWjdYDMAAAgAAAAIAAAACAAgAAgAAAAAAAAAAAAAA=',
    );

    assert.throws(() => psbt.finalizeAllInputs()); // as it is not fully signed yet
    walletWithNoKeys.cosignPsbt(psbt); // should do nothing, we have no keys
    assert.strictEqual(walletWithNoKeys.calculateHowManySignaturesWeHaveFromPsbt(psbt), 0);

    const walletWithFirstKey = new MultisigHDWallet();
    walletWithFirstKey.addCosigner(Zpub1, fp1cobo);
    walletWithFirstKey.addCosigner(process.env.MNEMONICS_COLDCARD, false, path);
    walletWithFirstKey.setDerivationPath(path);
    walletWithFirstKey.setM(2);

    walletWithFirstKey.cosignPsbt(psbt); // <-------------------------------------------------------------------------

    assert.strictEqual(walletWithFirstKey.calculateHowManySignaturesWeHaveFromPsbt(psbt), 1);
    assert.throws(() => psbt.finalizeAllInputs()); // as it is not fully signed yet

    walletWithFirstKey.cosignPsbt(psbt); // should do nothing, we already cosigned with this key
    assert.strictEqual(walletWithFirstKey.calculateHowManySignaturesWeHaveFromPsbt(psbt), 1); // didnt change

    const walletWithSecondKey = new MultisigHDWallet();
    walletWithSecondKey.addCosigner(process.env.MNEMONICS_COBO);
    walletWithSecondKey.addCosigner(Zpub2, fp2coldcard);
    walletWithSecondKey.setDerivationPath(path);
    walletWithSecondKey.setM(2);

    const { tx } = walletWithSecondKey.cosignPsbt(psbt); // <---------------------------------------------------------

    assert.strictEqual(walletWithFirstKey.calculateHowManySignaturesWeHaveFromPsbt(psbt), 2);
    assert.ok(tx);
    assert.throws(() => psbt.finalizeAllInputs()); // as it is already finalized
    assert.ok(tx.toHex());
  });

  it('can cosign PSBT that comes from electrum', async () => {
    const wallet = new MultisigHDWallet();
    wallet.setSecret(
      'Name: Multisig Vault\n' +
        'Policy: 2 of 2\n' +
        "Derivation: m/48'/0'/0'/2'\n" +
        'Format: P2WSH\n' +
        '\n' +
        '00000000: Zpub6yjw2xcmSY3uD1KbYLnrSuP2PaxDXajA1YymjzstkZCGnBX3Z1oC6dVFtA1TQNPoTaguixnjYfRK3edDDoP3xxJZSSv1S9NrG5zqK5YzKHE\n' +
        '\n' +
        'seed: point match rack notable poverty welcome slice stem warfare later skirt dream',
    );

    const psbt = bitcoin.Psbt.fromBase64(
      'cHNidP8BAHsCAAAAAn99yxH8deILgpB2qT23xRUvfnu8v98JSREOvhP5SFhHAAAAAAD9////2NGbHPsAqZoKkO+PsxfYuLT9pN8T5/LtHnQnStXsyWsAAAAAAP3///8B2LECAAAAAAAWABTNx1+3yJfKJVcFfHn3KBn9EVdBLmIkCgAAAQDrAgAAAAABAdjRmxz7AKmaCpDvj7MX2Li0/aTfE+fy7R50J0rV7MlrAQAAAAAAAACAAqCGAQAAAAAAIgAgNjviJkwSkV3MVJI0X8KnLUc+MfW/d4EQvWgykrvTwHDeDAIAAAAAABYAFGPIzN0T0b+DfXhLYiOUdT2c5pEBAkgwRQIhAIyPdquXeaHAXL7PpaYt5+G9rl0lLXMPaDM2u9fVuCp4AiA7EIZQm8bIdC4Z+oWtXh0xCKSvTgiwDQWGsQ2kMC2+LwEhA7+3G393F7pqELKBkYzEka2iEvVsLpGjdTvVuP6nufrLAAAAACICA6qDyEv6617qV3VEJoGIQowgTguor7GTI1qOYIz/M6PpRzBEAiBN+gF6Xa7PO1/NbL7K8Nqa3W5vPiuaAov6v+7zjTNDlgIgf9jYQ76Hf4xoOBdveYCyaOeoq+jwXN05nvJlVgZFngkBAQVHUiEDWcyClcxZ8xFXyF1LM8kiGaXqdqM3aHgKK2/Di976NAohA6qDyEv6617qV3VEJoGIQowgTguor7GTI1qOYIz/M6PpUq4iBgNZzIKVzFnzEVfIXUszySIZpep2ozdoeAorb8OL3vo0CgyRUA3SAAAAAAEAAAAiBgOqg8hL+ute6ld1RCaBiEKMIE4LqK+xkyNajmCM/zOj6RCvgJIDAQAAgAAAAAABAAAAAAEA6wIAAAAAAQHWV2FCU0XMuya/nkpDw/yIOK7U3NehUDZmechoTJQFlQEAAAAAAAAAgAKghgEAAAAAACIAIJi9hmdhYfHNmOEaEADqxlNRmtsZIU/NisM8/b4UVU67JqUDAAAAAAAWABSOkTpoURBU5UZG1VIoBj+EHlF6cgJIMEUCIQCJjUIn/LFJNknngMXEfHUNegppt/olh+2RCYGDZ/yw7AIgLw7SwWCaZvHB8PwMj+9F4Rjhvmq4BZ7gozr7tQZMOY0BIQN3F33l/rnJgyIJQHHYEwfxCympfDiFZ8rV76gttJdnLwAAAAAiAgKk1ZQ+v8BXIY1q1aQcRA1Qy6XQVrrhXEcWtXrOvOzf8kcwRAIgPYRi8+wJVym+EF3LNyOylj1RcdPzMiLxKRqlVm64IUgCIH1JVGxAIvmwKpg1TqlvbeXZbUMCjnr7CkYWqxBqghLfAQEFR1IhAqTVlD6/wFchjWrVpBxEDVDLpdBWuuFcRxa1es687N/yIQPo29i9fz5IsDSF1lSMDBbhehw+ydEhNYmjujZiSfyQD1KuIgYCpNWUPr/AVyGNatWkHEQNUMul0Fa64VxHFrV6zrzs3/IQr4CSAwEAAIAAAAAAAAAAACIGA+jb2L1/PkiwNIXWVIwMFuF6HD7J0SE1iaO6NmJJ/JAPDJFQDdIAAAAAAAAAAAAA',
    );
    assert.strictEqual(wallet.calculateHowManySignaturesWeHaveFromPsbt(psbt), 1);

    const { tx } = wallet.cosignPsbt(psbt); // <---------------------------------------------------------

    assert.strictEqual(wallet.calculateHowManySignaturesWeHaveFromPsbt(psbt), 2);
    assert.ok(tx);
    assert.throws(() => psbt.finalizeAllInputs()); // as it is already finalized
    assert.ok(tx.toHex());
  });

  it('can export/import when one of cosigners is mnemonic seed', async () => {
    const path = "m/48'/0'/0'/2'";

    const w = new MultisigHDWallet();
    w.addCosigner(Zpub1, fp1cobo);
    w.addCosigner(process.env.MNEMONICS_COLDCARD, false, path);
    w.setDerivationPath(path);
    w.setM(2);

    assert.ok(w.getID());

    const w2 = new MultisigHDWallet();
    w2.setSecret(w.getSecret());
    assert.strictEqual(w2.getID(), w.getID());

    assert.strictEqual(w._getExternalAddressByIndex(0), w2._getExternalAddressByIndex(0));
    assert.strictEqual(w._getExternalAddressByIndex(1), w2._getExternalAddressByIndex(1));
    assert.strictEqual(w._getInternalAddressByIndex(0), w2._getInternalAddressByIndex(0));
    assert.strictEqual(w._getInternalAddressByIndex(1), w2._getInternalAddressByIndex(1));
    assert.strictEqual(w.getM(), w2.getM());
    assert.strictEqual(w.getN(), w2.getN());
    assert.strictEqual(w.getDerivationPath(), w2.getDerivationPath());
    assert.strictEqual(w.getCosigner(1), w2.getCosigner(1));
    assert.strictEqual(w.getCosigner(2), w2.getCosigner(2));
    assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), w2.getCosignerForFingerprint(fp1cobo));
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), w2.getCosignerForFingerprint(fp2coldcard));
    assert.strictEqual(w.getCustomDerivationPathForCosigner(1), w2.getCustomDerivationPathForCosigner(1));
    assert.strictEqual(w.getCustomDerivationPathForCosigner(2), w2.getCustomDerivationPathForCosigner(2));
    assert.strictEqual(w.howManySignaturesCanWeMake(), w2.howManySignaturesCanWeMake());
    assert.strictEqual(w.isNativeSegwit(), w2.isNativeSegwit());
    assert.strictEqual(w.isWrappedSegwit(), w2.isWrappedSegwit());
    assert.strictEqual(w.isLegacy(), w2.isLegacy());
    assert.strictEqual(w.getLabel(), w2.getLabel());
  });

  it('can import txt from Cobo and export it back', async () => {
    const path = "m/48'/0'/0'/2'";

    // can work with same secret win different formats: as TXT and as same TXT encoded in UR:
    const secrets = [
      txtFileFormatMultisigNativeSegwit,
      Buffer.from(decodeUR([txtFileFormatMultisigNativeSegwit]), 'hex').toString(),
      txtFileFormatMultisigNativeSegwit.toLowerCase(),
      txtFileFormatMultisigNativeSegwit.toUpperCase(),
    ];

    for (const secret of secrets) {
      const w = new MultisigHDWallet();
      w.setSecret(secret);

      assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85');
      assert.strictEqual(w._getExternalAddressByIndex(1), 'bc1qvwd2d7r46j7u9qyxpedfhe5p075sxuhzd0n6napuvvhq2u5nrmqs9ex90q');
      assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1qtah0p50d4qlftn049k7lldcwh7cs3zkjy9g8xegv63p308hsh9zsf5567q');
      assert.strictEqual(w._getInternalAddressByIndex(1), 'bc1qv84pedzkqz2p4sd2dxm9krs0tcfatqcn73nndycaky9qttczj9qq3az9ma');
      assert.strictEqual(w.getM(), 2);
      assert.strictEqual(w.getN(), 2);
      assert.strictEqual(w.getDerivationPath(), path);
      assert.strictEqual(w.getCosigner(1), Zpub1);
      assert.strictEqual(w.getCosigner(2), Zpub2);
      assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), Zpub1);
      assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), Zpub2);
      assert.strictEqual(w.getCustomDerivationPathForCosigner(1), path); // default since custom was not provided
      assert.strictEqual(w.getCustomDerivationPathForCosigner(2), path); // default since custom was not provided
      assert.strictEqual(w.howManySignaturesCanWeMake(), 0);
      assert.strictEqual(w.getLabel(), 'CV_33B5B91A_2-2');

      const w2 = new MultisigHDWallet();
      w2.setSecret(w.getSecret());

      assert.strictEqual(w._getExternalAddressByIndex(0), w2._getExternalAddressByIndex(0));
      assert.strictEqual(w._getExternalAddressByIndex(1), w2._getExternalAddressByIndex(1));
      assert.strictEqual(w._getInternalAddressByIndex(0), w2._getInternalAddressByIndex(0));
      assert.strictEqual(w._getInternalAddressByIndex(1), w2._getInternalAddressByIndex(1));
      assert.strictEqual(w.getM(), w2.getM());
      assert.strictEqual(w.getN(), w2.getN());
      assert.strictEqual(w.getDerivationPath(), w2.getDerivationPath());
      assert.strictEqual(w.getCosigner(1), w2.getCosigner(1));
      assert.strictEqual(w.getCosigner(2), w2.getCosigner(2));
      assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), w2.getCosignerForFingerprint(fp1cobo));
      assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), w2.getCosignerForFingerprint(fp2coldcard));
      assert.strictEqual(w.getCustomDerivationPathForCosigner(1), w2.getCustomDerivationPathForCosigner(1)); // default since custom was not provided
      assert.strictEqual(w.getCustomDerivationPathForCosigner(2), w2.getCustomDerivationPathForCosigner(2)); // default since custom was not provided
      assert.strictEqual(w.howManySignaturesCanWeMake(), w2.howManySignaturesCanWeMake());
      assert.strictEqual(w.isNativeSegwit(), w2.isNativeSegwit());
      assert.strictEqual(w.isWrappedSegwit(), w2.isWrappedSegwit());
      assert.strictEqual(w.isLegacy(), w2.isLegacy());
      assert.strictEqual(w.getLabel(), w2.getLabel());
    }
  });

  it('can import txt with custom paths per each cosigner (and export it back)', async () => {
    const secret =
      '# CoboVault Multisig setup file (created on D37EAD88)\n' +
      '#\n' +
      'Name: CV_33B5B91A_2-2\n' +
      'Policy: 2 of 2\n' +
      'Format: P2WSH\n' +
      '\n' +
      "# derivation: m/47'/0'/0'/1'\n" +
      'D37EAD88: Zpub74ijpfhERJNjhCKXRspTdLJV5eoEmSRZdHqDvp9kVtdVEyiXk7pXxRbfZzQvsDFpfDHEHVtVpx4Dz9DGUWGn2Xk5zG5u45QTMsYS2vjohNQ\n' +
      '\n' +
      "# derivation: m/46'/0'/0'/1'\n" +
      '168DD603: Zpub75mAE8EjyxSzoyPmGnd5E6MyD7ALGNndruWv52xpzimZQKukwvEfXTHqmH8nbbc6ccP5t2aM3mws3pKYSnKpKMMytdbNEZFUxKzztYFM8Pn\n';

    const w = new MultisigHDWallet();
    w.setSecret(secret);

    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85');
    assert.strictEqual(w._getExternalAddressByIndex(1), 'bc1qvwd2d7r46j7u9qyxpedfhe5p075sxuhzd0n6napuvvhq2u5nrmqs9ex90q');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1qtah0p50d4qlftn049k7lldcwh7cs3zkjy9g8xegv63p308hsh9zsf5567q');
    assert.strictEqual(w._getInternalAddressByIndex(1), 'bc1qv84pedzkqz2p4sd2dxm9krs0tcfatqcn73nndycaky9qttczj9qq3az9ma');
    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 2);
    assert.strictEqual(w.getCustomDerivationPathForCosigner(1), "m/47'/0'/0'/1'");
    assert.strictEqual(w.getCustomDerivationPathForCosigner(2), "m/46'/0'/0'/1'");
    assert.strictEqual(w.getDerivationPath(), '');
    assert.strictEqual(w.getCosigner(1), Zpub1);
    assert.strictEqual(w.getCosigner(2), Zpub2);
    assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), Zpub1);
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), Zpub2);
    assert.strictEqual(w.howManySignaturesCanWeMake(), 0);

    const utxos = [
      {
        height: 666,
        value: 100000,
        address: 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85',
        txId: '666b1f2ee25dfd92377bb66a8db2badf45625a59e93f5a89836e178f9f5ed396',
        vout: 0,
        txid: '666b1f2ee25dfd92377bb66a8db2badf45625a59e93f5a89836e178f9f5ed396',
        amount: 100000,
        wif: false,
        confirmations: 0,
        txhex:
          '02000000000101b67e455069a0f44c9df4849ee1167b06c26f8478daefa9c8aeedf1da3d7d81860f000000000000008002a08601000000000022002030862bd71d77b314666e5fdab34d6293ecb4ffdbba55fbd5323dfd79d98b662b04b005000000000016001461e37702582ecf8c87c1eb5008f2afb17acc9d3c02473044022077268bb0f3060b737b657c3c990107be5db41fd311cc64abeab96cff621146fc0220766e2409c0669020ea2160b358037fdb17f49e59faf8e9c50ac946019be079e6012103c3ed17035033b2cb0ce03694d402c37a307f0eea2b909b0272816bfcea83714f00000000',
      },
    ];

    const { psbt: psbt2 } = w.createTransaction(
      utxos,
      [{ address: 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85', value: 10000 }],
      1,
      w._getInternalAddressByIndex(3),
      false,
      false,
    );

    assert.strictEqual(psbt2.data.outputs[1].bip32Derivation[0].path, "m/47'/0'/0'/1'" + '/1/3');
    assert.strictEqual(psbt2.data.outputs[1].bip32Derivation[1].path, "m/46'/0'/0'/1'" + '/1/3');

    assert.strictEqual(psbt2.data.inputs[0].bip32Derivation[0].path, "m/47'/0'/0'/1'/0/0");
    assert.strictEqual(psbt2.data.inputs[0].bip32Derivation[1].path, "m/46'/0'/0'/1'/0/0");

    // testing that custom paths survive export/import

    const w2 = new MultisigHDWallet();
    w2.setSecret(w.getSecret());

    assert.strictEqual(w._getExternalAddressByIndex(0), w2._getExternalAddressByIndex(0));
    assert.strictEqual(w._getExternalAddressByIndex(1), w2._getExternalAddressByIndex(1));
    assert.strictEqual(w._getInternalAddressByIndex(0), w2._getInternalAddressByIndex(0));
    assert.strictEqual(w._getInternalAddressByIndex(1), w2._getInternalAddressByIndex(1));
    assert.strictEqual(w.getM(), w2.getM());
    assert.strictEqual(w.getN(), w2.getN());
    assert.strictEqual(w.getDerivationPath(), w2.getDerivationPath());
    assert.strictEqual(w.getCosigner(1), w2.getCosigner(1));
    assert.strictEqual(w.getCosigner(2), w2.getCosigner(2));
    assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), w2.getCosignerForFingerprint(fp1cobo));
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), w2.getCosignerForFingerprint(fp2coldcard));
    assert.strictEqual(w.getCustomDerivationPathForCosigner(1), w2.getCustomDerivationPathForCosigner(1));
    assert.strictEqual(w.getCustomDerivationPathForCosigner(2), w2.getCustomDerivationPathForCosigner(2));
    assert.strictEqual(w.howManySignaturesCanWeMake(), w2.howManySignaturesCanWeMake());
    assert.strictEqual(w.getLabel(), w2.getLabel());
  });

  it('can import incomplete wallet from Coldcard', async () => {
    const Zpub2 = 'Zpub75mAE8EjyxSzoyPmGnd5E6MyD7ALGNndruWv52xpzimZQKukwvEfXTHqmH8nbbc6ccP5t2aM3mws3pKYSnKpKMMytdbNEZFUxKzztYFM8Pn';

    const w = new MultisigHDWallet();
    w.setSecret(coldcardExport);

    assert.throws(() => w._getExternalAddressByIndex(0));
    assert.throws(() => w._getInternalAddressByIndex(0));

    assert.strictEqual(w.getM(), 0); // zero means unknown
    assert.strictEqual(w.getN(), 1); // added only one cosigner
    assert.strictEqual(w.getCosigner(1), Zpub2);
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), Zpub2);
    assert.strictEqual(w.getDerivationPath(), ''); // unknown
  });

  it('can import electrum json file format', () => {
    assert.strictEqual(MultisigHDWallet.ckccXfp2fingerprint(64392470), '168DD603');
    assert.strictEqual(MultisigHDWallet.ckccXfp2fingerprint('64392470'), '168DD603');
    assert.strictEqual(MultisigHDWallet.ckccXfp2fingerprint(2389277556), '747B698E');
    assert.strictEqual(MultisigHDWallet.ckccXfp2fingerprint(1130956047), '0F056943');
    assert.strictEqual(MultisigHDWallet.ckccXfp2fingerprint(2293071571), 'D37EAD88');

    const w = new MultisigHDWallet();
    w.setSecret(electumJson);

    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 2);
    assert.strictEqual(w.getCustomDerivationPathForCosigner(1), "m/48'/1'/0'/1'");
    assert.strictEqual(w.getCustomDerivationPathForCosigner(2), "m/48'/1'/0'/1'");
    assert.strictEqual(w.getCosigner(1), Zpub1);
    assert.strictEqual(w.getCosigner(2), Zpub2);
    assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), Zpub1);
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), Zpub2);
    assert.strictEqual(w.howManySignaturesCanWeMake(), 0);
    assert.ok(w.isNativeSegwit());
    assert.ok(!w.isWrappedSegwit());
    assert.ok(!w.isLegacy());

    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85');
    assert.strictEqual(w._getExternalAddressByIndex(1), 'bc1qvwd2d7r46j7u9qyxpedfhe5p075sxuhzd0n6napuvvhq2u5nrmqs9ex90q');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1qtah0p50d4qlftn049k7lldcwh7cs3zkjy9g8xegv63p308hsh9zsf5567q');
    assert.strictEqual(w._getInternalAddressByIndex(1), 'bc1qv84pedzkqz2p4sd2dxm9krs0tcfatqcn73nndycaky9qttczj9qq3az9ma');
  });

  it('can import electrum json file format with seeds', () => {
    const json = require('./fixtures/electrum-multisig-wallet-with-seed.json');
    delete json['x1/'].xpub;
    const json2 = JSON.parse(JSON.stringify(json)); // full copy
    delete json2['x1/'].seed;
    const secrets = [
      JSON.stringify(json),
      JSON.stringify(json2), // has only xprv
    ];

    for (const s of secrets) {
      const w = new MultisigHDWallet();
      w.setSecret(s);

      assert.strictEqual(w.getM(), 2);
      assert.strictEqual(w.getN(), 3);

      assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qkzg22vej70cqnrlsxcee9nfnstcr70jalvsmjn0c8rjf0klwyydsk8nggs');
      assert.strictEqual(w._getExternalAddressByIndex(1), 'bc1q2mkhkvx9l7aqksvyf0dwd2x4yn8qx2w3sythjltdkjw70r8hsves2evfg6');
      assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1qqj0zx85x3d2frn4nmdn32fgskq5c2qkvk9sukxp3xsdzuf234mds85w068');
      assert.strictEqual(w._getInternalAddressByIndex(1), 'bc1qwpxkr4ac7fyp6y8uegfpqa6phyqex3vdf5mwwrfayrp8889adpgszge8m5');

      if (JSON.parse(s)['x1/'].seed) {
        assert.strictEqual(w.howManySignaturesCanWeMake(), 1);
      } else {
        assert.strictEqual(w.howManySignaturesCanWeMake(), 0);
      }

      assert.ok(w.isNativeSegwit());
      assert.ok(!w.isWrappedSegwit());
      assert.ok(!w.isLegacy());

      assert.strictEqual(w.getCustomDerivationPathForCosigner(1), "m/1'");
      assert.strictEqual(w.getCustomDerivationPathForCosigner(2), "m/1'");

      assert.strictEqual(w.getFingerprint(1), '8aaa5d05'.toUpperCase());
      assert.strictEqual(w.getFingerprint(2), 'ef748d2c'.toUpperCase());
      assert.strictEqual(w.getFingerprint(3), 'fdb6c4d8'.toUpperCase());

      const utxos = [
        {
          height: 666,
          value: 100000,
          address: 'bc1q2mkhkvx9l7aqksvyf0dwd2x4yn8qx2w3sythjltdkjw70r8hsves2evfg6',
          txId: 'c097161e8ae3b12ae2c90da95ade1185e368269a861ea9a8da023714d6fea31e',
          vout: 0,
          txid: 'c097161e8ae3b12ae2c90da95ade1185e368269a861ea9a8da023714d6fea31e',
          amount: 100000,
          wif: false,
          script: { length: 107 }, // incorrect value so old tests pass. in reality its calculated on the fly
          confirmations: 666,
          txhex:
            '020000000001021b43a3a3ba5ff4a23538cc2703fd8346a36431ea471a3f4dd5f0cd7f94f5c15d010000001716001426458e62e6e3c6c86f337a01419b033b19296fafffffffff058afa9f432909398bb960056ad94d25d750ebe363edb61580fa1e995ab9e70b00000000171600149807251b3dffaf026fa29efd0f33d4f3bc853105ffffffff02102700000000000022002056ed7b30c5ffba0b41844bdae6a8d524ce0329d18117797d6db49de78cf78333000300000000000017a91498a34ffa21c4b810eee5cb94cd038a9c1979aa81870247304402204e90bd4bc06f5de27c0c78bbdbcf14d18eee39c2341c8cbdd6d30c172bd83fb2022058a37442adb49f745b07c0f9cf8a06144f103856976356b2a782b5916c95728b012103a9acc34fc8e68e19bee16ca356c597c8f6336d319471dddf86dfd4e28d17264702483045022100fef44f4645da1718363fbe3a7ffde8460faa3d7ca02c9437ab4fed2cf0724cf50220575ce1b64846ffb44b5868092072727b08465d2b8884aecf25e5526f9b536e88012103c3f029468e9fd9741b26228bb71f730e24f55a7569de1f84f1e9826396999bcd00000000',
        },
      ];
      const { psbt, tx } = w.createTransaction(
        utxos,
        [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS' }],
        1,
        w._getInternalAddressByIndex(3),
        false,
        false,
      );
      assert.ok(psbt);
      assert.ok(!tx);
    }
  });

  it('can import electrum json file format with seeds and passphrase', () => {
    const json = require('./fixtures/electrum-multisig-wallet-with-seed-and-passphrase.json');
    const w = new MultisigHDWallet();
    w.setSecret(JSON.stringify(json));

    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 2);

    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qmpyrvv6fmkv494r9qk9nllyuyngtqj62fywcl2xzessgwf9qgrssxff69u');
    assert.strictEqual(w._getExternalAddressByIndex(1), 'bc1q7n8twph2zlfw6w0p5ms9vkvj9klxqhpjy5mv5tnqpcf2pl3d3qrst2pjz7');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1q2ltyvkrs0uay39acfk4y0gmw7flghd3403p94x26tc8579t9adwsjp83yz');
    assert.strictEqual(w._getInternalAddressByIndex(1), 'bc1q24rc4v9r6fjtkrwfp4j57ufef56ez46rrpyjtdkhjpr687f5de0sa7ryv5');

    assert.ok(w.isNativeSegwit());
    assert.ok(!w.isWrappedSegwit());
    assert.ok(!w.isLegacy());

    assert.strictEqual(w.getCustomDerivationPathForCosigner(1), "m/1'");
    assert.strictEqual(w.getCustomDerivationPathForCosigner(2), "m/48'/0'/0'/2'");

    assert.strictEqual(w.getFingerprint(1), '8de7b2c3'.toUpperCase());
    assert.strictEqual(w.getFingerprint(2), '84431270'.toUpperCase());

    const utxos = [
      {
        address: 'bc1qmpyrvv6fmkv494r9qk9nllyuyngtqj62fywcl2xzessgwf9qgrssxff69u',
        amount: 68419,
        height: 0,
        txId: '2d40b967bb3a4ecd8517843d01042b0dd4227192acbe0e1ad1f1cf144a1ec0c9',
        txhex:
          '02000000000101d7bf498a92b19bab8a58260efedd7e6cd3b7713ff1e9d2603ff9f06a64f66291000000001716001440512e04b685a0cd66a03bea0896c27000c828dcffffffff01430b010000000000220020d848363349dd9952d465058b3ffc9c24d0b04b4a491d8fa8c2cc208724a040e10247304402201ad742ffee74e5ae4b3867d9818b8ad6505ca5239280138f9da3f93e4c27ee0802202918fa6034485077596bf64501ae6954371e91d250ee98f5a3c5889d4dee923e012103a681da832358050bd9b197aaa55d921f1447025b999eadb018aa67c5b8f64a0900000000',
        txid: '2d40b967bb3a4ecd8517843d01042b0dd4227192acbe0e1ad1f1cf144a1ec0c9',
        value: 68419,
        vout: 0,
        wif: false,
      },
    ];
    const { psbt } = w.createTransaction(
      utxos,
      [{ address: '39RXMPjwKwoEGJeABJvdG1N4nQAzfEgcos' }],
      1,
      w._getInternalAddressByIndex(3),
      false,
      true,
    );
    assert.ok(psbt);
    // we are using .cosignPsbt for now, because .createTransaction throws
    // Need one bip32Derivation masterFingerprint to match the HDSigner fingerprint
    // https://github.com/BlueWallet/BlueWallet/pull/2466
    const { tx } = w.cosignPsbt(psbt);
    assert.ok(tx);
  });

  it('cant import garbage', () => {
    const w = new MultisigHDWallet();
    w.setSecret('garbage');
    assert.strictEqual(w.getM(), 0);
    assert.strictEqual(w.getN(), 0);

    w.setSecret(Zpub1);
    assert.strictEqual(w.getM(), 0);
    assert.strictEqual(w.getN(), 0);

    w.setSecret(process.env.MNEMONICS_COBO);
    assert.strictEqual(w.getM(), 0);
    assert.strictEqual(w.getN(), 0);

    w.setSecret(MultisigHDWallet.seedToXpub(process.env.MNEMONICS_COLDCARD, "m/48'/0'/0'/1'"));
    assert.strictEqual(w.getM(), 0);
    assert.strictEqual(w.getN(), 0);
  });

  it('can import from caravan', () => {
    const json = JSON.stringify({
      name: 'My Multisig Wallet',
      addressType: 'P2WSH',
      network: 'mainnet',
      client: {
        type: 'public',
      },
      quorum: {
        requiredSigners: 2,
        totalSigners: 3,
      },
      extendedPublicKeys: [
        {
          name: 'Extended Public Key 1',
          bip32Path: 'Unknown (make sure you have written this down previously!)',
          xpub: 'xpub6EA866cxYyjQa2mupVnEP5mg1vU5fqkyUo97Sm6SN73KWbXAUQ78dBRTisYHJxj5cTyduxhG2Qxd6QNNjtHoHaGDR7aeUrJUvh9GfqvsRQQ',
          method: 'text',
        },
        {
          name: 'Extended Public Key 2',
          bip32Path: 'Unknown (make sure you have written this down previously!)',
          xpub: 'xpub6FCYVZAU7dofgor9fQaqyqqA9NqBAn83iQpoayuWrwBPfwiPgCXGCD7dvAG93M5MZs5VWVP7FErGA5UeiALqaPt7KV67fL9WX9bqXTyeWxb',
          method: 'text',
        },
        {
          name: 'Extended Public Key 3',
          bip32Path: 'Unknown (make sure you have written this down previously!)',
          xpub: 'xpub6EBRM9zwt7Wmkvte61c4fshZ7ZJDaZiaC27WxTkCq5hdNYPodJY4wayCvMNH4ysF944HaBoS4dVrcfhaHwowTn9TJ7EPWE8hJAZjv7gwtew',
          method: 'text',
        },
      ],
    });
    let w = new MultisigHDWallet();
    w.setSecret(json);

    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 3);
    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qnpy7c7wz6tvmhdwgyk8ka4du3s9x6uhgjal305xdatmwfa538zxsys5l0t');
    assert.strictEqual(w._getExternalAddressByIndex(1), 'bc1qvuum7egsw4r4utzart88pergghy9rp8m4j5m4s464lz6u39sn6usn89w7c');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1qatmvfj5nzh4z3njxeg8z86y592clqe7sfgvp5cpund47knnm6pxsswl2lr');
    assert.strictEqual(w._getInternalAddressByIndex(1), 'bc1qpqa9c6nkqgcruegnh8wcsr0gzc4x9y90v9k0nxr6lww0gts430zqp7wm86');
    assert.ok(!w.isWrappedSegwit());
    assert.ok(w.isNativeSegwit());
    assert.ok(!w.isLegacy());

    // take 2

    const json2 = JSON.stringify({
      name: 'My Multisig Wallet',
      addressType: 'P2WSH',
      network: 'mainnet',
      client: {
        type: 'public',
      },
      quorum: {
        requiredSigners: 2,
        totalSigners: 2,
      },
      extendedPublicKeys: [
        {
          name: 'Extended Public Key 1',
          bip32Path: 'Unknown (make sure you have written this down previously!)',
          xpub: 'xpub6EA866cxYyjQa2mupVnEP5mg1vU5fqkyUo97Sm6SN73KWbXAUQ78dBRTisYHJxj5cTyduxhG2Qxd6QNNjtHoHaGDR7aeUrJUvh9GfqvsRQQ',
          method: 'text',
        },
        {
          name: 'Extended Public Key 2',
          bip32Path: 'Unknown (make sure you have written this down previously!)',
          xpub: 'xpub6FCYVZAU7dofgor9fQaqyqqA9NqBAn83iQpoayuWrwBPfwiPgCXGCD7dvAG93M5MZs5VWVP7FErGA5UeiALqaPt7KV67fL9WX9bqXTyeWxb',
          method: 'text',
        },
      ],
      startingAddressIndex: 0,
    });

    w = new MultisigHDWallet();
    w.setSecret(json2);

    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1qtah0p50d4qlftn049k7lldcwh7cs3zkjy9g8xegv63p308hsh9zsf5567q');

    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 2);
    assert.strictEqual(w.getFingerprint(1), '00000000'); // should be fp1cobo, but stupid caravan doesnt store fp
    assert.strictEqual(w.getFingerprint(2), '00000000'); // should be fp2coldcard, but stupid caravan doesnt store fp
    assert.strictEqual(w.howManySignaturesCanWeMake(), 0);
    assert.ok(!w.isWrappedSegwit());
    assert.ok(w.isNativeSegwit());
    assert.ok(!w.isLegacy());
  });

  it('base43 works', () => {
    const electrum43TransactionString =
      '71OUKK$VH33.J1Y/K8Q8T3-F8X59N/YIO*LXY.7320F/5.KN$EG47LC*I1VP$S7FS2+.KAJR5:8$-MDQTMHA54/QT3R$JVX/WRDLONP/*TJLGIHRB.KNSGZWVUW9TOSOE6G1::..-NLQNJD-R1GNJ.HA7A1M.6CS:-60X9LR9XHHB6B1KLTX4T/EZN3$ZWW+J10-Z9QU-N9HHU$EV865ED$3JD$ZUJ6IA2Z:.WXKXTCK2:BMZFW3F+QI.GS54BN3*Q1T*3C1ESF0QA:ZOX1RLG/I/I1GPL:FPLRKAKH:KO4*U0YAK16-CGI-Z7A3EQAJ8Q484VA05FE7JO$-U.HBFWNFSFD8EGPJR*QV3YJD5SHA3BLWM+FR0*FS7M89S115/PU7:6-XW:EPL4/+7N2RFM/**Z6J*/--97OD2QWSLUE7G5F42ATP0SAV52U1GV+WZAJX$T0R:49QIDYJUKOXWX.$UUTR5596EOVK88E$ALJ-/MEML4883J5572D1-LRSXTRYL:X39U8QQ0XII09I5M3:13$U+B7V3S1+YUQM3:G+A/IH9+$.CHEOGE-3NX:OZ+H1D*N3IFC9+/ZT*S/O45QLRC';
    const hexTransactionString =
      '0100000001ac01d39c405d31d3d20b00254e84dce9838b9c280f3aa07bf77a1510d8f8779900000000fd4201004830450221009a4065d3b869f20b6e858e0722d9b511213e09dcf1b61072cccbff340c7f424e022034c42927a64fe323d8e8b76d99960322bf0664fdad9994939aedac74a32ca8c701483045022100dda3d5974ae1c06d9742c7aa5e2f789218054c60476f049300c7d4d0395819aa02201f484d7a2b4cc6186b23f54ea4099a728760d71fcc0c7a82bd056c6eaeacf3ab014cad5221020de4d18c5b852a3c1d1f1033a812b019c396b75cab2a248089b09632c7bbdda221024ee8ab3639ea02d7fac7e90078b16c06811573d7046cd06b5d1d8d7e50e0767a21025392159aaf967c2f7e1dca92b68d1b3abaf44a9d3903f7382e76f9f64e7bfa242102df269b98c7ea5bdec1aac268d6107b827163d3a0ca8bd3522279d14c46e1bf1a2103cfbf85d74dddf892b3b6f918fd36dab13cc904d9ba3c9306e9e25fe53ebde08155aeffffffff01131f0000000000001976a914e9cc1b59c97f860f5c629c23d93920da60648d0388ac00000000';
    const badString = 'invalid characters';

    assert.throws(() => {
      Base43.decode(badString);
    });
    assert.strictEqual(Base43.decode(electrum43TransactionString), hexTransactionString);
    assert.ok(
      Base43.decode(
        '8+065FQS++FH76-QX$/RI8KR6O*V+WR-I0FH.9B49H1+L6I5N1JJ$M+P:3AH:QM2QUFSRR2D1XFX+I2:WTTG3F2HL4P02O2+6JE8VYJNXP:EPJ6KPMHQEJO-I/W.6*ESN:YC6FZ24PJS/QRU0YEAKSZAZM8:$7$HI7UKPG+H:+BNRO20QPOOCI8P45/TNGX-QR.X0P*WP0TAGCHMMO-UGONFLCG2QMMIA$GU6HPNI.9TK2+X99L7GLD0$OHSX2N55/1.X8ZCRH.-06B8L+6A865PIWM8Q.*8BLD2/AY+1E2F-FH6VD+JFZC*-G*IDZQ/U-8G0UOGYV1GA6BC1N.X95R:E12L987Q$TG61X4+SR4SO*IG083GH4L77DF6FL-JAFDX/W5BR4.I*$3S*9CDIW0Z4MXWJE-R9TP-OU3T$L0RHXXV885$GJ$VMOP6DX700GU7CASZGM:-XZQ+QSFXUOE:P/OKNUEIBT.BV8G.V5GRDQ3DT-W5*L4GHD-X2WFV9940YL:4LCTAWQDL..GAD9X6H:ZU064-5MUBKG0O20ZY8FV0RX+O7IL3T3YL0CKGLYZQUYXB+.F2JNN4MV83/V70UWZA6AGSU5SVSJMYXN7RRO02IXX8*QBDCYJU2G*N7+U',
      ).startsWith('70736274'),
    );
  });

  it('can import from specter-desktop/fullynoded', () => {
    // @see https://github.com/Fonta1n3/FullyNoded/blob/master/Docs/Wallets/Wallet-Export-Spec.md
    const json = JSON.stringify({
      label: 'Multisig',
      blockheight: 649459,
      descriptor:
        'wsh(sortedmulti(2,[1104442d/48h/0h/0h/2h]xpub6ERaLLFZ3qu7X4cpiMAvSZ6UZVXJfxY5FoNvVJgai1V78DmeNHTcNVfu4cK2RmvTNXU4s1tFpGMPTwqoQ1RraE2o9iiNw2s2aHESpandSFY/0/*,[8cce63f8/48h/0h/0h/2h]xpub6FCSLcRY99737oUAnvXd1k2gSz9P4zi4gQJ8UChSPSCxCK7XS9kLzoLHKNBiR26d3ivT7w3oka9f4BepVLoQ875XzgejjbDo626R6NBUJDW/0/*,[bf27bd7b/48h/0h/0h/2h]xpub6FE9uTPh1RxPRAfFVaET75vdfdQzXKZrT7LxukkqY4KhwUm4haMSPCwERfPouG6da6uZTRCXettvYFDck7nbw6JdBztGr1VBLonWch7NpJo/0/*))#erxvm6x2',
    });
    const w = new MultisigHDWallet();
    w.setSecret(json);
    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 3);
    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1q338rmdygx0weah4pdrp9xyycxlv2t48276gk3gxmg6m7xdkkglsqgzm6mz');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1qcgn73pjlwtt6krs2u6as0kh2jp486fa0t93yyq4d7xxxc37rf24qg67ewq');
    assert.strictEqual(w.getLabel(), 'Multisig');
    assert.ok(!w.isWrappedSegwit());
    assert.ok(w.isNativeSegwit());
    assert.ok(!w.isLegacy());

    assert.strictEqual(w.getFingerprint(1), '1104442D');
    assert.strictEqual(w.getFingerprint(2), '8CCE63F8');
    assert.strictEqual(w.getFingerprint(3), 'BF27BD7B');

    assert.strictEqual(
      w.getCosigner(1),
      'xpub6ERaLLFZ3qu7X4cpiMAvSZ6UZVXJfxY5FoNvVJgai1V78DmeNHTcNVfu4cK2RmvTNXU4s1tFpGMPTwqoQ1RraE2o9iiNw2s2aHESpandSFY',
    );
    assert.strictEqual(
      w.getCosigner(2),
      'xpub6FCSLcRY99737oUAnvXd1k2gSz9P4zi4gQJ8UChSPSCxCK7XS9kLzoLHKNBiR26d3ivT7w3oka9f4BepVLoQ875XzgejjbDo626R6NBUJDW',
    );
    assert.strictEqual(
      w.getCosigner(3),
      'xpub6FE9uTPh1RxPRAfFVaET75vdfdQzXKZrT7LxukkqY4KhwUm4haMSPCwERfPouG6da6uZTRCXettvYFDck7nbw6JdBztGr1VBLonWch7NpJo',
    );

    assert.strictEqual(w.getCustomDerivationPathForCosigner(1), "m/48'/0'/0'/2'");
    assert.strictEqual(w.getCustomDerivationPathForCosigner(2), "m/48'/0'/0'/2'");
    assert.strictEqual(w.getCustomDerivationPathForCosigner(3), "m/48'/0'/0'/2'");
    assert.strictEqual(w.getDerivationPath(), '');
  });

  it('can import from specter-desktop/fullynoded (p2sh-p2wsh)', () => {
    // @see https://github.com/Fonta1n3/FullyNoded/blob/master/Docs/Wallets/Wallet-Export-Spec.md

    const secrets = [
      JSON.stringify({
        label: 'nested2of3',
        blockheight: 481824,
        descriptor:
          'sh(wsh(sortedmulti(2,[99fe7770/48h/0h/0h/1h]xpub6FEEbEaYM9pmY8rxz4g6AuaJVszwKt8g6cFg9nFWeE85EdBrGBcnhHqXAaPbQ4Hi3Xu9vijtYdYnNjERw9eSniF3235Vjde11GieeHjv7XT/0/*,[636bdad0/48h/0h/0h/1h]xpub6F67TyyWngU5rkVPxHTdmuYkaXHXeRwwVg5SsDeiPPjt6Mithh4Qzpu2yHjNa5W7nhcTbV6QaJMvppYMDSnB3SxArCkp9GvHQqpr5P17yFv/0/*,[99c90b2f/48h/0h/0h/1h]xpub6E6FyTrwmuUYeRMULXSAGvUKeP5ba6pQKVhWNuvVZFmGPnDYb9m5vP2XsSEQ4gKUGfXtLcKs4AV31vpfx2P5KuWm9co4HM3FtGov8enmJ6f/0/*)))#wy7xtlnw',
      }),
      'sh(wsh(sortedmulti(2,[99fe7770/48h/0h/0h/1h]xpub6FEEbEaYM9pmY8rxz4g6AuaJVszwKt8g6cFg9nFWeE85EdBrGBcnhHqXAaPbQ4Hi3Xu9vijtYdYnNjERw9eSniF3235Vjde11GieeHjv7XT/0/*,[636bdad0/48h/0h/0h/1h]xpub6F67TyyWngU5rkVPxHTdmuYkaXHXeRwwVg5SsDeiPPjt6Mithh4Qzpu2yHjNa5W7nhcTbV6QaJMvppYMDSnB3SxArCkp9GvHQqpr5P17yFv/0/*,[99c90b2f/48h/0h/0h/1h]xpub6E6FyTrwmuUYeRMULXSAGvUKeP5ba6pQKVhWNuvVZFmGPnDYb9m5vP2XsSEQ4gKUGfXtLcKs4AV31vpfx2P5KuWm9co4HM3FtGov8enmJ6f/0/*)))#wy7xtlnw',
    ];

    for (const secret of secrets) {
      const w = new MultisigHDWallet();
      w.setSecret(secret);
      assert.strictEqual(w.getM(), 2);
      assert.strictEqual(w.getN(), 3);
      assert.strictEqual(w._getExternalAddressByIndex(0), '3GSZaKT3LujScx6JeWejc6xjZsCDRzptsA');
      assert.strictEqual(w._getExternalAddressByIndex(1), '3GT11kStn8W6q2kj257uZqW9xEKJwPMDkw');
      assert.ok(w.getLabel() === 'nested2of3' || w.getLabel() === 'Multisig vault');
      assert.ok(w.isWrappedSegwit());
      assert.ok(!w.isNativeSegwit());
      assert.ok(!w.isLegacy());

      assert.strictEqual(w.getFingerprint(1), '99FE7770');
      assert.strictEqual(w.getFingerprint(2), '636BDAD0');
      assert.strictEqual(w.getFingerprint(3), '99C90B2F');

      assert.strictEqual(
        w.getCosigner(1),
        'xpub6FEEbEaYM9pmY8rxz4g6AuaJVszwKt8g6cFg9nFWeE85EdBrGBcnhHqXAaPbQ4Hi3Xu9vijtYdYnNjERw9eSniF3235Vjde11GieeHjv7XT',
      );
      assert.strictEqual(
        w.getCosigner(2),
        'xpub6F67TyyWngU5rkVPxHTdmuYkaXHXeRwwVg5SsDeiPPjt6Mithh4Qzpu2yHjNa5W7nhcTbV6QaJMvppYMDSnB3SxArCkp9GvHQqpr5P17yFv',
      );
      assert.strictEqual(
        w.getCosigner(3),
        'xpub6E6FyTrwmuUYeRMULXSAGvUKeP5ba6pQKVhWNuvVZFmGPnDYb9m5vP2XsSEQ4gKUGfXtLcKs4AV31vpfx2P5KuWm9co4HM3FtGov8enmJ6f',
      );

      assert.strictEqual(w.getCustomDerivationPathForCosigner(1), "m/48'/0'/0'/1'");
      assert.strictEqual(w.getCustomDerivationPathForCosigner(2), "m/48'/0'/0'/1'");
      assert.strictEqual(w.getCustomDerivationPathForCosigner(3), "m/48'/0'/0'/1'");
      assert.strictEqual(w.getDerivationPath(), '');
    }

    const ww = new MultisigHDWallet();
    ww.addCosigner('equal emotion skin exchange scale inflict half expose awkward deliver series broken');
    ww.addCosigner('spatial road snack luggage buddy media seek charge people pool neither family');
    ww.addCosigner('sing author lyrics expand ladder embody frost rapid survey similar flight unknown');
    ww.setM(2);
    ww.setDerivationPath("m/48'/0'/0'/1'");
    ww.setWrappedSegwit();
    assert.strictEqual(ww._getExternalAddressByIndex(0), '3GSZaKT3LujScx6JeWejc6xjZsCDRzptsA');
    assert.strictEqual(ww.getFingerprint(1), '99FE7770');
  });

  it('can edit cosigners', () => {
    const path = "m/48'/0'/0'/2'";

    const w = new MultisigHDWallet();
    w.addCosigner(Zpub1, fp1cobo);
    w.addCosigner(process.env.MNEMONICS_COLDCARD);
    w.setDerivationPath(path);
    w.setM(2);
    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qxzrzh4caw7e3genwtldtxntzj0ktfl7mhf2lh4fj8h7hnkvtvc4salvp85');

    assert.strictEqual(w.getCosigner(1), Zpub1);
    assert.strictEqual(w.getCosigner(2), process.env.MNEMONICS_COLDCARD);
    assert.strictEqual(w.getFingerprint(1), fp1cobo);
    assert.strictEqual(w.getFingerprint(2), fp2coldcard);
    assert.strictEqual(w.getCustomDerivationPathForCosigner(1), path);
    assert.strictEqual(w.getCustomDerivationPathForCosigner(2), path);

    assert.strictEqual(w.getCosignerForFingerprint(fp1cobo), Zpub1);
    assert.strictEqual(w.getCosignerForFingerprint(fp2coldcard), process.env.MNEMONICS_COLDCARD);
    assert.strictEqual(w.howManySignaturesCanWeMake(), 1);

    w.replaceCosignerSeedWithXpub(2);
    assert.strictEqual(w.getCosigner(2), Zpub2);
    assert.strictEqual(w.getFingerprint(2), fp2coldcard);
    assert.strictEqual(w.getCustomDerivationPathForCosigner(2), path);

    w.replaceCosignerXpubWithSeed(2, process.env.MNEMONICS_COLDCARD);
    assert.strictEqual(w.getCosigner(2), process.env.MNEMONICS_COLDCARD);
    assert.strictEqual(w.getFingerprint(2), fp2coldcard);
    assert.strictEqual(w.getCustomDerivationPathForCosigner(2), path);

    w.deleteCosigner(fp2coldcard);
    assert.ok(!w.getCosigner(2));
    assert.ok(!w.getFingerprint(2));
    assert.ok(!w.getCustomDerivationPathForCosigner(2));
    assert.strictEqual(w.getN(), 1);
    assert.strictEqual(w.getM(), 2);

    w.addCosigner(process.env.MNEMONICS_COLDCARD);
    assert.strictEqual(w.getN(), 2);
    w.deleteCosigner(fp2coldcard);
    assert.ok(!w.getCosigner(2));
    assert.ok(!w.getFingerprint(2));
    assert.ok(!w.getCustomDerivationPathForCosigner(2));
    assert.strictEqual(w.getN(), 1);
    assert.strictEqual(w.getM(), 2);

    w.addCosigner(Zpub2, fp2coldcard, path);
    assert.strictEqual(w.getN(), 2);
    w.deleteCosigner(fp2coldcard);
    assert.ok(!w.getCosigner(2));
    assert.ok(!w.getFingerprint(2));
    assert.ok(!w.getCustomDerivationPathForCosigner(2));
    assert.strictEqual(w.getN(), 1);
    assert.strictEqual(w.getM(), 2);

    w.addCosigner(
      'salon smoke bubble dolphin powder govern rival sport better arrest certain manual',
      undefined,
      undefined,
      '9WDdFSZX4d6mPxkr',
    );
    assert.strictEqual(w.getN(), 2);

    w.replaceCosignerSeedWithXpub(2);
    assert.strictEqual(
      w.getCosigner(2),
      'Zpub752NRx3S4ax3S5oLHLB2DAQx9X3Ek4EGvtsyYTpzQ2VRdXB6DjL5ZKiHhcUqfZM6M2KCVB5vSXEQ4jMosHWuF4dD5pwowfzL4fmJz5FaJHh',
    );
    assert.strictEqual(w.getFingerprint(2), '2C0908B6');
    assert.strictEqual(w.getCustomDerivationPathForCosigner(2), path);
    assert.ok(!w.getPassphrase(2));

    w.replaceCosignerXpubWithSeed(
      2,
      'salon smoke bubble dolphin powder govern rival sport better arrest certain manual',
      '9WDdFSZX4d6mPxkr',
    );
    assert.strictEqual(w.getCosigner(2), 'salon smoke bubble dolphin powder govern rival sport better arrest certain manual');
    assert.strictEqual(w.getFingerprint(2), '2C0908B6');
    assert.strictEqual(w.getCustomDerivationPathForCosigner(2), path);
    assert.strictEqual(w.getPassphrase(2), '9WDdFSZX4d6mPxkr');

    // test that after deleting cosinger with passphrase, it has been cleaned out properly
    w.deleteCosigner('2C0908B6');
    assert.ok(!w.getCosigner(2));
    assert.ok(!w.getFingerprint(2));
    assert.ok(!w.getCustomDerivationPathForCosigner(2));
    assert.ok(!w.getPassphrase(2));
    assert.strictEqual(w.getN(), 1);
    assert.strictEqual(w.getM(), 2);

    // after chaning first cosigner, make sure that he changed, not the second one
    w.replaceCosignerXpubWithSeed(1, process.env.MNEMONICS_COBO);
    assert.strictEqual(w.getCosigner(1), process.env.MNEMONICS_COBO);
    assert.strictEqual(w.getFingerprint(1), fp1cobo);
    assert.strictEqual(w.getCustomDerivationPathForCosigner(1), path);
    assert.strictEqual(w.getPassphrase(1), undefined);
  });

  it('can sign valid tx if we have more keys than quorum ("Too many signatures" error)', async () => {
    const w = new MultisigHDWallet();
    w.setSecret(
      '# BlueWallet Multisig setup file\n' +
        '# this file may contain private information\n' +
        '#\n' +
        'Name: Multisig Vault\n' +
        'Policy: 3 of 6\n' +
        "Derivation: m/48'/0'/0'/2'\n" +
        'Format: P2WSH\n' +
        '\n' +
        'seed: start local figure rose pony artist voice agent pyramid still spot walk\n' +
        '# warning! sensitive information, do not disclose ^^^ \n' +
        '\n' +
        'seed: empty fall vanish sheriff vibrant diary route lock purity noodle ripple clutch\n' +
        '# warning! sensitive information, do not disclose ^^^ \n' +
        '\n' +
        'seed: else heart suggest proof travel announce reason priority trick bargain author duty\n' +
        '# warning! sensitive information, do not disclose ^^^ \n' +
        '\n' +
        'seed: craft response kitchen column feed fitness pill loyal capital together usage either\n' +
        '# warning! sensitive information, do not disclose ^^^ \n' +
        '\n' +
        'seed: trigger zebra image engine inhale employ floor soul glimpse version extra pizza\n' +
        '# warning! sensitive information, do not disclose ^^^ \n' +
        '\n' +
        'seed: thank post talent polar hire model trophy elevator wide green hungry gossip\n' +
        '# warning! sensitive information, do not disclose ^^^',
    );

    const utxos = [
      {
        height: 662352,
        value: 100000,
        address: 'bc1qlkh0zgq5ypcdfs9rdvrucra96c5gmjgaufm0au8cglkkrah29nesrkvewg',
        txId: 'e112e3b109aff5fe76d4fde90bd3c2df58bfb250280a4404421fff42d6801fd2',
        vout: 0,
        txid: 'e112e3b109aff5fe76d4fde90bd3c2df58bfb250280a4404421fff42d6801fd2',
        amount: 100000,
        wif: false,
        confirmations: 1,
        txhex:
          '020000000001020d0f713ba314566ea9b7e7d64eb8538dd0a88826377945464e9bb25eed61d665010000000000000080f570a2bb8faff02b848a4a5b2d334324a1ccc6cebf1c1cc27e231316f579e66d01000000000000008002a086010000000000220020fdaef120142070d4c0a36b07cc0fa5d6288dc91de276fef0f847ed61f6ea2cf3d6eb060000000000160014696154a1ed38813c4c45b58ece291c1a8d9cd7d102483045022100d02ef858d129ba50aeee126e41e9cca5fa58232def7934d6705747e81bcd61a402206d2565c336cd32cb128ae9e80af60d610154af0d4e77cb60e015dead349b368b012103471950f9952608d9db6d3698b731d89387b7b55026ae020919ee7da7a2a4866d0247304402204088a68fc4654c0cedb724f6e8fe3820845d5e7184b0363806ea77f8a739f58702202bf7b3b20d6d6db28617e8edd6d0ea3870ab7e3bc62307ad77fa9717a3689bcb01210371d2366d9fc32c5a83bb78d7ced38d5e318a96dc43a18074742e567defe4585d00000000',
      },
    ];

    const { psbt, tx } = w.createTransaction(
      utxos,
      [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS' }], // sendMax
      1,
      w._getInternalAddressByIndex(0),
    );

    assert.ok(tx);
    assert.ok(psbt);

    assert.strictEqual(psbt.data.inputs.length, 1);
    assert.strictEqual(psbt.data.outputs.length, 1);
  });

  it('can sign multiple inputs', async () => {
    const w = new MultisigHDWallet();
    w.setSecret(
      '# BlueWallet Multisig setup file\n' +
        '# this file may contain private information\n' +
        '#\n' +
        'Name: Multisig Vault\n' +
        'Policy: 2 of 3\n' +
        "Derivation: m/48'/0'/0'/2'\n" +
        'Format: P2WSH\n' +
        '\n' +
        'seed: certain cruise forum ladder reveal frame company book sausage flat wasp mouse\n' +
        '# warning! sensitive information, do not disclose ^^^ \n' +
        '\n' +
        'seed: sting tumble brave remember sadness embrace increase under year joke drum skate\n' +
        '# warning! sensitive information, do not disclose ^^^ \n' +
        '\n' +
        'seed: daughter parade neck suit brick wife horror inquiry leopard exhibit body mobile\n' +
        '# warning! sensitive information, do not disclose ^^^',
    );

    const utxos = [
      {
        address: 'bc1qzwt595g0q0xauxzr4h56kw4zavfrnq3r4zkx42relm8rvwuuxyvsqndmgl',
        amount: 2120,
        confirmations: 33,
        height: 668483,
        txId: '43b2ac418539b61610c3ae2e216052d634b9b20fcece05940b5662fe5cf3f3b5',
        txhex:
          '020000000001019e590dee7124728b988e32c1daad3a550663327b3478c4f9ee15eeaf740b898f0100000017160014018958ab9e2b29b7313a39c1a62189affeac94a8ffffffff014808000000000000220020139742d10f03cdde1843ade9ab3aa2eb12398223a8ac6aa879fece363b9c311902483045022100f431ad4d213265531f600ebf242cabd3adcb7b5c27464ad080a34ce4fb4a5e5702206fad42768d29ee1121e19dc4489366d0c02a412e9d60431cac59d49642868c7b0121037a24a1d8a4e86946e89478f352bda9d6b40843e01b86af5c94b99634cbb0c6b200000000',
        txid: '43b2ac418539b61610c3ae2e216052d634b9b20fcece05940b5662fe5cf3f3b5',
        value: 2120,
        vout: 0,
        wif: false,
      },
      {
        address: 'bc1qn0j7y5hau6s8tdcpnxyyumck256lfet78ehpxdkytv5nt570dr4qxl9s3p',
        amount: 10000,
        confirmations: 1,
        height: 668515,
        txId: '3a2753147121c2ab312a419f0788cb534232d3c0bd4838de718487aca495ac7a',
        txhex:
          '02000000000101a1fba4a09a1a7ed090c64f15024de4b9008b6ec4ee5e336f0f0fc43f78022dfa01000000171600142f78bf055b26feb8f2f6b3caa5956b991c507e49ffffffff0210270000000000002200209be5e252fde6a075b70199884e6f165535f4e57e3e6e1336c45b2935d3cf68ea9a8705000000000017a91484d55f28fc28676c5f195ce649851428ec5010a3870248304502210098a970398bc40a34423d5661ecc499240bb0edb6e6bea74a752269f92e588b1b022031fcdf66c4ed8378f352a5a096c438e7a8c1415c47c119a4c69ef787e1cdf5d9012102ade0a25d66406f67dc3e4a6c8bedd989dd3ceed7a623fb4c2839a84b5262ca0900000000',
        txid: '3a2753147121c2ab312a419f0788cb534232d3c0bd4838de718487aca495ac7a',
        value: 10000,
        vout: 0,
        wif: false,
      },
    ];

    const { psbt, tx } = w.createTransaction(
      utxos,
      [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS' }], // sendMax
      6,
      w._getInternalAddressByIndex(0),
    );

    assert.ok(tx);
    assert.ok(psbt);

    assert.strictEqual(psbt.data.inputs.length, 2);
    assert.strictEqual(psbt.data.outputs.length, 1);
  });

  it('can generate proper addresses for wallets with passphrases. Export and import such wallet', () => {
    // test case from https://github.com/BlueWallet/BlueWallet/issues/3665#issuecomment-907377442
    const path = "m/48'/0'/0'/2'";
    const w = new MultisigHDWallet();
    w.addCosigner(
      'salon smoke bubble dolphin powder govern rival sport better arrest certain manual',
      undefined,
      undefined,
      '9WDdFSZX4d6mPxkr',
    );
    w.addCosigner('chaos word void picture gas update shop wave task blossom close inner', undefined, undefined, 'E5jMAzsf464Hgwns');
    w.addCosigner(
      'plate inform scissors pill asset scatter people emotion dose primary together expose',
      undefined,
      undefined,
      'RyBFfLr7weK3nDUG',
    );
    w.setDerivationPath(path);
    w.setM(2);

    assert.strictEqual(w.getPassphrase(1), '9WDdFSZX4d6mPxkr');
    assert.strictEqual(w.getPassphrase(2), 'E5jMAzsf464Hgwns');
    assert.strictEqual(w.getPassphrase(3), 'RyBFfLr7weK3nDUG');
    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1q8rks34ypj5edxx82f7z7yzy4qy6dynfhcftjs9axzr2ml37p4pfs7j4uvm');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'bc1qjpjgumzs2afrr3mk85anwdnzd9qg5hc5p6f62un4umpyf4ccde5q4cywgy');

    const w2 = new MultisigHDWallet();
    w2.setSecret(w.getSecret());

    assert.strictEqual(w._getExternalAddressByIndex(0), w2._getExternalAddressByIndex(0));
    assert.strictEqual(w._getExternalAddressByIndex(1), w2._getExternalAddressByIndex(1));
    assert.strictEqual(w.getPassphrase(1), w2.getPassphrase(1));
    assert.strictEqual(w.getPassphrase(2), w2.getPassphrase(2));
    assert.strictEqual(w.getPassphrase(3), w2.getPassphrase(3));
  });
});

describe('multisig-cosigner', () => {
  it('can parse cobo json', () => {
    const cosigner = new MultisigCosigner(
      '{"xfp":"D37EAD88","xpub":"Zpub74ijpfhERJNjhCKXRspTdLJV5eoEmSRZdHqDvp9kVtdVEyiXk7pXxRbfZzQvsDFpfDHEHVtVpx4Dz9DGUWGn2Xk5zG5u45QTMsYS2vjohNQ","path":"m\\/48\'\\/0\'\\/0\'\\/2\'"}',
    );
    assert.ok(cosigner.isValid());
    assert.strictEqual(cosigner.getFp(), fp1cobo);
    assert.strictEqual(cosigner.getXpub(), Zpub1);
    assert.strictEqual(cosigner.getPath(), "m/48'/0'/0'/2'");
    assert.strictEqual(cosigner.howManyCosignersWeHave(), 1);
    assert.ok(cosigner.isNativeSegwit());
    assert.ok(!cosigner.isLegacy());
    assert.ok(!cosigner.isWrappedSegwit());
  });

  it('can parse cobo json, if xpub is plain xpub (not Zpub or Ypub)', () => {
    let xpub = MultisigCosigner._zpubToXpub(Zpub1);
    assert.ok(xpub.startsWith('xpub'));
    let cosigner = new MultisigCosigner(`{"xfp":"${fp1cobo}","xpub":"${xpub}","path":"${MultisigHDWallet.PATH_NATIVE_SEGWIT}"}`);
    assert.ok(cosigner.isValid());
    assert.strictEqual(cosigner.getFp(), fp1cobo);
    assert.strictEqual(cosigner.getXpub(), Zpub1);
    assert.strictEqual(cosigner.getPath(), MultisigHDWallet.PATH_NATIVE_SEGWIT);
    assert.strictEqual(cosigner.howManyCosignersWeHave(), 1);
    assert.ok(cosigner.isNativeSegwit());
    assert.ok(!cosigner.isLegacy());
    assert.ok(!cosigner.isWrappedSegwit());

    //

    const Ypub1 = 'Ypub6jtUX12KGcqFosZWP4YcHc9qbKRTvgBpb8aE58hsYqby3SQVTr5KGfMmdMg38ekmQ9iLhCdgbAbjih7AWSkA7pgRhiLfah3zT6u1PFvVEbc';
    xpub = MultisigCosigner._zpubToXpub(Ypub1);
    assert.ok(xpub.startsWith('xpub'));
    cosigner = new MultisigCosigner(`{"xfp":"${fp1cobo}","xpub":"${xpub}","path":"${MultisigHDWallet.PATH_WRAPPED_SEGWIT}"}`);
    assert.ok(cosigner.isValid());
    assert.strictEqual(cosigner.getFp(), fp1cobo);
    assert.strictEqual(cosigner.getXpub(), Ypub1);
    assert.strictEqual(cosigner.getPath(), MultisigHDWallet.PATH_WRAPPED_SEGWIT);
    assert.strictEqual(cosigner.howManyCosignersWeHave(), 1);
    assert.ok(!cosigner.isNativeSegwit());
    assert.ok(!cosigner.isLegacy());
    assert.ok(cosigner.isWrappedSegwit());

    //

    xpub = MultisigCosigner._zpubToXpub(Ypub1);
    assert.ok(xpub.startsWith('xpub'));
    cosigner = new MultisigCosigner(`{"xfp":"${fp1cobo}","xpub":"${xpub}","path":"${MultisigHDWallet.PATH_LEGACY}"}`);
    assert.ok(cosigner.isValid());
    assert.strictEqual(cosigner.getFp(), fp1cobo);
    assert.strictEqual(cosigner.getXpub(), xpub);
    assert.strictEqual(cosigner.getPath(), MultisigHDWallet.PATH_LEGACY);
    assert.strictEqual(cosigner.howManyCosignersWeHave(), 1);
    assert.ok(!cosigner.isNativeSegwit());
    assert.ok(cosigner.isLegacy());
    assert.ok(!cosigner.isWrappedSegwit());
  });

  it('can parse cobo URv2 account', () => {
    let decoded = decodeUR([
      'UR:CRYPTO-ACCOUNT/OEADCYADWMTNKIAOLYTAADMETAADDLOLAOWKAXHDCLAXHPDIHNWKMYCFHNROCARHSESKLDPDSWOTMWGTJNGWIYHYYNWSOLENTSUEMKTOTAVDAAHDCXBDHHBZSBURBSMKZOECOEHHJPHTSRVACMBGHEROMYCKHHNBHFHGNBGMNYAESPNDFHAHTAADEHOEADADAOAEAMTAADDYOTADLOCSDYYKAEYKAEYKAOYKAOCYADWMTNKIAXAAAYCYLOWLDITOJTCNDTAY',
    ]);
    decoded = Buffer.from(decoded, 'hex').toString('ascii');

    const cosigner = new MultisigCosigner(decoded);
    assert.ok(cosigner.isValid());
    assert.strictEqual(
      cosigner.getXpub(),
      'Zpub756tPxxwHiYkYiT12G2WUD2cpAHyVWhjvKPbXoY5jDZSyo71yG5C14LCuwhycTTAzgTUcQfddR8FFTQ1bSWR6kzmNbMEaVzUrj4Lhxbonjo',
    );
    assert.strictEqual(cosigner.getPath(), "m/48'/0'/0'/2'");
    assert.strictEqual(cosigner.howManyCosignersWeHave(), 1);
    assert.strictEqual(cosigner.getFp(), '01EBDA7D');
  });

  it('can parse plain Zpub', () => {
    const cosigner = new MultisigCosigner(Zpub1);
    assert.ok(cosigner.isValid());
    assert.strictEqual(cosigner.getFp(), '00000000');
    assert.strictEqual(cosigner.getXpub(), Zpub1);
    assert.strictEqual(cosigner.getPath(), "m/48'/0'/0'/2'");
    assert.strictEqual(cosigner.howManyCosignersWeHave(), 1);
  });

  it('can parse wallet descriptor', () => {
    let cosigner = new MultisigCosigner(
      '[73c5da0a/48h/0h/0h/2h]Zpub74Jru6aftwwHxCUCWEvP6DgrfFsdA4U6ZRtQ5i8qJpMcC39yZGv3egBhQfV3MS9pZtH5z8iV5qWkJsK6ESs6mSzt4qvGhzJxPeeVS2e1zUG',
    );
    assert.ok(cosigner.isValid());
    assert.strictEqual(cosigner.getFp(), '73c5da0a');
    assert.strictEqual(
      cosigner.getXpub(),
      'Zpub74Jru6aftwwHxCUCWEvP6DgrfFsdA4U6ZRtQ5i8qJpMcC39yZGv3egBhQfV3MS9pZtH5z8iV5qWkJsK6ESs6mSzt4qvGhzJxPeeVS2e1zUG',
    );
    assert.strictEqual(cosigner.getPath(), "m/48'/0'/0'/2'");
    assert.strictEqual(cosigner.howManyCosignersWeHave(), 1);

    cosigner = new MultisigCosigner(
      '[73c5da0a/48h/0h/0h/2h]xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf',
    );
    assert.ok(cosigner.isValid());
    assert.strictEqual(cosigner.getFp(), '73c5da0a');
    assert.strictEqual(
      cosigner.getXpub(),
      'xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf',
    );
    assert.strictEqual(cosigner.getPath(), "m/48'/0'/0'/2'");
    assert.strictEqual(cosigner.howManyCosignersWeHave(), 1);
  });

  it('cant parse bs', () => {
    const cosigner = new MultisigCosigner('asdfasdgsqwrgqwegq');
    assert.ok(!cosigner.isValid());
    assert.strictEqual(cosigner.getFp(), false);
    assert.strictEqual(cosigner.getXpub(), false);
    assert.strictEqual(cosigner.getPath(), false);
  });

  it('can parse file from coldcard with multiple xpubs (for different formats)', () => {
    const cc =
      '{\n' +
      '  "p2sh_deriv": "m/45\'",\n' +
      '  "p2sh": "xpub6847W6cYUqq4ixcmFb83iqPtJZfnMPTkpYiCsuUybzFppJp2qzh3KCVHsLGQy4WhaxGqkK9aDDZnSfhB92PkHDKihbH6WLztzmN7WW9GYpR",\n' +
      '  "p2wsh_p2sh_deriv": "m/48\'/0\'/0\'/1\'",\n' +
      '  "p2wsh_p2sh": "Ypub6kvtvTZpqGuWtQfg9bL5xe4vDWtwsirR8LzDvsY3vgXvyncW1NGXCUJ9Ps7CiizSSLV6NnnXSYyVDnxCu26QChWzWLg5YCAHam6cYjGtzRz",\n' +
      '  "p2wsh_deriv": "m/48\'/0\'/0\'/2\'",\n' +
      '  "p2wsh": "Zpub75mAE8EjyxSzoyPmGnd5E6MyD7ALGNndruWv52xpzimZQKukwvEfXTHqmH8nbbc6ccP5t2aM3mws3pKYSnKpKMMytdbNEZFUxKzztYFM8Pn",\n' +
      '  "xfp": "168DD603"\n' +
      '}\n';

    const cosigner = new MultisigCosigner(cc);
    assert.strictEqual(cosigner.howManyCosignersWeHave(), 3);
    assert.ok(cosigner.isValid());
    assert.strictEqual(cosigner.getFp(), false);
    assert.strictEqual(cosigner.getXpub(), false);
    assert.strictEqual(cosigner.getPath(), false);

    const [c1, c2, c3] = cosigner.getAllCosigners();

    assert.strictEqual(
      c1.getXpub(),
      'xpub6847W6cYUqq4ixcmFb83iqPtJZfnMPTkpYiCsuUybzFppJp2qzh3KCVHsLGQy4WhaxGqkK9aDDZnSfhB92PkHDKihbH6WLztzmN7WW9GYpR',
    );
    assert.strictEqual(c1.getFp(), '168DD603');
    assert.strictEqual(c1.getPath(), "m/45'");

    assert.strictEqual(
      c2.getXpub(),
      'Ypub6kvtvTZpqGuWtQfg9bL5xe4vDWtwsirR8LzDvsY3vgXvyncW1NGXCUJ9Ps7CiizSSLV6NnnXSYyVDnxCu26QChWzWLg5YCAHam6cYjGtzRz',
    );
    assert.strictEqual(c2.getFp(), '168DD603');
    assert.strictEqual(c2.getPath(), "m/48'/0'/0'/1'");

    assert.strictEqual(
      c3.getXpub(),
      'Zpub75mAE8EjyxSzoyPmGnd5E6MyD7ALGNndruWv52xpzimZQKukwvEfXTHqmH8nbbc6ccP5t2aM3mws3pKYSnKpKMMytdbNEZFUxKzztYFM8Pn',
    );
    assert.strictEqual(c3.getFp(), '168DD603');
    assert.strictEqual(c3.getPath(), "m/48'/0'/0'/2'");
  });

  it('can parse files from sparrow wallet', () => {
    const secrets = [
      JSON.stringify(require('./fixtures/fromsparrow-electrum.json')),
      require('fs').readFileSync('./tests/unit/fixtures/fromsparrow-coldcard.txt', 'ascii'),
      JSON.stringify(require('./fixtures/fromsparrow-specter.json')),
    ];

    for (const s of secrets) {
      const w = new MultisigHDWallet();
      w.setSecret(s);

      assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qtysquqsjqjfqvhd6l2h470hdgwhcahs4nq2ca49cyxftwjnjt9ssh8emel');
    }
  });

  it('can export to json', () => {
    const result = MultisigCosigner.exportToJson(fp1cobo, Zpub1, "m/48'/0'/0'/2'");
    assert.strictEqual(
      result,
      '{"xfp":"D37EAD88","xpub":"Zpub74ijpfhERJNjhCKXRspTdLJV5eoEmSRZdHqDvp9kVtdVEyiXk7pXxRbfZzQvsDFpfDHEHVtVpx4Dz9DGUWGn2Xk5zG5u45QTMsYS2vjohNQ","path":"m/48\'/0\'/0\'/2\'"}',
    );

    const cosigner = new MultisigCosigner(MultisigCosigner.exportToJson(fp1cobo, Zpub1, "m/48'/0'/0'/2'"));
    assert.strictEqual(cosigner.getFp(), 'D37EAD88');
    assert.strictEqual(
      cosigner.getXpub(),
      'Zpub74ijpfhERJNjhCKXRspTdLJV5eoEmSRZdHqDvp9kVtdVEyiXk7pXxRbfZzQvsDFpfDHEHVtVpx4Dz9DGUWGn2Xk5zG5u45QTMsYS2vjohNQ',
    );
    assert.strictEqual(cosigner.getPath(), "m/48'/0'/0'/2'");
    assert.strictEqual(cosigner.isValid(), true);
    assert.strictEqual(cosigner.isNativeSegwit(), true);
    assert.strictEqual(cosigner.isWrappedSegwit(), false);
    assert.strictEqual(cosigner.isLegacy(), false);

    // using bad xpub just to check chaincode & keyhex
    const c2 = new MultisigCosigner(
      MultisigCosigner.exportToJson(
        fp1cobo,
        'zpub6qT7amLcp2exr4mU4AhXZMjD9CFkopECVhUxc9LHW8pNsJG2B9ogs5sFbGZpxEeT5TBjLmc7EFYgZA9EeWEM1xkJMFLefzZc8eigRFhKB8Q',
        "m/48'/0'/0'/2'",
      ),
    );
    assert.strictEqual(c2.getChainCodeHex(), '906730ab8a03fb4baa32a912134f2c5bfe6ae70e0264e4e9fe4b0abe3a560692');
    assert.strictEqual(c2.getKeyHex(), '0395b643f45bd89fede6f4f6416b288e73005419b48cdcd88465913bd31b4be5ea');
    assert.strictEqual(c2.getParentFingerprintHex(), '125688b1');
    assert.strictEqual(c2.getDepthNumber(), 3);
  });

  it('can export cosigner to URv2', () => {
    let result = encodeUR(MultisigCosigner.exportToJson(fp1cobo, Zpub1, "m/48'/0'/0'/2'"));
    assert.deepStrictEqual(result, [
      'ur:crypto-account/oeadcytekbpmloaolytaadmetaaddloxaxhdclaofejnolgudllagdgodyweehzsmeyasnswrpdalnwzfenbmewlrtplsklbjkvdloweaahdcxltjzjpctayfsimuogtpypffrnlisflswwzntbecabtbdwdbstojnfrahdamnpfcyamtaaddyotadlocsdyykaeykaeykaoykaocytekbpmloaxaaaycyghykhpcmkgnstevs',
    ]);

    result = encodeUR(
      MultisigCosigner.exportToJson(
        '42A2460E',
        'Ypub6m2WhkZvujztfZVYWEB4Hfcq3mKfeZYMfZj2wfvgNmTDjcCncU9ua6VSxXno7FeF8P2kqp1S7N8UoYapR8YKnMLNq8bEDDd2PU6q7QCHoEb',
        "m/48'/0'/0'/1'",
      ),
    );
    assert.deepStrictEqual(result, [
      'ur:crypto-account/oeadcyfwoefgbaaolytaadmhtaadmetaaddloxaxhdclaxsblplucfptgtwywzcmnshtotqzleihrnndtoeodrfdpfoyeyqzsbenrplbhtdymuaahdcxlgbdsrcxatcmdpuokpwzvymttatphtlftplsvlgmeeflpdtanlromhfgvekbbznyamtaaddyotadlocsdyykaeykaeykadykaocyfwoefgbaaxaaaycywsutbeuyyndacaeh',
    ]);

    result = encodeUR(
      MultisigCosigner.exportToJson(
        'ED5C5B8A',
        'xpub69dgpFkP9mFYhaAWt6svmwd1BYsuGiyyNs8sJW1GwCn8GSK69mrCmNG6ZLcrPGvBSiJzfjXD66ntgJxdqQbhMk4j273VQYHEMc5knoqFGvt',
        "m/45'",
      ),
    );
    assert.deepStrictEqual(result, [
      'ur:crypto-account/oeadcywehhhpleaolytaadmhtaaddloxaxhdclaoamutctbahthnislelbwemnkeoefnhddienfetbpygrpaqdkemyrywyldaspyjkdtaahdcxhyneskwdhlehlfbwrpdnjlgsgakplkjtknvyttsgolnnlbwlcagoolcpfgsglkinamtaaddyotadlfcsdpykaocywehhhpleaxadaycywehhhplekpdwveih',
    ]);
  });
});
