# Dutch translation vocabulary (`nl_nl.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · nl.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand · nl.wikipedia.org/wiki/Lightning_Network ("Lightningnetwerk" in body text) |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. Only in key name; URI label localised. |
| LND | LND | brand. Only in key prefixes. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker · nl.wikipedia.org/wiki/Bitcoin |
| sats | sats / satoshi | noun, lowercase · nl.wikipedia.org/wiki/Bitcoin |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. |
| vByte | vByte | technical unit. From "in sat/vByte". |
| **_Wallet, keys & seeds_** | | |
| Wallet | wallet | noun, lowercase. Shipped mixes "wallet" / "Wallets"; lowercase singular is canonical. |
| Vault | kluis | noun, lowercase · "kluis" = safe/strongbox. Shipped "Multisig Kluis". |
| Watch-only | alleen-lezen / alleen kijken | adj · Electrum nl_NL ("Alleen-lezen"). Shipped "alleen kijken" is informal but acceptable. |
| Hardware wallet | hardware-wallet | noun, lowercase · matches shipped; nl.wikipedia.org/wiki/Bitcoin uses "hardwareportemonnee". |
| Seed | seed / seed-zin | noun · English kept in mainstream nl usage · Zeus nl + Electrum nl_NL keep "Seed". |
| Mnemonic | mnemonische zin | noun. |
| Passphrase | wachtwoordzin | noun · ⚠️ NOT "Wachtwoord" (= password) · Bitcoin Core nl. Shipped uses "Passphrase" + "Wachtwoord" inconsistently — flag. |
| Public key | publieke sleutel | noun, lowercase · nl.wikipedia.org/wiki/Bitcoin. Shipped keeps English "public key". |
| Private key | privésleutel | noun, lowercase · Bitcoin Core nl + Electrum nl_NL. Shipped keeps English "private key". |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. Shipped mixes "xpub" / "XPUB". |
| Descriptor | descriptor | noun, lowercase · Electrum nl_NL keeps "Descriptor". |
| Derivation path | derivatiepad | noun, lowercase · Electrum nl_NL. |
| Master fingerprint | master-vingerafdruk | noun, lowercase · Electrum nl_NL ("Master vingerafdruk"). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | transactie | noun, lowercase · Bitcoin Core nl + Electrum nl_NL. ⚠️ Shipped uses plural "Transacties" for singular — fix to singular "transactie". |
| Address | adres | noun, lowercase · Bitcoin Core nl + Electrum nl_NL. |
| Input | input / transactie-input | noun · short / explanatory · Electrum nl_NL keeps "Input". Shipped uses English "Inputs". |
| Output | output / transactie-output | noun · short / explanatory · Electrum nl_NL keeps "Output". ⚠️ NOT the recipient "Aan:" label. Shipped "Uitvoer" (= computer output) is wrong context. |
| UTXO | UTXO | acronym · gloss: niet-uitgegeven transactie-output. |
| Change | wisselgeld / wisseladres | noun · ⚠️ NOT verb "veranderen". Shipped `cc.type_change` already correct ("Wisselgeld") but `cc.change` ships wrong "Veranderen" — fix · Bitcoin Core nl + Electrum nl_NL. |
| Hex | hex | noun, lowercase · Electrum nl_NL. ⚠️ NOT "hash". |
| Pending | in afwachting / wachtend | adj/state · Electrum nl_NL ("Wachtend"). |
| Unconfirmed | onbevestigd / niet-bevestigd | adj · Electrum nl_NL ("Onbevestigd"). |
| Confirmed | bevestigd | adj, singular · Bitcoin Core nl + Electrum nl_NL. Shipped only has plural noun "bevestigingen" (= confirmations) — flag, add adj form. |
| Mempool | mempool | noun, lowercase · Electrum nl_NL + nl.wikipedia.org/wiki/Bitcoin. |
| Broadcast | verzenden / uitzenden | verb · Electrum nl_NL keeps "Broadcast"; Zeus nl "Uitzenden". Shipped "Verzenden". |
| Block explorer | blokverkenner | noun, lowercase · Electrum nl_NL. ⚠️ Shipped "blok explorer" mixes Dutch/English — fix. |
| Onchain | on-chain / op de blockchain | adj · compact (chip) / explanatory (body) · nl.wikipedia.org/wiki/Bitcoin. |
| Offchain | off-chain / buiten de blockchain | adj · compact (chip) / explanatory (body) · nl.wikipedia.org/wiki/Bitcoin ("off-chain betalingen"). |
| **_Fees & fee bumping_** | | |
| Fee | fee / transactiekosten | noun · technical / mainstream · English "fee" widely used in nl wallets; Bitcoin Core nl uses "Vergoeding". Shipped keeps "Fee". |
| Fee Bump | fee bump / fee verhogen | noun · ⚠️ Shipped typo "Fee Bumb" — fix to "Fee Bump" · Electrum nl_NL "Vergoeding verhogen". |
| RBF | RBF | acronym · gloss: Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: Child-Pays-For-Parent. ⚠️ NOT a verb. |
| Speed Up | versnellen | verb · Electrum nl_NL. |
| **_Lightning_** | | |
| Invoice | factuur | noun, lowercase · Electrum nl_NL + Zeus nl. |
| Lightning Invoice | Lightning-factuur | noun · Electrum nl_NL. |
| Preimage | preimage | noun, lowercase · Electrum nl_NL + Zeus nl keep English term. |
| Payment | betaling | noun, lowercase · ⚠️ NOT verb "betalen" · nl.wikipedia.org/wiki/Lightning_Network. |
| Expired | verlopen | adj · Electrum nl_NL. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | medeondertekenaar | noun · ⚠️ NOT "mede-eigenaar" (co-owner) · Electrum nl_NL. |
| Quorum | quorum / handtekeningdrempel | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym. |
| Provide signature | handtekening verstrekken / transactie ondertekenen | verb · generic / specific. Shipped "Geef een handtekening" acceptable. |
| BIP47 / Payment Code | BIP47 / betaalcode | acronym kept; "Payment Code" → "betaalcode". |
| Notification transaction | notificatietransactie | noun · BIP47-specific. |
| SilentPayment | Silent Payments / stille betalingen | protocol name kept English (plural); explanatory "stille betalingen" if needed. |
| **_Coin control_** | | |
| Coin Control | coin control / muntbeheer | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. Shipped keeps English. |
| Frozen | bevroren | adj · ⚠️ NOT verb "bevriezen" · Electrum nl_NL + Zeus nl. Shipped "Bevriezen" is the verb — flag, fix for state labels. |
| **_Security & storage_** | | |
| Encrypted storage | versleutelde opslag | noun, lowercase · ⚠️ NOT Title Case · Electrum nl_NL. |
| Plausible Deniability | plausibele ontkenning | noun, lowercase · ⚠️ NOT Title Case. Shipped matches. |
| Biometrics | biometrische beveiliging / biometrie | noun, lowercase. Shipped uses long form. |
| Passcode | toegangscode | noun · ⚠️ NOT "wachtwoord" (= password). |
| **_Backup, import & UX_** | | |
| Backup | back-up / back-up maken | noun / verb · Electrum nl_NL ("Back-up"). Shipped "Exporteren / back-up maken". |
| Restore | herstellen / herstel | verb / noun · Bitcoin Core nl + Electrum nl_NL. |
| Import | importeren / import | verb / noun · Electrum nl_NL. |
| Voucher | voucher | noun · ⚠️ Shipped typo "Atze.co" — fix to "Azte.co". |
| Redeem | inwisselen / verzilveren | verb · ⚠️ NOT "kopen" (buy) / NOT "overdragen" (transfer). Shipped uses both forms · Cake nl. |
| Send | verzenden / versturen | verb. Shipped "Verstuur". |
| Receive | ontvangen | verb. Shipped imperative "Ontvang". |
| Settings | instellingen | noun, lowercase. |
| Confirm | bevestigen / bevestiging | verb / noun. Shipped imperative "Bevestig". |
| QR Code | QR-code | noun · Bitcoin Core nl + Electrum nl_NL. |
| Clipboard | klembord | noun, lowercase · Bitcoin Core nl + Electrum nl_NL. |
| Memo | memo | noun, lowercase · Electrum nl_NL. |
| Description | omschrijving / beschrijving | noun, lowercase · Electrum nl_NL ("Beschrijving"). Shipped "Omschrijving". |
| Label | label | noun, lowercase · Bitcoin Core nl + Electrum nl_NL. ⚠️ Shipped "labelen" is the verb — flag, fix for noun contexts. |
