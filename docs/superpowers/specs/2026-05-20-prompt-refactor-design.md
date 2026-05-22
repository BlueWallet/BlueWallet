# Design: refactor `helpers/prompt`

Date: 2026-05-20
Branch: `wallet-details`
Origin: BlueWallet/BlueWallet PR #8301 review thread (`screen/wallets/WalletDetails.tsx:489`).

## Problem

`helpers/prompt` takes 7 positional arguments:

```ts
(title, text, isCancelable, type, isOKDestructive, continueButtonText, defaultInputValue)
```

The trailing 5 optional args are fragile. In PR #8301 a code-quality bot miscounted the
arity ("only accepts 6 args"), and reviewer @marcosrdz called the helper "so fragile" and
asked for a clearer interface. A positional `undefined` placeholder is needed today just to
reach `defaultInputValue` (see `WalletDetails.tsx:489`).

## Investigated and rejected

- **Drop `react-native-prompt-android`.** Not possible. The package ships native Android
  Java code (`RNPromptModule.java`, `NativeModules.PromptAndroid`) and is the only Android
  prompt implementation. RN's `Alert.prompt` is iOS-only.
- **Add an `anchor` option** (reviewer suggestion). Not possible. Neither
  `react-native-prompt-android` nor RN `Alert.prompt` accept an anchor parameter. Out of
  scope; report this finding back on the PR thread.

## Design

Keep `title` and `text` positional (passed at every call site). Move the 5 fragile
trailing args into an optional `options` object.

### New signature

```ts
type PromptOptions = {
  cancelable?: boolean;        // default true
  type?: PromptType | PromptTypeIOS | PromptTypeAndroid; // default 'secure-text'
  destructive?: boolean;       // default false — OK button uses 'destructive' style
  continueButtonText?: string; // default loc._.ok
  defaultValue?: string;       // prefills the input field
};

export default (title: string, text: string, options?: PromptOptions): Promise<string>
```

Renames (aligning with the lib's own `PromptOptions` field names):

| old positional param | new options field |
| -------------------- | ----------------- |
| `isCancelable`       | `cancelable`      |
| `type`               | `type`            |
| `isOKDestructive`    | `destructive`     |
| `continueButtonText` | `continueButtonText` |
| `defaultInputValue`  | `defaultValue`    |

### Internals

Logic unchanged. Destructure with defaults at the top, handling `options` being
`undefined`:

```ts
const { cancelable = true, type = 'secure-text', destructive = false,
        continueButtonText = loc._.ok, defaultValue } = options ?? {};
```

Everything downstream (button array build, `keyboardType` derivation, iOS
`numeric`→`plain-text` workaround, message-blanking when `defaultValue` is set) reads
these locals instead of positional params. No behavior change.

## Call site migration

12 call sites. 3 are two-arg calls — untouched. 9 migrate trailing args into an object.

| # | File:line | Change |
|---|-----------|--------|
| 1 | `screen/transactions/TransactionStatus.tsx:680` | `{ type: 'plain-text', defaultValue: currentMemo }` |
| 2 | `screen/wallets/WalletDetails.tsx:157` | `{ type: 'numeric', destructive: true, continueButtonText: loc.wallets.details_delete }` |
| 3 | `screen/wallets/WalletDetails.tsx:489` | `{ type: 'plain-text', defaultValue: wallet.getLabel() }` |
| 4 | `screen/wallets/ImportWalletDiscovery.tsx:109` | unchanged (2-arg) |
| 5 | `screen/wallets/addMultisigStep2.tsx:289` | `{ type: 'plain-text' }` |
| 6 | `screen/wallets/addMultisigStep2.tsx:300` | `{ type: 'plain-text' }` |
| 7 | `screen/wallets/addMultisigStep2.tsx:362` | unchanged (2-arg) |
| 8 | `screen/wallets/PaymentCodesList.tsx:137` | `{ type: 'plain-text' }` |
| 9 | `screen/wallets/PaymentCodesList.tsx:248` | `{ type: 'plain-text' }` |
| 10 | `screen/wallets/ViewEditMultisigCosigners.tsx:422` | unchanged (2-arg) |
| 11 | `screen/lnd/lnurlPay.tsx:143` | `{ cancelable: false, type: 'plain-text' }` |
| 12 | `blue_modules/start-and-decrypt.ts:26` | `{ cancelable: false }` |

Note: sites 5/6/8/9 pass `isCancelable: true` today, which is the default — the
`{ type: 'plain-text' }` object omits it.

## Testing

- `tests/unit/transaction-status.test.tsx:114` mocks the helper as a `jest.fn` — no change.
- Verify: `npm run lint` (ESLint + `tsc`) and `npm run unit` pass.
- TypeScript catches any missed/malformed call site at compile time.

## Out of scope

- Anchor support.
- Removing `react-native-prompt-android`.
- Any change to prompt UI/behavior.
