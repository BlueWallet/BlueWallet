# Albanian translation vocabulary (`sq_AL.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · sq.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand kept Latin. |
| Electrum | Electrum | brand kept Latin · Fix: shipped `Elektrum` (Albanianised spelling) — brand rows stay Latin. |
| LNDhub | LNDhub | brand kept Latin. |
| LND | LND | brand kept Latin. |
| LNURL | LNURL | brand kept Latin. |
| Tor | Tor | brand kept Latin. |
| Orbot | Orbot | brand kept Latin. |
| GroundControl | GroundControl | brand kept Latin. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker, lowercase unit. |
| sats | sats / satoshi | noun, lowercase; unit kept as in English (`sats`) · Albanian singular noun form `satoshi` (pl. `satoshi`) acceptable in body text. |
| sat/vByte | sat/vByte | technical unit; kept Latin. |
| vByte | vByte | technical unit; kept Latin. |
| **_Wallet, keys & seeds_** | | |
| Wallet | portofol | noun, lowercase · Bitcoin Core sq + sq.wikipedia.org/wiki/Bitcoin · Fix: shipped `Portofola` is plural ("wallets"); singular is `portofol`. |
| Vault | kasafortë / arkë | noun, lowercase; "safe / strongbox" sense · Fix: shipped `portofol` collapses Vault into Wallet — Vault must be a distinct word. |
| Watch-only | vetëm për shikim / vetëm për vëzhgim | adj · short / explanatory. ⚠️ NOT "view mode" — wallet type. |
| Hardware wallet | portofol hardware / portofol fizik | noun, lowercase · technical / mainstream. |
| Seed | frazë rigjenerimi / farë | noun · mainstream "recovery phrase" / literal · ⚠️ `farë` = botanical seed, NOT BIP39 sense; prefer `frazë rigjenerimi` in UI. |
| Mnemonic | frazë mnemonike / fjalët e rigjenerimit | noun · technical / mainstream. |
| Passphrase | frazë sekrete | noun · ⚠️ NOT `fjalëkalim` (= password) · distinct from app password and device passcode. |
| Public key | çelës publik | noun, lowercase. |
| Private key | çelës privat | noun, lowercase · Fix: shipped `celësin privat` is accusative + missing `ç` diacritic. |
| WIF | WIF | acronym · gloss: format importi për çelësin privat. |
| xpub | xpub | acronym, lowercase. |
| Descriptor | përshkrues | noun, lowercase. |
| Derivation path | shteg derivimi | noun, lowercase · BIP32 path. |
| Master fingerprint | shenjë gishti kryesore | noun, lowercase · gloss for HASH160 prefix of master pubkey. |
| BIP38 | BIP38 | acronym kept · gloss: çelës privat i mbrojtur me fjalëkalim. ⚠️ NOT a verb. |
| **_On-chain transactions_** | | |
| Transaction | transaksion | noun, lowercase · sq.wikipedia.org/wiki/Bitcoin · Fix: shipped `Transferte` ("transfer") loses tx meaning and lacks `ë`. |
| Address | adresë | noun, lowercase · Bitcoin Core sq (`Adresë`) · Fix: shipped `Adresa` is definite form; lemma is `adresë`. |
| Input | hyrje / hyrje transaksioni | noun · short / full. ⚠️ NOT "login". |
| Output | dalje / dalje transaksioni | noun · short / full. ⚠️ NOT UI recipient label "Për". |
| UTXO | UTXO | acronym · gloss: dalje transaksioni e pashpenzuar. ⚠️ Fix: shipped `Xheton` ("token/chip") is wrong — UTXO is an acronym kept as-is. |
| Change | kusur / adresa e kusurit | noun · ⚠️ NOT verb `ndrysho` (= to modify). `kusur` = leftover change · Fix: shipped `Ndrysho` is the wrong POS (verb "modify"). |
| Hex | hex / të dhëna hex | noun · short / explanatory. ⚠️ NOT "hash". |
| Pending | në pritje | adj/state · lowercase. |
| Unconfirmed | i pakonfirmuar / e pakonfirmuar | adj · masc / fem agreement · Bitcoin Core sq (`I pakonfirmuar`). |
| Confirmed | i konfirmuar / e konfirmuar | adj · masc / fem agreement · Bitcoin Core sq (`I/E konfirmuar`). |
| Mempool | mempool | noun, lowercase · kept Latin (no established Albanian term). |
| Broadcast | transmeto / transmetim | verb / noun · UI buttons use both forms in shipped strings. Fix: shipped `Shpërndarja` ("the sharing", definite noun) is inconsistent with `Transmetim` already used in `send.broadcastButton`. |
| Block explorer | eksplorues blloqesh | noun, lowercase. |
| Onchain | on-chain / në zinxhir | adj · compact (chip) / explanatory (body). |
| Offchain | off-chain / jashtë zinxhirit | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | komision | noun, lowercase · shipped uses "commission" sense (acceptable in finance UI). |
| Fee Bump | rritje e komisionit | noun · ⚠️ shipped `Lejo rritjen e komisionit` is the full sentence "Allow fee bump" — the standalone term is `rritje e komisionit`. |
| RBF | RBF | acronym · gloss: zëvendëso me komision më të lartë (Replace-By-Fee). |
| CPFP | CPFP | acronym · gloss: fëmija paguan për prindin (Child-Pays-For-Parent). ⚠️ NOT a verb like "Krijo". |
| Speed Up | përshpejto | verb · button label for RBF. |
| **_Lightning_** | | |
| Invoice | faturë / kërkesë pagese | noun · technical / mainstream · Fix: shipped `Fatura` is definite form; lemma is `faturë`. |
| Lightning Invoice | faturë Lightning / kërkesë pagese Lightning | noun · technical / mainstream. |
| Preimage | preimazh | noun, lowercase · calque of English "preimage". |
| Payment | pagesë | noun · ⚠️ NOT verb `paguaj` ("to pay"). Fix: shipped `Pagesa` is definite form; lemma is `pagesë`. |
| Expired | i skaduar / skaduar | adj · with-article / bare state form. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | bashkë-firmëtar / firmëtar | noun · ⚠️ NOT "bashkëpronar" (co-owner). |
| Quorum | kuorum / prag firmash | noun, lowercase · canonical / UI-clear · Fix: shipped `Kuorumi` is definite form; lemma is `kuorum`. |
| PSBT | PSBT | acronym kept. |
| Provide signature | jep firmën / firmos transaksionin | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / kod pagese | acronym kept; `Payment Code` → `kod pagese` (lowercase, lemma) · Fix: shipped `Kodi i Pagesës` is Title Case + definite; should be lowercase indefinite. |
| Notification transaction | transaksion njoftimi | noun · BIP47-specific 0-value tx. |
| SilentPayment | Silent Payments / pagesa të heshtura | protocol name kept English (plural); explanatory `pagesa të heshtura` if needed. |
| **_Coin control_** | | |
| Coin Control | kontroll i UTXO-ve / kontroll i monedhave | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. Fix: shipped `Kontrollo Xhetonin` is verb imperative ("control the chip") with wrong noun. |
| Frozen | i ngrirë / e ngrirë | adj · masc / fem agreement · ⚠️ NOT verb `ngrije` ("freeze it") · Fix: shipped `Ngrije` is the imperative button label, not the adjective state. |
| **_Security & storage_** | | |
| Encrypted storage | memorie e enkriptuar | noun, lowercase · Bitcoin Core sq uses `enkriptim` for encryption · ⚠️ NOT Title Case. |
| Plausible Deniability | mohim i besueshëm | noun, lowercase · matches shipped form (drop Title Case if any). |
| Biometrics | biometri / të dhëna biometrike | noun, lowercase · short / explanatory · Fix: shipped `Te dhenat Biometrike` is missing `ë` and uses Title Case. |
| Passcode | kod hyrjeje | noun · ⚠️ NOT `fjalëkalim` (= password) · Fix: shipped `Fjalkalimi` collapses passcode into password and is missing `ë`. |
| **_Backup, import & UX_** | | |
| Backup | kopje rezervë / krijo kopje rezervë | noun / verb. |
| Restore | rikuperoj / rikuperim | verb / noun · also `rivendos` for the verb form. |
| Import | importo / importim | verb / noun. |
| Voucher | kupon / faturë blerjeje | noun, lowercase · Fix: shipped `Përdor kodin promocional të Azte.co` is the full sentence "Use the Azte.co promo code" and collapses voucher into "promo code" — voucher is a distinct word `kupon`. |
| Redeem | shfrytëzo / aktivizo | verb · ⚠️ NOT "buy to wallet" / NOT `transfero`. Fix: shipped `Përdore në portofol` ("use it in wallet") loses the redeem semantics. |
| Send | dërgo | verb · Bitcoin Core sq (`Dërgo`). |
| Receive | merr | verb · Bitcoin Core sq (`Merr`). |
| Settings | cilësime / konfigurime | noun, lowercase · mainstream / Bitcoin Core sq (`Konfigurimet`). |
| Confirm | konfirmo / konfirmim | verb / noun · noun also = `konfirmime` (block confirmations). |
| QR Code | kod QR | noun, lowercase · Fix: shipped `QR kodi` is Anglo-order definite; Albanian noun-first lemma is `kod QR`. |
| Clipboard | kujtesë e përkohshme / memorie e sistemit | noun, lowercase · short / Bitcoin Core sq form (`memorja e sistemit`) · Fix: shipped `Memoria e përkohshme` is acceptable but has Title Case + Italianate `Memoria`; lemma `kujtesë e përkohshme`. |
| Memo | memo / shënim | noun, lowercase · Latin / native. |
| Description | përshkrim | noun, lowercase. |
| Label | etiketë | noun, lowercase · Bitcoin Core sq (`Etiketë`). |
