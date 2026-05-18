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

## External reference translations

When picking or vetting a translation for a new term, cross-check how mature Bitcoin/Lightning wallets render the same term. Cite the source in the Notes column when borrowing a rendering. Do **not** blindly copy — verify the term still matches BlueWallet's UX context first.

### Wallet sources (primary)

| Project | Format | Path / URL | Coverage |
|---------|--------|------------|----------|
| **Bitcoin Core** — reference Bitcoin client | Qt `.ts` / `.xlf` per locale | <https://github.com/bitcoin/bitcoin/tree/master/src/qt/locale> (`bitcoin_<locale>.ts`) | Authoritative on-chain vocabulary (transaction, address, fee, mempool, PSBT, RBF, descriptor, UTXO). Most widely-translated. |
| **Electrum** — long-running reference SPV wallet | gettext `.po` per locale | <https://github.com/spesmilo/electrum-locale/tree/master/locale> (`<locale>/electrum.po`) | Decades of translator polish for on-chain + advanced UX (descriptors, fee bumping, hardware, Lightning). 60+ locales. |
| **Phoenix** (ACINQ) — Lightning wallet | Android XML `strings.xml` per locale | <https://github.com/ACINQ/phoenix/tree/master/phoenix-android/src/main/res/> (`values-<locale>/strings.xml`) | Strong Lightning vocabulary (invoice, channel, liquidity, swap, BOLT11/12). |
| **Zeus** (ZeusLN) — Lightning mobile wallet | JSON per locale | <https://github.com/ZeusLN/zeus/tree/master/locales> (`<locale>.json`) | Lightning + node management terms; similar JSON layout to BlueWallet's own files. |
| **Trezor Suite** — hardware-wallet companion | JSON `messages.json` per locale | <https://github.com/trezor/trezor-suite/tree/develop/packages/suite-data/files/translations> | Multisig / passphrase / derivation / Coinjoin vocabulary; precise hardware-wallet terms. |
| **Green** (Blockstream) — Bitcoin + Liquid wallet | Compose MP string resources per locale | <https://github.com/Blockstream/green_android/tree/master/compose/src/commonMain/composeResources> (`values-<locale>/strings.xml`) | Multisig, hardware, Lightning + Liquid asset vocabulary. |
| **Bisq** — P2P Bitcoin exchange | Java `.properties` per locale | <https://github.com/bisq-network/bisq/tree/master/core/src/main/resources/i18n> (`displayStrings_<locale>.properties`) | Trade, fee, escrow, deposit terminology; mature for ~30 languages. |
| **Cake Wallet** — multi-currency mobile wallet | Flutter `.arb` per locale | <https://github.com/cake-tech/cake_wallet/tree/main/res/values> (`strings_<locale>.arb`) | 25+ languages including non-Latin (Burmese, Hausa, Yoruba, Urdu). Useful when other refs don't cover a locale. |
| **Mycelium** — Android Bitcoin wallet | Android XML per locale | <https://github.com/mycelium-com/wallet-android/tree/master/mbw/src/main/res> (`values-<locale>/strings.xml`) | Long-standing Android-Bitcoin idioms (legacy mobile vocabulary). |
| **Samourai Wallet** (archived) — Android privacy wallet | Android XML per locale | <https://github.com/Samourai-Wallet/samourai-wallet-android/tree/develop/app/src/main/res> (`values-<locale>/strings.xml`) | Coin control, mixing, fee bumping. Archive only — verify terms still current. |
| **Breez** — Lightning self-custodial mobile | Dart i18n | <https://github.com/breez/Breez-Translations> | Lightning UX terms (send, receive, swap, channel state) for the mobile flow. |

### Wikipedia (native-script references)

For locales where wallet projects don't cover the language well, or to validate a culturally-natural rendering of a concept, fetch the **Wikipedia article in that language** for the underlying term. Wikipedia article titles + opening paragraphs are often the most-cited native rendering of a technical concept.

Useful interwiki anchors (English title → follow the language switcher in the left sidebar):

| English term | Wikipedia anchor |
|--------------|------------------|
| Bitcoin | <https://en.wikipedia.org/wiki/Bitcoin> |
| Lightning Network | <https://en.wikipedia.org/wiki/Lightning_Network> |
| Bitcoin Core | <https://en.wikipedia.org/wiki/Bitcoin_Core> |
| Cryptographic hash function | <https://en.wikipedia.org/wiki/Cryptographic_hash_function> |
| Public-key cryptography | <https://en.wikipedia.org/wiki/Public-key_cryptography> |
| Mnemonic phrase / BIP39 | <https://en.wikipedia.org/wiki/BIP39> |
| Multi-signature | <https://en.wikipedia.org/wiki/Multisignature> |
| QR code | <https://en.wikipedia.org/wiki/QR_code> |
| Hexadecimal | <https://en.wikipedia.org/wiki/Hexadecimal> |
| Plausible deniability | <https://en.wikipedia.org/wiki/Plausible_deniability> |
| Tor (network) | <https://en.wikipedia.org/wiki/Tor_(network)> |

Use Wikipedia only as a tie-breaker / cultural validator. Wallet UI prefers a shorter, terser rendering than Wikipedia's article title (e.g. `Адреса` not `Криптовалютна адреса`).

### How to use these

1. Identify the term and target locale (e.g. "derivation path" in Czech).
2. Open the matching upstream file (Bitcoin Core's `bitcoin_cs.ts`, Electrum's `cs/electrum.po`, etc.).
3. Search for the English term; copy the established translation if it fits BlueWallet's screen.
4. If sources disagree, fall back to the Wikipedia article in the target language to see which form is most idiomatic.
5. Update `loc/<locale>.json` and the corresponding row in `loc/vocabulary/<locale>.md`; in **Notes**, cite the source, e.g. `Notes: matches Bitcoin Core cs` or `Notes: per cs.wikipedia.org/wiki/Lightning_Network`.

### Priority when sources disagree

1. **Bitcoin Core** — on-chain terms (transaction, address, fee, PSBT, RBF, descriptor, UTXO).
2. **Electrum** — fallback on-chain + early Lightning + hardware.
3. **Phoenix** / **Zeus** / **Breez** — Lightning-specific (invoice, channel, swap, liquidity).
4. **Trezor Suite** — multisig, hardware, passphrase, Coinjoin.
5. **Green** / **Bisq** — tie-breakers; Bisq is good for trade/fee terms.
6. **Cake** / **Mycelium** / **Samourai** — mobile UX + locales the others miss.
7. **Wikipedia** in the target language — cultural fit / native rendering.

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

## Vocabulary entry conventions

These rules apply to every per-language file. The English glossary below uses the same conventions.

1. **POS column.** Every term carries a part-of-speech: `noun` / `verb` / `adj` / `acronym` / `brand`. The Translation in per-language files **must** match the POS. If the English term is a noun, store a noun in the target language. If a UI string actually uses the verb, list both forms (see rule 4).
2. **Canonical form = noun unless UI uses verb.** Default to the noun form (e.g. *Payment* → noun *Платіж*, **not** verb *Оплатити*). Add the verb form as a secondary entry only when at least one shipped UI string uses it.
3. **Target-locale natural casing.** Do **not** mirror English Title Case. Use the casing the target locale uses for ordinary nouns (Cyrillic, Greek, Arabic, etc. are usually lowercase). Brand rows are the only exception.
4. **Multi-form syntax: `compact / explanatory` (or `noun / verb`), leftmost = preferred.** When two valid forms exist (chip-label vs body-text, technical vs mainstream, noun vs verb), list them slash-separated in the Translation column. The Notes column tags them, e.g. `chip / body` or `noun / verb` or `technical / mainstream`. Translator picks the form that fits the screen.
5. **Brand rows are not translated.** Rows marked `brand` in the POS column keep the English spelling unless the target locale has an established Cyrillic/Hangul/Devanagari/etc. transliteration in widespread use. When in doubt, keep Latin.
6. **Acronyms stay as-is; gloss is optional.** Rows marked `acronym` keep the English letters (RBF, CPFP, PSBT, WIF, BIP38, BIP47, xpub, UTXO, LNURL). A target-locale explanatory gloss may appear in Notes, never as the Translation value.
7. **Anti-meaning callouts.** If a term has a dangerous look-alike in many locales (verb-vs-noun, modify-vs-leftover, etc.), the Notes column starts with `⚠️ NOT <wrong meaning>`. Don't drop these callouts when filling.
8. **Source citation.** When you fill a row from an upstream wallet or Wikipedia, append the source: `Notes: <meaning> · Bitcoin Core cs` or `· uk.wikipedia.org/wiki/<Article>`.

---

## Glossary of terms

### 1. Brand & protocol

| Term | POS | Meaning |
|------|-----|---------|
| **Bitcoin** | brand | The network/protocol. Capitalised. As the unit, lowercase "bitcoin" or `BTC`. |
| **Lightning / Lightning Network** | brand | Layer-2 payment network on top of Bitcoin. Usually left in English. |
| **Electrum (server)** | brand | Electrum protocol server BlueWallet uses for on-chain data. |
| **LNDhub** | brand | Custodial Lightning backend service. |
| **LND** | brand | Lightning Network Daemon. |
| **LNURL** | brand | URL-based Lightning protocol family (LNURL-pay, LNURL-withdraw). |
| **Tor** | brand | The Tor anonymity network. |
| **Orbot** | brand | Tor proxy app on Android required for routing BlueWallet over Tor. |
| **GroundControl** | brand | BlueWallet's open-source push-notification server. |

### 2. Units & amounts

| Term | POS | Meaning |
|------|-----|---------|
| **bitcoin / BTC** | noun | Unit of currency. 1 BTC = 100,000,000 sats. `BTC` is the ticker; `bitcoin` is the unit name. |
| **sats / satoshis** | noun | Smallest Bitcoin unit (1 sat = 0.00000001 BTC). Lowercase. |
| **sat/vByte** | noun | Fee rate unit: satoshis per virtual byte. Casing matters: lowercase `sat`, capital `B` in `vByte`. |
| **vByte** | noun | Virtual byte — SegWit-discounted size unit. |

### 3. Wallet, keys & seeds

| Term | POS | Meaning |
|------|-----|---------|
| **Wallet** | noun | A keyset + UI for managing funds. Use target-locale lowercase. |
| **Vault** | noun | BlueWallet's user-facing name for a multisig wallet. **NOT** a brand — translate using target-locale word for "safe / strongbox" (e.g. `сейф`, `Tresor`, `coffre-fort`). |
| **Watch-only** | adj | Wallet that holds only public keys; can view but not spend. ⚠️ NOT "view mode" / "read mode" — it's specifically a wallet type. |
| **Hardware wallet** | noun | External signing device (Coldcard, Trezor, Ledger). |
| **Seed** | noun | The BIP39 mnemonic. In mainstream UI prefer the locale's word for "recovery phrase" over a transliteration of "seed". List both forms when applicable (`seed-фраза / фраза відновлення`). |
| **Mnemonic / Seed phrase** | noun | BIP39 word list that encodes the wallet's master seed. |
| **Passphrase** | noun | BIP39 optional 25th word. ⚠️ NOT the device "passcode" and NOT the app "password" — use a distinct word (e.g. `Кодова фраза`, not `Пароль`). |
| **Public key** | noun | Asymmetric pubkey; derives addresses. Target-locale lowercase. |
| **Private key** | noun | Asymmetric privkey; signs transactions. Target-locale lowercase. |
| **WIF** | acronym | Wallet Import Format — base58-encoded private key. Letters kept; gloss in Notes if helpful. |
| **xpub / extended public key** | acronym | BIP32 extended public key. Letters kept; prefer lowercase `xpub` (only force `XPUB` if the locale's convention does). |
| **Descriptor** | noun | Output descriptor — script template describing how to spend an output (`wpkh(...)`, `wsh(multi(...))`). |
| **Derivation path** | noun | BIP32 path (e.g. `m/84'/0'/0'`). |
| **Master fingerprint** | noun | First 4 bytes of HASH160(master pubkey). Identifies a wallet's root key. |
| **BIP38** | acronym | Password-protected private-key encoding. Letters kept. ⚠️ NOT a verb / NOT "password" alone — keep `BIP38` as the term. |

### 4. On-chain transactions

| Term | POS | Meaning |
|------|-----|---------|
| **Transaction (tx)** | noun | An on-chain Bitcoin transaction. |
| **Address** | noun | A destination for receiving on-chain bitcoin. |
| **Input** | noun | A tx input — spends a previous UTXO. ⚠️ NOT "login / entrance" — pair with `вихід` / `output` if the locale's "вхід"-like word is ambiguous; list `<short> / <full>` (e.g. `вхід / вхід транзакції`). |
| **Output** | noun | A tx output — creates a spendable UTXO. ⚠️ NOT the UI recipient label "To:" (that is a separate UI string). |
| **UTXO** | acronym | Unspent Transaction Output. Letters kept. |
| **Change (output)** | noun | The leftover output that returns to the sender's wallet. ⚠️ NOT the verb "to change/modify" — must be a noun (e.g. `здача`, `Wechselgeld`, `Resto`). |
| **Hex** | noun | Hexadecimal-encoded transaction blob. List as `hex / hex-дані / шістнадцяткові дані` style: short form first, explanatory form second. ⚠️ NOT "hash" and NOT "transaction data". |
| **Pending** | adj | Tx broadcast but not yet in a block. Adjective/state form; **not** the noun "expectation/waiting". |
| **Unconfirmed** | adj | Tx in mempool, no confirmations. Use the adjective state form. |
| **Confirmed** | adj | Tx mined with ≥1 confirmation. Adjective state form. |
| **Mempool** | noun | Pool of unconfirmed transactions. |
| **Broadcast** | verb / noun | Verb: to submit a signed tx to the network. List both `verb / noun` if both are used in the UI (button vs status). |
| **Block explorer** | noun | Web service for viewing on-chain data. |
| **Onchain** | adj | Layer-1 Bitcoin filter chip. List `compact / explanatory` (e.g. `он-чейн / у блокчейні`). |
| **Offchain** | adj | Lightning (L2) filter chip. List `compact / explanatory` (e.g. `оф-чейн / поза блокчейном`). |

### 5. Fees & fee bumping

| Term | POS | Meaning |
|------|-----|---------|
| **Fee / Network fee / Mining fee** | noun | The miner/network fee paid for an on-chain tx. |
| **Fee Bump** | noun | Action of raising a tx's fee post-broadcast (umbrella for RBF + CPFP). |
| **RBF (Replace-by-fee)** | acronym | BIP125. Acronym kept; gloss optional in Notes (e.g. "замінити за комісією"). |
| **CPFP (Child-pays-for-parent)** | acronym | Fee-bumping by attaching a high-fee child tx. Acronym kept. ⚠️ NOT a verb like "Create" — `CPFP` stays as `CPFP`. |
| **Speed Up** | verb | User-facing label for RBF in tx detail screen. Verb form (button label). |

### 6. Lightning

| Term | POS | Meaning |
|------|-----|---------|
| **Invoice** | noun | A payment request. List `technical / mainstream` (e.g. `інвойс / рахунок` or `інвойс / платіжний запит`). |
| **Lightning Invoice** | noun | BOLT11 payment request encoded as `lnbc…`. Pair "Lightning" (brand) with the localised noun: `інвойс Lightning / платіжний запит Lightning`. |
| **Preimage** | noun | The 32-byte secret that, when hashed, equals the payment hash; revealing it settles a Lightning payment. Math term `preimage` (e.g. `прообраз`). |
| **Payment** | noun | A Lightning payment (distinct from on-chain "Transaction"). ⚠️ NOT the verb "to pay" — must be a noun (e.g. `Платіж`, **not** `Оплатити`). |
| **Expired** | adj | Invoice/state that passed its validity window. Adjective/state form. |

### 7. Multisig & advanced addressing

| Term | POS | Meaning |
|------|-----|---------|
| **Co-signer / Signer** | noun | Participant in a multisig setup who provides a signature. ⚠️ NOT "co-owner" — must be a signer noun (e.g. `співпідписант`, **not** `співвласник`). |
| **Quorum** | noun | The m-of-n threshold required to spend from a multisig. List `<canonical> / <UI alternative>` (e.g. `кворум / поріг підписів`). |
| **PSBT** | acronym | Partially Signed Bitcoin Transaction (BIP174). Letters kept. |
| **Provide signature** | verb | Action: sign a PSBT as one of the multisig co-signers. |
| **BIP47 / Payment Code** | acronym + noun | `BIP47` is an acronym (kept as-is). `Payment Code` is a translatable noun (e.g. `платіжний код`). |
| **Notification transaction** | noun | BIP47-specific 0-value tx that announces a payment code to the recipient. |
| **SilentPayment** | brand + noun | BIP352 reusable static address scheme. The protocol name `Silent Payments` (note plural) stays in English; an optional explanatory locale gloss may follow (e.g. `Silent Payments / тихі платежі`). |

### 8. Coin control

| Term | POS | Meaning |
|------|-----|---------|
| **Coin Control** | noun | Per-UTXO selection feature. ⚠️ NOT Title Case in target locale. Prefer the technical UTXO form when possible (e.g. `керування UTXO / керування монетами`). |
| **Frozen** | adj | UTXO marked unspendable by the user. ⚠️ NOT the verb "to freeze" — must be an adjective/state form (e.g. `заморожено`, **not** `заморозити`). |

### 9. Security & storage

| Term | POS | Meaning |
|------|-----|---------|
| **Encrypted storage / Storage encryption** | noun | Whole-app encryption of the wallet store with a password. ⚠️ NOT Title Case in target locale. |
| **Plausible Deniability** | noun | Feature creating a fake encrypted storage with a different password, to disclose under coercion. ⚠️ NOT Title Case in target locale. |
| **Biometrics** | noun | Face ID / Touch ID / fingerprint unlock. |
| **Passcode** | noun | Device-level unlock code (iOS/Android). ⚠️ NOT the same as app "password" — use a distinct word (e.g. `код доступу`, **not** `пароль`). |

### 10. Backup, import & UX

| Term | POS | Meaning |
|------|-----|---------|
| **Backup / Export** | noun / verb | Saving wallet data outside the app. List `noun / verb` (e.g. `резервна копія / зробити резервну копію`). |
| **Restore** | verb / noun | Recreate a wallet from its backup/mnemonic. List `verb / noun` (e.g. `відновити / відновлення`). |
| **Import** | verb / noun | Loading a wallet from a backup or external source. List `verb / noun`. |
| **Voucher** | noun | Azte.co prepaid bitcoin voucher. |
| **Redeem** | verb | Convert a voucher into wallet balance. ⚠️ NOT "buy to wallet" / NOT "transfer" — use the locale's word for *activate* or *cash in* (e.g. `активувати / погасити`). |
| **Send** | verb | Primary user action: spend funds. |
| **Receive** | verb | Primary user action: get an address/invoice. |
| **Settings** | noun | App preferences screen. |
| **Confirm** | verb / noun | User action. Also: "confirmations" = blocks on a tx (noun, plural). |
| **QR Code** | noun | Square barcode used to share addresses / invoices / PSBTs. |
| **Clipboard** | noun | OS clipboard. |
| **Memo** | noun | Sender note on outgoing tx. |
| **Description** | noun | Free-text label on a receive invoice. |
| **Label** | noun | Free-text annotation on a wallet or address. |

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
- **pl** `send/broadcastNone`: contains `postaci szestnastkowej` — typo; should be `postaci szesnastkowej`.
- **pl** `azteco/redeem`: ships `Odbierz` ("collect") for Redeem — recommended is `Zrealizuj` / `Aktywuj` per Bitcoin Core pl / Cake pl.
- **th** Mnemonic: shipped English passthrough `backup phrase` — should be localised (e.g. `วลีนีโมนิก` / `วลีกู้คืน`).
- **th** Biometrics: shipped English passthrough `Biometrics` — should be localised (e.g. `ไบโอเมตริก` / `การยืนยันตัวตนทางชีวภาพ`).
- **th** `send/details_adv_fee_bump`: shipped `อนุญาติให้เพิ่มธรรมเนียมได้` has typo `อนุญาติ` → should be `อนุญาต`.
- **vi_vn** Vault: shipped UI uses Latin `Vault` — should be Vietnamese `két` / `két an toàn`.
- **vi_vn** Passphrase: shipped UI keeps Latin `Passphrase` — should be `cụm mật khẩu`.
- **vi_vn** Derivation path: shipped `Đường dẫn xuất` is incomplete — should be `đường dẫn dẫn xuất`.
- **vi_vn** Pending: shipped `Đang chờ giải quyết` is wordy — prefer `đang chờ`.
- **vi_vn** Confirmed: shipped `xác nhận` is verb — should be adjective `đã xác nhận`.
- **vi_vn** Block explorer: shipped Latin `Block Explorer` — should be `trình khám phá khối`.
- **vi_vn** Broadcast: shipped `Phát sóng` literally = radio broadcast — prefer `phát đi mạng` / `truyền tải`.
- **vi_vn** Speed Up: shipped `Tăng phí` collides with Fee Bump — should be `tăng tốc`.
- **vi_vn** Memo: shipped `Ghi nhớ` (= "remember") is wrong sense — should be `ghi chú`.
- **vi_vn** Label: shipped `dán nhãn` is verb ("to label") — should be noun `nhãn`.
- **ms** `settings.groundcontrol_explanation`: body has typo `GrounControl` → `GroundControl`.
- **ms** mnemonic strings ship misspelling `nemonik` → standard ms `mnemonik`.
- **ms** `sat/vBait` / `vBait` localise "byte"→"bait" — per convention keep Latin `sat/vByte` / `vByte`.
- **ms** wallet/vault/hardware-wallet/master-fingerprint/plausible-deniability strings ship Title Case (`Dompet`, `Dompet Perkakas`, `Cap Jari Induk`, etc.) — should be lowercase.
- **ms** `XPUB` shipped uppercase; convention prefers lowercase `xpub`.
- **ms** `transactions.details_outputs` UI uses `Kepada` (= "To:" preposition) for transaction-output noun — must be a noun (`keluaran`).
- **ms** `cc.change`: shipped `Ubah` (verb "to change/modify") → noun form (`baki` / `duit baki`).
- **ms** `unconfirmed`: shipped `tak terperaku` uses uncommon root `peraku` — prefer standard root `sah` (`belum disahkan` / `tidak disahkan`).
- **ms** `confirmed`: shipped `perakuan` is a noun using non-standard `peraku` — prefer `disahkan` (adj).
- **ms** `cpfp_exp`: glosses CPFP as `Cabang Pembayar Fi Pokok` (creative backronym, not standard) — use plain gloss "anak bayar untuk induk".
- **ms** Payment shipped `Bayar` is a verb — should be noun (`bayaran` / `pembayaran`).
- **ms** Frozen shipped `Bekukan` is a verb ("freeze!") — should be adj/state (`dibekukan` / `beku`).
- **ms** Passcode shipped `Kata Laluan` collides with password term — use `kod laluan`.
- **ms** Restore shipped `mengembalikan` is gerund — prefer base verb `kembalikan`.
- **ms** Confirm shipped `Pasti` (= "sure/certain") is awkward — use `sahkan`.
- **ms** Clipboard shipped `Papan Sepit` (= "pinching board") is non-standard — prefer `papan klip`.
- **ms** Label shipped `melabel` is verb form — should be noun (`label` / `tanda`).
- **ms** Coin Control shipped Title Case — should be lowercase `kawalan UTXO` / `kawalan duit`.

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
- **da** shipped UI: `XPUB` uppercase — vocabulary prefers lowercase `xpub`.
- **th** shipped UI: `XPUB` uppercase — vocabulary prefers lowercase `xpub`.
- **th** Confirmed: shipped `ยืนยัน` is verb form — prefer adj/state `ยืนยันแล้ว`.
- **th** `wallets/import_passphrase` Passcode: shipped `รหัสผ่าน` collides with "password" — use distinct form (e.g. `รหัสผ่านอุปกรณ์` / `PIN`).
- **id** shipped UI: `LNDHub` casing — vocabulary prefers `LNDhub` per glossary casing.
- **id** shipped UI: `XPUB` uppercase — vocabulary prefers lowercase `xpub`.
- **id** shipped UI mixes `backup` Latin — prefer `cadangan` per Bitcoin Core id + Cake id.
- **id** shipped UI: `setting` is an anglicism — fix to `pengaturan` per Bitcoin Core id + Cake id.
- **id** shipped UI: `Tarif` for Fee (= tariff/rate) is misleading — prefer `biaya` per id.wikipedia.org/wiki/Bitcoin.
- **vi_vn** shipped UI: `XPUB` uppercase — vocabulary prefers lowercase `xpub`.
- **vi_vn** Passcode: shipped `Mật khẩu` collides with "password" — should be `mã PIN` / `mã mở khóa`.

---

## Adding a new term

1. Decide which of the 10 categories it belongs to.
2. Add a row to **Glossary of terms** under that category with the English meaning.
3. Add a row to each per-language section under the same category (between the category's divider row and the next divider row). Mark unknown values **TODO**.
4. If the term is brand/protocol (capitalised proper noun), default to **keep in English** across locales unless a locale has an established convention.
5. If you change a shipped string in a locale's `.json`, update the corresponding row here in the same PR.
