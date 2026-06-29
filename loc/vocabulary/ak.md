# Akan translation vocabulary (`ak.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: Akan (Twi/Fante) is a Niger-Congo Kwa language written in the Latin script (LTR) with the special letters **ɛ** and **ɔ**. No upstream wallet project (Bitcoin Core, Electrum, Phoenix, Zeus, Trezor, Cake, Bisq, Green, Breez) ships an Akan localization, and the Akan Wikipedia has no Bitcoin/Lightning article (the `Bitcoin` and `Sika` pages 404). With no native wallet citations available, almost every row below is a **best-effort** native rendering or a **transliteration**; rows are tagged `(transliteration)` or `(no upstream wallet citation)` accordingly. Brand/protocol names and acronyms are kept Latin per convention.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin (no ak.wikipedia article). |
| Lightning | Lightning | brand kept Latin. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | Bitcoin / BTC | noun unit + ticker; kept Latin (no upstream wallet citation). |
| sats | satoshi | noun · transliteration of satoshi (no upstream wallet citation). |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | sika kotokuo | noun · native "money bag/purse" (no upstream wallet citation). |
| Vault | sika korabea | noun · "money store / strongbox" (no upstream wallet citation). ⚠️ NOT a brand. |
| Watch-only | hwɛ-nko | adj · "watch-only" (no upstream wallet citation). ⚠️ NOT generic "view mode". |
| Hardware wallet | hardware sika kotokuo | noun · "hardware" kept Latin + native purse (no upstream wallet citation). |
| Seed | aba | noun · native "seed (of a plant)"; also transliterated `seed` (no upstream wallet citation). |
| Mnemonic | nkaeɛ nsɛmfua | noun · "words of remembrance / recovery phrase" (no upstream wallet citation). |
| Passphrase | ahintasɛm | noun · "hidden/secret phrase" · ⚠️ NOT the app password (`password`) and NOT the device passcode (no upstream wallet citation). |
| Public key | badwam safoa | noun · "public key" (safoa = key) (no upstream wallet citation). |
| Private key | kokoam safoa | noun · "secret/private key" (no upstream wallet citation). |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | descriptor | noun · transliteration kept Latin (no upstream wallet citation). |
| Derivation path | derivation path | noun · transliteration kept Latin (no upstream wallet citation). |
| Master fingerprint | master fingerprint | noun · transliteration kept Latin (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | nsesaeɛ | noun · "exchange / transaction" (no upstream wallet citation). |
| Address | Adrɛse / address | noun · Akan-orthography transliteration `Adrɛse` (labels) / Latin `address` (body); no native term (no upstream wallet citation). |
| Input | deɛ ɛba mu | noun · "what comes in" · ⚠️ NOT "login / entrance" (no upstream wallet citation). |
| Output | deɛ ɛfiri adi | noun · "what goes out" · ⚠️ NOT the UI recipient label "To:" (no upstream wallet citation). |
| UTXO | UTXO | acronym. |
| Change | sika a aka | noun · "money that remains / change" · ⚠️ NOT verb "to change/modify" (no upstream wallet citation). |
| Hex | hex | noun · transliteration kept Latin · ⚠️ NOT "hash" (no upstream wallet citation). |
| Pending | ɛretwɛn | adj/state · "is waiting/pending" · ⚠️ NOT a noun (no upstream wallet citation). |
| Unconfirmed | wɔnnsii so dua | adj/state · "not confirmed" (no upstream wallet citation). |
| Confirmed | wɔasi so dua | adj/state · "has been confirmed" (no upstream wallet citation). |
| Mempool | mempool | technical term kept Latin (no native rendering). |
| Broadcast | bɔ dawuro | verb · native "beat the gong / announce" / noun `dawurobɔ` (no upstream wallet citation). |
| Block explorer | block explorer | noun · kept Latin/transliteration (no upstream wallet citation). |
| Onchain | chain so | adj · "on the chain" (no upstream wallet citation). |
| Offchain | chain akyi | adj · "off the chain" (no upstream wallet citation). |
| **_Fees & fee bumping_** | | |
| Fee | ka | noun · "charge / fee" (no upstream wallet citation). |
| Fee Bump | ka no ho nkɔsoɔ | noun · "fee increase" (no upstream wallet citation). |
| RBF | RBF | acronym. |
| CPFP | CPFP | acronym · ⚠️ NOT a verb. |
| Speed Up | yɛ no ntɛm | verb · "make it fast / speed up" (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | ka krataa | noun · "bill paper / invoice" (no upstream wallet citation). |
| Lightning Invoice | Lightning ka krataa | noun · brand kept Latin + native noun (no upstream wallet citation). |
| Preimage | preimage | noun · math term kept Latin (no upstream wallet citation). |
| Payment | akatua | noun · "payment" · ⚠️ NOT verb "to pay" (`tua`) (no upstream wallet citation). |
| Expired | bere asa | adj/state · "time is over / expired" (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | ɔde-nsa-hyɛ-ase foɔ | noun · "one who signs" · ⚠️ NOT "co-owner" (no upstream wallet citation). |
| Quorum | quorum | noun · transliteration kept Latin / "dodoɔ a ɛho hia" (no upstream wallet citation). |
| PSBT | PSBT | acronym. |
| Provide signature | hyɛ wo nsa ase | verb · "sign / put your hand under" (no upstream wallet citation). |
| BIP47 / Payment Code | BIP47 / akatua koodu | acronym kept; "Payment Code" translatable noun (no upstream wallet citation). |
| Notification transaction | amaneɛbɔ nsesaeɛ | noun · "notification transaction" (no upstream wallet citation). |
| SilentPayment | Silent Payments / akatua a ɛnka | protocol name kept English (plural); explanatory gloss "payment that is silent" (no upstream wallet citation). |
| **_Coin control_** | | |
| Coin Control | sika so banbɔ | noun · "control over coins" / `coin control` · ⚠️ Akan has no Title Case for ordinary nouns (no upstream wallet citation). |
| Frozen | wɔakyekyere | adj/state · "has been tied/locked" · ⚠️ NOT verb "to freeze" (no upstream wallet citation). |
| **_Security & storage_** | | |
| Encrypted storage | koraeɛ a wɔakyekyere mu | noun · "storage that is locked/secured" · ⚠️ Akan has no Title Case (no upstream wallet citation). |
| Plausible Deniability | atoroɔ banbɔ a ɛyɛ nokwasɛm | noun · "protection that plausibly appears true" · ⚠️ Akan has no Title Case; abstract concept, uncertain rendering (no upstream wallet citation). |
| Biometrics | honam nsɛnkyerɛnne | noun · "body markers" / also transliterated `biometrics` (no upstream wallet citation). |
| Passcode | passcode | noun · transliteration / "koodu" · ⚠️ NOT the app password (no upstream wallet citation). |
| **_Backup, import & UX_** | | |
| Backup | nsiesie | noun · "backup / setting aside" / verb `siesie` (no upstream wallet citation). |
| Restore | san gye | verb · "get back / restore" / noun `nsangyeɛ` (no upstream wallet citation). |
| Import | fa ba mu | verb · "bring in / import" (no upstream wallet citation). |
| Voucher | voucher | noun · transliteration kept Latin (no upstream wallet citation). |
| Redeem | gye | verb · "collect / redeem" · ⚠️ NOT "buy to wallet" / NOT "transfer" (no upstream wallet citation). |
| Send | soma / fa kɔ | verb · "send" (`soma`) / "take to" (`fa kɔ`) for funds (no upstream wallet citation). |
| Receive | gye | verb · "receive / get" (no upstream wallet citation). |
| Settings | nhyehyɛeɛ | noun · "arrangements / settings" (no upstream wallet citation). |
| Confirm | si so dua | verb · "confirm / affirm" (no upstream wallet citation). |
| QR Code | QR Koodu | noun · brand QR kept Latin + transliterated "koodu" (no upstream wallet citation). |
| Clipboard | clipboard | noun · transliteration kept Latin (no upstream wallet citation). |
| Memo | nkaeɛ | noun · "note / reminder" (no upstream wallet citation). |
| Description | nkyerɛkyerɛmu | noun · "explanation / description" (no upstream wallet citation). |
| Label | din | noun · "name / label" · ⚠️ must be a noun, not "to label" (no upstream wallet citation). |
</invoke>

