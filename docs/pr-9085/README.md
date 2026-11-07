Wallet history review verification
================================

The menu screenshot is captured from Wallet Details in the iPhone 18 Pro simulator, cropped to the native popup. The preview screenshots use public sample records and the production `PreviewViewController`, hosted by the native smoke test.

![Wallet Details export menu](history-menu.png)

![Wallet Labels export format](history-label-format.png)

![Quick Look Records](quicklook-records.png)

![Quick Look Raw](quicklook-raw.png)

Native preview smoke test (macOS with Xcode and an installed iOS simulator runtime):

```sh
node scripts/test-quicklook-preview.ts
```

The `quicklook-preview` job in `.github/workflows/e2e-ios.yml` runs this command on every PR, independently of the main app build. It compiles the production preview controller and native assertions, creates a dedicated simulator, and fails on compilation errors, assertions, crashes, or a missing completion receipt. The simulator and build directory are removed afterward.

The assertions cover invalid PSBT/transaction data, unreadable files, JSONL sections, invalid-line counts, and original Raw contents. Set `PREVIEW_RESULTS_DIR` to retain the success receipt and a simulator screenshot; CI uploads these as the `quicklook-preview-results` artifact.
