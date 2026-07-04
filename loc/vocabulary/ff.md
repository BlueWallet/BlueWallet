# Fula translation vocabulary (`ff.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: upstream Bitcoin/Lightning wallet projects (Bitcoin Core, Electrum, Phoenix, Zeus, Trezor, Cake, Bisq, Green, Breez) do **not** ship Fula (Fulfulde/Pulaar) localizations — no `bitcoin_ff.ts` and all other locale files 404. The only native references are the small Fula Wikipedia (ff.wikipedia.org) and general Pulaar/Fulfulde lexicon. Fula is written in Latin script (LTR) and uses the special letters `ɓ ɗ ŋ ƴ`. Almost every technical row is therefore **best-effort / transliteration**; such rows are tagged `(transliteration)` and/or `(no upstream wallet citation)`. Brand/protocol names stay in Latin.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; Fula gloss `Bitkoyin` may appear in body text per ff.wikipedia.org. |
| Lightning | Lightning | brand kept Latin (no ff.wikipedia article for Lightning Network). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker · brand kept Latin (no upstream wallet citation). |
| sats | sats | noun · kept Latin, smallest unit (no upstream wallet citation). |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | boktoore | noun · "purse / pouch" — native Pulaar/Fulfulde word (no upstream wallet citation). |
| Vault | sanduku kisal | noun · "safe / strongbox" (`sanduku` box + `kisal` safety) (no upstream wallet citation). ⚠️ NOT a brand. |
| Watch-only | ndaarɗo-tan | adj · "view-only" (`ndaarde` to look + `tan` only) (no upstream wallet citation). ⚠️ NOT generic "view mode". |
| Hardware wallet | boktoore kaɓirgal | noun · "device wallet" (`kaɓirgal` apparatus/tool) (no upstream wallet citation). |
| Seed | aawdi | noun · "seed (for sowing)" — native term reused for recovery seed (no upstream wallet citation). |
| Mnemonic | konngi ciftorɗi | noun · "remembrance words" (`konngol` word + `siftorde` to recall) (no upstream wallet citation). |
| Passphrase | konngol gunndoo | noun · "secret phrase" · ⚠️ NOT `finnde` (app password) — distinct term (no upstream wallet citation). |
| Public key | coktirgal laaɓngal | noun · "public key" (`coktirgal` key + `laaɓngal` open/clear) parallel to private key (no upstream wallet citation). |
| Private key | coktirgal suuɗiingal | noun · "hidden/secret key" (`suuɗde` to hide) (no upstream wallet citation). |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | siforwol | noun · "descriptor" (from `sifaade` to describe) (no upstream wallet citation). |
| Derivation path | laawol jaltingol | noun · "derivation path" (`laawol` path + `jaltinde` to derive/extract) (no upstream wallet citation). |
| Master fingerprint | tampannde jaaba | noun · "master fingerprint" (`tampannde` imprint + `jaaba` master/chief) (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | njuɓɓudi | noun · "transaction / dealing" (from `juɓɓinde` to arrange/conduct) (no upstream wallet citation). |
| Address | adreesi | noun · transliteration (no upstream wallet citation). |
| Input | naatirde | noun · "entry / inflow" (from `naatde` to enter) · ⚠️ NOT "login / entrance" (no upstream wallet citation). |
| Output | yaltirde | noun · "exit / outflow" (from `yaltude` to exit) parallel to Input (no upstream wallet citation). ⚠️ NOT the UI recipient label "To:". |
| UTXO | UTXO | acronym. |
| Change | keddi | noun · "remainder / leftover" (from `heddaade` to remain) (no upstream wallet citation). ⚠️ NOT verb "to change/modify". |
| Hex | hex | noun · kept Latin (transliteration) (no upstream wallet citation). ⚠️ NOT "hash". |
| Pending | ina padii | adj/state · "is waiting" (from `fadde` to wait) (no upstream wallet citation). ⚠️ NOT a noun. |
| Unconfirmed | tabintinaaka | adj · "not confirmed" (from `tabintinde` to confirm) (no upstream wallet citation). |
| Confirmed | tabintinaama | adj/state · "has been confirmed" (no upstream wallet citation). |
| Mempool | mempool | technical term kept Latin (no Fula upstream rendering). |
| Broadcast | saakto / saaktu | noun / verb · "spread / broadcast it" (from `saaktude` to spread) (no upstream wallet citation). |
| Block explorer | ndaarirde blok | noun · "block explorer" (`ndaarirde` viewer + `blok` block) (no upstream wallet citation). |
| Onchain | e jokkere / on-chain | adj · "on the chain" / transliteration (no upstream wallet citation). |
| Offchain | boowal jokkere / off-chain | adj · "off the chain" / transliteration (no upstream wallet citation). |
| **_Fees & fee bumping_** | | |
| Fee | njoɓdi | noun · "payment / fee" (from `yoɓde` to pay) (no upstream wallet citation). |
| Fee Bump | ɓeydude njoɓdi | noun/verb · "increase the fee" (`ɓeydude` to add/increase) (no upstream wallet citation). |
| RBF | RBF | acronym. |
| CPFP | CPFP | acronym · ⚠️ NOT a verb. |
| Speed Up | yaawnu | verb · imperative "speed up / hasten" (from `yaawnude`) (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | faktiir | noun · transliteration of "invoice/facture" (no upstream wallet citation). |
| Lightning Invoice | faktiir Lightning | noun · brand kept Latin + localised noun (no upstream wallet citation). |
| Preimage | pre-image | noun · math term kept Latin (transliteration) (no upstream wallet citation). |
| Payment | njoɓdi | noun · "payment" (from `yoɓde` to pay) (no upstream wallet citation). ⚠️ NOT verb "to pay". |
| Expired | timmii | adj/state · "has ended/expired" (from `timmude` to finish) (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | gardiiɗo siiñoore | noun · "co-signer" (`siiñoore` signature) (no upstream wallet citation). ⚠️ NOT "co-owner". |
| Quorum | keewal sokliingal | noun · "required count / threshold" (`keewal` quantity + `soklude` to need) (no upstream wallet citation). |
| PSBT | PSBT | acronym. |
| Provide signature | siiño | verb · "sign" (imperative, from `siiñaade`) (no upstream wallet citation). |
| BIP47 / Payment Code | BIP47 / kood njoɓdi | acronym kept; "Payment Code" translatable noun `kood njoɓdi` (no upstream wallet citation). |
| Notification transaction | njuɓɓudi tintinoore | noun · "notification transaction" (`tintinde` to notify) (no upstream wallet citation). |
| SilentPayment | Silent Payments / njoɓɗi deeƴɗi | protocol name kept English (plural); explanatory gloss "silent payments" (no upstream wallet citation). |
| **_Coin control_** | | |
| Coin Control | njiimaandi koppe | noun · "coin control" (`njiimaandi` control/governance + `koppe` coins) (no upstream wallet citation). ⚠️ NOT Title Case. |
| Frozen | jaangaama | adj/state · "has been frozen" (from `jaangude` to be cold/freeze) (no upstream wallet citation). ⚠️ NOT verb "to freeze". |
| **_Security & storage_** | | |
| Encrypted storage | mooftirde wirniinde | noun · "encrypted storage" (`mooftirde` store + `wirnude` to conceal) (no upstream wallet citation). ⚠️ NOT Title Case. |
| Plausible Deniability | suuɗgol gaandiingol | noun · "concealment that is deniable / believable" — best-effort abstract rendering (no upstream wallet citation). ⚠️ NOT Title Case. |
| Biometrics | biyometrii | noun · transliteration (no upstream wallet citation). |
| Passcode | kood udditirgal | noun · "unlock code" · ⚠️ NOT `finnde` (= app password). Distinct word for device unlock code (no upstream wallet citation). |
| **_Backup, import & UX_** | | |
| Backup | kisnirde / hisnude | noun / verb · "backup / to back up" (from `hisnude` to safeguard) (no upstream wallet citation). |
| Restore | artir / artirgol | verb / noun · "restore / restoration" (from `artirde` to bring back) (no upstream wallet citation). |
| Import | naatnu / naatnugol | verb / noun · "import" (from `naatnude` to bring in) (no upstream wallet citation). |
| Voucher | bon | noun · transliteration of "bon / voucher" (no upstream wallet citation). |
| Redeem | hettu | verb · "claim / cash in" (from `hettude` to take/collect) (no upstream wallet citation). ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | neldu | verb · imperative "send" (from `neldude`) (no upstream wallet citation). |
| Receive | jaɓ / heɓ | verb · imperative "receive / get" (from `jaɓude` / `heɓude`) (no upstream wallet citation). |
| Settings | teelte | noun · "settings / adjustments" (no upstream wallet citation). |
| Confirm | tabintinde | verb · "confirm" (from `tabintinde` to make firm) (no upstream wallet citation). |
| QR Code | kood QR | noun · "QR code" (no upstream wallet citation). |
| Clipboard | tabal-natto | noun · "clipboard" (best-effort compound) (no upstream wallet citation). |
| Memo | siftorgol | noun · "note / reminder" (from `siftorde` to recall) (no upstream wallet citation). |
| Description | sifaa | noun · "description" (from `sifaade` to describe) (no upstream wallet citation). |
| Label | maantorgal | noun · "label / mark" (from `maantaade` to mark) (no upstream wallet citation). |
