# Mac Catalyst end-to-end tests

The suite uses Appium Mac2/XCTest against a Release Catalyst app. It mirrors the Detox suite one to one: `bluewallet.spec.ts`, `bluewallet2.spec.ts` and `bluewallet3.spec.ts` carry the same case titles, data and assertions as `tests/e2e/bluewallet.spec.js`, `bluewallet2.spec.js` and `bluewallet3.spec.js`. `catalyst.spec.ts` adds the desktop-only coverage: menu bar commands and shortcuts, the permanent wallets sidebar and the native file picker.

The app talks to its default public Electrum servers, exactly like the mobile Detox app. Funded cases import the same test wallets from the environment: `HD_MNEMONIC_BIP84` (the BIP84 wallet with balance `0.00105526`) and `MNEMONICS_COBO` (the multisig cosigner). A missing variable fails the case with `Set HD_MNEMONIC_BIP84 (locally: source ../env.sh)`; nothing is skipped silently. No case ever broadcasts: flows stop at the transaction details hex, `Send now` and the hardware-wallet broadcast button are never tapped, and the Tools › Broadcast case submits the literal `invalid`.

Camera capture, biometrics, hardware wallets, widgets, App Store installation and external Lightning services are outside this suite. Scanner input uses the same backdoor as Detox. The sandboxed E2E app deliberately omits the camera entitlement; scanner cases exercise text payload handling without hardware access.

## Detox parity map

Every Detox `it(...)` title exists here with the same name. Detox imports the funded wallet once per file in `beforeAll`; this harness resets the app before every case, so funded cases import it themselves. The mobile swipe gestures and the `SettingsButton`, `SendButton`, `ReceiveButton` and `WalletDetails` taps are replaced by their desktop equivalents.

| Detox file | Catalyst file | Cases |
| --- | --- | --- |
| `bluewallet.spec.js` (no wallets) | `bluewallet.spec.ts` | self-test, all settings screens, create/receive labels/Manage Wallets, both storage-encryption cases, 2-of-2 cosigner import, UR multisig setup with hardware signatures, Cobo co-signing, account discovery, home SCAN button (on-chain, Lightning, unified BIP21 wallet selector, Azteco), delete wallet, dice entropy, 2-of-3 vault with forget/restore, wrapped 2-of-2 vault |
| `bluewallet2.spec.js` (funded BIP84) | `bluewallet2.spec.ts` | transaction + BIP21 scan + unit switching, batch send, sendMAX, cosign PSBT, payment codes & contacts, wallet-details operations, deep-link URL, UTXO notes and freezing, purge/refetch while running and after restart |
| `bluewallet3.spec.js` (watch-only) | `bluewallet3.spec.ts` | zpub import, receive request, unsigned/signed UR PSBT, delete with balance confirmation |
| — | `catalyst.spec.ts` | menu bar and shortcuts (Settings, Add/Import Wallet, Keyboard Shortcuts, Send/Receive/Wallet Details, Back to Wallets, Copy Address, Copy Transaction ID, Reload Transactions, context-dependent presence), sidebar (wallet list and detail pane, Add Wallet button and its Import Wallet context menu, persistence across screens), PSBT import through the macOS file picker |

Catalyst deviations from the mobile steps:

- `File › Add Wallet`, `File › Import Wallet`, `File › Send…`, `File › Receive…`, `File › Wallet Details…` and `BlueWallet › Settings…` replace the in-app buttons; `View › Back to Wallets` replaces the back gestures to the wallet list; `View › Reload Transactions` replaces pull-to-refresh. Header `…` menus are opened the same way as in Detox.
- Long press is a native mouse press-and-hold (`macos: clickAndDrag` on the same element) for React Native gestures such as the wallet card. Tooltip menus (`ToolTipMenu`, a UIContextMenuInteraction) open on secondary click instead: a held mouse button is delivered as a plain press, so the sidebar Add Wallet case right-clicks and picks the hittable `Import wallet` item, the same path text views use for Paste.
- Alerts raised from inside a presented sheet are deferred by Catalyst until that sheet closes: the entropy Save confirmation and the plausible-deniability "password in use" alert appear only after leaving the Add Wallet or password sheet. The entropy case is skipped with a `TODO(Catalyst alerts)` because its OK must run while the sheet is open; the plausible-deniability case asserts that the sheet stays open and dismisses the deferred alert afterwards. The passphrase prompt over the import sheet reacts to neither clicks nor Escape, so the discovery case imports without the passphrase toggle.
- Transaction and coin rows are single accessible buttons whose testID is not exposed; the purge cases count rows by their `Incoming Transaction` / `Outgoing Transaction` labels and the UTXO case finds a coin by the memo inside its row label.
- The receive card is one accessible Copy button, so `BitcoinAmountText` and `CustomAmountDescriptionText` are not reachable; the watch-only case verifies amount and label through the copied BIP21 request instead. The `WalletsList` container is exposed beside its wallet cards rather than above them, so cards are located by their own testID. Swipe-to-hide-balance in Manage Wallets and swipe-to-second-output in batch send have no mouse equivalent; batch send removes the last (third) recipient twice instead, so the asserted outputs are the first two recipients plus the re-added third one and removing a middle recipient is not covered on Catalyst.
- The amount `TextInput` is hidden from accessibility behind the `Enter amount` button, so unit-switching assertions read it back through `Edit › Select All`, `Edit › Copy` and the clipboard.
- Editing the Electrum server in settings is Android-only in Detox and stays out here; the fields are only checked to exist.

## Local run

Install the repository's Node, Ruby and CocoaPods dependencies. Xcode, an enabled ABC or US keyboard input source, and Accessibility permission for Xcode Helper are required. Mac2 controls the foreground app, so avoid using the mouse/keyboard during a run. The suite temporarily selects an ASCII keyboard source for shortcuts and restores the previous source on normal teardown. Most text fields use native Edit-menu paste and verify the resulting value, restoring the previous clipboard. Scanner backdoor fields are filled the same way, which needs two app-side arrangements. `scanQrHelper` pushes the scanner inside the focused navigator (see `helpers/scan-qr.ts`): presenting the root stack's scanner over an already presented modal made UIKit on the Intel runner rehost it without keyboard focus or Edit-menu actions (run 38647288308). Nested stacks also present the scanner as a regular modal on desktop (`nestedScannerPresentation` in `components/navigationStyle.tsx`): a full-screen modal inside a Catalyst sheet is rehosted into its own window, and validating a contextual menu then terminates the app with `rehostedVC should be in a UIWindow` (run 38635192455, reproducible locally). A pushed card would avoid that too, but it ends up behind form-sheet routes such as the cosigner import sheet. The helper retains an explicit type mode for diagnosing other environments.

macOS can separately ask to enable UI automation when XCTest starts. Approve that system prompt locally. `automationmodetool` without arguments reports the current state without changing it. A timeout saying “Timed out while enabling automation mode” occurs before test execution; see [Mac2 device preparation](https://appium.github.io/appium-mac2-driver/v4/getting-started/#device-preparation). The workflow enables unattended automation on its disposable CI runner; local test scripts do not change that security preference.

Use an Apple Development identity in your login keychain and a team which can provision a dedicated Catalyst bundle identifier ending in `.e2e`:

```sh
export CATALYST_BUNDLE_ID=your.registered.identifier.e2e
export CATALYST_TEAM_ID=YOUR_TEAM_ID
export CATALYST_SIGNING_IDENTITY='Apple Development'
bundle exec npm run e2e:catalyst:build
source ../env.sh # HD_MNEMONIC_BIP84 and MNEMONICS_COBO, as for the integration tests
npm run e2e:catalyst:test
```

The build uses automatic provisioning unless `CATALYST_PROVISIONING_PROFILE` is set. Xcode may request access to the signing key during **builds**. Tests reuse the built app; rebuilding is unnecessary when only test code changes. Run a single flow with:

```sh
npm run e2e:catalyst:test -- --runTestsByPath tests/e2e-appium/bluewallet2.spec.ts -t 'can batch send'
```

`CATALYST_APP_PATH` overrides the built app path. It must point to an E2E build with the matching `CATALYST_BUNDLE_ID`. Do not use an installed production wallet.

## Isolation and Keychain

The build creates a disposable Xcode project and workspace alongside the originals, excludes extensions, and uses a dedicated `.e2e` bundle identifier, sandbox and keychain access group locally. On disposable GitHub-hosted runners it reuses `io.bluewallet.bluewallet` and its existing development profile. The build and test harness reject that ID outside GitHub-hosted CI; the native E2E app also requires the CI launch marker before initializing or resetting storage. Xcode bundles and compiles the test JavaScript before signing with its resolved entitlements. The production project and production Metro configuration do not load E2E overrides.

The `CATALYST_E2E` compile flag enables launch-time reset of the test app's own generic-password keychain items, files and preferences. A Metro adapter routes native shared preferences to the test app's domain. Wallet persistence and Keychain APIs use their real native implementations; they are not mocked. Each case starts from reset storage, while restart assertions relaunch without resetting it.

Catalyst uses the data-protection Keychain. Ad-hoc signing cannot authorize the required keychain access group, so unsigned builds cannot validate these wallet/security flows. See [Apple TN3137](https://developer.apple.com/documentation/technotes/tn3137-on-mac-keychains).

## CI signing setup

`e2e-catalyst.yml` reuses `CATALYST_TEAM_ID`, `GIT_URL`, `GIT_ACCESS_TOKEN` and `KEYCHAIN_PASSWORD` from the existing Catalyst build setup, plus `MATCH_PASSWORD` (already used by the iOS release workflow) to decrypt Match storage without an interactive prompt. The developer team falls back to `TEAM_ID` and then `ITC_TEAM_ID`; the iOS signing lane already uses the latter for `DEVELOPMENT_TEAM`. The workflow checks the team ID format without printing its value. The signing lane converts a raw GitHub token to Match's Basic Auth encoding using the existing Fastlane helper; already encoded credentials are preserved.

CI reuses the existing Catalyst development certificate/private key and profile for `io.bluewallet.bluewallet` from Match. No new bundle identifier or E2E profile is required. The profile must include the Intel hosted runner UDID `4203018E-580F-C1B5-9525-B745CECA79EB` and the lane checks this before building. If absent, a team administrator must register that runner and regenerate the existing development profile in Match. [GitHub documents this stable Intel UDID](https://docs.github.com/en/actions/reference/runners/github-hosted-runners#limitations-for-arm64-macos-runners); arm64 hosted runners do not have one.

CI fetches the development profile read-only, takes the actual profile name from Match's output, signs with `Apple Development`, and deletes the temporary keychain afterwards. An App Store distribution identity from the release workflow is not a substitute for development provisioning of the directly launched UI-test app. Missing credentials/profile fail the job; there is no silent fallback to mocked storage.

Signing secrets are never made available to fork PR code. The signed job runs on same-repository PRs or a reviewed repository branch selected through `workflow_dispatch`. Fork PRs therefore do not run this signed suite automatically; they retain the regular lint/unit jobs. The test job receives `HD_MNEMONIC_BIP84` and `MNEMONICS_COBO` from repository secrets, the same values the Detox workflows use. There is no `pull_request_target` checkout of untrusted code.

CI has separate build and test jobs. The build job signs or restores the app once and uploads a tar archive that preserves bundle permissions and symlinks. A test-job matrix (`bluewallet`, `bluewallet2`, `bluewallet3`, `catalyst`) downloads the artifact, verifies its signature and bundle ID, and runs one spec file per runner (`maxWorkers: 1`); failure diagnostics are uploaded per file. Signing credentials are used only in the build job. New pushes cancel the previous run for the same PR.

The signed app is cached immediately after a successful build, even if the subsequent UI test fails. Test-only changes, including harness unit tests and test selection, can reuse it. Changes to application sources, dependencies, E2E build inputs, build configuration, toolchain or provisioning profile invalidate the cache. Cache invalidation has a standalone regression check. Only the app bundle is cached, never wallet data or the signing keychain.

## Failures and retries

Keep the application's original native modal presentation. Record Catalyst alert limitations as TODOs in tests rather than changing production presentation for automation. Informational import confirmations are dismissed when available; if absent, the test logs a TODO and still verifies the imported wallet and persistence after restart. An absent operation result, failed click or transport error remains a failure. Blocking input/confirmation subflows are explicitly deferred when they cannot continue.

Cases are independent. CI allows up to three attempts per failed case (`E2E_RETRIES=2`, `E2E_FAIL_FAST=0`). Successful cases are not repeated. Jest reports the errors before retrying, and each start/pass log includes its attempt number. A case that fails all three attempts fails the job; retries never convert an unexecuted test into a pass. The custom fail-fast environment is disabled in this mode so it cannot skip a failed case's retries.

An Appium server already listening on port 4723 is reused, including its WebDriverAgent runner. Restart that runner (the `xcodebuild … WebDriverAgentMac` process) after rebuilding the app or after terminating the app outside WebDriver, for example with `kill`: the runner then fails every launch with `Not authorized for performing UI testing actions`.

Local runs default to a single attempt and fail-fast. For the same retry policy as CI, use `E2E_RETRIES=2 E2E_FAIL_FAST=0 npm run e2e:catalyst:test`. To diagnose only the initial failure, use `E2E_RETRIES=0 E2E_FAIL_FAST=1`: cleanup and diagnostics still run, remaining cases are reported as not run, and Jest bail prevents subsequent files from starting.

Each attempt resets app state. Failed attempts discard their WebDriver session before the next case or retry. Teardown hooks also collect diagnostics for Jest timeouts; a late completion cannot mark a later attempt as passed. There are no persisted pass markers. The ten-minute transport timeout applies only to initial session creation; subsequent requests have a one-minute timeout and are not automatically replayed.

Hosted Intel's virtual GPU can abort in RenderBox when loading a Metal shader archive. The harness passes `RB_USE_BINARY_ARCHIVE=0` only to the app on hosted CI; recheck this workaround when the runner image changes. Long compound cases have individual twenty-minute budgets, while element and command waits stay bounded. The build has a two-hour ceiling; each matrix test job has four hours, including retries and diagnostics. Commands from a timed-out test body are rejected before reaching WebDriver, while teardown can still save diagnostics.

Failures save accessibility XML, Appium logs, app-window screenshots and video under `artifacts/`. Videos from successful attempts are discarded. CI uploads diagnostics only if the test job fails; successful jobs upload none, including when a retry recovered. Local screenshots are disabled because XCTest captures overlapping windows, even when asked for an app-window image. Accessibility XML, native logs and the Appium server log (rewritten in global teardown) are written with the values of `HD_MNEMONIC`, `HD_MNEMONIC_BIP84` and `MNEMONICS_COBO` replaced by `[redacted]`, including their base64 form from clipboard pastes and the numbered words of the seed screen; screenshots and video are not redacted, so treat failure artifacts of funded cases as sensitive, as with the mobile Detox artifacts. Video captures the display, so it is enabled by default only on CI or with `E2E_RECORD_VIDEO=1`. Global teardown restores clipboard text even if the last WebDriver session crashed.

CI failures also collect native logs and available BlueWallet crash reports.

If a run is forcibly killed before teardown, select your previous keyboard input source manually. Normal completion and setup failures restore it automatically.

## Test dependency security

Mac2's bundled `shell-quote` needs a security patch in addition to the npm override. See [patch details and removal criteria](../../patches/README.md). `tests/unit/catalyst-shell-quote.test.ts` checks both installed copies.
