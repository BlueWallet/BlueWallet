# Slovenian translation vocabulary (`sl_SI.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · sl.wikipedia.org/wiki/Bitcoin (lowercase `bitcoin` as unit). |
| Lightning | Lightning | brand. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; lowercase as unit. |
| sats | sats / satošiji | noun · technical / mainstream; app ships `sats` in UI. |
| sat/vByte | sat/vByte | fee-rate unit; Latin canonical per glossary (casing matters). ⚠️ App currently ships `sat/vBajt` — shipped-string deviation. |
| vByte | vByte | virtual byte, Latin canonical per glossary. ⚠️ App currently ships `vBajt` — shipped-string deviation. |
| **_Wallet, keys & seeds_** | | |
| Wallet | denarnica | noun, lowercase. |
| Vault | trezor / sejf | noun · ⚠️ NOT a brand — `trezor` = safe/strongbox in Slovenian (app ships `Trezor`); avoid confusion with the Trezor hardware-wallet brand. |
| Watch-only | opazovalna / opazovana | adj · Bitcoin Core sl uses `opazovane denarnice` (watch-only wallets). |
| Hardware wallet | strojna denarnica | noun, lowercase. |
| Seed | seme / obnovitvena fraza | noun · technical / mainstream. |
| Mnemonic | mnemonična fraza / obnovitvena fraza | noun · technical / mainstream. |
| Passphrase | dodatna fraza / dodatna beseda | noun · ⚠️ distinct from `geslo` (password). App ships `Dodatna beseda/niz (passphrase)`. |
| Public key | javni ključ | noun, lowercase. |
| Private key | zasebni ključ | noun, lowercase. |
| WIF | WIF | acronym · gloss: oblika za uvoz denarnice. |
| xpub | xpub | acronym · lowercase preferred (app currently ships `XPUB`). |
| Descriptor | deskriptor | noun, lowercase · output descriptor (BIP380). |
| Derivation path | pot izpeljave | noun · Bitcoin Core sl. App keeps `(derivation path)` parenthetical — recommend dropping. |
| Master fingerprint | prstni odtis glavnega ključa | noun · App keeps `(fingerprint)` parenthetical — recommend dropping. |
| BIP38 | BIP38 | acronym · gloss: z geslom zaščiten zasebni ključ. |
| **_On-chain transactions_** | | |
| Transaction | transakcija | noun, lowercase. |
| Address | naslov | noun, lowercase. |
| Input | vhod / vhod transakcije | noun · short / full · ⚠️ NOT "prijava" (login). |
| Output | izhod / izhod transakcije | noun · short / full · ⚠️ NOT the UI recipient label "Za:". |
| UTXO | UTXO | acronym · gloss: neporabljen izhod transakcije. |
| Change | vračilo / naslov vračila | noun · ⚠️ NOT verb "spremeniti". `vračilo` = leftover; `naslov vračila` for change-address · Bitcoin Core sl. |
| Hex | hex / šestnajstiška vrednost | noun · short / explanatory · ⚠️ NOT "hash". App ships `šestnajstiška vrednost`. |
| Pending | v teku / čaka | adj/state · body / chip. ⚠️ NOT noun "čakanje". |
| Unconfirmed | nepotrjeno / nepotrjena | adj · state / fem-agreement. |
| Confirmed | potrjeno / potrjena | adj · state / fem-agreement. App abbreviates as `Potrd.`. |
| Mempool | mempool | noun · kept Latin (technical term). ⚠️ NOT `čakalna vrsta` (= generic "queue") — anti-meaning risk. |
| Broadcast | objavi v omrežje / objava | verb / noun · App ships `Objavi v omrežju`. |
| Block explorer | raziskovalec blokov | noun, lowercase. |
| Onchain | on-chain / v verigi blokov | adj · compact (chip) / explanatory (body). |
| Offchain | off-chain / izven verige blokov | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | omrežnina / provizija | noun, lowercase · ⚠️ NOT Title Case. App ships `omrežnina` (lit. "network fee"). |
| Fee Bump | povečanje omrežnine | noun, lowercase · ⚠️ NOT Title Case. |
| RBF | RBF | acronym · gloss: zamenjava za višjo omrežnino / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: otrok plača za starša / Child-Pays-For-Parent. ⚠️ NOT verb "Ustvari". |
| Speed Up | povečaj omrežnino / pospeši | verb · App ships `Povečaj omrežnino (RBF)`. |
| **_Lightning_** | | |
| Invoice | račun / plačilni zahtevek | noun · technical (BOLT11) / mainstream. App ships `Račun`. |
| Lightning Invoice | Lightning račun | noun · pair brand `Lightning` + localised noun. |
| Preimage | predslika / praslika | noun · math term (cryptographic preimage) · `predslika` matches Slavic CS-context convention (cf. cs `předobraz`, hr `predslika`); sl.wikipedia uses `praslika` for the math preimage. No Electrum sl citation found. Either acceptable; `predslika` preferred in technical/CS UI. |
| Payment | plačilo | noun · ⚠️ NOT verb "plačati". |
| Expired | potekel / poteklo | adj · masc / neuter-agreement state. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | sopodpisnik | noun · ⚠️ NOT "solastnik" (co-owner) · Bitcoin Core sl uses `zunanji podpisnik` for external signer. |
| Quorum | kvorum / prag podpisov | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · gloss: delno podpisana bitcoin transakcija (DPBT per Bitcoin Core sl). |
| Provide signature | podpiši transakcijo / zagotovi podpis | verb · App ships `Vnesite podpis` ("enter signature") — recommend revising. |
| BIP47 / Payment Code | BIP47 / plačilna koda | acronym kept; `Payment Code` → `plačilna koda`. |
| Notification transaction | obvestilna transakcija | noun · BIP47-specific. |
| SilentPayment | Silent Payments / tiha plačila | protocol name kept English (plural); explanatory `tiha plačila` if needed. |
| **_Coin control_** | | |
| Coin Control | nadzor nad kovanci / upravljanje UTXO | noun, lowercase · mainstream / technical · ⚠️ NOT Title Case. |
| Frozen | zamrznjen / zamrznjeno | adj · masc-agreement / state · ⚠️ NOT verb "zamrzniti". |
| **_Security & storage_** | | |
| Encrypted storage | šifrirana shramba | noun, lowercase · ⚠️ NOT Title Case. |
| Plausible Deniability | verodostojno zanikanje | noun, lowercase · ⚠️ NOT Title Case (app currently ships `Verodostojno Zanikanje`). |
| Biometrics | biometrija | noun, lowercase. |
| Passcode | koda za dostop | noun · ⚠️ NOT "geslo" (= password); app currently collides with `Geslo` — recommend distinct word. |
| **_Backup, import & UX_** | | |
| Backup | varnostna kopija / izdelaj varnostno kopijo | noun / verb. |
| Restore | obnovi / obnovitev | verb / noun. |
| Import | uvozi / uvoz | verb / noun. |
| Voucher | bon | noun, lowercase. |
| Redeem | unovči / aktiviraj | verb · ⚠️ NOT "kupi" (buy); app ships `Unovčite` (polite imperative). |
| Send | pošlji | verb. |
| Receive | prejmi | verb. |
| Settings | nastavitve | noun, lowercase. |
| Confirm | potrdi / potrditev | verb / noun. Also: `potrditve` (plural) = block confirmations. |
| QR Code | QR koda | noun. |
| Clipboard | odložišče | noun, lowercase. |
| Memo | opomba | noun, lowercase. |
| Description | opis | noun, lowercase. |
| Label | oznaka | noun, lowercase · Bitcoin Core sl. |
