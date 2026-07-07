# Zulu translation vocabulary (`zu_ZA.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: upstream wallet projects (Bitcoin Core, Electrum, Phoenix, Zeus, Trezor, Cake, Bisq, Green, Breez) do **not** ship Zulu (isiZulu) localizations. The only native-script reference is zu.wikipedia.org (capped lookups). Zulu is a Nguni-Bantu language closely related to Xhosa (`zar_xho.md`); noun-class prefixes (`isi-`, `i-`, `um-`, `uku-`) and the relative/stative verb forms used for adjectival states follow the same patterns. Technical Bitcoin/Lightning terms with no established Zulu rendering are transliterated (marked "(transliteration)") or kept Latin; brand/protocol names stay Latin per glossary.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand, kept Latin. Native gloss: none. |
| Lightning | Lightning | brand, kept Latin. Native gloss: `umbani` (lightning bolt). |
| Electrum | Electrum | brand, kept Latin. |
| LNDhub | LNDhub | brand, kept Latin. |
| LND | LND | brand, kept Latin. |
| LNURL | LNURL | brand, kept Latin. |
| Tor | Tor | brand, kept Latin. |
| Orbot | Orbot | brand, kept Latin. |
| GroundControl | GroundControl | brand, kept Latin. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | unit name + ticker kept as in English. |
| sats | sats | lowercase, kept Latin per glossary. |
| sat/vByte | sat/vByte | kept Latin, mixed case per glossary. |
| vByte | vByte | kept Latin. |
| **_Wallet, keys & seeds_** | | |
| Wallet | isikhwama | noun · lit. "bag/purse"; standard Zulu rendering for wallet. |
| Vault | isefe | noun · "safe / strongbox" (transliteration, widely used in zu). ⚠️ NOT a brand — translatable. |
| Watch-only | okokubuka-kuphela | adj · "view-only". ⚠️ NOT generic "view mode" — it is a wallet type. |
| Hardware wallet | isikhwama sehadiwe | noun · "hardware wallet" (hardware = transliteration). |
| Seed | imbewu | noun · lit. "seed" (parallels Xhosa `imbewu`). |
| Mnemonic / Seed phrase | amagama embewu / umusho wokukhumbula | noun · "seed words" / "phrase to remember". |
| Passphrase | ibinzana lokungena | noun · "entry phrase". ⚠️ NOT `iphasiwedi` (password) and NOT `ikhodi yokuvula` (passcode). |
| Public key | isihluthulelo somphakathi | noun · "public key" (key = lit. "key/lock"). |
| Private key | isihluthulelo esiyimfihlo | noun · "secret key". |
| WIF | WIF | acronym kept. |
| xpub | xpub | acronym, lowercase preferred per glossary. |
| Descriptor | umchazi | noun · "describer" (no upstream Zulu rendering). |
| Derivation path | indlela yokususelwa | noun · "derivation path" (lit. "path of being derived"). |
| Master fingerprint | isigxivizo somunwe esiyinhloko | noun · "master fingerprint" (lit. "main fingerprint"). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | ithransekshini | noun · transliteration; no established native Zulu noun (native verb `ukuthengiselana` = "to transact" is verb-derived). |
| Address | ikheli | noun · standard Zulu for "address". |
| Input | okufakwayo | noun · "what is put in". ⚠️ NOT "login / entrance". |
| Output | okukhishwayo | noun · "what is put out". ⚠️ NOT the UI recipient label "To:". |
| UTXO | UTXO | acronym kept. |
| Change | ushintshi | noun · "change (coins)". ⚠️ NOT verb `shintsha` "to change/modify". |
| Hex | hex | noun · kept Latin (no native Zulu rendering). ⚠️ NOT "hash". |
| Pending | kulindile | adj/state · "is pending/waiting". ⚠️ NOT a noun. |
| Unconfirmed | akuqinisekiswanga | adj/state · "not confirmed". |
| Confirmed | kuqinisekisiwe | adj/state · "has been confirmed". |
| Mempool | mempool | noun · kept Latin (no native rendering). |
| Broadcast | sakaza / ukusakaza | verb / noun · `sakaza` = broadcast/disseminate. |
| Block explorer | isihloli sebhulokhi | noun · "block explorer" (block = transliteration). |
| Onchain | onchain | adj · kept Latin (no native rendering). |
| Offchain | offchain | adj · kept Latin (no native rendering). |
| **_Fees & fee bumping_** | | |
| Fee / Network fee | inkokhiso / inkokhiso yenethiwekhi | noun · "charge/fee" (from causative `khokhisa` "to charge"). ⚠️ NOT bare `imali` ("money/funds") — collides with `imali` = funds/amount in the send flow. |
| Fee Bump | ukukhuphula inkokhiso | noun · "raising the fee". |
| RBF | RBF | acronym kept; gloss "ukufaka esikhundleni ngenkokhiso ephakeme" (replace by higher fee). |
| CPFP | CPFP | acronym kept. ⚠️ NOT a verb. |
| Speed Up | sheshisa | verb · imperative "speed up". |
| **_Lightning_** | | |
| Invoice | i-invoyisi / isicelo sokukhokha | noun · transliteration / "payment request". |
| Lightning Invoice | i-invoyisi ye-Lightning | noun · brand kept Latin + localised noun. |
| Preimage | preimage | noun · kept Latin; math term, uncertain Zulu rendering. |
| Payment | inkokhelo | noun · standard Zulu "payment". ⚠️ NOT verb `khokha` "to pay". |
| Expired | kuphelelwe yisikhathi | adj/state · "time has run out". |
| **_Multisig & advanced addressing_** | | |
| Co-signer | osayina naye | noun · "one who co-signs". ⚠️ NOT "co-owner". |
| Quorum | ikhoramu | noun · transliteration. |
| PSBT | PSBT | acronym kept. |
| Provide signature | nikeza isiginesha | verb · "provide signature" (signature = transliteration). |
| BIP47 / Payment Code | BIP47 / ikhodi yokukhokha | acronym kept; "Payment Code" translatable noun. |
| Notification transaction | ithransekshini yesaziso | noun · BIP47-specific "notification transaction". |
| SilentPayment | Silent Payments | brand/protocol name kept English (plural per glossary). |
| **_Coin control_** | | |
| Coin Control | ukulawula izinhlamvu | noun · "control of coins". ⚠️ NOT Title Case (Zulu sentence case). |
| Frozen | kuqandisiwe | adj/state · "has been frozen". ⚠️ NOT verb `qandisa` "to freeze". |
| **_Security & storage_** | | |
| Encrypted storage | isitoreji esibethelwe | noun · "encrypted storage" (`bethela` = encode/lock). ⚠️ NOT Title Case. |
| Plausible Deniability | ukuphika okunokwenzeka | noun · "deniability that is plausible". ⚠️ NOT Title Case. |
| Biometrics | i-biometrics | noun · kept Latin/transliteration; no native rendering. |
| Passcode | ikhodi yokuvula | noun · "unlock code". ⚠️ NOT `iphasiwedi` (app password). |
| **_Backup, import & UX_** | | |
| Backup | isipele / yenza isipele | noun / verb · `isipele` = "spare/backup". |
| Restore | buyisela | verb · "bring back / restore". |
| Import | ngenisa / ukungenisa | verb / noun · "to bring in". |
| Voucher | ivawusha | noun · transliteration (parallels Xhosa `ivawutsha`). |
| Redeem | sebenzisa | verb · "use/activate" (voucher). ⚠️ NOT "buy" / NOT "transfer". |
| Send | thumela | verb · standard Zulu "send". |
| Receive | thola / amukela | verb · "get" / "accept". |
| Settings | izilungiselelo | noun · standard Zulu "settings". |
| Confirm | qinisekisa | verb · "make sure / confirm". |
| QR Code | ikhodi ye-QR | noun · "QR code". |
| Clipboard | ibhodi lokukopisha | noun · "copy board". |
| Memo | inothi | noun · "note" (transliteration). |
| Description | incazelo | noun · standard Zulu "description". |
| Label | ilebula | noun · transliteration. ⚠️ NOT verb "to label". |
