# Mac Catalyst end-to-end tests

The suite uses Appium Mac2/XCTest against a Release Catalyst app. It mirrors the Detox suite: `bluewallet.spec.ts`, `bluewallet2.spec.ts` and `bluewallet3.spec.ts` carry the same case titles, data and assertions as `tests/e2e/bluewallet.spec.js`, `bluewallet2.spec.js` and `bluewallet3.spec.js`, except that four multisig cases stay Detox-only: their wallet logic is platform-independent, and the UR multisig case already walks every desktop element of the vault flow. `catalyst.spec.ts` adds the desktop-only coverage: menu bar commands and shortcuts and the permanent wallets sidebar; the native file picker is exercised by the UR multisig case in `bluewallet.spec.ts`.

The app talks to its default public Electrum servers, exactly like the mobile Detox app. Funded cases import the same test wallet from the environment: `HD_MNEMONIC_BIP84` (the BIP84 wallet with balance `0.00105526`). A missing variable fails the case with `Set HD_MNEMONIC_BIP84 (locally: source ../env.sh)`; nothing is skipped silently. No case ever broadcasts: flows stop at the transaction details hex, `Send now` and the hardware-wallet broadcast button are never tapped, and the Tools › Broadcast case submits the literal `invalid`.

Camera capture, biometrics, hardware wallets, widgets, App Store installation and external Lightning services are outside this suite. Scanner input uses the same backdoor as Detox. The sandboxed E2E app deliberately omits the camera entitlement; scanner cases exercise text payload handling without hardware access.

## Detox parity map

Every ported case keeps its Detox `it(...)` title; the four multisig cases listed below as Detox-only have no counterpart here. Detox imports the funded wallet once per file in `beforeAll`; this harness resets the app before every case, so funded cases import it themselves. The mobile swipe gestures and the `SettingsButton`, `SendButton`, `ReceiveButton` and `WalletDetails` taps are replaced by their desktop equivalents.

| Detox file | Catalyst file | Cases |
| --- | --- | --- |
| `bluewallet.spec.js` (no wallets) | `bluewallet.spec.ts` | self-test, all settings screens, create/receive labels/Manage Wallets, both storage-encryption cases, UR multisig setup with hardware signatures (plus the Catalyst-only PSBT import through the macOS open panel), account discovery, home SCAN button (on-chain, Lightning, unified BIP21 wallet selector, Azteco), delete wallet, dice entropy (skipped, see the alert deviation above). Detox-only: 2-of-2 cosigner import, Cobo co-signing, 2-of-3 vault with forget/restore, wrapped 2-of-2 vault |
| `bluewallet2.spec.js` (funded BIP84) | `bluewallet2.spec.ts` | transaction + BIP21 scan + unit switching, batch send, sendMAX, cosign PSBT, payment codes & contacts, wallet-details operations, deep-link URL, UTXO notes and freezing, purge/refetch while running and after restart |
| `bluewallet3.spec.js` (watch-only) | `bluewallet3.spec.ts` | zpub import, receive request, unsigned/signed UR PSBT, delete with balance confirmation |
| — | `catalyst.spec.ts` | menu bar and shortcuts (Settings, Add/Import Wallet, Keyboard Shortcuts, Send/Receive/Wallet, Back to Wallets, Copy Address, Copy Transaction ID, Refresh, context-dependent presence), sidebar (wallet list and detail pane, Add Wallet button and its Import Wallet context menu, persistence across screens) |

Catalyst deviations from the mobile steps:

- `File › Add Wallet`, `File › Import wallet`, `File › Send`, `File › Receive`, `File › Wallet` (wallet details) and `BlueWallet › Settings…` replace the in-app buttons; `View › Back to Wallets` replaces the back gestures to the wallet list; `View › Refresh` replaces pull-to-refresh. Header `…` menus are opened the same way as in Detox.
- Long press is a native mouse press-and-hold (`macos: clickAndDrag` on the same element) for React Native gestures such as the wallet card. Tooltip menus (`ToolTipMenu`, a UIContextMenuInteraction) open on secondary click instead: a held mouse button is delivered as a plain press, so the sidebar Add Wallet case right-clicks and picks the hittable `Import wallet` item, the same path text views use for Paste.
- Alerts raised from inside a presented sheet are deferred by Catalyst until that sheet closes: the entropy Save confirmation and the plausible-deniability "password in use" alert appear only after leaving the Add Wallet or password sheet. The entropy case is skipped with a `TODO(Catalyst alerts)` because its OK must run while the sheet is open; the plausible-deniability case asserts that the sheet stays open and dismisses the deferred alert afterwards. The passphrase prompt over the import sheet reacts to neither clicks nor Escape, so the discovery case imports without the passphrase toggle.
- Transaction and coin rows are single accessible buttons whose testID is not exposed; the purge cases count rows by their `Incoming Transaction` / `Outgoing Transaction` labels and the UTXO case finds a coin by the memo inside its row label.
- The receive card is one accessible Copy button, so `BitcoinAmountText` and `CustomAmountDescriptionText` are not reachable; the watch-only case verifies amount and label through the copied BIP21 request instead. The `WalletsList` container is exposed beside its wallet cards rather than above them, so cards are located by their own testID. Swipe-to-hide-balance in Manage Wallets and swipe-to-second-output in batch send have no mouse equivalent; batch send removes the last (third) recipient twice instead, so the transaction pays the first two recipients plus change; the third one is never in it.
- The amount `TextInput` is hidden from accessibility behind the `Enter amount` button, so unit-switching assertions read it back through `Edit › Select All`, `Edit › Copy` and the clipboard.
- Editing the Electrum server in settings is Android-only in Detox and stays out here; the fields are only checked to exist.

## Local run

Install the repository's Node, Ruby and CocoaPods dependencies. Xcode, an enabled ABC or US keyboard input source, and Accessibility permission for Xcode Helper are required. Mac2 controls the foreground app, so avoid using the mouse/keyboard during a run. The suite temporarily selects an ASCII keyboard source for shortcuts and restores the previous source on normal teardown. Most text fields use native Edit-menu paste and verify the resulting value, restoring the previous clipboard. Scanner backdoor fields are filled the same way, which needs one app-side arrangement. Nested stacks present the scanner as a regular modal on desktop (`nestedScannerPresentation` in `components/navigationStyle.tsx`): a full-screen modal inside a Catalyst sheet is rehosted into its own window, and validating a contextual menu then terminates the app with `rehostedVC should be in a UIWindow` (run 38635192455, reproducible locally). A pushed card would avoid that too, but it ends up behind form-sheet routes such as the cosigner import sheet.

macOS can separately ask to enable UI automation when XCTest starts. Approve that system prompt locally. `automationmodetool` without arguments reports the current state without changing it. A timeout saying “Timed out while enabling automation mode” occurs before test execution; see [Mac2 device preparation](https://appium.github.io/appium-mac2-driver/v4/getting-started/#device-preparation). The workflow enables unattended automation on its disposable CI runner; local test scripts do not change that security preference.

Use an Apple Development identity in your login keychain and a team which can provision a dedicated Catalyst bundle identifier ending in `.e2e`:

```sh
export CATALYST_BUNDLE_ID=your.registered.identifier.e2e
export CATALYST_TEAM_ID=YOUR_TEAM_ID
export CATALYST_SIGNING_IDENTITY='Apple Development'
bundle exec npm run e2e:catalyst:build
source ../env.sh # HD_MNEMONIC_BIP84, as for the integration tests
npm run e2e:catalyst:test
```

The build uses automatic provisioning unless `CATALYST_PROVISIONING_PROFILE` is set. Xcode may request access to the signing key during **builds**. Tests reuse the built app; rebuilding is unnecessary when only test code changes. Run a single flow with:

```sh
npm run e2e:catalyst:test -- --runTestsByPath tests/e2e-appium/bluewallet2.spec.ts -t 'can batch send'
```

`CATALYST_APP_PATH` overrides the built app path. It must point to an E2E build with the matching `CATALYST_BUNDLE_ID`. Do not use an installed production wallet.

## Isolation and Keychain

The build creates a disposable Xcode project and workspace alongside the originals, excludes extensions, and uses a dedicated `.e2e` bundle identifier, sandbox and keychain access group, locally and on CI (`io.bluewallet.bluewallet.e2e`). The build, the harness and the native E2E app all refuse any other identifier, so the signed test app (handed between CI jobs only through the Actions cache) cannot read or reset a production wallet's container or keychain items. Xcode bundles and compiles the test JavaScript before signing with its resolved entitlements. The production project and production Metro configuration do not load E2E overrides.

The `CATALYST_E2E` compile flag enables launch-time reset of the test app's own generic-password keychain items, files and preferences. A Metro adapter routes native shared preferences to the test app's domain. Wallet persistence and Keychain APIs use their real native implementations; they are not mocked. Each case starts from reset storage, while restart assertions relaunch without resetting it.

Catalyst uses the data-protection Keychain. Ad-hoc signing cannot authorize the required keychain access group, so unsigned builds cannot validate these wallet/security flows. See [Apple TN3137](https://developer.apple.com/documentation/technotes/tn3137-on-mac-keychains).

## CI signing setup

`e2e-catalyst.yml` reuses `CATALYST_TEAM_ID`, `GIT_URL`, `GIT_ACCESS_TOKEN` and `KEYCHAIN_PASSWORD` from the existing Catalyst build setup, plus `MATCH_PASSWORD` (already used by the iOS release workflow) to decrypt Match storage without an interactive prompt. The developer team falls back to `TEAM_ID` and then `ITC_TEAM_ID`; the iOS signing lane already uses the latter for `DEVELOPMENT_TEAM`. The workflow checks the team ID format without printing its value. The signing lane converts a raw GitHub token to Match's Basic Auth encoding using the existing Fastlane helper; already encoded credentials are preserved.

CI signs the test app with the team's Developer ID Application certificate and the Developer ID ("Direct") Catalyst profile for `io.bluewallet.bluewallet.e2e`, both read from Match. That profile provisions every Mac, which GitHub's Apple silicon runners need: each VM boots with a random Provisioning UDID, so a development profile cannot list it and the app fails with `Launchd job spawn failed` (run 39234136975; amfid: "Provisioning profile does not allow this device"). Only the Account Holder can create a Developer ID Application certificate (`fastlane match developer_id` with an Apple ID login; an App Store Connect API key cannot). Match looks a stored certificate up in the portal by its file name, so import an existing certificate without `--skip_certificate_matching`. The profile is then created once with `MATCH_READONLY=false fastlane match developer_id --platform catalyst --app_identifier io.bluewallet.bluewallet.e2e` (an API key is enough for that step); the App ID's Mac Catalyst capability can only be enabled in the portal UI.

CI fetches the profile read-only, takes the actual profile name from Match's output, signs with `Developer ID Application`, and deletes the temporary keychain afterwards. An App Store distribution identity from the release workflow is not a substitute: App Store profiles cannot provision a directly launched UI-test app. Missing credentials/profile fail the job; there is no silent fallback to mocked storage.

Signing secrets are never made available to fork PR code. The signed job runs only on same-repository PRs: their caches are scoped to the PR, so no other PR can restore the signed app. Fork PRs therefore do not run this signed suite automatically; they retain the regular lint/unit jobs. The test job receives `HD_MNEMONIC_BIP84` from repository secrets, the same value the Detox workflows use. There is no `pull_request_target` checkout of untrusted code.

CI has separate build and test jobs. The build job signs or restores the app once and hands it to the test jobs through the Actions cache, never as a downloadable artifact: a Developer ID-signed build with the e2e backdoors must not be a public download. A test-job matrix (`bluewallet`, `bluewallet2`, `bluewallet3`, `catalyst`) restores the app from that cache, verifies its signature and bundle ID, and runs one spec file per runner (`maxWorkers: 1`); failure diagnostics are uploaded per file. Signing credentials are used only in the build job. New pushes cancel the previous run for the same PR.

The signed app is cached immediately after a successful build, even if the subsequent UI test fails. Test-only changes, including harness unit tests and test selection, can reuse it. Changes to application sources, dependencies, E2E build inputs, build configuration, toolchain or provisioning profile invalidate the cache. Cache invalidation has a standalone regression check. Only the app bundle is cached, never wallet data or the signing keychain.

## Failures and retries

Keep the application's original native modal presentation; the one exception is the nested scanner, which desktop presents as a regular modal because the full-screen one crashes Catalyst (see Local run). Record Catalyst alert limitations as TODOs in tests rather than changing production presentation for automation. Blocking input/confirmation subflows are explicitly deferred when they cannot continue.

Cases are independent. CI allows up to three attempts per failed case (`E2E_RETRIES=2`). Successful cases are not repeated. Jest reports the errors before retrying. A case that fails all three attempts fails the job; retries never convert an unexecuted test into a pass.

An Appium server already listening on port 4723 is refused, because its log is not redacted (pasted seeds, generated phrases); stop it before a run. Restart that runner (the `xcodebuild … WebDriverAgentMac` process) after rebuilding the app or after terminating the app outside WebDriver, for example with `kill`: the runner then fails every launch with `Not authorized for performing UI testing actions`.

Local runs default to a single attempt and run every case even after a failure. For the same retry policy as CI, use `E2E_RETRIES=2 npm run e2e:catalyst:test`; to run one case, use `-t 'regex'`.

Every case, and every retry, starts its own WebDriver session and resets the app; the session is deleted afterwards, so a body that outlived its Jest timeout cannot reach the next case. Teardown hooks also collect diagnostics for Jest timeouts. There are no persisted pass markers. The ten-minute transport timeout applies only to initial session creation; subsequent requests have a one-minute timeout and are not automatically replayed.

The hosted Intel runner's virtual GPU aborted in RenderBox when loading a Metal shader archive; the harness still passes `RB_USE_BINARY_ARCHIVE=0` to the app on hosted CI, so drop it once Apple silicon runs have proven it unnecessary. Long compound cases have individual 35-minute budgets, while element and command waits stay bounded. The build has a two-hour ceiling; each matrix test job has six hours, including retries and diagnostics. On Apple silicon the full workflow takes about 70 minutes (run 39964789987).

Failures save accessibility XML, Appium logs, app-window screenshots and video under `artifacts/`. The Appium server redacts the test mnemonics (plain and base64 clipboard payloads), plus any 12- or 24-word BIP39 phrase, any numbered seed word, any raw signed transaction and any PSBT, so that phrases the app generated and the transactions the funded cases signed are covered too, as it writes its log (`--log-filters`), so even a run killed by a job timeout leaves no secret in the uploaded log; the native log and accessibility XML are redacted when saved. Videos from successful attempts are discarded. Builds made with `E2E_HIDE_SECRETS=1` (the e2e workflows) draw seeds, passphrases and their QR codes in transparent ink (`helpers/e2e-flags.ts`, replaced by `tests/e2e/metro.config.js` for Detox and Catalyst builds alike), so screenshots and video never show them; the accessibility tree still does, and `readSeed` reads it from there. Local builds show them as usual. With `E2E_HIDE_SECRETS=1` at test time both harnesses first wait for the `SecretsHidden` marker that only such bundles render on the wallets list (and on the import and seed screens), so a bundle that missed the Metro swap fails before any seed screen is opened; should that check ever fail later, the Catalyst suite discards the attempt's screenshots and video. CI uploads diagnostics only if the test job fails; successful jobs upload none, including when a retry recovered. Failure screenshots are taken only on CI because XCTest captures overlapping windows, even when asked for an app-window image. The seed must be given as lowercase BIP39 words separated by single spaces, the form the wallet keeps verbatim, so the redaction patterns match every artifact. Accessibility XML, native logs and the Appium server log (rewritten in global teardown) are written with the values of `HD_MNEMONIC` and `HD_MNEMONIC_BIP84` replaced by `[redacted]`, including their base64 form from clipboard pastes and the numbered words of the seed screen; screenshots and video are not redacted, so treat failure artifacts of funded cases as sensitive, as with the mobile Detox artifacts, even though builds with `E2E_HIDE_SECRETS=1` never draw the seed. Video captures the display, so it is enabled by default only on CI or with `E2E_RECORD_VIDEO=1`. Global teardown restores clipboard text even if the last WebDriver session crashed.

CI failures also collect native logs and available BlueWallet crash reports.

If a run is forcibly killed before teardown, select your previous keyboard input source manually. Normal completion and setup failures restore it automatically.

## Test dependency security

Mac2's bundled `shell-quote` needs a security patch in addition to the npm override. See [patch details and removal criteria](../../patches/README.md). `tests/unit/catalyst-harness.test.ts` checks both installed copies.
