# Multisig Files preview

From the repository root, run the Foundation-only parser checks:

```sh
swiftc ios/QuickLookShared/MultisigCoordination.swift tests/native/MultisigCoordinationTests.swift -o /tmp/bw-coordination-tests
/tmp/bw-coordination-tests
```

To check the UI, build and install BlueWallet with both Quick Look extensions, then save
`tests/unit/fixtures/quicklook-preview-sample.bwcoord` into Files. The sample contains
public keys from existing test fixtures and is for demonstration only.

In Files, check the thumbnail in grid and list views. Use Quick Look from the file's
context menu to check the wallet name, 2-of-3 policy, and three cosigner cards.
The preview and thumbnail reuse the wallet card’s gradient and vault artwork; the preview uses the vault screen’s signature badge and connected Vault key rows.
Check light/dark appearance, large text, and a narrow window. Existing PSBT, TXN,
and BIP-329 previews should still work.

On iOS, the coordination screen's Save and Share actions now export `.bwcoord`.
The additional `(.txt)` actions export the original interoperable setup text.
Android keeps the existing TXT export. Both file variants contain identical text.
A native rebuild is required to register the file type; a JavaScript reload alone
does not enable the Files preview.


For simulator testing, run `scripts/deeplink-to-emusim.sh` and choose **Preview a sample
file → bwcoord**. This stages the sample under **On My iPhone → BlueWallet →
Quick Look Samples** and opens that folder in Files. Long-press the file and
choose **Quick Look**.

An existing sample copied into `Documents/Inbox` was observed to silently fail
before launching the preview extension on the iOS 26.5 simulator. The identical
file in a fresh Documents location successfully opened through Files' Quick Look
menu. If an older sample does nothing, use the newly staged copy.


In the Files preview, touch and hold a public key and choose **Copy public key**.
Paste it into a text field and verify that the entire key is copied, without its
fingerprint, derivation path, or display line breaks. VoiceOver exposes the same
Copy public key action.


Use **Search vault keys** to filter by vault-key number (for example, "Vault key 2"),
fingerprint, derivation path, or any part of the public key. Matching ignores case
and surrounding whitespace. Confirm that original key numbers remain intact, a
nonmatching query shows **No matching keys**, closing search restores all keys, and
long-press copying still copies the complete matching key.


## Localization

Both extensions bundle `ios/QuickLookShared/VaultPreview.xcstrings`. Add new
translations there; entries are marked for manual extraction because the
Foundation localization helper looks them up dynamically. English, Spanish
(Spain), and Latin American Spanish are included. The extensions follow the
native iOS preferred language, with English fallback; they do not read the
React Native language setting. Existing wallet names and key data are never
translated. Search uses localized vault-key labels.

Run the resource-backed checks (requires Xcode):

```sh
bash tests/native/test-vault-localization.sh
```

This compiles the real catalog into a temporary test bundle and checks English,
both Spanish variants, fallback, argument formatting, and localized key search.

The preview presentation uses SwiftUI hosted by the Quick Look extension controller.
Thumbnail drawing uses the system thumbnail drawing context: small icons show the signing policy;
grid thumbnails add the vault name, and large thumbnails add the derivation path.

## Transaction, PSBT, and label previews

`QuickLookDocument.swift` is the shared preview/thumbnail model. It supports binary
and hexadecimal transactions, binary/base64 PSBT v0/v2, and BIP-329 JSONL labels.
It bounds file size, validates lengths and amounts, rejects duplicate PSBT map keys,
and checks previous-transaction hashes and conflicting UTXO data before using them.

Run the model checks:

```sh
swiftc ios/QuickLookShared/MultisigCoordination.swift ios/QuickLookShared/QuickLookDocument.swift tests/native/QuickLookDocumentTests.swift -o /tmp/bw-quicklook-tests
/tmp/bw-quicklook-tests
```

The address fixtures contain Base58Check, Bech32, and Bech32m outputs cross-checked
with bitcoinjs-lib. The parser tests cover v0/v2 fee calculation, unavailable fees,
signature/finalization metadata, conflicting previous outputs, malformed lengths,
truncation, label search/filtering, and unchanged references.

- Vault search keeps the wallet name/policy visible. Fingerprints and derivation
  paths have long-press copy menus and VoiceOver copy actions.
- Transactions show separate output amounts and copyable destinations. Select a
  network explicitly to display addresses; the default shows output scripts because
  transactions do not identify their network. Unsupported scripts remain hexadecimal.
- PSBT progress counts inputs containing signature/finalization data, **not verified
  signatures or readiness to broadcast**. Fees use all supplied input values and are
  absent when any value is missing. Previous-transaction matching does not establish
  blockchain confirmation or spendability. No network requests are made.
- Labels support combined search/type filters, clear filters, skipped-line counts,
  and empty/no-results states. Copy preserves the exact reference.
- Thumbnails show signing policy for vaults, output totals for transactions/PSBTs,
  and record counts for labels. The thumbnail extension registers the BIP-329 UTI.
- All presentation strings use the shared English/Spanish catalog. Both preview
  types constrain reading width on iPad and use dynamic fonts and semantic colors.

Use the simulator script's **JSONL · Wallet labels** sample, or stage the PSBT/TXN
samples. Check each from Files, including search/filter combinations, long-press
copy, network selection, malformed/empty files, dark appearance, accessibility text
sizes, and iPad landscape. A new export or filename may be needed to refresh a
cached Files thumbnail.

Run all native checks with `bash tests/native/test-quicklook.sh`; the iOS PR build
also runs this script. Compact thumbnails use SI prefixes (k/M/G/T/P) and mark
rounded totals with ≈; the full preview always shows exact satoshi amounts.

## Copy file contents from Files

In Files or Quick Look, choose **Share → Copy File Contents**. This is a native
Action extension. Apple's existing **Copy** action still copies the file itself;
preview extensions cannot replace Files' share-sheet behavior.

The action accepts one `.bwcoord`, `.jsonl`, `.psbt`, or `.txn` file. It preserves
UTF-8 text, including whitespace and line endings. Binary PSBTs are copied as
Base64 and binary transactions as hexadecimal so they can be pasted into wallets.
It reads only the supplied file, limits input to 8 MB, and leaves the clipboard
untouched on failure. It does not normalize or reconstruct the formatted preview.
The action and its error UI support the native English/Spanish localizations.

`CopyFileContents` is embedded in BlueWallet and included in the Fastlane Match
identifier lists. A native rebuild is needed to install it. Before signed device
or distribution builds, provision `io.bluewallet.bluewallet.CopyFileContents` in
the Apple Developer/Match setup; the simulator build does not require that profile.
The Detox iOS workflow removes this extension alongside the existing extensions.

`test-quicklook.sh` also checks exact text copying and binary round trips. In Files,
verify **Share → Copy File Contents**, then paste into a text field and compare
against the original file rather than the preview's displayed summary.
