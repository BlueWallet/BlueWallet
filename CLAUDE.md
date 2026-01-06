# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlueWallet is a Bitcoin & Lightning Network wallet built with React Native and Electrum. Cross-platform mobile app (iOS/Android/macOS via Catalyst).

## Common Commands

```bash
# Development
npm start                    # Start Metro bundler
npm run ios                  # Run on iOS
npm run android              # Run on Android

# Testing
npm test                     # Full suite (lint + unit + integration)
npm run lint                 # ESLint + TypeScript check + unused loc keys
npm run lint:fix             # Auto-fix linting issues
npm run unit                 # Jest unit tests only

# E2E Testing (Detox)
npm run e2e:debug            # Debug build and test on Android
npm run e2e:release-test     # Release build test

# Clean builds
npm run clean                # Full clean (gradle, cache, node_modules)
npm run clean:ios            # iOS clean (Pods + node_modules)
npm run android:clean        # Android clean
```

## Architecture

**Directory Structure:**
- `components/` - React components and Context providers (SettingsProvider, StorageProvider)
- `class/` - Core business logic including wallet implementations in `class/wallets/`
- `blue_modules/` - Utility modules (BlueElectrum, currency, encryption, etc.)
- `screen/` - Navigation screens organized by feature (wallets, send, receive, settings, lnd)
- `navigation/` - React Navigation setup with typed param lists
- `hooks/` - Custom React hooks (useStorage, useSettings, useBiometrics, etc.)
- `loc/` - Localization files (en.json as source, 55+ languages)
- `models/` - Type definitions for units, fiat, block explorers
- `tests/unit/`, `tests/integration/`, `tests/e2e/` - Test suites

**Wallet System:**
Multiple wallet implementations in `class/wallets/`: Legacy, SegWit (P2SH, Bech32), Taproot, HD variants, Lightning (Custodian, Ark), Multisig, Watch-only. Types defined in `class/wallets/types.ts`.

**State Management:**
React Context providers wrap the app. Custom hooks expose state logic. Realm for database, AsyncStorage for persistence, Keychain for secrets.

**Navigation:**
React Navigation 7.x with native stack. Typed params in `navigation/DetailViewStackParamList.ts` and other param list files.

## Code Conventions

**Commit Prefixes:** REL, FIX, ADD, REF, TST, OPS, DOC (e.g., `"ADD: new feature"`)

**TypeScript:** All new files must be TypeScript. Strict mode enabled.

**Dependencies:** Do not add new dependencies without strong justification. Bonus for removing dependencies.

**Components:** New components go in `components/`, not legacy `BlueComponents.js`.

**Linting Rules:**
- No inline styles in React Native (`react-native/no-inline-styles`: error)
- No unused styles (`react-native/no-unused-styles`: error)
- Prettier: single quotes, 140 char width, trailing commas

**Localization:** Keys in `loc/en.json`. Run `find-unused-loc.js` to detect unused keys.

## Testing

Unit tests in `tests/unit/` use Jest with `assert`. Test setup mocks React Native modules (Clipboard, Push Notifications, Keychain, etc.). Integration tests require environment variables for test mnemonics (HD_MNEMONIC, HD_MNEMONIC_BIP84, etc.).
