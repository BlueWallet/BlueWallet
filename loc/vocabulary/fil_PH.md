# Filipino translation vocabulary (`fil_PH.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: Filipino/Tagalog (Latin script, LTR). Bitcoin Core ships a Filipino/Tagalog locale (`bitcoin_fil.ts` / `tl`) that anchors the core on-chain vocabulary (e.g. Wallet → *Pitaka*, Send → *Ipadala*, Receive → *Tumanggap*). Where Bitcoin Core/Electrum/Wikipedia do not cover a term, the table uses a natural Filipino noun/verb or a settled English borrowing common in Filipino tech usage; such rows are marked "(transliteration)" or "native Filipino". Brand/protocol names and acronyms stay Latin. Filipino does not Title-Case ordinary nouns, so lowercase is used except for brand rows and sentence-initial casing.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin. |
| Lightning | Lightning | brand kept Latin. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; unit lowercase, ticker uppercase. |
| sats | sats | noun, lowercase; kept as-is (no Filipino native unit). |
| sat/vByte | sat/vByte | technical fee-rate unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | pitaka | noun · Bitcoin Core fil/tl (*Pitaka* = wallet/purse). |
| Vault | kaban / kahang-bakal | noun · "coffer / iron safe"; native Filipino for strongbox. ⚠️ NOT a brand. |
| Watch-only | tingnan-lamang | adj · "view-only"; native Filipino descriptive. ⚠️ NOT generic "view mode". |
| Hardware wallet | hardware wallet | noun · borrowing; parallel to pitaka but device-specific (transliteration). |
| Seed | seed / parirala ng pagbawi | noun · technical / "recovery phrase"; native Filipino mainstream form. |
| Mnemonic | mnemonic na parirala | noun · "mnemonic phrase" (transliteration + native *parirala*). |
| Passphrase | passphrase | noun · ⚠️ NOT *password* (= app password, *hudyat*/*password*) — kept distinct (transliteration). |
| Public key | pampublikong susi | noun · *susi* = key; native Filipino, parallel to pribadong susi. |
| Private key | pribadong susi | noun · *susi* = key; native Filipino. |
| WIF | WIF | acronym kept. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | descriptor | noun · borrowing (transliteration). |
| Derivation path | derivation path | noun · borrowing; gloss *landas ng deribasyon* (transliteration). |
| Master fingerprint | master fingerprint | noun · borrowing (transliteration). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | transaksiyon | noun · Bitcoin Core fil/tl (*transaksyon*). |
| Address | address | noun · kept Latin; common in Filipino tech usage (gloss *tirahan*). |
| Input | input | noun · ⚠️ NOT "login / entrance"; tx-input borrowing (transliteration). |
| Output | output | noun · borrowing (transliteration). ⚠️ NOT the UI recipient label "To:". |
| UTXO | UTXO | acronym kept. |
| Change | sukli | noun · native Filipino "change/leftover money". ⚠️ NOT the verb "to change/modify" (*baguhin*). |
| Hex | hex | noun · borrowing (transliteration). ⚠️ NOT "hash". |
| Pending | nakabinbin | adj/state · native Filipino "pending/on hold". ⚠️ NOT a noun. |
| Unconfirmed | hindi pa nakumpirma | adj · "not yet confirmed"; native Filipino. |
| Confirmed | nakumpirma / kumpirmado | adj/state · native Filipino. |
| Mempool | mempool | technical term kept Latin. |
| Broadcast | i-broadcast / ipalaganap | verb / verb · borrowing / native "spread out". ⚠️ NOT radio broadcast (*isahimpapawid*). |
| Block explorer | block explorer | noun · borrowing; gloss *tagapaghanap ng block* (transliteration). |
| Onchain | onchain / sa chain | adj · compact / explanatory (transliteration). |
| Offchain | offchain / labas sa chain | adj · compact / explanatory (transliteration). |
| **_Fees & fee bumping_** | | |
| Fee | bayarin | noun · Bitcoin Core fil/tl (*bayad/bayarin* = fee/charge). |
| Fee Bump | pagtaas ng bayarin | noun · "fee increase"; native Filipino. |
| RBF | RBF | acronym kept; gloss "palitan ayon sa bayarin". |
| CPFP | CPFP | acronym kept. ⚠️ NOT a verb. |
| Speed Up | pabilisin | verb · imperative "speed up"; native Filipino. |
| **_Lightning_** | | |
| Invoice | invoice / kahilingan sa bayad | noun · technical borrowing / "payment request"; native Filipino mainstream. |
| Lightning Invoice | Lightning Invoice | noun · brand kept Latin + borrowing; gloss *kahilingan sa bayad ng Lightning*. |
| Preimage | pre-image | noun · math term kept (transliteration). |
| Payment | kabayaran | noun · native Filipino. ⚠️ NOT the verb "to pay" (*magbayad*). |
| Expired | nag-expire / paso | adj/state · borrowing / native Filipino "lapsed". |
| **_Multisig & advanced addressing_** | | |
| Co-signer | kasamang lumagda | noun · "co-signer"; native Filipino (*lagda* = signature). ⚠️ NOT "co-owner". |
| Quorum | korum | noun · native Filipino borrowing (legislative *korum*). |
| PSBT | PSBT | acronym kept. |
| Provide signature | magbigay ng lagda | verb · "provide signature"; native Filipino. |
| BIP47 / Payment Code | BIP47 / Payment Code | acronym kept; "Payment Code" kept Latin, gloss *code ng bayad*. |
| Notification transaction | transaksiyon ng abiso | noun · "notification + transaction"; native Filipino (*abiso* = notice). |
| SilentPayment | Silent Payments | brand kept English (plural); gloss *tahimik na bayad*. |
| **_Coin control_** | | |
| Coin Control | kontrol ng barya | noun · native Filipino (*barya* = coins). ⚠️ NOT Title Case (Filipino has casing but ordinary nouns are lowercase). |
| Frozen | naka-freeze / nagyelo | adj/state · borrowing / native "frozen". ⚠️ NOT the verb "to freeze". |
| **_Security & storage_** | | |
| Encrypted storage | naka-encrypt na storage | noun · borrowing (transliteration). ⚠️ NOT Title Case. |
| Plausible Deniability | kapani-paniwalang pagtanggi | noun · "believable denial"; native Filipino. ⚠️ NOT Title Case. |
| Biometrics | biometrics | noun · borrowing; gloss *biyometriko* (transliteration). |
| Passcode | passcode | noun · ⚠️ NOT app *password* (*hudyat*) — kept distinct (transliteration). |
| **_Backup, import & UX_** | | |
| Backup | backup / kopyang pansalba | noun · borrowing / native "rescue copy". |
| Restore | ibalik / pagbawi | verb / noun · native Filipino "return / recovery". |
| Import | i-import / mag-import | verb · borrowing with Filipino affix (transliteration). |
| Voucher | voucher | noun · borrowing (transliteration). |
| Redeem | tubusin | verb · native Filipino "redeem/cash in". ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | ipadala | verb · Bitcoin Core fil/tl. |
| Receive | tumanggap | verb · Bitcoin Core fil/tl. |
| Settings | mga setting | noun · borrowing common in Filipino UI; gloss *mga kaayusan* (transliteration). |
| Confirm | kumpirmahin | verb · native Filipino; "confirmations" = *mga kumpirmasyon* (noun). |
| QR Code | QR Code | noun · kept Latin. |
| Clipboard | clipboard | noun · borrowing (transliteration). |
| Memo | memo / tala | noun · borrowing / native "note". |
| Description | paglalarawan | noun · native Filipino. |
| Label | label / tatak | noun · borrowing / native "mark". |
</invoke>

