# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BlueWallet: Bitcoin + Lightning wallet. React Native 0.85, TypeScript strict, Electrum backend. iOS / Android / macOS (Catalyst). Node >= 22.11 (CI uses 24).

## Commands

```bash
npm start                                 # Metro
npm run ios / npm run android             # run app
npm run lint                              # tsc + loc checks + fastlane metadata + eslint (CI gate)
npm run lint:quickfix                     # eslint --fix only changed .js/.ts files
npm run unit                              # jest tests/unit
npx jest tests/unit/foo.test.ts           # one test file
npx jest tests/unit/foo.test.ts -t 'name' # one test case
npm run integration                       # jest tests/integration (hits real Electrum, slow)
npm test                                  # lint + unit + integration
npm run e2e:debug                         # Detox android debug build + test
npm run patches                           # re-apply patches/ (patch-package, also runs on postinstall)
npm run clean / npm run clean:ios         # nuke node_modules, gradle, metro cache / Pods
```

Integration and some unit tests need secrets in env (`HD_MNEMONIC`, `HD_MNEMONIC_BIP84`, `BIP47_HD_MNEMONIC`, `MNEMONICS_COLDCARD`, ...). Missing var = test logs "not set, skipped" and passes. Not a failure.

## Architecture

**Boot:** `index.js` (shims, headless Ark task) -> `App.tsx` (providers + NavigationContainer) -> `navigation/MasterView.tsx`.

**State:** React Context, no Redux. `components/Context/StorageProvider.tsx` wraps the `BlueApp` singleton (`class/blue-app.ts`) which owns wallets, tx/address/counterparty metadata and disk persistence (AsyncStorage + secure keystore, optional encryption; Realm caches txs). `SettingsProvider.tsx` holds prefs. Consume via `hooks/context/useStorage.ts` and `useSettings.ts`.

**Wallets** (`class/wallets/`): class hierarchy, every wallet serializes to JSON and lives in the storage bucket.
- `AbstractWallet` -> `LegacyWallet` -> `SegwitP2SHWallet`, `SegwitBech32Wallet` -> `TaprootWallet`, `WatchOnlyWallet`
- `LegacyWallet` -> `AbstractHDWallet` -> `AbstractHDElectrumWallet` -> `HDSegwitBech32Wallet`, `HDSegwitP2SHWallet`, `HDLegacyP2PKHWallet`, `HDTaprootWallet`, `MultisigHDWallet`, `HDAezeedWallet`, SLIP39 and Electrum-seed variants
- `LegacyWallet` -> `LightningCustodianWallet` (LNDHub) -> `LightningArkWallet`
- `TWallet` union + shared types in `class/wallets/types.ts`. New wallet type must be added there and to `BlueApp` deserialization.

**Network:** `blue_modules/BlueElectrum.ts` is the single Electrum client (module-level singleton). Wallets call it for balance/tx/utxo/broadcast. `blue_modules/currency.ts` handles fiat rates.

**Navigation:** React Navigation 7 native stacks. One `*Stack.tsx` + `*ParamList.ts` per flow in `navigation/`. `navigation/navigationGuard.ts` intercepts guarded routes (biometrics, backup reminder, camera permission) before dispatch. Screens in `screen/<feature>/`.

**Localization:** `loc/en.json` is the only source. Use `loc.section.key` from `loc/index.ts`. Never edit other `loc/*.json`, Transifex owns them. `loc/vocabulary.md` is the term glossary, ground truth when translating by hand or with an LLM. `npm run lint` fails on unused keys and English leftovers.

**Native patches:** `patches/*.patch` applied by patch-package. Each one documented in `patches/README.md` (what / why / upstream link). Update README when adding or removing a patch.

## Rules

@CONTRIBUTING.md

Extra, not in CONTRIBUTING:
- No inline styles, no unused styles (eslint errors). Prettier: single quotes, 140 width, trailing commas, no arrow parens.
- Commit prefix `DEL` also in use for removals.
- Native modules mocked in `tests/setup.js`, add new mocks there.
