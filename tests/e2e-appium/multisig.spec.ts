import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Psbt, Transaction, address, script } from 'bitcoinjs-lib';
import { catalystSuite } from './suite';
import { openWallet, scanText } from './flows';
import {
  COMMAND,
  SHIFT,
  activate,
  getText,
  pressKey,
  scrollDownToId,
  selectMenuItem,
  tapButtonWithLabel,
  tapHeaderMenuItem,
  tapId,
  waitForId,
  waitForIdGone,
} from './driver';
import type { Driver } from './driver';
import fixture from './fixtures/multisig.json';

const scanParts = async (driver: Driver, parts: string[]) => {
  for (const [index, part] of parts.entries()) {
    process.stdout.write(`[Catalyst] Scanning UR part ${index + 1}/${parts.length}\n`);
    await scanText(driver, part);
    if (index < parts.length - 1) await waitForId(driver, 'UrProgressBar');
  }
  await waitForIdGone(driver, 'ScanQrBackdoorButton');
};

catalystSuite('Multisig UR signing and macOS file import', test => {
  // TODO(Catalyst scanner input): shared scanQrBackdoorInput cannot be filled
  // with ordinary typing (38647288308); contextual Paste aborts UIKit
  // (38635192455). Restore this flow without changing native presentation.
  test.skip('imports multipart setup, opens a PSBT file and combines two hardware signatures for review', async driver => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bluewallet-catalyst-psbt-'));
    const filename = path.join(directory, 'unsigned.psbt');
    const unsigned = Psbt.fromBase64(fixture.unsignedPsbt);
    fs.writeFileSync(filename, unsigned.toBuffer());
    try {
      await selectMenuItem(driver, 'File', 'Import Wallet');
      await tapId(driver, 'ScanImport');
      await scanParts(driver, fixture.setup);
      await tapButtonWithLabel(driver, 'OK', 180_000);
      await openWallet(driver, 'Multisig Vault');
      await tapId(driver, 'SendButton');
      await tapHeaderMenuItem(driver, 'Import Transaction');
      // The real macOS file picker exercises sandbox access to a user-selected file.
      for (const reopen of [false, true]) {
        await pressKey(driver, 'g', COMMAND | SHIFT);
        // Catalyst duplicates underlying sheet fields after the panel in its AX
        // tree. Use AppKit's path-field identifier instead of the last text field.
        const filePath = await waitForId(driver, 'PathTextField', 15_000);
        await activate(driver);
        await filePath.click();
        await filePath.setValue(filename);
        assert.strictEqual(await filePath.getAttribute('value'), filename);
        if (!reopen) {
          await pressKey(driver, 'XCUIKeyboardKeyEscape');
          await waitForIdGone(driver, 'GoToWindow');
        }
      }
      await pressKey(driver, 'XCUIKeyboardKeyReturn');
      await tapButtonWithLabel(driver, 'Open');
      await waitForId(driver, 'ItemUnsigned');
      await waitForIdGone(driver, 'ItemSigned');
      for (const parts of [fixture.partial, fixture.signed]) {
        await tapId(driver, 'ProvideSignature');
        await scrollDownToId(driver, 'PsbtMultisigQRCodeScrollView', 'CosignedScanOrImportFile');
        await tapId(driver, 'CosignedScanOrImportFile');
        await scanParts(driver, parts);
        await waitForId(driver, 'ItemSigned');
      }
      await waitForId(driver, 'ExportSignedPsbt');
      await tapId(driver, 'PsbtMultisigConfirmButton');
      await tapId(driver, 'TransactionDetailsButton');
      const tx = Transaction.fromHex(await getText(driver, 'TxhexInput'));
      assert.strictEqual(tx.ins.length, 1);
      assert.strictEqual(tx.outs.length, 2);
      assert.strictEqual(address.fromOutputScript(tx.outs[0].script), 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl');
      assert.strictEqual(tx.outs[0].value, 5000n);
      const witness = tx.ins[0].witness;
      assert.strictEqual(witness.length, 4);
      const witnessScript = witness[3];
      const publicKeys = script
        .decompile(witnessScript)!
        .filter((chunk): chunk is Uint8Array => chunk instanceof Uint8Array && chunk.length === 33);
      const { verify } = await import('@noble/secp256k1');
      let previousKey = -1;
      for (const encoded of witness.slice(1, 3)) {
        const signature = script.signature.decode(encoded);
        const digest = tx.hashForWitnessV0(0, witnessScript, unsigned.data.inputs[0].witnessUtxo!.value, signature.hashType);
        const signingKey = publicKeys.findIndex(
          (key, index) => index > previousKey && verify(signature.signature, digest, key, { prehash: false }),
        );
        assert.ok(signingKey >= 0, 'CHECKMULTISIG signatures must match distinct public keys in script order');
        previousKey = signingKey;
      }
      // Do not broadcast the historical hardware-wallet fixture.
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }, 2_100_000); // Hosted Intel needs ~25–30 minutes for 17 UR scans and the native file picker.
});
