# Norwegian Bokmål translation vocabulary (`nb_no.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand · no.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand · no.wikipedia.org/wiki/Lightning_Network |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; lowercase for unit. |
| sats | sats | noun, lowercase. |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | lommebok | noun, lowercase · Bitcoin Core nb + Electrum nb. |
| Vault | hvelv / safe | noun · target-locale word for safe/strongbox · ⚠️ NOT brand "Vault". Shipped uses Latin `Vault`; recommend `hvelv`. |
| Watch-only | kun klokke / kun observasjon | adj · Bitcoin Core nb uses "kun klokker" · ⚠️ NOT "view mode" / "read mode". |
| Hardware wallet | maskinvarelommebok | noun, lowercase · Bitcoin Core nb. |
| Seed | seed / gjenopprettingsfrase | noun · technical / mainstream · Electrum nb + Bitcoin Core nb keep `seed`. |
| Mnemonic | mnemonisk frase / gjenopprettingsfrase | noun · technical / mainstream. ⚠️ shipped `mnemonisk` is adj only — full noun is `mnemonisk frase`. |
| Passphrase | passordfrase | noun · Bitcoin Core nb + Electrum nb · ⚠️ NOT `passord` (password). |
| Public key | offentlig nøkkel | noun, lowercase · ⚠️ shipped `offentlige nøkkelen` is definite/inflected — canonical form is `offentlig nøkkel` · Bitcoin Core nb. |
| Private key | privat nøkkel | noun, lowercase · Bitcoin Core nb. |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred · ⚠️ shipped UI uses `XPUB` uppercase. |
| Descriptor | deskriptor | noun, lowercase. |
| Derivation path | utledningssti / derivation path | noun · localized / technical fallback · ⚠️ shipped is English passthrough `derivation path` — recommend localized `utledningssti`. |
| Master fingerprint | hovednøkkelens fingeravtrykk / fingeravtrykk | noun · Zeus nb · ⚠️ shipped `Master Fingerprint` is English passthrough; fix. |
| BIP38 | BIP38 | acronym kept · gloss: passordbeskyttet privat nøkkel. |
| **_On-chain transactions_** | | |
| Transaction | transaksjon | noun, lowercase · Bitcoin Core nb. |
| Address | adresse | noun, lowercase · Bitcoin Core nb. |
| Input | inndata / inngang | noun · UI / generic · shipped uses `Inndata`. |
| Output | utdata / utgang | noun · UI / generic · ⚠️ NOT the UI label "Til:". |
| UTXO | UTXO | acronym · gloss: ubrukt transaksjonsutdata. |
| Change | veksel / vekslepenger | noun · Bitcoin Core nb + Electrum nb · ⚠️ NOT verb `endre` (shipped `cc.change=Endre` is wrong). |
| Hex | hex / heksadesimal | noun · short / explanatory · ⚠️ NOT "hash". Shipped `heks` is informal. |
| Pending | venter / ventende | adj/state · short / explanatory. |
| Unconfirmed | ubekreftet | adj · Bitcoin Core nb · ⚠️ shipped `ubekreftede` is plural form — canonical singular is `ubekreftet`. |
| Confirmed | bekreftet | adj · ⚠️ shipped `bekreftelser` means "confirmations" (noun plural), not the adj state. Use `bekreftet` for the state. |
| Mempool | mempool | noun · Bitcoin Core nb keeps Latin. |
| Broadcast | kringkast / kringkasting | verb / noun · Bitcoin Core nb + Electrum nb. |
| Block explorer | blokk-utforsker / Block Explorer | noun · localized / brand-style · shipped uses Latin `Block Explorer`. |
| Onchain | på kjeden / onchain | adj · compact / explanatory · Zeus nb uses `On-chain`. |
| Offchain | utenfor kjeden / offchain | adj · compact / explanatory. |
| **_Fees & fee bumping_** | | |
| Fee | gebyr / avgift | noun, lowercase · canonical fee / duty-or-tax · ⚠️ `avgift` = duty/tax; `gebyr` is canonical fee · Bitcoin Core nb. |
| Fee Bump | gebyrøkning / fee bump | noun · localized / English-loan · shipped quotes `Fee Bump`. |
| RBF | RBF | acronym · gloss: erstatt med høyere gebyr (Replace-By-Fee). |
| CPFP | CPFP | acronym · gloss: barn betaler for forelder. |
| Speed Up | fremskynd | verb · canonical verb · ⚠️ shipped `Betal en høyere avgift` is a sentence (verbose form) — flag. |
| **_Lightning_** | | |
| Invoice | faktura | noun · Bitcoin Core nb + Electrum nb + Zeus nb. |
| Lightning Invoice | Lightning-faktura | noun · brand + localized noun. |
| Preimage | forhåndsbilde / preimage | noun · math / English-loan · Zeus nb keeps `Preimage`. |
| Payment | betaling | noun · ⚠️ NOT verb `betal`. |
| Expired | utløpt | adj/state. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | medsignerer / medsigner | noun · participant noun · ⚠️ NOT `medsignatur` (= co-signature act) · ⚠️ NOT "medeier" (co-owner) · Bitcoin Core nb. |
| Quorum | quorum / terskel | noun · canonical / UI · shipped uses `quorum`. |
| PSBT | PSBT | acronym · gloss: delvis signert Bitcoin-transaksjon · Bitcoin Core nb. |
| Provide signature | gi signatur / signer transaksjon | verb · ⚠️ shipped `Skriv signatur` (= "write signature") is awkward — prefer `gi signatur` or `signer`. |
| BIP47 / Payment Code | BIP47 / betalingskode | acronym kept; "Payment Code" → `betalingskode`. |
| Notification transaction | varslingstransaksjon | noun · BIP47-specific. |
| SilentPayment | Silent Payments / stille betalinger | protocol name kept English (plural); explanatory locale gloss `stille betalinger`. |
| **_Coin control_** | | |
| Coin Control | myntkontroll | noun, lowercase · Bitcoin Core nb · ⚠️ NOT Title Case. |
| Frozen | fryst | adj · Zeus nb · ⚠️ NOT verb `fryse`. Shipped uses `frosne` (plural); canonical singular is `fryst`. |
| **_Security & storage_** | | |
| Encrypted storage | kryptert lagring | noun, lowercase · ⚠️ NOT Title Case (shipped `Kryptert Lagring`). |
| Plausible Deniability | plausibel fornektelse | noun, lowercase · ⚠️ NOT Title Case (shipped `Plausibel Fornektelse`). |
| Biometrics | biometri | noun, lowercase · ⚠️ shipped `Biometrics` is English passthrough — fix to `biometri`. |
| Passcode | tilgangskode | noun · ⚠️ NOT `passord` (= password). Shipped `Passord` collides with "password". |
| **_Backup, import & UX_** | | |
| Backup | sikkerhetskopi / sikkerhetskopier | noun / verb · Bitcoin Core nb + Electrum nb · ⚠️ shipped `backup` is informal English-loan. |
| Restore | gjenopprett / gjenoppretting | verb / noun · Bitcoin Core nb. |
| Import | importer / import | verb / noun. |
| Voucher | kupong | noun, lowercase. |
| Redeem | løs inn / innløs | verb. |
| Send | send | verb · ⚠️ shipped `Sende` is infinitive form; button label should be imperative `Send`. |
| Receive | motta | verb. |
| Settings | innstillinger | noun, lowercase. |
| Confirm | bekreft / bekreftelse | verb / noun. |
| QR Code | QR-kode | noun. |
| Clipboard | utklippstavle | noun, lowercase · Bitcoin Core nb. |
| Memo | notat / memo | noun · localized / English-loan · Zeus nb uses `notat`. |
| Description | beskrivelse | noun, lowercase · Bitcoin Core nb + Electrum nb. |
| Label | merkelapp / etikett | noun, lowercase. |
