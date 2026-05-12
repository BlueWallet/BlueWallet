# BlueWallet Translation Vocabulary

Reference glossary for translating BlueWallet's UI strings. Use this file as ground truth when improving or generating translations with LLMs — it documents the **chosen** rendering of each term per language (not just any literal dictionary translation) plus the reasoning behind those choices.

## How to use

1. Find the term in **Glossary of terms** for the English meaning + nuance (e.g. "Bitcoin the network" vs "bitcoin the unit").
2. Open the **per-language section** for the target locale.
3. Translate the new string consistent with the table. If you must deviate (context demands it), add a note here.
4. If a term is missing or marked **TODO**, propose a value and update both the per-language table and (if cross-cutting) the glossary.

Conventions:
- Brand/protocol names (Bitcoin, Lightning, Electrum, LNDhub, LNURL, Tor, PSBT) generally stay **untranslated** — capitalise as in English.
- Unit `sats` is lowercase; `BTC` is uppercase.
- Where the existing locale file already commits to a rendering, the table reflects what the app ships today. Discrepancies = TODO.

Sources: `loc/en.json` (canonical) + each locale file. Strings quoted verbatim where extracted.

---

## Categories

Terms are grouped into 10 categories. Same order is used in the glossary and in every per-language section.

1. **Brand & protocol** — proper nouns; usually untranslated.
2. **Units & amounts** — bitcoin, sats, fee-rate units.
3. **Wallet, keys & seeds** — wallet types, keys, mnemonics, derivation, fingerprints.
4. **On-chain transactions** — tx parts, states, broadcast, explorers, layer filters.
5. **Fees & fee bumping** — fee terminology and RBF / CPFP.
6. **Lightning** — invoices, payments, preimage.
7. **Multisig & advanced addressing** — co-signers, PSBT, BIP47, SilentPayment.
8. **Coin control** — UTXO management.
9. **Security & storage** — encryption, biometrics, plausible deniability.
10. **Backup, import & UX** — backup/restore, common verbs, QR/clipboard/memo.

---

## Glossary of terms

### 1. Brand & protocol

| Term | Meaning |
|------|---------|
| **Bitcoin** | The network/protocol. Capitalised. As the unit, lowercase "bitcoin" or `BTC`. |
| **Lightning / Lightning Network** | Layer-2 payment network on top of Bitcoin. Brand-style term; usually left in English. |
| **Electrum (server)** | Electrum protocol server BlueWallet uses for on-chain data. Brand. |
| **LNDhub** | Custodial Lightning backend service. Brand/proper noun. |
| **LND** | Lightning Network Daemon. Brand. |
| **LNURL** | URL-based Lightning protocol family (LNURL-pay, LNURL-withdraw). Brand. |
| **Tor** | The Tor anonymity network. Brand. |
| **Orbot** | Tor proxy app on Android required for routing BlueWallet over Tor. Brand. |
| **GroundControl** | BlueWallet's open-source push-notification server. Brand. |

### 2. Units & amounts

| Term | Meaning |
|------|---------|
| **bitcoin / BTC** | Unit of currency. 1 BTC = 100,000,000 sats. |
| **sats / satoshis** | Smallest Bitcoin unit (1 sat = 0.00000001 BTC). Lowercase. |
| **sat/vByte** | Fee rate unit: satoshis per virtual byte. Casing matters (lowercase `sat`, capital `B` in `vByte`). |
| **vByte** | Virtual byte — SegWit-discounted size unit. |

### 3. Wallet, keys & seeds

| Term | Meaning |
|------|---------|
| **Wallet** | A keyset + UI for managing funds. BlueWallet supports many wallet types (HD, SegWit, Taproot, Multisig, Lightning, Watch-only). |
| **Vault** | BlueWallet's user-facing name for a multisig wallet. |
| **Watch-only** | Wallet that holds only public keys; can view but not spend. |
| **Hardware wallet** | External signing device (Coldcard, Trezor, Ledger, etc.). |
| **Seed** | Often used interchangeably with mnemonic in the UI. |
| **Mnemonic / Seed phrase** | BIP39 word list that encodes the wallet's master seed. |
| **Passphrase** | BIP39 optional 25th word. Distinct from device "passcode" or app "password". |
| **Public key** | Asymmetric pubkey; derives addresses. |
| **Private key** | Asymmetric privkey; signs transactions. |
| **WIF** | Wallet Import Format — base58-encoded private key. Acronym kept. |
| **xpub / extended public key** | BIP32 extended public key. Acronym kept. |
| **Descriptor** | Output descriptor — script template describing how to spend an output (`wpkh(...)`, `wsh(multi(...))`). |
| **Derivation path** | BIP32 path describing how a key is derived from the master seed (e.g. `m/84'/0'/0'`). |
| **Master fingerprint** | First 4 bytes of HASH160(master pubkey). Identifies a wallet's root key. |
| **BIP38** | Password-protected private-key encoding. Acronym kept. |

### 4. On-chain transactions

| Term | Meaning |
|------|---------|
| **Transaction (tx)** | An on-chain Bitcoin transaction. |
| **Address** | A destination for receiving on-chain bitcoin. |
| **Input** | A tx input — spends a previous UTXO. |
| **Output** | A tx output — creates a spendable UTXO. |
| **UTXO** | Unspent Transaction Output. Acronym kept. |
| **Change (output)** | The leftover output that returns to the sender's wallet. |
| **Hex** | Hexadecimal-encoded transaction blob. |
| **Pending** | Tx broadcast but not yet in a block. |
| **Unconfirmed** | Tx in mempool, no confirmations. |
| **Confirmed** | Tx mined with ≥1 confirmation. |
| **Mempool** | Pool of unconfirmed transactions. |
| **Broadcast** | Verb: to submit a signed tx to the network. |
| **Block explorer** | Web service for viewing on-chain data. |
| **Onchain** | Layer-1 Bitcoin filter chip. One word in UI. |
| **Offchain** | Lightning (L2) filter chip. One word in UI. |

### 5. Fees & fee bumping

| Term | Meaning |
|------|---------|
| **Fee / Network fee / Mining fee** | The miner/network fee paid for an on-chain tx. |
| **Fee Bump** | Action of raising a tx's fee post-broadcast (umbrella for RBF + CPFP). |
| **RBF (Replace-by-fee)** | BIP125. Rebroadcasting a tx with a higher fee. Acronym kept; full term often translated. |
| **CPFP (Child-pays-for-parent)** | Fee-bumping by attaching a high-fee child tx. Acronym kept. |
| **Speed Up** | User-facing label for RBF in BlueWallet's tx detail screen. |

### 6. Lightning

| Term | Meaning |
|------|---------|
| **Invoice** | A payment request. In BlueWallet context almost always a Lightning invoice (BOLT11), but the bare word `Invoice` is also used for on-chain payment requests. |
| **Lightning Invoice** | BOLT11 payment request encoded as `lnbc…`. |
| **Preimage** | The 32-byte secret that, when hashed, equals the payment hash; revealing it settles a Lightning payment. Proof of payment. |
| **Payment** | A Lightning payment (distinct from on-chain "Transaction"). |
| **Expired** | Invoice/state that passed its validity window. |

### 7. Multisig & advanced addressing

| Term | Meaning |
|------|---------|
| **Co-signer / Signer** | Participant in a multisig setup who provides a signature. |
| **Quorum** | The m-of-n threshold required to spend from a multisig. |
| **PSBT** | Partially Signed Bitcoin Transaction (BIP174). Acronym kept. |
| **Provide signature** | Action: sign a PSBT as one of the multisig co-signers. |
| **BIP47 / Payment Code** | Reusable, shareable payment code that derives unique addresses per sender. Acronym kept. |
| **Notification transaction** | BIP47-specific 0-value tx that announces a payment code to the recipient. |
| **SilentPayment** | BIP352 reusable static address scheme. Spelled as one word in BlueWallet UI. |

### 8. Coin control

| Term | Meaning |
|------|---------|
| **Coin Control** | Per-UTXO selection feature. Branded as "Coin Control" in BlueWallet UI. |
| **Frozen** | UTXO marked unspendable by the user (won't be auto-selected). |

### 9. Security & storage

| Term | Meaning |
|------|---------|
| **Encrypted storage / Storage encryption** | Whole-app encryption of the wallet store with a password. |
| **Plausible Deniability** | Feature creating a fake encrypted storage with a different password, to disclose under coercion. |
| **Biometrics** | Face ID / Touch ID / fingerprint unlock. |
| **Passcode** | Device-level unlock code (iOS/Android). Distinct from BIP39 passphrase and app password. |

### 10. Backup, import & UX

| Term | Meaning |
|------|---------|
| **Backup / Export** | Saving wallet data (mnemonic, descriptor, file) outside the app. |
| **Restore** | Recreate a wallet from its backup/mnemonic. |
| **Import** | Loading a wallet from a backup or external source. |
| **Voucher** | Azte.co prepaid bitcoin voucher. |
| **Redeem** | Action: convert a voucher into wallet balance. |
| **Send** | Primary user action: spend funds. |
| **Receive** | Primary user action: get an address/invoice. |
| **Settings** | App preferences screen. |
| **Confirm** | User action (also "confirmations" = blocks on a tx). |
| **QR Code** | Square barcode used to share addresses / invoices / PSBTs. |
| **Clipboard** | OS clipboard. |
| **Memo** | Sender note on outgoing tx. |
| **Description** | Free-text label on a receive invoice. |
| **Label** | Free-text annotation on a wallet or address. |

---

## Per-language sections

Each locale lives in its own file under [`vocabulary/`](vocabulary/). One Markdown file per locale, named to match the JSON file (e.g. `pl.md` ↔ `loc/pl.json`). Open the file matching the locale you are editing.

---

## Open TODOs / known issues

### Typos and clear bugs in shipped strings

- **es** `transactions.transaction`: `Transaccion` → `Transacción` (missing accent).
- **es** `lndViewInvoice.lightning_invoice`: `Factura Lighting` → `Factura Lightning`.
- **es** `send/broadcastNone`: "Introduce el hash de la transacción" → should be "hex" not "hash".
- **fr** `lndViewInvoice.lightning_invoice`: `Facture Ligthning` → `Facture Lightning`.
- **fr** `cc.change`: ungrammatical `monnaie rendu` → `Monnaie rendue` or just `Monnaie`.
- **fr** `wallets/details_master_fingerprint`: `Empreinte maitresse` → `Empreinte maîtresse`.
- **fr** `cc/header`: `Controle des UTXO` → `Contrôle des UTXO`.
- **fr** `send/details_adv_fee_bump`: `Autoriser le Fee Bum` → `Autoriser le Fee Bump` (missing "p").
- **fr** `azteco/title`: references `Azte.com` → should be `Azte.co`.
- **de** `cc.change`: `Ändern` (verb "to change") → `Wechselgeld` (change-output).
- **de** `multisig/provide_signature`: `Schlüssel eingeben` (= "enter key") → `Signatur bereitstellen`.
- **pt_br** `send/broadcastNone`: "Insira o Hash da Transação" → should be "Hex" not "Hash".
- **pt_br** `multisig/quorum`: `Quantidade mínima {m} de máxima {n}` semantically wrong (m and n are signers-required and total). Suggest `{m} de {n} (quórum)`.
- **ko** `cc.change`: `변경` ("to change/alter") → `거스름돈` (change-output).
- **ko** `azteco/title`: `제목` ("title") → `바우처` or `Azte.co 바우처`.
- **ko** `receive/details_label`: `형태` ("form/shape") → `설명` (description).
- **ko** `transactions/rbf_title`: `급행 수수료(CPFP)` references CPFP but feature is RBF — fix the acronym.
- **ar** `cc.change`: `تغيير` (alteration) → `الباقي` (remainder/change).
- **ar** Azteco strings reference `Atze.co` → `Azte.co`.

### Ambiguity / consistency issues

- **ru** `wallets/import_passphrase` = "Пароль" — collides with "password". Recommend "Passphrase" or "Кодовая фраза".
- **pt_br** `wallets/import_passphrase` = "Senha" — same ambiguity with "password".
- **ko** `wallets/import_passphrase` = "암호" — same ambiguity.
- **ko** mnemonic backup screen mixes English "mnemonic phrase" inside Korean text — localise to `시드 문구` / `복구 문구`.
- **ko** wallet term inconsistent: `지갑` vs `월렛`. Standardise on `지갑`.
- **ko** clipboard uses non-standard `붙여넣기판` — recommend `클립보드`.
- **zh_cn** `sat/vByte` rendered `聪/字节` drops the "v" prefix; technically incorrect vs SegWit-aware vByte.
- **jp** `wallets/details_derivation_path`: drop redundant English `(derivation path)` parenthetical.
- **ar** `wallets/details_derivation_path`: drop redundant English `(derivation path)` parenthetical.

---

## Adding a new term

1. Decide which of the 10 categories it belongs to.
2. Add a row to **Glossary of terms** under that category with the English meaning.
3. Add a row to each per-language section under the same category (between the category's divider row and the next divider row). Mark unknown values **TODO**.
4. If the term is brand/protocol (capitalised proper noun), default to **keep in English** across locales unless a locale has an established convention.
5. If you change a shipped string in a locale's `.json`, update the corresponding row here in the same PR.
