# Kannada translation vocabulary (`kn.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: upstream wallet projects (Bitcoin Core, Electrum, Phoenix, Zeus, Trezor, Cake, Bisq, Green, Breez) do **not** ship Kannada localizations — `bitcoin_kn.ts` exists but is 100% unfinished, all other locale files 404. The only native-script reference is Wikipedia kn (Bitcoin article). Almost every row remains **TODO** by design; fill only with high confidence from Wikipedia or the shipped `kn.json`.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; Kannada gloss `ಬಿಟ್‌ಕಾಯಿನ್` per kn.wikipedia.org/wiki/ಬಿಟ್‌ಕಾಯಿನ್ (use in body text only). |
| Lightning | Lightning | brand kept Latin (no kn.wikipedia article for Lightning Network). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | ಬಿಟ್‌ಕಾಯಿನ್ / BTC | noun unit + ticker · kn.wikipedia.org/wiki/ಬಿಟ್‌ಕಾಯಿನ್ |
| sats | ಸತಾಶಿ | noun · transliteration of satoshi as used in kn.wikipedia.org/wiki/ಬಿಟ್‌ಕಾಯಿನ್ |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | ವ್ಯಾಲೆಟ್ | noun · transliteration; matches `_.wallet_key` shipped in kn.json. |
| Vault | ತಿಜೋರಿ | noun · "safe / strongbox" — generic Kannada noun (no upstream wallet citation). ⚠️ NOT a brand. |
| Watch-only | ವೀಕ್ಷಣೆ-ಮಾತ್ರ | adj · descriptive "view-only" (no upstream wallet citation). ⚠️ NOT generic "view mode". |
| Hardware wallet | ಹಾರ್ಡ್‌ವೇರ್ ವ್ಯಾಲೆಟ್ | noun · transliteration parallel to Wallet=ವ್ಯಾಲೆಟ್ (no upstream wallet citation). |
| Seed | ಸೀಡ್ | noun · transliteration (no upstream wallet citation). |
| Mnemonic | ನಿಮೋನಿಕ್ ಫ್ರೇಸ್ | noun · transliteration (no upstream wallet citation). |
| Passphrase | ಪಾಸ್‌ಫ್ರೇಸ್ | noun · ⚠️ NOT ಪಾಸ್ವರ್ಡ್ (password) — distinct transliteration · Bitcoin Core kn |
| Public key | ಸಾರ್ವಜನಿಕ ಕೀ | noun · parallel to ಖಾಸಗಿ ಕೀ · Bitcoin Core kn |
| Private key | ಖಾಸಗಿ ಕೀ | noun · Bitcoin Core kn |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | ಡಿಸ್ಕ್ರಿಪ್ಟರ್ | noun · transliteration (no upstream wallet citation). |
| Derivation path | ಡೆರಿವೇಶನ್ ಪಾತ್ | noun · transliteration (no upstream wallet citation). |
| Master fingerprint | ಮಾಸ್ಟರ್ ಫಿಂಗರ್‌ಪ್ರಿಂಟ್ | noun · transliteration (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | ವಹಿವಾಟು / ವ್ಯವಹಾರ | noun · mainstream / technical (Wikipedia kn / Bitcoin Core kn) · kn.wikipedia.org/wiki/ಬಿಟ್‌ಕಾಯಿನ್ uses ವಹಿವಾಟು; Bitcoin Core kn uses ವ್ಯವಹಾರ. |
| Address | ವಿಳಾಸ | noun · Bitcoin Core kn |
| Input | ಇನ್‌ಪುಟ್ | noun · ⚠️ NOT "login / entrance" · Bitcoin Core kn (transliteration) |
| Output | ಔಟ್‌ಪುಟ್ | noun · transliteration parallel to Input=ಇನ್‌ಪುಟ್ (no upstream wallet citation). ⚠️ NOT the UI recipient label "To:". |
| UTXO | UTXO | acronym. |
| Change | ಚಿಲ್ಲರೆ | noun · "small change / leftover" (Kannada native term, no upstream wallet citation). ⚠️ NOT verb "to change/modify". |
| Hex | ಹೆಕ್ಸ್ | noun · transliteration (no upstream wallet citation). ⚠️ NOT "hash". |
| Pending | ಬಾಕಿ ಇದೆ | adj/state · "is pending/remaining" (no upstream wallet citation). ⚠️ NOT a noun. |
| Unconfirmed | ದೃಢೀಕರಿಸದ | adj · Bitcoin Core kn |
| Confirmed | ದೃಢೀಕರಿಸಲಾಗಿದೆ | adj/state form · Bitcoin Core kn |
| Mempool | mempool | technical term kept Latin (no Kannada upstream rendering). |
| Broadcast | ಪ್ರಸಾರ / ಪ್ರಸಾರ ಮಾಡಿ | noun / verb · Bitcoin Core kn |
| Block explorer | ಬ್ಲಾಕ್ ಎಕ್ಸ್‌ಪ್ಲೋರರ್ | noun · transliteration (no upstream wallet citation). |
| Onchain | ಆನ್-ಚೈನ್ | adj · transliteration; no native Kannada term in upstream refs. |
| Offchain | ಆಫ್-ಚೈನ್ | adj · transliteration; no native Kannada term in upstream refs. |
| **_Fees & fee bumping_** | | |
| Fee | ಶುಲ್ಕ | noun · Bitcoin Core kn |
| Fee Bump | ಶುಲ್ಕ ಹೆಚ್ಚಳ | noun · "fee increase" (no upstream wallet citation). |
| RBF | RBF | acronym. |
| CPFP | CPFP | acronym · ⚠️ NOT a verb. |
| Speed Up | ವೇಗಗೊಳಿಸಿ | verb · imperative "speed up" (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | ಸರಕುಪಟ್ಟಿ / ಇನ್‌ವಾಯ್ಸ್ | noun · native (bill) / transliteration (no upstream wallet citation). |
| Lightning Invoice | Lightning ಸರಕುಪಟ್ಟಿ | noun · brand kept Latin + localised noun (no upstream wallet citation). |
| Preimage | TODO | math term; uncertain Kannada rendering. |
| Payment | ಪಾವತಿ | noun · standard Kannada (no upstream wallet citation). ⚠️ NOT verb "to pay". |
| Expired | ಅವಧಿ ಮುಗಿದಿದೆ | adj/state · "validity ended" (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | ಸಹ-ಸಹಿದಾರ | noun · literal "co-signer" (no upstream wallet citation). ⚠️ NOT "co-owner". |
| Quorum | ಕೋರಂ | noun · transliteration (no upstream wallet citation). |
| PSBT | PSBT | acronym. |
| Provide signature | ಸಹಿ ಮಾಡಿ | verb · "sign" (no upstream wallet citation). |
| BIP47 / Payment Code | BIP47 / TODO | acronym kept; "Payment Code" translatable noun. |
| Notification transaction | ಸೂಚನೆ ವಹಿವಾಟು | noun · BIP47-specific "notification + transaction" (no upstream wallet citation). |
| SilentPayment | Silent Payments / TODO | protocol name kept English (plural); explanatory kn gloss TODO. |
| **_Coin control_** | | |
| Coin Control | ಕಾಯಿನ್ ನಿಯಂತ್ರಣ | noun · "coin control"; Devanagari has casing but Kannada parallel keeps loanword. ⚠️ NOT Title Case (Kannada has no casing). |
| Frozen | ಫ್ರೀಜ್ ಮಾಡಲಾಗಿದೆ | adj/state · "has been frozen" (no upstream wallet citation). ⚠️ NOT verb "to freeze". |
| **_Security & storage_** | | |
| Encrypted storage | ಎನ್‌ಕ್ರಿಪ್ಟ್ ಮಾಡಲಾದ ಸಂಗ್ರಹಣೆ | noun · ⚠️ NOT Title Case · shipped `_.storage_is_encrypted` uses ಎನ್‌ಕ್ರಿಪ್ಟ್ ಮಾಡಲಾಗಿದೆ + ಸಂಗ್ರಹಣೆ. Existing kn.json `wallets.add_placeholder` value `ಎನ್‌ಕ್ರಿಪ್ಟ್ (ಸಂಗ್ರಹಣೆ)` is malformed. |
| Plausible Deniability | TODO | ⚠️ NOT Title Case (Kannada has no casing). Abstract privacy concept — uncertain idiomatic Kannada rendering. |
| Biometrics | ಬಯೋಮೆಟ್ರಿಕ್ಸ್ | noun · transliteration (no upstream wallet citation). |
| Passcode | ಪಾಸ್‌ಕೋಡ್ | noun · transliteration · ⚠️ NOT ಪಾಸ್ವರ್ಡ್ (= app password). Distinct word needed for device unlock code. Shipped kn.json conflates the two. |
| **_Backup, import & UX_** | | |
| Backup | ಬ್ಯಾಕಪ್ | noun · transliteration · Bitcoin Core kn |
| Restore | ಪುನರುದ್ಧಾರ / ಪುನರುದ್ಧರಿಸಿ | noun / verb · Bitcoin Core kn |
| Import | ಆಮದು | noun / verb · standard Kannada noun "import" (no upstream wallet citation). |
| Voucher | ವೋಚರ್ | noun · transliteration (no upstream wallet citation). |
| Redeem | ರಿಡೀಮ್ ಮಾಡಿ | verb · transliteration (no upstream wallet citation). ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | ಕಳುಹಿಸಿ | verb · Bitcoin Core kn (imperative ಕಳುಹಿಸು; polite ಕಳುಹಿಸಿ preferred for UI) |
| Receive | ಸ್ವೀಕರಿಸಿ | verb · Bitcoin Core kn |
| Settings | ಸೆಟ್ಟಿಂಗ್‌ಗಳು | noun · Bitcoin Core kn |
| Confirm | ದೃಢೀಕರಿಸಿ | verb · Bitcoin Core kn |
| QR Code | QR ಕೋಡ್ | noun · Bitcoin Core kn |
| Clipboard | ಕ್ಲಿಪ್‌ಬೋರ್ಡ್ | noun · transliteration · Bitcoin Core kn |
| Memo | ಮೆಮೊ | noun · transliteration (no upstream wallet citation). |
| Description | ವರ್ಣನೆ | noun · Bitcoin Core kn |
| Label | ಲೇಬಲ್ | noun · transliteration · Bitcoin Core kn |
