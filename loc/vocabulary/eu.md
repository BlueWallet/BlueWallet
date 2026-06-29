# Basque translation vocabulary (`eu.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: upstream wallet projects have limited Basque coverage. Bitcoin Core ships `bitcoin_eu.ts` (partial) and Electrum ships `eu/electrum.po` (partial); both were consulted where they had finished strings. Wikipedia eu (eu.wikipedia.org) was used as a native-script tie-breaker for core concepts (Bitcoin, sare-tarifa, transakzioa). Where no source committed to a rendering, the Notes column says "(transliteration)" or that no upstream citation exists. Basque is Latin script, LTR, and uses ordinary lowercase for common nouns (only brands and sentence starts are capitalised).

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; eu.wikipedia.org/wiki/Bitcoin. |
| Lightning | Lightning | brand kept Latin (no eu.wikipedia article for Lightning Network). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker · eu.wikipedia.org/wiki/Bitcoin |
| sats | sats | noun · lowercase; smallest unit kept Latin as in app UI. |
| sat/vByte | sat/vByte | technical fee-rate unit; casing preserved. |
| vByte | vByte | technical unit kept Latin. |
| **_Wallet, keys & seeds_** | | |
| Wallet | diru-zorroa | noun · "money purse" — standard Basque for wallet (no upstream wallet citation). lowercase. |
| Vault | kutxa gotorra | noun · "strongbox / safe" — generic Basque term. ⚠️ NOT a brand. |
| Watch-only | ikus soileko | adj · "view-only" descriptive. ⚠️ NOT generic "view mode" — specifically a wallet type. |
| Hardware wallet | hardware diru-zorroa | noun · "hardware" kept Latin + diru-zorroa (no upstream wallet citation). |
| Seed | hazia | noun · "seed" (literal) used for the recovery seed. |
| Mnemonic / Seed phrase | esaldi mnemonikoa / berreskuratze-esaldia | noun · technical / mainstream "recovery phrase" (no upstream wallet citation). |
| Passphrase | pasaesaldia | noun · ⚠️ NOT pasahitza (password) — distinct compound (pasa + esaldi). |
| Public key | gako publikoa | noun · "public key" · cf. Bitcoin Core eu. |
| Private key | gako pribatua | noun · parallel to gako publikoa · cf. Bitcoin Core eu. |
| WIF | WIF | acronym kept. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | deskriptorea | noun · "descriptor" (transliteration). |
| Derivation path | eratorpen-bidea | noun · eratorpen "derivation" + bidea "path" (no upstream wallet citation). |
| Master fingerprint | hatz-marka nagusia | noun · "master fingerprint" (literal). |
| BIP38 | BIP38 | acronym kept. ⚠️ NOT a verb / NOT "password". |
| **_On-chain transactions_** | | |
| Transaction | transakzioa | noun · eu.wikipedia.org/wiki/Bitcoin; cf. Bitcoin Core eu. |
| Address | helbidea | noun · standard Basque "address" · cf. Bitcoin Core eu. |
| Input | sarrera | noun · "input/entry". ⚠️ NOT "login / entrance to app" — tx input. Pairs with irteera (output). |
| Output | irteera | noun · "output". ⚠️ NOT the UI recipient label "To:". |
| UTXO | UTXO | acronym kept. |
| Change | bueltakoa | noun · change-output, "the returned change". ⚠️ NOT the verb "to change/modify" (that is aldatu). |
| Hex | hex / hamaseitarra | noun · short loan / "hexadecimal" explanatory. ⚠️ NOT "hash". |
| Pending | zain | adj/state · "waiting/pending". ⚠️ NOT a noun. |
| Unconfirmed | berretsi gabea | adj · "not confirmed" (state form). |
| Confirmed | berretsita | adj/state · "confirmed". |
| Mempool | mempool | technical term kept Latin (no Basque upstream rendering). |
| Broadcast | igorri / igorpena | verb / noun · "emit/transmit" (button) / "transmission" (status). |
| Block explorer | blokeen arakatzailea | noun · "block explorer" (arakatzaile = browser/explorer). |
| Onchain | katean / on-chain | adj · "on the chain" / loan compact. |
| Offchain | katetik kanpo / off-chain | adj · "off the chain" / loan compact. |
| **_Fees & fee bumping_** | | |
| Fee | tarifa | noun · network/mining fee · cf. eu.wikipedia.org/wiki/Bitcoin (sare-tarifa). |
| Fee Bump | tarifa igoera | noun · "fee increase" (umbrella for RBF + CPFP). |
| RBF | RBF | acronym kept; gloss "tarifaren bidez ordeztu" optional in Notes. |
| CPFP | CPFP | acronym kept. ⚠️ NOT a verb. |
| Speed Up | bizkortu | verb · "speed up" (button label for RBF). |
| **_Lightning_** | | |
| Invoice | faktura | noun · "invoice/bill"; cf. Bitcoin Core eu. |
| Lightning Invoice | Lightning faktura | noun · brand kept Latin + localised noun. |
| Preimage | aurreirudia | noun · math "pre-image" (aurre "pre" + irudi "image"). |
| Payment | ordainketa | noun · "payment". ⚠️ NOT the verb "to pay" (ordaindu). |
| Expired | iraungita | adj/state · "expired". |
| **_Multisig & advanced addressing_** | | |
| Co-signer / Signer | kosinatzailea | noun · "co-signer". ⚠️ NOT "co-owner". |
| Quorum | kuoruma | noun · "quorum" (transliteration). |
| PSBT | PSBT | acronym kept. |
| Provide signature | sinadura eman | verb · "give/provide signature" (sinatu = to sign). |
| BIP47 / Payment Code | BIP47 / ordainketa-kodea | acronym kept; "Payment Code" translatable noun. |
| Notification transaction | jakinarazpen-transakzioa | noun · BIP47 "notification transaction". |
| SilentPayment | Silent Payments / ordainketa isilak | protocol name kept English (plural) + explanatory eu gloss. |
| **_Coin control_** | | |
| Coin Control | txanponen kontrola | noun · "coin control". ⚠️ NOT Title Case in Basque. |
| Frozen | izoztuta | adj/state · "frozen". ⚠️ NOT the verb "to freeze" (izoztu). |
| **_Security & storage_** | | |
| Encrypted storage | biltegiratze zifratua | noun · "encrypted storage". ⚠️ NOT Title Case in Basque. |
| Plausible Deniability | ukapen sinesgarria | noun · "believable denial". ⚠️ NOT Title Case in Basque. |
| Biometrics | biometria | noun · "biometrics". |
| Passcode | sarbide-kodea | noun · "access code". ⚠️ NOT pasahitza (= app password) — distinct device unlock code. |
| **_Backup, import & UX_** | | |
| Backup | babeskopia / babeskopia egin | noun / verb · "backup copy" / "make a backup". |
| Restore | berreskuratu / berreskurapena | verb / noun · "recover/restore". |
| Import | inportatu | verb / noun · "import". |
| Voucher | bonua | noun · "voucher" (Azte.co prepaid voucher). |
| Redeem | kanjeatu | verb · "redeem/cash in". ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | bidali | verb · "send" · cf. Bitcoin Core eu. |
| Receive | jaso | verb · "receive" · cf. Bitcoin Core eu. |
| Settings | ezarpenak | noun · "settings" · cf. Bitcoin Core eu. |
| Confirm | berretsi | verb · "confirm"; "confirmations" = berrespenak (noun, plural). |
| QR Code | QR kodea | noun · "QR code". |
| Clipboard | arbela | noun · standard Basque localization term for clipboard. |
| Memo | oharra | noun · "note/memo". |
| Description | deskribapena | noun · "description". |
| Label | etiketa | noun · "label". |

