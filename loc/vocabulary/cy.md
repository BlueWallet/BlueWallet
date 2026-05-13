# Welsh translation vocabulary (`cy.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · cy.wikipedia.org/wiki/Bitcoin |
| Lightning | Mellten | brand; Welsh for "lightning" — established in shipped UI (`Anfoneb Mellten`, `Mellten`). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; lowercase as unit. |
| sats | sats / satoshis | noun, lowercase · Bitcoin Core cy keeps `satoshi`. |
| sat/vByte | sat/vByte | technical unit; Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | waled / waledi | noun, lowercase; `waledi` plural (shipped `Waledi`). |
| Vault | claddgell / cist | noun · Welsh for "vault/strongbox"; avoid Latin "Vault". |
| Watch-only | gwylio'n unig | adj · Bitcoin Core cy. |
| Hardware wallet | waled caledwedd | noun, lowercase. |
| Seed | Seed / ymadrodd adfer | noun · English loanword preferred (UI convention) · ⚠️ NOT `hadyn` / `had` (botanical kernel — wrong register for crypto seed phrase). |
| Mnemonic | ymadrodd cofiadwy / ymadrodd adfer | noun · technical / mainstream ("recovery phrase"). |
| Passphrase | geiriau pas | noun · ⚠️ NOT `cyfrinair` (= password) · Bitcoin Core cy. |
| Public key | allwedd gyhoeddus | noun, lowercase. |
| Private key | allwedd breifat | noun, lowercase · Bitcoin Core cy. |
| WIF | WIF | acronym · gloss: fformat mewnforio waled. |
| xpub | xpub | acronym, lowercase. |
| Descriptor | disgrifydd | noun, lowercase. |
| Derivation path | llwybr deilliant | noun · BIP32 path. |
| Master fingerprint | ôl bys y brif allwedd | noun. |
| BIP38 | BIP38 | acronym kept · ⚠️ NOT a verb; gloss only: `cyfrinair i ddad-gryptio` (shipped paraphrase — should not replace acronym). |
| **_On-chain transactions_** | | |
| Transaction | trafodyn / trafodiad | noun · shipped `trafodyn` / Bitcoin Core cy `trafodiad`. |
| Address | cyfeiriad | noun, lowercase · Bitcoin Core cy. |
| Input | mewnbwn / mewnbynau | noun · singular / plural (shipped). |
| Output | allbwn / allbynau | noun · singular / plural · ⚠️ NOT the UI recipient label "At:" (that's separate). |
| UTXO | UTXO | acronym · gloss: allbwn trafodyn heb ei wario. |
| Change | newid | noun · ⚠️ NOT verb "to change/alter". Welsh `newid` is ambiguous (also "to change"); consider `gweddill` (remainder) for change-output. |
| Hex | hex / hecsadegol | noun · short / explanatory · ⚠️ NOT "hash" / NOT "transaction data" · cy.wikipedia.org/wiki/Hecsadegol |
| Pending | yn aros / disgwyl | adj/state · ⚠️ shipped `Disgwyl` literally means "wait" (verb); `yn aros` = "waiting/pending" reads better. |
| Unconfirmed | heb gadarnhau | adj · negation of `cadarnhawyd`. |
| Confirmed | cadarnhawyd | adj/state · ⚠️ shipped `Wedi Cysylltu` literally means "connected" — WRONG, must be fixed · Bitcoin Core cy. |
| Mempool | mempool / pwll trafodion | noun · technical / explanatory. |
| Broadcast | darlledu | verb · also noun: `darllediad`. |
| Block explorer | archwiliwr blociau | noun, lowercase. |
| Onchain | ar y gadwyn / ar y blockchain | adj · compact / explanatory. |
| Offchain | oddi ar y gadwyn / tu allan i'r gadwyn | adj · compact / explanatory. |
| **_Fees & fee bumping_** | | |
| Fee | ffi | noun, lowercase · Bitcoin Core cy uses `ffî`. |
| Fee Bump | codi'r ffi | noun · "raise the fee". |
| RBF | RBF | acronym · gloss: amnewid yn ôl ffi (Replace-By-Fee). |
| CPFP | CPFP | acronym · gloss: plentyn yn talu dros riant · ⚠️ shipped `Creu` (= "create") is WRONG; CPFP must stay as acronym. |
| Speed Up | cyflymu | verb. |
| **_Lightning_** | | |
| Invoice | anfoneb | noun, lowercase · shipped. |
| Lightning Invoice | anfoneb Mellten | noun · shipped. |
| Preimage | cynddelw | noun · Welsh math term for "preimage". |
| Payment | taliad | noun · ⚠️ NOT verb `talu` (= "to pay"); shipped uses verb where noun is needed. |
| Expired | wedi dod i ben | adj/state · ⚠️ shipped `Gorffen` is verb "finish/end"; `wedi dod i ben` = "has expired". |
| **_Multisig & advanced addressing_** | | |
| Co-signer | cyd-lofnodwr | noun · ⚠️ NOT `cyd-berchennog` (co-owner). |
| Quorum | cworwm / trothwy llofnodion | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · ⚠️ shipped paraphrase `Arwyddo trafodyn` (= "sign transaction") is WRONG — must keep acronym `PSBT`. |
| Provide signature | darparu llofnod / llofnodi'r trafodyn | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / cod taliad | acronym kept; "Payment Code" → `cod taliad`. |
| Notification transaction | trafodyn hysbysu | noun · BIP47-specific. |
| SilentPayment | Silent Payments / taliadau tawel | protocol name kept English (plural); explanatory `taliadau tawel` if needed. |
| **_Coin control_** | | |
| Coin Control | rheoli UTXO / rheoli darnau arian | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. |
| Frozen | wedi'i rewi | adj/state · ⚠️ NOT verb `rhewi` (= to freeze). |
| **_Security & storage_** | | |
| Encrypted storage | storfa wedi'i hamgryptio | noun, lowercase · ⚠️ NOT Title Case. Shipped string `Creu storfa wedi encryptio` mixes Welsh + English-derived `encryptio`; prefer `amgryptio` · Bitcoin Core cy. |
| Plausible Deniability | gwadu credadwy | noun, lowercase. |
| Biometrics | biometreg | noun, lowercase. |
| Passcode | cod mynediad | noun · ⚠️ NOT `cyfrinair` (= password). Shipped uses `Cyfrinair` — collides with password. |
| **_Backup, import & UX_** | | |
| Backup | copi wrth gefn / gwneud copi wrth gefn | noun / verb · Bitcoin Core cy. |
| Restore | adfer / adferiad | verb / noun · Bitcoin Core cy uses `ail-adfer`. |
| Import | mewnforio / mewnforiad | verb / noun · Bitcoin Core cy. |
| Voucher | taleb | noun, lowercase. |
| Redeem | adbrynu / actifadu | verb · for vouchers prefer `actifadu` (activate). |
| Send | anfon | verb · Bitcoin Core cy. |
| Receive | derbyn | verb · Bitcoin Core cy. |
| Settings | gosodiadau | noun, lowercase · Bitcoin Core cy. |
| Confirm | cadarnhau / cadarnhad | verb / noun. |
| QR Code | cod QR | noun · cy.wikipedia.org/wiki/Cod_QR |
| Clipboard | clipfwrdd | noun, lowercase · Bitcoin Core cy. |
| Memo | nodyn | noun, lowercase. |
| Description | disgrifiad | noun, lowercase · shipped. |
| Label | label / tag | noun, lowercase · Bitcoin Core cy. |
