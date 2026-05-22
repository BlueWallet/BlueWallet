# Prompt Helper Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `helpers/prompt`'s 7 fragile positional arguments with `prompt(title, text, options?)`.

**Architecture:** `title` and `text` stay positional (passed at every call site). The 5 trailing optional args move into a `PromptOptions` object. Helper internals are unchanged — only the source of the values changes. All 9 affected call sites migrate. TypeScript verifies completeness.

**Tech Stack:** React Native, TypeScript, `react-native-prompt-android`, Jest.

**Spec:** `docs/superpowers/specs/2026-05-20-prompt-refactor-design.md`

**Do NOT commit.** Per user instruction this branch is left uncommitted. Every task ends with verification, not a commit.

**Compilation note:** After Task 1 alone, `tsc` fails — the helper signature no longer matches its callers. This is expected. The codebase compiles again only after Task 2 finishes. Run `tsc` verification in Task 3, not before.

---

### Task 1: Refactor the `helpers/prompt` helper

**Files:**
- Modify: `helpers/prompt.ts` (entire file)

- [ ] **Step 1: Rewrite `helpers/prompt.ts`**

Replace the full file contents with:

```ts
import { Platform } from 'react-native';
import prompt from 'react-native-prompt-android';
import loc from '../loc';

type PromptOptions = {
  cancelable?: boolean;
  type?: PromptType | PromptTypeIOS | PromptTypeAndroid;
  destructive?: boolean;
  continueButtonText?: string;
  defaultValue?: string;
};

export default (title: string, text: string, options: PromptOptions = {}): Promise<string> => {
  const { cancelable = true, destructive = false, continueButtonText = loc._.ok, defaultValue } = options;
  let { type = 'secure-text' } = options;

  const keyboardType = type === 'numeric' ? 'numeric' : 'default';

  if (Platform.OS === 'ios' && type === 'numeric') {
    // `react-native-prompt-android` on ios does not support numeric input
    type = 'plain-text';
  }

  return new Promise((resolve, reject) => {
    const buttons: Array<PromptButton> = cancelable
      ? [
          {
            text: loc._.cancel,
            onPress: () => {
              reject(Error('Cancel Pressed'));
            },
            style: 'cancel',
          },
          {
            text: continueButtonText,
            onPress: password => {
              console.log('OK Pressed');
              resolve(password);
            },
            style: destructive ? 'destructive' : 'default',
          },
        ]
      : [
          {
            text: continueButtonText,
            onPress: password => {
              console.log('OK Pressed');
              resolve(password);
            },
          },
        ];

    const message = defaultValue !== undefined ? '' : text;
    prompt(title, message, buttons, {
      type,
      cancelable,
      // @ts-ignore suppressed because its supported only on ios and is absent from type definitions
      keyboardType,
      ...(defaultValue !== undefined && { defaultValue }),
    });
  });
};
```

Notes:
- `PromptType`, `PromptTypeIOS`, `PromptTypeAndroid`, `PromptButton` are global ambient types from `react-native-prompt-android/index.d.ts` — no import needed (same as before).
- `type` uses `let` because the iOS-numeric workaround reassigns it.
- The `// @ts-ignore` comment and message-blanking behavior are carried over unchanged.

- [ ] **Step 2: Verify the file type-checks in isolation**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "helpers/prompt"`
Expected: no output (the helper file itself has no type errors). Call-site errors elsewhere are expected at this stage — they are fixed in Task 2.

---

### Task 2: Migrate the 9 call sites

**Files:**
- Modify: `screen/transactions/TransactionStatus.tsx:680`
- Modify: `screen/wallets/WalletDetails.tsx:157`, `screen/wallets/WalletDetails.tsx:489`
- Modify: `screen/wallets/addMultisigStep2.tsx:289`, `screen/wallets/addMultisigStep2.tsx:300`
- Modify: `screen/wallets/PaymentCodesList.tsx:137`, `screen/wallets/PaymentCodesList.tsx:248`
- Modify: `screen/lnd/lnurlPay.tsx:143`
- Modify: `blue_modules/start-and-decrypt.ts:26`

The 3 two-arg call sites (`ImportWalletDiscovery.tsx:109`, `addMultisigStep2.tsx:362`, `ViewEditMultisigCosigners.tsx:422`) need no change.

- [ ] **Step 1: `screen/transactions/TransactionStatus.tsx`**

Replace:
```ts
      const newMemo = await prompt(loc.send.details_note_placeholder, '', true, 'plain-text', false, undefined, currentMemo);
```
with:
```ts
      const newMemo = await prompt(loc.send.details_note_placeholder, '', { type: 'plain-text', defaultValue: currentMemo });
```

- [ ] **Step 2: `screen/wallets/WalletDetails.tsx` — delete confirmation prompt**

Replace:
```ts
      const walletBalanceConfirmation = await prompt(
        loc.wallets.details_delete_wallet,
        loc.formatString(loc.wallets.details_del_wb_q, { balance }),
        true,
        'numeric',
        true,
        loc.wallets.details_delete,
      );
```
with:
```ts
      const walletBalanceConfirmation = await prompt(
        loc.wallets.details_delete_wallet,
        loc.formatString(loc.wallets.details_del_wb_q, { balance }),
        { type: 'numeric', destructive: true, continueButtonText: loc.wallets.details_delete },
      );
```

- [ ] **Step 3: `screen/wallets/WalletDetails.tsx` — rename prompt**

Replace:
```ts
      const newName = await prompt(loc.wallets.add_wallet_name, '', true, 'plain-text', false, undefined, wallet.getLabel());
```
with:
```ts
      const newName = await prompt(loc.wallets.add_wallet_name, '', { type: 'plain-text', defaultValue: wallet.getLabel() });
```

- [ ] **Step 4: `screen/wallets/addMultisigStep2.tsx` — fingerprint prompt**

Replace:
```ts
          fp = await prompt(loc.multisig.input_fp, loc.multisig.input_fp_explain, true, 'plain-text');
```
with:
```ts
          fp = await prompt(loc.multisig.input_fp, loc.multisig.input_fp_explain, { type: 'plain-text' });
```

- [ ] **Step 5: `screen/wallets/addMultisigStep2.tsx` — path prompt**

Replace:
```ts
          path = await prompt(
            loc.multisig.input_path,
            loc.formatString(loc.multisig.input_path_explain, { default: getPath() }),
            true,
            'plain-text',
          );
```
with:
```ts
          path = await prompt(
            loc.multisig.input_path,
            loc.formatString(loc.multisig.input_path_explain, { default: getPath() }),
            { type: 'plain-text' },
          );
```

- [ ] **Step 6: `screen/wallets/PaymentCodesList.tsx` — rename prompt**

Replace:
```ts
        const newName = await prompt(loc.bip47.rename, loc.bip47.provide_name, true, 'plain-text');
```
with:
```ts
        const newName = await prompt(loc.bip47.rename, loc.bip47.provide_name, { type: 'plain-text' });
```

- [ ] **Step 7: `screen/wallets/PaymentCodesList.tsx` — add contact prompt**

Replace:
```ts
      const newPc = await prompt(loc.bip47.add_contact, loc.bip47.provide_payment_code, true, 'plain-text');
```
with:
```ts
      const newPc = await prompt(loc.bip47.add_contact, loc.bip47.provide_payment_code, { type: 'plain-text' });
```

- [ ] **Step 8: `screen/lnd/lnurlPay.tsx` — comment prompt**

Replace:
```ts
        comment = await prompt('Comment', '', false, 'plain-text');
```
with:
```ts
        comment = await prompt('Comment', '', { cancelable: false, type: 'plain-text' });
```

- [ ] **Step 9: `blue_modules/start-and-decrypt.ts` — password prompt**

Replace:
```ts
        password = await prompt((retry && loc._.bad_password) || loc._.enter_password, loc._.storage_is_encrypted, false);
```
with:
```ts
        password = await prompt((retry && loc._.bad_password) || loc._.enter_password, loc._.storage_is_encrypted, { cancelable: false });
```

---

### Task 3: Verify

**Files:** none (verification only)

- [ ] **Step 1: TypeScript + lint**

Run: `npm run lint`
Expected: PASS. No errors. In particular, no `prompt` arity or argument-type errors. If `tsc` reports an error at a `prompt(` call, a call site was missed or malformed — fix it.

- [ ] **Step 2: Unit tests**

Run: `npm run unit`
Expected: PASS. `tests/unit/transaction-status.test.tsx` mocks `helpers/prompt` as a `jest.fn`, so its behavior is unaffected by the signature change.

- [ ] **Step 3: Sanity grep for stale positional calls**

Run: `grep -rn "prompt(" --include='*.ts' --include='*.tsx' --include='*.js' screen blue_modules | grep -v "react-native-prompt" | grep -E "prompt\([^)]*,\s*(true|false)\s*,"`
Expected: no output. Any match is a call site still passing a positional boolean — migrate it.

---

## Out of scope

- Anchor support (not supported by `react-native-prompt-android` or RN `Alert.prompt`).
- Removing the `react-native-prompt-android` dependency (it provides the native Android prompt).
- Committing — branch stays uncommitted per user instruction.
