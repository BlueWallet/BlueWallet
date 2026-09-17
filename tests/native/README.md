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
Check light/dark appearance, large text, and a narrow window. Existing PSBT, TXN,
and BIP-329 previews should still work.

On iOS, the coordination screen's Save and Share actions now export `.bwcoord`.
The additional `(.txt)` actions export the original interoperable setup text.
Android keeps the existing TXT export. Both file variants contain identical text.
A native rebuild is required to register the file type; a JavaScript reload alone
does not enable the Files preview.
