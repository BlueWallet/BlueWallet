# Punjabi translation vocabulary (`pa.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: Punjabi (Gurmukhi, LTR) is not well covered by upstream Bitcoin/Lightning wallet localizations — `bitcoin_pa.ts` exists but is largely unfinished, and most other locale files (Electrum `pa/electrum.po`, Phoenix, Zeus, Trezor, Cake, Green, Bisq) lack Punjabi. The main native-script reference is pa.wikipedia.org (Bitcoin article). Native Punjabi words are used where they are well established; technical/brand terms fall back to a Gurmukhi transliteration, marked "(transliteration)". Brands/acronyms stay Latin per convention.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; Punjabi gloss `ਬਿਟਕੋਇਨ` per pa.wikipedia.org (use in body text only). |
| Lightning | Lightning | brand kept Latin (no settled Punjabi rendering). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | ਬਿਟਕੋਇਨ / BTC | noun unit + ticker · pa.wikipedia.org (transliteration) |
| sats | ਸੈਟਸ | noun · transliteration of satoshi (no upstream wallet citation). |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | ਵਾਲਿਟ | noun · transliteration; native ਬਟੂਆ (purse) also understood. |
| Vault | ਤਿਜੋਰੀ | noun · native "safe / strongbox". ⚠️ NOT a brand. |
| Watch-only | ਸਿਰਫ਼-ਦੇਖਣ ਵਾਲਾ | adj · descriptive "view-only" (no upstream wallet citation). ⚠️ NOT generic "view mode". |
| Hardware wallet | ਹਾਰਡਵੇਅਰ ਵਾਲਿਟ | noun · parallel to Wallet=ਵਾਲਿਟ (transliteration). |
| Seed | ਸੀਡ | noun · transliteration (no upstream wallet citation). |
| Mnemonic | ਨੀਮੋਨਿਕ ਵਾਕ | noun · transliteration + "phrase" (no upstream wallet citation). |
| Passphrase | ਪਾਸਫ੍ਰੇਜ਼ | noun · ⚠️ NOT ਪਾਸਵਰਡ (password) — distinct transliteration. |
| Public key | ਜਨਤਕ ਕੁੰਜੀ | noun · native "public" + "key" (ਕੁੰਜੀ). |
| Private key | ਨਿੱਜੀ ਕੁੰਜੀ | noun · native "private" + "key" (ਕੁੰਜੀ). |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | ਡਿਸਕ੍ਰਿਪਟਰ | noun · transliteration (no upstream wallet citation). |
| Derivation path | ਡੈਰੀਵੇਸ਼ਨ ਪਾਥ | noun · transliteration (no upstream wallet citation). |
| Master fingerprint | ਮਾਸਟਰ ਫਿੰਗਰਪ੍ਰਿੰਟ | noun · transliteration (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | ਲੈਣ-ਦੇਣ | noun · standard Punjabi "transaction / dealing". |
| Address | ਪਤਾ | noun · standard Punjabi "address". |
| Input | ਇਨਪੁੱਟ | noun · ⚠️ NOT "login / entrance" (transliteration). |
| Output | ਆਉਟਪੁੱਟ | noun · parallel to Input=ਇਨਪੁੱਟ (transliteration). ⚠️ NOT the UI recipient label "To:". |
| UTXO | UTXO | acronym. |
| Change | ਬਾਕੀ | noun · "remainder / leftover". ⚠️ NOT verb "to change/modify". |
| Hex | ਹੈਕਸ | noun · transliteration (no upstream wallet citation). ⚠️ NOT "hash". |
| Pending | ਬਕਾਇਆ | adj/state · "pending/outstanding". ⚠️ NOT a noun. |
| Unconfirmed | ਅਪੁਸ਼ਟ | adj · "unconfirmed". |
| Confirmed | ਪੁਸ਼ਟ | adj/state form · "confirmed". |
| Mempool | mempool | technical term kept Latin (no Punjabi upstream rendering). |
| Broadcast | ਪ੍ਰਸਾਰਣ / ਪ੍ਰਸਾਰਿਤ ਕਰੋ | noun / verb · "broadcast / transmit". |
| Block explorer | ਬਲਾਕ ਐਕਸਪਲੋਰਰ | noun · transliteration (no upstream wallet citation). |
| Onchain | ਆਨ-ਚੇਨ | adj · transliteration; no native Punjabi term. |
| Offchain | ਆਫ-ਚੇਨ | adj · transliteration; no native Punjabi term. |
| **_Fees & fee bumping_** | | |
| Fee | ਫ਼ੀਸ | noun · standard Punjabi "fee". |
| Fee Bump | ਫ਼ੀਸ ਵਾਧਾ | noun · "fee increase" (no upstream wallet citation). |
| RBF | RBF | acronym. |
| CPFP | CPFP | acronym · ⚠️ NOT a verb. |
| Speed Up | ਤੇਜ਼ ਕਰੋ | verb · imperative "speed up" (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | ਇਨਵੌਇਸ / ਬਿੱਲ | noun · transliteration / native "bill" (no upstream wallet citation). |
| Lightning Invoice | Lightning ਇਨਵੌਇਸ | noun · brand kept Latin + localised noun. |
| Preimage | ਪ੍ਰੀ-ਇਮੇਜ | noun · transliteration of math term (no upstream wallet citation). |
| Payment | ਭੁਗਤਾਨ | noun · standard Punjabi "payment". ⚠️ NOT verb "to pay". |
| Expired | ਮਿਆਦ ਪੁੱਗ ਗਈ | adj/state · "validity expired" (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | ਸਹਿ-ਦਸਤਖ਼ਤਕਰਤਾ | noun · literal "co-signer". ⚠️ NOT "co-owner". |
| Quorum | ਕੋਰਮ | noun · transliteration (no upstream wallet citation). |
| PSBT | PSBT | acronym. |
| Provide signature | ਦਸਤਖ਼ਤ ਕਰੋ | verb · "sign" (no upstream wallet citation). |
| BIP47 / Payment Code | BIP47 / ਭੁਗਤਾਨ ਕੋਡ | acronym kept; "Payment Code" translatable noun. |
| Notification transaction | ਸੂਚਨਾ ਲੈਣ-ਦੇਣ | noun · BIP47-specific "notification + transaction" (no upstream wallet citation). |
| SilentPayment | Silent Payments / ਖ਼ਾਮੋਸ਼ ਭੁਗਤਾਨ | protocol name kept English (plural); explanatory Punjabi gloss "silent payments". |
| **_Coin control_** | | |
| Coin Control | ਸਿੱਕਾ ਕੰਟਰੋਲ | noun · "coin control" (Gurmukhi has no casing). ⚠️ NOT Title Case. |
| Frozen | ਜੰਮਿਆ | adj/state · "frozen". ⚠️ NOT verb "to freeze". |
| **_Security & storage_** | | |
| Encrypted storage | ਇਨਕ੍ਰਿਪਟ ਕੀਤੀ ਸਟੋਰੇਜ | noun · "encrypted storage" (transliteration). ⚠️ NOT Title Case. |
| Plausible Deniability | ਸੰਭਾਵੀ ਇਨਕਾਰ | noun · "plausible denial" (no upstream wallet citation). ⚠️ NOT Title Case. |
| Biometrics | ਬਾਇਓਮੈਟ੍ਰਿਕਸ | noun · transliteration (no upstream wallet citation). |
| Passcode | ਪਾਸਕੋਡ | noun · transliteration · ⚠️ NOT ਪਾਸਵਰਡ (= app password). Distinct word for device unlock code. |
| **_Backup, import & UX_** | | |
| Backup | ਬੈਕਅੱਪ | noun · transliteration (no upstream wallet citation). |
| Restore | ਬਹਾਲ ਕਰੋ / ਬਹਾਲੀ | verb / noun · native "restore". |
| Import | ਆਯਾਤ ਕਰੋ | verb / noun · native "import". |
| Voucher | ਵਾਊਚਰ | noun · transliteration (no upstream wallet citation). |
| Redeem | ਰੀਡੀਮ ਕਰੋ | verb · transliteration (no upstream wallet citation). ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | ਭੇਜੋ | verb · standard Punjabi imperative "send". |
| Receive | ਪ੍ਰਾਪਤ ਕਰੋ | verb · standard Punjabi "receive". |
| Settings | ਸੈਟਿੰਗਾਂ | noun · standard Punjabi "settings" (plural). |
| Confirm | ਪੁਸ਼ਟੀ ਕਰੋ | verb · standard Punjabi "confirm". |
| QR Code | QR ਕੋਡ | noun · "QR" Latin + ਕੋਡ. |
| Clipboard | ਕਲਿੱਪਬੋਰਡ | noun · transliteration (no upstream wallet citation). |
| Memo | ਮੀਮੋ | noun · transliteration; native ਨੋਟ (note) also used. |
| Description | ਵੇਰਵਾ | noun · standard Punjabi "description / detail". |
| Label | ਲੇਬਲ | noun · transliteration (no upstream wallet citation). |

