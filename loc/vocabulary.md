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

> Columns: **Term** (canonical English) · **Translation** (what the app ships, or recommended) · **Notes** (rationale, exceptions, common pitfalls). Categories appear as **_italic-bold divider rows_** in the same order as the glossary.

### English (`en.json`)

Reference. All other locales translate from this.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | Capitalised when referring to the network. |
| Lightning | Lightning | Always capitalised. |
| Electrum | Electrum | Brand. |
| LNDhub | LNDhub | Brand, camelcase. |
| LND | LND | — |
| LNURL | LNURL | Always uppercase. |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | GroundControl | Brand, camelcase. |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | Unit. |
| sats | sats | Lowercase, plural. |
| sat/vByte | sat/vByte | Casing matters. |
| vByte | vByte | — |
| **_Wallet, keys & seeds_** | | |
| Wallet / Wallets | Wallet / Wallets | — |
| Vault | Multisig Vault | BlueWallet's user-facing name for multisig. |
| Watch-only | watch-only | Hyphenated, lowercase in body text; "Watch-only Wallet" in titles. |
| Hardware wallet | Hardware Wallet | — |
| Seed | Seed | — |
| Mnemonic | mnemonic phrase | — |
| Passphrase | Passphrase | — |
| Public key | public key | — |
| Private key | private key | — |
| WIF | WIF | Acronym, uppercase. |
| xpub | xpub | Lowercase. |
| Descriptor | descriptor | — |
| Derivation path | derivation path | Lowercase in body. |
| Master fingerprint | Master Fingerprint | Title-cased. |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | Transaction | — |
| Address | Address | — |
| Input | Input | tx input. |
| Output | Output | tx output. |
| UTXO | UTXO | — |
| Change | Change | The output kind. |
| Hex | Hex | — |
| Pending | Pending | — |
| Unconfirmed | unconfirmed | — |
| Confirmed | confirmed | — |
| Mempool | Mempool | — |
| Broadcast | Broadcast | — |
| Block explorer | Block Explorer | — |
| Onchain | Onchain | One word, no hyphen. |
| Offchain | Offchain | One word, no hyphen. |
| **_Fees & fee bumping_** | | |
| Fee | Fee | — |
| Fee Bump | Allow Fee Bump | Setting label. |
| RBF | RBF — Replace by Fee | Acronym + expansion on first use. |
| CPFP | Bump Fee (CPFP) | — |
| Speed Up | Speed Up (RBF) | — |
| **_Lightning_** | | |
| Invoice | Invoice | — |
| Lightning Invoice | Lightning Invoice | — |
| Preimage | Pre-image | Hyphenated in shipped string `lndViewInvoice.preimage`. |
| Payment | Payment | LN context. |
| Expired | Expired | — |
| **_Multisig & advanced addressing_** | | |
| Co-signer | co-signer | Hyphenated, lowercase. |
| Quorum | quorum | — |
| PSBT | PSBT | Expanded once as "Partially Signed Bitcoin Transaction (PSBT)". |
| Provide signature | Provide signature | — |
| BIP47 / Payment Code | BIP47 payment code | — |
| Notification transaction | Notification transaction | BIP47-specific. |
| SilentPayment | SilentPayment | One word, capital-S, capital-P. |
| **_Coin control_** | | |
| Coin Control | Coin Control | Title-cased proper feature name. |
| Frozen | Freeze (verb) / frozen | — |
| **_Security & storage_** | | |
| Encrypted storage | Encrypted Storage / Storage Encryption | — |
| Plausible Deniability | Plausible Deniability | — |
| Biometrics | Biometrics | — |
| Passcode | passcode | — |
| **_Backup, import & UX_** | | |
| Backup / Export | Export/Backup | — |
| Restore | Restore | — |
| Import | Import | — |
| Voucher | voucher | Azte.co context. |
| Redeem | Redeem | — |
| Send | Send | — |
| Receive | Receive | — |
| Settings | Settings | — |
| Confirm | Confirm | — |
| QR Code | QR Code | — |
| Clipboard | Clipboard | — |
| Memo | Memo | Sender note on outgoing tx. |
| Description | Description | Invoice text. |
| Label | Label | Wallet/address name. |

---

### Russian (`ru.json`)

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | **Bitcoin** | Kept in Latin. "Биткоин"/"биткойн" exists but the app uses the English brand. |
| Lightning | **Lightning** | Kept in English. "Молния" would read as a translation, not a name. |
| Electrum | Electrum | Brand. |
| LNDhub | LNDhub | Brand. |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | Brand. |
| Orbot | Orbot | Brand. |
| GroundControl | GroundControl | Brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats / satoshi | сатоши | Cyrillic transliteration, plural-invariant. |
| sat/vByte | Сатоши за vByte | Mixed: Cyrillic + Latin `vByte`. |
| vByte | vByte | Latin. |
| **_Wallet, keys & seeds_** | | |
| Wallet | Кошелёк / Кошельки | — |
| Vault | Мультисиг хранилище | "Хранилище" = vault. |
| Watch-only | Watch-only | Kept in English; literal "только для просмотра" sometimes used. |
| Hardware wallet | аппаратный кошелёк | — |
| Seed | Сид-фраза | Hybrid: "сид" (transliterated) + "фраза" (translated). |
| Mnemonic | мнемоническая фраза | Also seen alongside "Сид-фраза". |
| Passphrase | Пароль | TODO: collides with "password"; recommend "Passphrase" or "Кодовая фраза". |
| Public key | публичный ключ | — |
| Private key | закрытый ключ | "Приватный ключ" also common. |
| WIF | WIF | — |
| xpub | xpub | — |
| Descriptor | дескриптор | Transliteration. |
| Derivation path | Путь деривации | Transliteration; "путь вывода ключей" also valid. |
| Master fingerprint | Master Fingerprint | Kept in English. |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | Транзакция | — |
| Address | Адрес | — |
| Input | вход | — |
| Output | выход | "Аутпут" sometimes used. |
| UTXO | UTXO | — |
| Change | Сдача | — |
| Hex | HEX | Uppercase in shipped value. |
| Pending | В процессе | — |
| Unconfirmed | неподтверждённая | — |
| Confirmed | подтверждена | — |
| Mempool | мемпул | Transliteration. |
| Broadcast | Отправка / Передача | Verb "транслировать" also acceptable. |
| Block explorer | Обозреватель блоков | — |
| Onchain | В цепочке | Translated, not loaned. |
| Offchain | Вне цепочки | — |
| **_Fees & fee bumping_** | | |
| Fee | Комиссия | — |
| Fee Bump | Разрешить повышение комиссии | Setting label. |
| RBF | RBF | Acronym kept. |
| CPFP | CPFP | Acronym kept; surrounding text translated ("Повысить комиссию"). |
| Speed Up | Повысить комиссию (RBF) | — |
| **_Lightning_** | | |
| Invoice | инвойс | Transliteration. "Счёт" ambiguous (bill/account). |
| Lightning Invoice | Lightning инвойс | Mixed: brand stays English. |
| Preimage | Преимидж | Transliterated; "прообраз" is the math term but unfamiliar to most users. |
| Payment | Платёж | — |
| Expired | Просрочен | — |
| **_Multisig & advanced addressing_** | | |
| Co-signer | со-подписант | Hyphenated. |
| Quorum | кворум | — |
| PSBT | PSBT | — |
| Provide signature | Предоставить подпись | — |
| BIP47 / Payment Code | коды оплаты BIP47 | "Код оплаты" = payment code. |
| Notification transaction | Транзакция уведомления | — |
| SilentPayment | SilentPayment | Kept in English. |
| **_Coin control_** | | |
| Coin Control | Управление монетами | — |
| Frozen | Заморозить / заморожен | — |
| **_Security & storage_** | | |
| Encrypted storage | Шифрование хранилища | — |
| Plausible Deniability | Двойное дно | Lit. "double bottom" — Russian idiom for hidden compartment; idiomatic, not literal. |
| Biometrics | Биометрия | — |
| Passcode | код устройства | Ambiguous with "пароль" (password). |
| **_Backup, import & UX_** | | |
| Backup | Резервное копирование | — |
| Restore | Восстановить | — |
| Import | Импорт | — |
| Voucher | ваучер | Azte.co context. |
| Redeem | Зачислить | Lit. "credit to". |
| Send | Отправить | — |
| Receive | Получить | — |
| Settings | Настройки | — |
| Confirm | Подтвердить | — |
| QR Code | QR-код | Hyphenated. |
| Clipboard | Буфер обмена | — |
| Memo | Примечание | "Мемо" also used. |
| Description | Описание | — |
| Label | Метка | Wallet/address name. |

---

### Spanish (`es.json`)

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | Brand. |
| Lightning | Lightning | Brand. |
| Electrum | Electrum | — |
| LNDhub | LNDhub | — |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | TODO | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats | sats | Lowercase English. |
| sat/vByte | Satoshis por vByte | — |
| vByte | vByte | — |
| **_Wallet, keys & seeds_** | | |
| Wallet | Cartera / Carteras | "Monedero" also valid; app standardises on "cartera". |
| Vault | Vault multifirma | Mixed: English "Vault" + Spanish "multifirma". |
| Watch-only | Solo lectura | — |
| Hardware wallet | cartera de hardware | — |
| Seed | Semilla | Literal "seed". |
| Mnemonic | Frase mnemónica | — |
| Passphrase | Passphrase | Kept in English. |
| Public key | llave pública | "Clave pública" also valid; app uses "llave". |
| Private key | llave privada | — |
| WIF | WIF | — |
| xpub | xpub | — |
| Descriptor | TODO | — |
| Derivation path | ruta de derivación | — |
| Master fingerprint | Huella dactilar maestra | Literal calque. |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | Transacción | Note: shipped value "Transaccion" missing accent — fix. |
| Address | Dirección | — |
| Input | TODO | — |
| Output | TODO | — |
| UTXO | TODO | — |
| Change | Cambio | — |
| Hex | hash | TODO: shipped value says "hash"; should be "hex". |
| Pending | Pendiente | — |
| Unconfirmed | TODO | — |
| Confirmed | TODO | — |
| Mempool | TODO | — |
| Broadcast | Emisión / Transmitir | — |
| Block explorer | TODO | — |
| Onchain | TODO | — |
| Offchain | TODO | — |
| **_Fees & fee bumping_** | | |
| Fee | Comisión | "Tarifa" also valid; the app uses "comisión". |
| Fee Bump | Permitir aumentar la comisión | — |
| RBF | RBF — Reemplazo por comisión | — |
| CPFP | Aumentar comisión (CPFP) | — |
| Speed Up | Incrementar comisión (RBF) | — |
| **_Lightning_** | | |
| Invoice | Factura | — |
| Lightning Invoice | Factura Lightning | Note: shipped value has typo "Lighting" — fix. |
| Preimage | TODO | Suggest "Preimagen" or keep "Pre-image". |
| Payment | TODO | — |
| Expired | Expirado | — |
| **_Multisig & advanced addressing_** | | |
| Co-signer | TODO | — |
| Quorum | quórum | — |
| PSBT | PSBT | — |
| Provide signature | Proporcionar firma | — |
| BIP47 / Payment Code | TODO | — |
| Notification transaction | TODO | — |
| SilentPayment | TODO | — |
| **_Coin control_** | | |
| Coin Control | Coin control | Kept in English, lowercase second word. |
| Frozen | Congelar / congelado | — |
| **_Security & storage_** | | |
| Encrypted storage | TODO | — |
| Plausible Deniability | Negación plausible | — |
| Biometrics | Biometría | — |
| Passcode | TODO | — |
| **_Backup, import & UX_** | | |
| Backup | Exportar / Guardar | — |
| Restore | Restaurar | — |
| Import | Importar | — |
| Voucher | cupón | — |
| Redeem | Canjear | — |
| Send | Enviar | — |
| Receive | Recibir | — |
| Settings | Ajustes | — |
| Confirm | Confirmar | — |
| QR Code | TODO | — |
| Clipboard | Portapapeles | — |
| Memo | Comentario | "Memo" also acceptable. |
| Description | Descripción | — |
| Label | Etiqueta | — |

---

### German (`de_de.json`)

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | Brand. |
| Lightning | Lightning | Brand. |
| Electrum | Electrum | — |
| LNDhub | LNDhub | — |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | GroundControl | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats | sats | Lowercase English. |
| sat/vByte | Satoshi pro vByte | — |
| vByte | vByte | — |
| **_Wallet, keys & seeds_** | | |
| Wallet | Wallet | Loanword used unchanged; "Geldbörse" is dictionary equivalent but the crypto community uses "Wallet". |
| Vault | Multisignatur Tresor | "Tresor" = vault/safe. |
| Watch-only | „Watch-only" | Quoted, kept in English. |
| Hardware wallet | Hardware Wallet | English loanword. |
| Seed | Seed | English loanword in crypto context. |
| Mnemonic | mnemonische Phrase | — |
| Passphrase | Passphrase | Loanword. |
| Public key | öffentlicher Schlüssel | — |
| Private key | Privatschlüssel | — |
| WIF | WIF | — |
| xpub | xpub | — |
| Descriptor | TODO | — |
| Derivation path | Ableitungspfad | — |
| Master fingerprint | Fingerabdruckkennung | Lit. "fingerprint identifier". |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | Transaktion | — |
| Address | Adresse | — |
| Input | TODO | — |
| Output | TODO | — |
| UTXO | TODO | — |
| Change | Wechselgeld | TODO: shipped `cc.change` is "Ändern" (verb "to change") — wrong context. Should be "Wechselgeld". |
| Hex | Rohtransaktion | Lit. "raw transaction" — semantic translation. |
| Pending | ausstehend | — |
| Unconfirmed | unbestätigt | — |
| Confirmed | bestätigt | — |
| Mempool | Mempool | Loanword. |
| Broadcast | Übertragung | — |
| Block explorer | Block-Explorer | — |
| Onchain | Onchain | — |
| Offchain | Offchain | — |
| **_Fees & fee bumping_** | | |
| Fee | Gebühr | — |
| Fee Bump | Erhöhung TRX-Gebühr nach Senden erlauben | Verbose. "TRX" = transaction (informal). |
| RBF | RBF — Replace By Fee | English expansion preserved. |
| CPFP | TRX-Gebühr erhöhen (CPFP) | — |
| Speed Up | TRX-Gebühr erhöhen (RBF) | — |
| **_Lightning_** | | |
| Invoice | Rechnung | — |
| Lightning Invoice | Lightning Rechnung | — |
| Preimage | Urbild | Math term. Rare but technically correct. |
| Payment | Zahlung | — |
| Expired | Abgelaufen | — |
| **_Multisig & advanced addressing_** | | |
| Co-signer | Mitsignierer | — |
| Quorum | signaturfähig | Approximated, not literal "Quorum". |
| PSBT | PSBT | — |
| Provide signature | Schlüssel eingeben | TODO: shipped value means "enter key" — should be "Signatur bereitstellen". |
| BIP47 / Payment Code | BIP47 Zahlungscodes | "Zahlungscode" = payment code. |
| Notification transaction | Benachrichtigungstransaktion | Compound noun. |
| SilentPayment | Stille Zahlung | Translated lit. "silent payment". |
| **_Coin control_** | | |
| Coin Control | Münzkontrolle | — |
| Frozen | Einfrieren / eingefroren | — |
| **_Security & storage_** | | |
| Encrypted storage | Speicherverschlüsselung | — |
| Plausible Deniability | Glaubhafte Täuschung | Lit. "credible deception". |
| Biometrics | Biometrie | — |
| Passcode | TODO | — |
| **_Backup, import & UX_** | | |
| Backup | Backup | — |
| Restore | Wiederherstellen | — |
| Import | Importieren | — |
| Voucher | Gutschein | — |
| Redeem | Einlösen | — |
| Send | Senden | — |
| Receive | Erhalten | — |
| Settings | Einstellungen | — |
| Confirm | Bestätigen | — |
| QR Code | QR-Code | Hyphenated. |
| Clipboard | Zwischenablage | — |
| Memo | Notiz | — |
| Description | Beschreibung | — |
| Label | Bezeichnung | — |

---

### French (`fr_fr.json`)

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | — |
| Lightning | Lightning | Brand. |
| Electrum | Electrum | — |
| LNDhub | LNDhub | — |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | GroundControl | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats | sats | English. |
| sat/vByte | Satoshi par vByte | — |
| vByte | vByte | — |
| **_Wallet, keys & seeds_** | | |
| Wallet | Portefeuille | — |
| Vault | Coffre-fort multi-signature | "Coffre-fort" = vault/safe. |
| Watch-only | Lecture seule | Or kept in English. |
| Hardware wallet | portefeuille matériel | — |
| Seed | Graine | Literal "seed". "Phrase mnémonique" also used. |
| Mnemonic | Phrase mnémonique | — |
| Passphrase | Phrase secrète | — |
| Public key | clé publique | — |
| Private key | clé privée | — |
| WIF | WIF | — |
| xpub | xpub | — |
| Descriptor | TODO | — |
| Derivation path | chemin de dérivation | — |
| Master fingerprint | Empreinte maitresse | TODO: missing circumflex; should be "Empreinte maîtresse". |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | Transaction | Same spelling. |
| Address | Adresse | — |
| Input | TODO | — |
| Output | TODO | — |
| UTXO | UTXO | "Controle des UTXO" in `cc/header`. |
| Change | Monnaie rendue | TODO: shipped `cc.change` is ungrammatical "monnaie rendu". |
| Hex | hexadécimal | — |
| Pending | en cours | Lowercase. |
| Unconfirmed | non confirmé | — |
| Confirmed | confirmé | — |
| Mempool | Mempool | Loanword. |
| Broadcast | Diffusion | — |
| Block explorer | Explorateur de blocs | — |
| Onchain | Onchain | — |
| Offchain | Offchain | — |
| **_Fees & fee bumping_** | | |
| Fee | Frais | Plural noun. |
| Fee Bump | Autoriser le Fee Bump | TODO: shipped value missing "p" — "Fee Bum". |
| RBF | RBF — Replace By Fee | English expansion preserved. |
| CPFP | Frais de propulsion (CPFP) | Idiomatic "propulsion fees". |
| Speed Up | Frais de propulsion (RBF) | — |
| **_Lightning_** | | |
| Invoice | Facture | — |
| Lightning Invoice | Facture Lightning | TODO: shipped value has typo "Ligthning". |
| Preimage | Préimage | French-style accent. |
| Payment | Paiement | — |
| Expired | Expiré | — |
| **_Multisig & advanced addressing_** | | |
| Co-signer | Cosignataire | — |
| Quorum | quorum | — |
| PSBT | PSBT | — |
| Provide signature | Fournir la signature | — |
| BIP47 / Payment Code | codes de paiement BIP47 | — |
| Notification transaction | Transaction de notification | — |
| SilentPayment | SilentPayment | Kept in English. |
| **_Coin control_** | | |
| Coin Control | Contrôle des UTXO | TODO: shipped value missing accent — "Controle". |
| Frozen | Gelé / gelée | — |
| **_Security & storage_** | | |
| Encrypted storage | chiffrement du stockage | — |
| Plausible Deniability | Déni plausible | — |
| Biometrics | Biométrie | — |
| Passcode | TODO | — |
| **_Backup, import & UX_** | | |
| Backup | Sauvegarde | — |
| Restore | Restaurer | — |
| Import | Importer | — |
| Voucher | bon | TODO: shipped says "Azte.com" — typo, should be "Azte.co". |
| Redeem | Collecter | Lit. "collect". |
| Send | Envoyer | — |
| Receive | Recevoir | — |
| Settings | Réglages | "Paramètres" also valid; app uses "Réglages" (Apple-style). |
| Confirm | Confirmer | — |
| QR Code | Code QR | Word order inverted. |
| Clipboard | Presse-papier | — |
| Memo | Memo | Loanword. |
| Description | Description | — |
| Label | Étiquette | — |

---

### Portuguese, Brazil (`pt_br.json`)

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | — |
| Lightning | Lightning | Brand. |
| Electrum | Electrum | — |
| LNDhub | LNDhub | — |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | GroundControl | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats | sats | — |
| sat/vByte | Satoshi por vByte | — |
| vByte | vByte | — |
| **_Wallet, keys & seeds_** | | |
| Wallet | Carteira / Carteiras | — |
| Vault | Cofre Multisig | "Cofre" = vault. |
| Watch-only | "watch-only (somente para assistir)" | Kept in English with parenthetical gloss on first use. |
| Hardware wallet | Carteira Hardware | — |
| Seed | Seed | Loanword. "Frase de recuperação" also seen. |
| Mnemonic | Frase mnemônica | — |
| Passphrase | Senha | TODO: collides with "password" — ambiguous. |
| Public key | chave pública | — |
| Private key | chave privada | — |
| WIF | WIF | — |
| xpub | xpub | — |
| Descriptor | TODO | — |
| Derivation path | caminho de derivação | — |
| Master fingerprint | Fingerprint Soberana | Mixed: English "Fingerprint" + Portuguese adjective. |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | Transação | — |
| Address | Endereço | — |
| Input | TODO | — |
| Output | TODO | — |
| UTXO | UTXO | — |
| Change | Troco | — |
| Hex | Hash | TODO: shipped value "Hash" wrong; should be "Hex". |
| Pending | Pendente | — |
| Unconfirmed | não confirmada | — |
| Confirmed | confirmada | — |
| Mempool | Mempool | Loanword. |
| Broadcast | Transmissão | — |
| Block explorer | Explorador de blocos | — |
| Onchain | Onchain | — |
| Offchain | Offchain | — |
| **_Fees & fee bumping_** | | |
| Fee | Taxa | — |
| Fee Bump | Permitir aumento de taxa | — |
| RBF | RBF — Replace by Fee | English expansion preserved. |
| CPFP | Aumento de taxa (CPFP) | — |
| Speed Up | Aumentar Taxa (RBF) | — |
| **_Lightning_** | | |
| Invoice | Fatura | — |
| Lightning Invoice | Fatura Lightning | — |
| Preimage | Imagem prévia | Literal calque. |
| Payment | Pagamento | — |
| Expired | Expirada | Feminine, agreeing with "fatura". |
| **_Multisig & advanced addressing_** | | |
| Co-signer | Coassinatura | — |
| Quorum | mínima/máxima | TODO: translated as min/max bounds — semantically wrong (m-of-n). |
| PSBT | PSBT | — |
| Provide signature | Fornecer assinatura | — |
| BIP47 / Payment Code | Payment Codes BIP47 | Kept in English. |
| Notification transaction | Transação de notificação | — |
| SilentPayment | SilentPayment | Kept in English. |
| **_Coin control_** | | |
| Coin Control | Controle de moedas | — |
| Frozen | Congelar / congelado | — |
| **_Security & storage_** | | |
| Encrypted storage | criptografia de armazenamento | — |
| Plausible Deniability | Negação plausível | — |
| Biometrics | Biometria | — |
| Passcode | TODO | — |
| **_Backup, import & UX_** | | |
| Backup | Backup | — |
| Restore | Restaurar | — |
| Import | Importar | — |
| Voucher | voucher | — |
| Redeem | Resgatar | — |
| Send | Enviar | — |
| Receive | Receber | — |
| Settings | Configurações | — |
| Confirm | Confirmar | — |
| QR Code | QR Code | Kept in English. |
| Clipboard | Área de transferência | — |
| Memo | Nota | — |
| Description | Descrição | — |
| Label | Rótulo | — |

---

### Chinese, Simplified (`zh_cn.json`)

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | 比特币 | Sometimes also kept as "Bitcoin"; app mixes both. |
| Lightning | 闪电网络 | Literal "lightning network". |
| Electrum | Electrum | Brand. |
| LNDhub | LNDhub（闪电网络守护节点集线器） | Gloss on first mention. |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | GroundControl | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats | 聪 | Cong — the canonical CN unit for satoshi. |
| sat/vByte | 聪/字节 | Note: drops "v" prefix; technically incorrect vs SegWit-aware vByte. Consider 聪/vByte. |
| vByte | 字节 / vByte | Inconsistent. |
| **_Wallet, keys & seeds_** | | |
| Wallet | 钱包 | — |
| Vault | 多重签名金库 | "金库" = vault. |
| Watch-only | 仅查看 | — |
| Hardware wallet | 硬件钱包 | — |
| Seed | 助记词 | Standard CN crypto term. |
| Mnemonic | 助记词 | Same as Seed. |
| Passphrase | 密码短语 | Distinct from "密码" (password). |
| Public key | 公钥 | — |
| Private key | 私钥 | — |
| WIF | 钱包导入格式 (WIF) | Translated + acronym. |
| xpub | xpub | — |
| Descriptor | TODO | — |
| Derivation path | 派生路径 | — |
| Master fingerprint | 主密钥指纹 | Lit. "master key fingerprint". |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | 交易 | — |
| Address | 地址 | — |
| Input | 输入 | — |
| Output | 输出 | — |
| UTXO | UTXO | — |
| Change | 找零 | — |
| Hex | 十六进制 | Translated. |
| Pending | 待处理 | — |
| Unconfirmed | 未确认 | — |
| Confirmed | 已确认 | — |
| Mempool | 内存池 | Lit. "memory pool". |
| Broadcast | 广播 | — |
| Block explorer | 区块浏览器 | — |
| Onchain | 链上 | — |
| Offchain | 链下 | — |
| **_Fees & fee bumping_** | | |
| Fee | 矿工费 | Lit. "miner fee". "手续费" also valid. |
| Fee Bump | 允许追加矿工费 | — |
| RBF | RBF（费用替换） | Acronym + CN gloss. |
| CPFP | 追加矿工费（CPFP） | — |
| Speed Up | 追加矿工费（RBF） | — |
| **_Lightning_** | | |
| Invoice | 发票 | — |
| Lightning Invoice | 闪电网络发票 | — |
| Preimage | 原像 | Math term. |
| Payment | 付款 | — |
| Expired | 已过期 | — |
| **_Multisig & advanced addressing_** | | |
| Co-signer | 共享联合签名者 | — |
| Quorum | 法定数 | — |
| PSBT | PSBT | Sometimes glossed as "部分签名的比特币交易". |
| Provide signature | 提供签名 | — |
| BIP47 / Payment Code | BIP47 支付码 | "支付码" = payment code. |
| Notification transaction | 通知交易 | — |
| SilentPayment | SilentPayment | — |
| **_Coin control_** | | |
| Coin Control | 选币功能 | — |
| Frozen | 冻结 | — |
| **_Security & storage_** | | |
| Encrypted storage | 启用存储加密 | — |
| Plausible Deniability | 可合理否认 | — |
| Biometrics | 生物识别认证 | — |
| Passcode | 设备密码 | — |
| **_Backup, import & UX_** | | |
| Backup | 备份 | — |
| Restore | 恢复 | — |
| Import | 导入 | — |
| Voucher | 券码 | — |
| Redeem | 领取 | — |
| Send | 发送 | — |
| Receive | 接收 | — |
| Settings | 设置 | — |
| Confirm | 确认 | — |
| QR Code | 二维码 | Standard CN term. |
| Clipboard | 剪贴板 | — |
| Memo | 备注 | — |
| Description | 描述 | — |
| Label | 标签 | — |

---

### Japanese (`jp_jp.json`)

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | Kept in Latin in most places; "ビットコイン" also acceptable. |
| Lightning | Lightning / ライトニング | Brand mostly Latin; katakana when followed by a Japanese noun. |
| Electrum | Electrum | — |
| LNDhub | LNDhub | — |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | GroundControl | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats | sats | Latin, lowercase. |
| sat/vByte | vByteあたりsatoshi | Word order JP-style. |
| vByte | vByte | Latin. |
| **_Wallet, keys & seeds_** | | |
| Wallet | ウォレット | Katakana, not 財布. |
| Vault | マルチシグ金庫 | "金庫" = vault/safe. |
| Watch-only | ウォッチオンリー | Katakana transliteration. |
| Hardware wallet | ハードウェアウォレット | — |
| Seed | シード | Katakana of "seed". |
| Mnemonic | シードフレーズ | — |
| Passphrase | パスフレーズ | Distinct from "パスワード" (password). |
| Public key | 公開鍵 | — |
| Private key | 秘密鍵 | — |
| WIF | WIF | — |
| xpub | xpub | — |
| Descriptor | TODO | — |
| Derivation path | 派生パス | Note: shipped has redundant English `(derivation path)` parenthetical. |
| Master fingerprint | マスタフィンガープリント | Katakana. |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | 取引 | Kanji; トランザクション also used. |
| Address | アドレス | Katakana. |
| Input | 入力 | — |
| Output | 出力 | — |
| UTXO | UTXO | — |
| Change | チェンジ | Katakana — ambiguous, could be 釣り銭. |
| Hex | Hex | Latin. |
| Pending | 試行中 | Lit. "trying". |
| Unconfirmed | 未承認 | — |
| Confirmed | 承認済み | — |
| Mempool | メモリプール | — |
| Broadcast | ブロードキャスト | — |
| Block explorer | ブロックエクスプローラー | — |
| Onchain | オンチェーン | Katakana. |
| Offchain | オフチェーン | — |
| **_Fees & fee bumping_** | | |
| Fee | 手数料 | — |
| Fee Bump | 費用のバンプ(増加)を許可 | "バンプ" + parenthetical Japanese gloss. |
| RBF | RBF（Replace By Fee） | English expansion. |
| CPFP | バンプ費用 (CPFP) | — |
| Speed Up | 手数料をバンプ (RBF) | — |
| **_Lightning_** | | |
| Invoice | インボイス | Katakana of "invoice". 請求書 (seikyū-sho) used in body text. |
| Lightning Invoice | ライトニングインボイス | Full katakana. |
| Preimage | プリイメージ | Katakana. |
| Payment | 支払い | — |
| Expired | 失効 | — |
| **_Multisig & advanced addressing_** | | |
| Co-signer | 共同署名 | — |
| Quorum | 定足数 | Standard JP term. |
| PSBT | PSBT | — |
| Provide signature | 署名を提供 | — |
| BIP47 / Payment Code | BIP47支払いコード | — |
| Notification transaction | 通知トランザクション | — |
| SilentPayment | SilentPayment | — |
| **_Coin control_** | | |
| Coin Control | コイン管理 | Lit. "coin management". |
| Frozen | フリーズ | Katakana. |
| **_Security & storage_** | | |
| Encrypted storage | ストレージ暗号化 | — |
| Plausible Deniability | 隠匿設定 | Lit. "concealment setting". |
| Biometrics | 生体認証 | — |
| Passcode | パスコード | Katakana. |
| **_Backup, import & UX_** | | |
| Backup | バックアップ | — |
| Restore | 復元 | — |
| Import | インポート | — |
| Voucher | バウチャー | — |
| Redeem | 交換 | Lit. "exchange". |
| Send | 送金 / 送る | "送金" = remit, "送る" = send (general). |
| Receive | 入金 / 受け取る | "入金" = deposit. |
| Settings | 設定 | — |
| Confirm | 確認 | — |
| QR Code | QRコード | — |
| Clipboard | クリップボード | — |
| Memo | メモ | — |
| Description | 概要 | Lit. "overview". |
| Label | ラベル | — |

---

### Korean (`ko_KR.json`)

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | 비트코인 | Hangul of "bitcoin". |
| Lightning | 라이트닝 | — |
| Electrum | Electrum | — |
| LNDhub | LNDhub | — |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | GroundControl | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats | 사토시 | Hangul of "satoshi". |
| sat/vByte | 가상바이트 당 사토시 | "가상바이트" = virtual byte. |
| vByte | 가상바이트 | Translated. |
| **_Wallet, keys & seeds_** | | |
| Wallet | 지갑 | Native Korean. (Note: "월렛" appears in some strings — standardise on 지갑.) |
| Vault | 다중서명 금고 | "금고" = vault. |
| Watch-only | 보기 전용 | — |
| Hardware wallet | 하드웨어 지갑 | — |
| Seed | 시드 | Transliteration. |
| Mnemonic | 시드 문구 / 복구 문구 | TODO: body text uses English "mnemonic phrase". |
| Passphrase | 암호 | TODO: collides with "password". |
| Public key | 공용 키 | — |
| Private key | 비밀키 | — |
| WIF | WIF | — |
| xpub | xpub | — |
| Descriptor | TODO | — |
| Derivation path | 유도 경로 | — |
| Master fingerprint | 마스터 지문 | "지문" = fingerprint. |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | 트랜잭션 | Loanword; "거래" (Hanja-based "trade") also used. |
| Address | 주소 | — |
| Input | TODO | — |
| Output | TODO | — |
| UTXO | UTXO | — |
| Change | 거스름돈 | TODO: shipped `cc.change` "변경" means *to change* (verb) — wrong; should be "거스름돈". |
| Hex | 헥스 | Hangul of "hex". |
| Pending | 보류중 | — |
| Unconfirmed | 미확정 | — |
| Confirmed | 확정 | — |
| Mempool | 멤풀 | — |
| Broadcast | 브로드캐스트 | — |
| Block explorer | 블록 탐색기 | — |
| Onchain | 온체인 | — |
| Offchain | 오프체인 | — |
| **_Fees & fee bumping_** | | |
| Fee | 수수료 | — |
| Fee Bump | 수수료 인상 허락하기 | — |
| RBF | RBF | Acronym kept. |
| CPFP | 급행 수수료(CPFP) | Lit. "express fee". |
| Speed Up | 급행 수수료(CPFP) | TODO: shipped `transactions/rbf_title` references CPFP but feature is RBF — mismatch. |
| **_Lightning_** | | |
| Invoice | 청구서 | — |
| Lightning Invoice | 라이트닝 청구서 | — |
| Preimage | 프리이미지 | Transliteration. |
| Payment | 결제 | — |
| Expired | 만료되었습니다 | Full sentence form; shorter "만료됨" also valid. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | 공동 서명자 | — |
| Quorum | 정족수 | — |
| PSBT | PSBT | — |
| Provide signature | 서명 제공하기 | — |
| BIP47 / Payment Code | BIP47 결제 코드 | — |
| Notification transaction | 알림 트랜잭션 | — |
| SilentPayment | SilentPayment | — |
| **_Coin control_** | | |
| Coin Control | 코인 관리 | — |
| Frozen | 동결 | — |
| **_Security & storage_** | | |
| Encrypted storage | 저장소 암호화 | — |
| Plausible Deniability | 당위적 거부 | — |
| Biometrics | 바이오메트릭 | Katakana-style transliteration. |
| Passcode | TODO | — |
| **_Backup, import & UX_** | | |
| Backup | 백업 | — |
| Restore | 복원 | — |
| Import | 들여오기 | — |
| Voucher | 바우처 | TODO: shipped `azteco/title` is "제목" (= "title") — wrong, leftover placeholder. |
| Redeem | 교환 | — |
| Send | 보내기 | — |
| Receive | 받기 | — |
| Settings | 설정 | — |
| Confirm | 확인 | — |
| QR Code | QR코드 | — |
| Clipboard | 클립보드 | TODO: shipped uses "붙여넣기판" (lit. "paste board") — unusual; standard "클립보드". |
| Memo | 메모 | — |
| Description | 설명 | TODO: shipped `receive/details_label` "형태" (= "form/shape") wrong. |
| Label | 라벨 | — |

---

### Italian (`it.json`)

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | — |
| Lightning | Lightning | Brand. |
| Electrum | Electrum | — |
| LNDhub | LNDhub | — |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | GroundControl | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats | sat | Singular form preferred. |
| sat/vByte | Satoshi per vByte | — |
| vByte | vByte | — |
| **_Wallet, keys & seeds_** | | |
| Wallet | Portafoglio | — |
| Vault | Cassaforte Multisig | "Cassaforte" = safe/vault. |
| Watch-only | "watch-only" | Kept in English, quoted. |
| Hardware wallet | portafoglio hardware | — |
| Seed | Seed | Loanword. |
| Mnemonic | Seed mnemonico | Loanword + Italian adjective. |
| Passphrase | Passphrase | Loanword. |
| Public key | chiave pubblica | — |
| Private key | chiave privata | — |
| WIF | WIF | — |
| xpub | xpub | — |
| Descriptor | TODO | — |
| Derivation path | derivation path | Kept in English. |
| Master fingerprint | Master Fingerprint | Kept in English. |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | Transazione | — |
| Address | Indirizzo | — |
| Input | TODO | — |
| Output | TODO | — |
| UTXO | TODO | — |
| Change | Resto | — |
| Hex | Hex | Loanword. |
| Pending | In attesa | — |
| Unconfirmed | non confermata | — |
| Confirmed | confermata | — |
| Mempool | Mempool | Loanword. |
| Broadcast | Trasmissione | — |
| Block explorer | Esploratore di blocchi | — |
| Onchain | TODO | — |
| Offchain | TODO | — |
| **_Fees & fee bumping_** | | |
| Fee | Commissione / Commissioni | — |
| Fee Bump | Permetti l'aumento della commissione | — |
| RBF | RBF — Replace by Fee | English expansion. |
| CPFP | Aumenta la commissione (CPFP) | — |
| Speed Up | Aumenta la commissione (RBF) | — |
| **_Lightning_** | | |
| Invoice | Fattura | — |
| Lightning Invoice | Fattura Lightning | — |
| Preimage | TODO | Suggest "preimmagine" or keep "pre-image". |
| Payment | Pagamento | — |
| Expired | Scaduto / Scaduta | Gender agrees with noun. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | TODO | — |
| Quorum | quorum | — |
| PSBT | PSBT | — |
| Provide signature | Fornisci la firma | — |
| BIP47 / Payment Code | TODO | — |
| Notification transaction | TODO | — |
| SilentPayment | TODO | — |
| **_Coin control_** | | |
| Coin Control | Coin Control | Kept in English. |
| Frozen | Congela / congelato | — |
| **_Security & storage_** | | |
| Encrypted storage | TODO | — |
| Plausible Deniability | Negazione Plausibile | — |
| Biometrics | Dati biometrici | — |
| Passcode | TODO | — |
| **_Backup, import & UX_** | | |
| Backup | Backup | — |
| Restore | Ripristina | — |
| Import | Importa | — |
| Voucher | voucher | TODO: shipped string mentions "Atze.co" — typo for "Azte.co". |
| Redeem | Riscatta | — |
| Send | Invia | — |
| Receive | Ricevi | — |
| Settings | Impostazioni | — |
| Confirm | Conferma | — |
| QR Code | TODO | — |
| Clipboard | Appunti | — |
| Memo | Memo | — |
| Description | Descrizione | — |
| Label | Etichetta | — |

---

### Arabic (`ar.json`)

RTL. Brand names appear in Latin inside Arabic text; the table below gives the Arabic rendering used.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / بيتكوين | Brand mostly kept in Latin. |
| Lightning | البرق / Lightning | "البرق" (lightning, the natural phenomenon) is used in body text, often with Latin "Lightning" in parens. |
| Electrum | Electrum | Brand. |
| LNDhub | LNDhub | — |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | GroundControl | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats / satoshi | ساتوشي / بالساتوشي | Transliteration. |
| sat/vByte | ساتوشي لكل بايت افتراضي | Lit. "satoshi per virtual byte". |
| vByte | بايت افتراضي | — |
| **_Wallet, keys & seeds_** | | |
| Wallet | محفظة / المحافظ | — |
| Vault | خزنة متعددة التواقيع | "خزنة" = vault. |
| Watch-only | للقراءة فقط | — |
| Hardware wallet | محفظة جهاز | — |
| Seed | عبارة الاسترداد | Lit. "recovery phrase". |
| Mnemonic | عبارة الاسترداد | Same as Seed. |
| Passphrase | عبارة المرور | Lit. "passphrase" — distinct from password. |
| Public key | المفتاح العام | — |
| Private key | المفتاح الخاص | — |
| WIF | WIF | — |
| xpub | xpub | — |
| Descriptor | TODO | — |
| Derivation path | مسار الاشتقاق | Note: shipped has redundant `(derivation path)` parenthetical. |
| Master fingerprint | البصمة الرئيسية | — |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | العملية / المعاملة | App uses "العملية" (operation); "المعاملة" (transaction) also common. |
| Address | العنوان | — |
| Input | TODO | — |
| Output | TODO | — |
| UTXO | TODO | — |
| Change | الباقي | TODO: shipped `cc.change` "تغيير" (alteration) — wrong context. |
| Hex | Hex | Latin kept. |
| Pending | قيد الانتظار | — |
| Unconfirmed | غير مؤكدة | — |
| Confirmed | مؤكدة | — |
| Mempool | الذاكرة المعلقة | — |
| Broadcast | البث | — |
| Block explorer | مستكشف الكتل | — |
| Onchain | TODO | — |
| Offchain | TODO | — |
| **_Fees & fee bumping_** | | |
| Fee | الرسوم | — |
| Fee Bump | السماح بزيادة الرسوم | — |
| RBF | RBF — الاستبدال بالرسوم | Acronym + Arabic gloss. |
| CPFP | تسريع المعاملة (CPFP) | Lit. "speed up the transaction". |
| Speed Up | تسريع العملية (RBF) | — |
| **_Lightning_** | | |
| Invoice | فاتورة / برقية | "فاتورة" for on-chain; "برقية" used specifically for LN invoice. |
| Lightning Invoice | برقية | Lit. "lightning-message" — creative calque. Note: also means "telegram" normally. |
| Preimage | TODO | Suggest "صورة أولية" or transliteration. |
| Payment | TODO | — |
| Expired | منتهية الصلاحية | — |
| **_Multisig & advanced addressing_** | | |
| Co-signer | TODO | — |
| Quorum | العدد | Lit. "the count". |
| PSBT | PSBT | — |
| Provide signature | قدم توقيعًا | — |
| BIP47 / Payment Code | TODO | — |
| Notification transaction | TODO | — |
| SilentPayment | TODO | — |
| **_Coin control_** | | |
| Coin Control | التحكم في العملات | — |
| Frozen | تجميد | — |
| **_Security & storage_** | | |
| Encrypted storage | TODO | — |
| Plausible Deniability | الإنكار المقبول | — |
| Biometrics | القياسات الحيوية | — |
| Passcode | TODO | — |
| **_Backup, import & UX_** | | |
| Backup | النسخ الاحتياطي | — |
| Restore | استعادة | — |
| Import | الاستيراد | — |
| Voucher | قسيمة | TODO: shipped uses "Atze.co" — typo. |
| Redeem | الاسترداد | — |
| Send | إرسال | — |
| Receive | استلام | — |
| Settings | الإعدادات | — |
| Confirm | التأكيد | — |
| QR Code | TODO | — |
| Clipboard | الحافظة | — |
| Memo | مذكرة | — |
| Description | الوصف | — |
| Label | علامة | — |

---

### Turkish (`tr_tr.json`)

Incomplete locale (~190 strings shipped). Many TODO entries.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | Brand. |
| Lightning | Lightning | Brand. |
| Electrum | TODO | — |
| LNDhub | TODO | — |
| LND | TODO | — |
| LNURL | TODO | — |
| Tor | TODO | — |
| Orbot | TODO | — |
| GroundControl | TODO | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats | sat | Singular. |
| sat/vByte | TODO | — |
| vByte | TODO | — |
| **_Wallet, keys & seeds_** | | |
| Wallet | Cüzdan / cüzdanlar | Note: shipped capitalisation inconsistent. |
| Vault | TODO | — |
| Watch-only | TODO | — |
| Hardware wallet | TODO | — |
| Seed | Seed | Loanword. |
| Mnemonic | TODO | — |
| Passphrase | TODO | — |
| Public key | TODO | — |
| Private key | TODO | — |
| WIF | TODO | — |
| xpub | TODO | — |
| Descriptor | TODO | — |
| Derivation path | TODO | — |
| Master fingerprint | TODO | — |
| BIP38 | TODO | — |
| **_On-chain transactions_** | | |
| Transaction | İşlem | — |
| Address | Adres | — |
| Input | TODO | — |
| Output | TODO | — |
| UTXO | TODO | — |
| Change | TODO | Suggest "para üstü". |
| Hex | Hex | Loanword. |
| Pending | Beklemede | — |
| Unconfirmed | TODO | — |
| Confirmed | TODO | — |
| Mempool | TODO | — |
| Broadcast | Yayın | — |
| Block explorer | TODO | — |
| Onchain | TODO | — |
| Offchain | TODO | — |
| **_Fees & fee bumping_** | | |
| Fee | Ücret | — |
| Fee Bump | Ücret arttırımına izin ver | — |
| RBF | TODO | — |
| CPFP | TODO | — |
| Speed Up | TODO | — |
| **_Lightning_** | | |
| Invoice | fatura | — |
| Lightning Invoice | Lightning faturası | Possessive suffix. |
| Preimage | TODO | — |
| Payment | TODO | — |
| Expired | Süresi doldu | — |
| **_Multisig & advanced addressing_** | | |
| Co-signer | TODO | — |
| Quorum | TODO | — |
| PSBT | TODO | — |
| Provide signature | TODO | — |
| BIP47 / Payment Code | TODO | — |
| Notification transaction | TODO | — |
| SilentPayment | TODO | — |
| **_Coin control_** | | |
| Coin Control | TODO | — |
| Frozen | TODO | — |
| **_Security & storage_** | | |
| Encrypted storage | TODO | — |
| Plausible Deniability | Makul Ret | — |
| Biometrics | Biyometrikler | — |
| Passcode | TODO | — |
| **_Backup, import & UX_** | | |
| Backup | yedekle | Verb form. |
| Restore | TODO | — |
| Import | içeri yükle | Lit. "load inside". |
| Voucher | kupon | "Azte.co kuponu" = Azte.co voucher. |
| Redeem | bozdurun | Lit. "exchange/break (cash)". |
| Send | Gönder | — |
| Receive | Al | — |
| Settings | ayarlar | — |
| Confirm | Onayla | — |
| QR Code | TODO | — |
| Clipboard | Pano | — |
| Memo | Not | — |
| Description | Açıklama | — |
| Label | TODO | — |

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

### Missing translations

- Preimage missing in **es**, **it**, **ar**, **tr**.
- BIP47/Payment Code missing in **es**, **it**, **ar**, **tr**.
- Descriptor missing in nearly all non-en locales.
- Input/Output missing in **es**, **de**, **fr**, **pt_br**, **it**, **ar**, **tr**.
- UTXO row missing in **de**, **fr** (partial), **it**, **ar**, **tr**.
- Onchain / Offchain missing in **es**, **it**, **ar**, **tr**.
- GroundControl row missing in **es**.
- QR Code row missing in **es**, **it**, **ar**, **tr**.
- Passcode row missing across most non-en, non-jp, non-zh_cn locales.
- **tr** locale is broadly incomplete (~30% coverage).

---

## Adding a new term

1. Decide which of the 10 categories it belongs to.
2. Add a row to **Glossary of terms** under that category with the English meaning.
3. Add a row to each per-language section under the same category (between the category's divider row and the next divider row). Mark unknown values **TODO**.
4. If the term is brand/protocol (capitalised proper noun), default to **keep in English** across locales unless a locale has an established convention.
5. If you change a shipped string in a locale's `.json`, update the corresponding row here in the same PR.
