/**
 * Investigation for https://github.com/BlueWallet/BlueWallet/issues/8803
 *
 * Reporter: multi-UTXO PSBTs sign OK on SeedSigner / AirGap Vault, but BlueWallet rejects
 * the signed PSBT on import. Also notes UI fee ≠ fee implied by exported PSBT.
 *
 * Findings from these unit tests (synthetic mnemonic + fake UTXOs):
 *   - REJECTION NOT REPRODUCED: WatchOnlyWallet.combinePsbt accepts SeedSigner-trimmed
 *     multi-input PSBTs signed by @scure/btc-signer, bitcoinjs, and embit (SeedSigner’s lib),
 *     including UR:CRYPTO-PSBT roundtrip and bare-zpub (zero fingerprint) wallets.
 *   - FEE MISMATCH was caused by SendDetails calling WatchOnlyWallet.coinselect while
 *     createTransaction used _hdWalletInstance.coinselect. Fixed by delegating coinselect
 *     to the HD instance and syncing segwitType in WatchOnlyWallet.init().
 *
 * SeedSigner firmware signs via embit `psbt.sign_with(root)` then `PSBTParser.trim()` which
 * keeps only the global tx + partial_sigs (strips witnessUtxo / bip32Derivation).
 */
/* global it, describe */
import assert from 'assert';
import { execFileSync } from 'child_process';
import * as bip39 from 'bip39';
import BIP32Factory from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as btc from '@scure/btc-signer';

import ecc from '../../blue_modules/noble_ecc';
import { encodeUR, BlueURDecoder } from '../../blue_modules/ur';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import { CreateTransactionUtxo } from '../../class/wallets/types';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

/** Fixed BIP39 mnemonic — synthetic, not a real wallet */
const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

/** Destination used in targets (random well-known bech32) */
const DESTINATION = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

function makeHotWallet(): HDSegwitBech32Wallet {
  const w = new HDSegwitBech32Wallet();
  w.setSecret(MNEMONIC);
  assert.ok(w.validateMnemonic());
  return w;
}

function makeWatchOnly(hot: HDSegwitBech32Wallet): WatchOnlyWallet {
  const watch = new WatchOnlyWallet();
  watch.setSecret(
    JSON.stringify({
      ExtPubKey: hot.getXpub(),
      MasterFingerprint: hot.getMasterFingerprintHex(),
      AccountKeyPath: hot.getDerivationPath(),
    }),
  );
  watch.init();
  watch.setUseWithHardwareWalletEnabled(true);
  return watch;
}

function makeFakeUtxos(hot: HDSegwitBech32Wallet, count: number): CreateTransactionUtxo[] {
  const utxos: CreateTransactionUtxo[] = [];
  for (let i = 0; i < count; i++) {
    utxos.push({
      value: 100_000 + i * 25_000,
      address: hot._getExternalAddressByIndex(i),
      vout: i,
      // deterministic fake txids
      txid: Buffer.alloc(32, i + 1).toString('hex'),
      wif: '',
    });
  }
  return utxos;
}

/**
 * Emulate SeedSigner PSBTParser.trim():
 * keep global unsigned tx + partial_sigs only (strip witnessUtxo, bip32Derivation, etc.).
 * @see https://github.com/SeedSigner/seedsigner/blob/dev/src/seedsigner/models/psbt_parser.py
 */
function trimLikeSeedSigner(signedPsbt: bitcoin.Psbt): bitcoin.Psbt {
  const trimmed = new bitcoin.Psbt();
  for (let i = 0; i < signedPsbt.inputCount; i++) {
    const txIn = signedPsbt.txInputs[i];
    trimmed.addInput({
      hash: txIn.hash,
      index: txIn.index,
      sequence: txIn.sequence,
    });
  }
  for (const out of signedPsbt.txOutputs) {
    trimmed.addOutput({ script: out.script, value: out.value });
  }
  for (let i = 0; i < signedPsbt.data.inputs.length; i++) {
    if (signedPsbt.data.inputs[i].partialSig) {
      trimmed.data.inputs[i].partialSig = signedPsbt.data.inputs[i].partialSig;
    }
    if (signedPsbt.data.inputs[i].finalScriptWitness) {
      trimmed.data.inputs[i].finalScriptWitness = signedPsbt.data.inputs[i].finalScriptWitness;
    }
  }
  return trimmed;
}

/** Sign every input with @scure/btc-signer (not bitcoinjs). Returns unfinalized PSBT. */
function signWithScure(unsignedPsbt: bitcoin.Psbt, mnemonic: string): bitcoin.Psbt {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed);
  const scureTx = btc.Transaction.fromPSBT(Buffer.from(unsignedPsbt.toBase64(), 'base64'));

  for (let i = 0; i < unsignedPsbt.inputCount; i++) {
    const derivations = unsignedPsbt.data.inputs[i].bip32Derivation;
    assert.ok(derivations && derivations.length > 0, `missing bip32Derivation on input ${i}`);
    const child = root.derivePath(derivations[0].path);
    assert.ok(child.privateKey, `missing private key for input ${i}`);
    scureTx.signIdx(child.privateKey, i);
  }

  // PSBTv0
  return bitcoin.Psbt.fromBuffer(Buffer.from(scureTx.toPSBT(0)));
}

/** Sign every input with bitcoinjs ECPair (control signer). Returns unfinalized PSBT. */
function signWithBitcoinjs(unsignedPsbt: bitcoin.Psbt, hot: HDSegwitBech32Wallet, inputAddresses: string[]): bitcoin.Psbt {
  const psbt = bitcoin.Psbt.fromBase64(unsignedPsbt.toBase64());
  for (let i = 0; i < psbt.inputCount; i++) {
    const wif = hot._getWifForAddress(inputAddresses[i]);
    psbt.signInput(i, ECPair.fromWIF(wif));
  }
  return psbt;
}

/**
 * Sign + trim exactly like SeedSigner firmware (embit PSBT.sign_with + PSBTParser.trim).
 * Requires system Python with `embit` installed.
 */
function signAndTrimWithEmbitSeedSignerStyle(unsignedPsbtBase64: string, mnemonic: string): string {
  const py = `
from base64 import b64encode, b64decode
from embit import bip39, bip32
from embit.psbt import PSBT
from embit.networks import NETWORKS

mnemonic = ${JSON.stringify(mnemonic)}
unsigned_b64 = ${JSON.stringify(unsignedPsbtBase64)}

seed = bip39.mnemonic_to_seed(mnemonic)
root = bip32.HDKey.from_seed(seed, version=NETWORKS["main"]["xprv"])
psbt = PSBT.parse(b64decode(unsigned_b64))

# SeedSigner: fill missing zero fingerprints when pubkey matches derived key
signing_fp = root.child(0).fingerprint
for scope in list(psbt.inputs) + list(psbt.outputs):
    for pub, der in list(scope.bip32_derivations.items()):
        if der.fingerprint == b"\\x00\\x00\\x00\\x00":
            derived = root.derive(der.derivation)
            if derived.key.sec() == pub.sec():
                from embit.psbt import DerivationPath
                scope.bip32_derivations[pub] = DerivationPath(signing_fp, der.derivation)

psbt.sign_with(root)

# SeedSigner PSBTParser.trim
trimmed = PSBT(psbt.tx)
for i, inp in enumerate(psbt.inputs):
    if inp.final_scriptwitness:
        trimmed.inputs[i].final_scriptwitness = inp.final_scriptwitness
    else:
        trimmed.inputs[i].partial_sigs = inp.partial_sigs

print(b64encode(trimmed.serialize()).decode())
`;
  const out = execFileSync('python3', ['-c', py], { encoding: 'utf8' }).trim();
  assert.ok(out.length > 20, 'embit signer produced empty output');
  return out;
}

/** Heuristic used by PsbtWithHardwareWallet.onBarScanned to decide base64 vs tx hex */
function looksLikeBase64Psbt(data: string): boolean {
  return !(data.indexOf('+') === -1 && data.indexOf('=') === -1);
}

function psbtFeeFromValues(psbt: bitcoin.Psbt): number {
  let inSum = 0;
  for (const input of psbt.data.inputs) {
    assert.ok(input.witnessUtxo, 'need witnessUtxo to compute fee');
    inSum += Number(input.witnessUtxo.value);
  }
  const outSum = psbt.txOutputs.reduce((s, o) => s + Number(o.value), 0);
  return inSum - outSum;
}

describe('Issue #8803: multi-UTXO PSBT external signer import', () => {
  it('creates a multi-input unsigned PSBT from synthetic mnemonic + fake UTXOs', () => {
    const hot = makeHotWallet();
    const watch = makeWatchOnly(hot);
    const utxos = makeFakeUtxos(hot, 3);

    const { psbt, fee, inputs, outputs } = watch.createTransaction(
      utxos,
      [{ address: DESTINATION, value: 150_000 }],
      1,
      hot._getInternalAddressByIndex(0),
    );

    assert.ok(psbt);
    assert.ok(inputs.length >= 2, `expected multi-input PSBT, got ${inputs.length} inputs`);
    assert.ok(outputs.length >= 1);
    assert.ok(fee > 0);
    // bitcoinjs Psbt.getFee() requires finalized PSBT; compute from witnessUtxo instead
    assert.strictEqual(psbtFeeFromValues(psbt), fee);
    assert.strictEqual(psbt.data.inputs.length, inputs.length);

    for (const input of psbt.data.inputs) {
      assert.ok(input.witnessUtxo, 'unsigned PSBT should carry witnessUtxo for HW signers');
      assert.ok(input.bip32Derivation && input.bip32Derivation.length > 0, 'unsigned PSBT should carry bip32Derivation');
    }
  });

  it('imports SeedSigner-trimmed PSBT signed by @scure/btc-signer (multi-UTXO)', () => {
    const hot = makeHotWallet();
    const watch = makeWatchOnly(hot);
    const utxos = makeFakeUtxos(hot, 3);

    const {
      psbt: unsignedPsbt,
      inputs,
      fee,
    } = watch.createTransaction(utxos, [{ address: DESTINATION, value: 150_000 }], 1, hot._getInternalAddressByIndex(0));
    assert.ok(inputs.length >= 2, `expected multi-input, got ${inputs.length}`);

    const signedByScure = signWithScure(unsignedPsbt, MNEMONIC);
    for (let i = 0; i < signedByScure.inputCount; i++) {
      assert.ok(signedByScure.data.inputs[i].partialSig?.length, `scure should add partialSig on input ${i}`);
    }

    // SeedSigner returns trimmed PSBT (partial_sigs only)
    const trimmed = trimLikeSeedSigner(signedByScure);
    for (const input of trimmed.data.inputs) {
      assert.ok(input.partialSig?.length, 'trimmed PSBT must keep partialSig');
      assert.ok(!input.witnessUtxo, 'trimmed PSBT must not keep witnessUtxo');
      assert.ok(!input.bip32Derivation?.length, 'trimmed PSBT must not keep bip32Derivation');
    }

    // Hardware-wallet import path: combine original unsigned with scanned signed/trimmed
    let tx: bitcoin.Transaction;
    try {
      tx = watch.combinePsbt(unsignedPsbt.toBase64(), trimmed.toBase64());
    } catch (e: any) {
      assert.fail(`combinePsbt rejected SeedSigner-style trimmed multi-UTXO PSBT: ${e?.message || e}`);
    }

    assert.ok(tx);
    assert.ok(tx.toHex().length > 0);
    assert.strictEqual(tx.ins.length, inputs.length);
    // fee preserved: sum(in) - sum(out)
    const inSum = inputs.reduce((s, i) => s + i.value, 0);
    const outSum = tx.outs.reduce((s, o) => s + Number(o.value), 0);
    assert.strictEqual(inSum - outSum, fee);
  });

  it('imports SeedSigner-trimmed PSBT signed by bitcoinjs (control, multi-UTXO)', () => {
    const hot = makeHotWallet();
    const watch = makeWatchOnly(hot);
    const utxos = makeFakeUtxos(hot, 3);

    const { psbt: unsignedPsbt, inputs } = watch.createTransaction(
      utxos,
      [{ address: DESTINATION, value: 150_000 }],
      1,
      hot._getInternalAddressByIndex(0),
    );
    assert.ok(inputs.length >= 2);

    const signed = signWithBitcoinjs(
      unsignedPsbt,
      hot,
      inputs.map(i => String(i.address)),
    );
    const trimmed = trimLikeSeedSigner(signed);

    const tx = watch.combinePsbt(unsignedPsbt.toBase64(), trimmed.toBase64());
    assert.ok(tx.toHex());
    assert.strictEqual(tx.ins.length, inputs.length);
  });

  it('single-UTXO SeedSigner-trimmed PSBT still imports (control — reported working)', () => {
    const hot = makeHotWallet();
    const watch = makeWatchOnly(hot);
    const utxos = makeFakeUtxos(hot, 1);

    const { psbt: unsignedPsbt, inputs } = watch.createTransaction(
      utxos,
      [{ address: DESTINATION, value: 50_000 }],
      1,
      hot._getInternalAddressByIndex(0),
    );
    assert.strictEqual(inputs.length, 1);

    const signedByScure = signWithScure(unsignedPsbt, MNEMONIC);
    const trimmed = trimLikeSeedSigner(signedByScure);
    const tx = watch.combinePsbt(unsignedPsbt.toBase64(), trimmed.toBase64());
    assert.ok(tx.toHex());
    assert.strictEqual(tx.ins.length, 1);
  });

  it('watch-only UI coinselect fee matches PSBT fee for multi-UTXO (fix for #8803 fee half)', () => {
    const hot = makeHotWallet();
    const watch = makeWatchOnly(hot);
    const utxos = makeFakeUtxos(hot, 3);
    const targets = [{ address: DESTINATION, value: 150_000 }];
    const feeRate = 1;

    const { fee: psbtFee, psbt, inputs } = watch.createTransaction(utxos, targets, feeRate, hot._getInternalAddressByIndex(0));
    assert.ok(inputs.length >= 2);
    assert.strictEqual(psbtFeeFromValues(psbt), psbtFee);
    assert.strictEqual(watch._hdWalletInstance?.segwitType, 'p2wpkh');
    // init() should mirror HD script type onto the watch-only wallet (bare zpub / Coldcard JSON)
    assert.strictEqual(watch.segwitType, 'p2wpkh');

    // SendDetails fee label calls wallet.coinselect on the WatchOnlyWallet instance
    const ui = watch.coinselect(utxos, targets, feeRate);
    assert.strictEqual(ui.fee, psbtFee, `UI coinselect fee must match PSBT fee; ui=${ui.fee} psbt=${psbtFee}`);
  });

  it('fails to finalize SeedSigner-trimmed PSBT alone (needs combine with unsigned)', () => {
    const hot = makeHotWallet();
    const watch = makeWatchOnly(hot);
    const utxos = makeFakeUtxos(hot, 3);

    const { psbt: unsignedPsbt, inputs } = watch.createTransaction(
      utxos,
      [{ address: DESTINATION, value: 150_000 }],
      1,
      hot._getInternalAddressByIndex(0),
    );
    assert.ok(inputs.length >= 2);

    const trimmed = trimLikeSeedSigner(signWithScure(unsignedPsbt, MNEMONIC));

    assert.throws(() => {
      bitcoin.Psbt.fromBase64(trimmed.toBase64()).finalizeAllInputs().extractTransaction();
    }, /Error/);

    // Full scure-signed (untrimmed) PSBT should finalize without the original
    const signedFull = signWithScure(unsignedPsbt, MNEMONIC);
    const tx = signedFull.finalizeAllInputs().extractTransaction();
    assert.ok(tx.toHex());
  });

  it('imports embit/SeedSigner-signed+trimmed multi-UTXO PSBT via combinePsbt', () => {
    const hot = makeHotWallet();
    const watch = makeWatchOnly(hot);
    const utxos = makeFakeUtxos(hot, 3);

    const { psbt: unsignedPsbt, inputs } = watch.createTransaction(
      utxos,
      [{ address: DESTINATION, value: 150_000 }],
      1,
      hot._getInternalAddressByIndex(0),
    );
    assert.ok(inputs.length >= 2);

    let trimmedB64: string;
    try {
      trimmedB64 = signAndTrimWithEmbitSeedSignerStyle(unsignedPsbt.toBase64(), MNEMONIC);
    } catch (e: any) {
      console.warn('skipping embit SeedSigner test — python/embit unavailable:', e?.message || e);
      return;
    }

    const trimmed = bitcoin.Psbt.fromBase64(trimmedB64);
    assert.ok(trimmed.inputCount >= 2);
    for (const input of trimmed.data.inputs) {
      assert.ok(input.partialSig?.length, 'embit/SeedSigner trim should leave partialSig');
      assert.ok(!input.witnessUtxo, 'embit/SeedSigner trim should strip witnessUtxo');
    }

    // Same heuristic PsbtWithHardwareWallet uses before combine
    assert.ok(looksLikeBase64Psbt(trimmedB64), 'trimmed PSBT base64 must contain + or = or import path treats it as tx hex');

    let tx: bitcoin.Transaction;
    try {
      tx = watch.combinePsbt(unsignedPsbt.toBase64(), trimmedB64);
    } catch (e: any) {
      assert.fail(`combinePsbt rejected embit/SeedSigner trimmed multi-UTXO PSBT: ${e?.message || e}`);
    }
    assert.ok(tx.toHex());
    assert.strictEqual(tx.ins.length, inputs.length);
  });

  it('UR crypto-psbt roundtrip of SeedSigner-trimmed multi-UTXO PSBT still combines', () => {
    const hot = makeHotWallet();
    const watch = makeWatchOnly(hot);
    const utxos = makeFakeUtxos(hot, 3);

    const { psbt: unsignedPsbt, inputs } = watch.createTransaction(
      utxos,
      [{ address: DESTINATION, value: 150_000 }],
      1,
      hot._getInternalAddressByIndex(0),
    );
    assert.ok(inputs.length >= 2);

    const trimmed = trimLikeSeedSigner(signWithScure(unsignedPsbt, MNEMONIC));

    // DynamicQRCode encodes psbt.toHex(); SeedSigner returns UR:CRYPTO-PSBT of the trimmed signed PSBT
    const fragments = encodeUR(trimmed.toHex(), 175, null, 'URv2') as string[];
    assert.ok(fragments.length >= 1);

    const decoder = new BlueURDecoder();
    for (const part of fragments) {
      decoder.receivePart(part);
    }
    assert.ok(decoder.isComplete());
    const decodedB64 = decoder.toString();
    assert.ok(looksLikeBase64Psbt(decodedB64));

    const tx = watch.combinePsbt(unsignedPsbt.toBase64(), decodedB64);
    assert.ok(tx.toHex());
    assert.strictEqual(tx.ins.length, inputs.length);
  });

  it('bare zpub (zero fingerprint) multi-UTXO still combines after external sign', () => {
    const hot = makeHotWallet();
    // Import as bare zpub — masterFingerprint stays 0 / 00000000 in PSBT bip32Derivation
    const watch = new WatchOnlyWallet();
    watch.setSecret(hot.getXpub());
    watch.init();
    watch.setUseWithHardwareWalletEnabled(true);
    assert.strictEqual(watch.getMasterFingerprintHex(), '00000000');

    const utxos = makeFakeUtxos(hot, 3);
    const { psbt: unsignedPsbt, inputs } = watch.createTransaction(
      utxos,
      [{ address: DESTINATION, value: 150_000 }],
      1,
      hot._getInternalAddressByIndex(0),
    );
    assert.ok(inputs.length >= 2);
    assert.ok(unsignedPsbt.data.inputs.every(i => i.bip32Derivation?.[0]));

    const signed = signWithScure(unsignedPsbt, MNEMONIC);
    const trimmed = trimLikeSeedSigner(signed);
    const tx = watch.combinePsbt(unsignedPsbt.toBase64(), trimmed.toBase64());
    assert.ok(tx.toHex());
  });

  it('combine with fully-finalized multi-UTXO PSBT (AirGap-style full return) works', () => {
    const hot = makeHotWallet();
    const watch = makeWatchOnly(hot);
    const utxos = makeFakeUtxos(hot, 3);

    const { psbt: unsignedPsbt, inputs } = watch.createTransaction(
      utxos,
      [{ address: DESTINATION, value: 150_000 }],
      1,
      hot._getInternalAddressByIndex(0),
    );
    assert.ok(inputs.length >= 2);

    const signed = signWithScure(unsignedPsbt, MNEMONIC);
    const finalized = bitcoin.Psbt.fromBase64(signed.toBase64());
    finalized.finalizeAllInputs();

    const tx = watch.combinePsbt(unsignedPsbt.toBase64(), finalized.toBase64());
    assert.ok(tx.toHex());
    assert.strictEqual(tx.ins.length, inputs.length);
  });
});
