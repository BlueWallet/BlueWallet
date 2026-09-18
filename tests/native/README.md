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
Thumbnail drawing uses the system thumbnail drawing context: small icons show policy
and script type; grid thumbnails add the vault name, and large thumbnails add the derivation path.
