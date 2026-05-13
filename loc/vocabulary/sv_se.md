# Swedish translation vocabulary (`sv_se.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · sv.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand kept Latin · Electrum sv_SE + Zeus sv |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand · Bitcoin Core sv + Zeus sv |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker · lowercase unit per sv.wikipedia.org/wiki/Bitcoin |
| sats | sats | noun, lowercase. |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | wallet / plånbok | noun, lowercase · Swedish Bitcoin community prefers English loanword "wallet"; "plånbok" still acceptable in long-form prose. |
| Vault | Vault | noun · kept English loanword (Swedish Bitcoin/Lightning community usage). Avoid "valv". |
| Watch-only | watch-only | adj · English loanword preferred; matches "watch-only"-plånbok pattern in shipped UI. |
| Hardware wallet | hardware wallet | noun · English loanword preferred over "hårdvaruplånbok". |
| Seed | seed | noun · English technical loanword · Bitcoin Core sv keeps "HD-seed". |
| Mnemonic | mnemonic / mnemonic-fras | noun · English loanword preferred over "mnemonisk fras". |
| Passphrase | lösenfras | noun · ⚠️ NOT "lösenord" (= password) · Electrum sv_SE |
| Public key | publik nyckel | noun, lowercase · Electrum sv_SE + Zeus sv |
| Private key | privat nyckel | noun, lowercase · Bitcoin Core sv + Electrum sv_SE |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | deskriptor | noun, lowercase · Bitcoin Core sv ("descriptor wallets" → "deskriptor"-plånböcker). |
| Derivation path | derivation path | noun · English loanword preferred; common in Swedish wallet UIs. |
| Master fingerprint | master fingerprint / fingerprint | noun · English loanword preferred over "huvudfingeravtryck". |
| BIP38 | BIP38 | acronym kept · gloss: BIP38-krypterad privat nyckel. |
| **_On-chain transactions_** | | |
| Transaction | transaktion | noun, lowercase · Bitcoin Core sv + Electrum sv_SE |
| Address | adress | noun, lowercase · Bitcoin Core sv + Electrum sv_SE |
| Input | indata / transaktionsindata | noun · short / full · Bitcoin Core sv "Inmatningar". |
| Output | utdata / transaktionsutdata | noun · short / full · ⚠️ NOT the UI recipient label "Till". |
| UTXO | UTXO | acronym · gloss: oanvänd transaktionsutdata. |
| Change | växel / växeladress | noun · ⚠️ NOT verb "ändra". `växel` = leftover coin; `växeladress` for change-address field · Bitcoin Core sv ("Spendera obekräftad växel"). |
| Hex | hex / hexadecimal | noun · short / explanatory · ⚠️ NOT "hash" / NOT "transaktionsdata" · Bitcoin Core sv "hex". |
| Pending | väntande | adj/state · matches shipped "Väntande" in send/transactions. |
| Unconfirmed | obekräftad | adj · Bitcoin Core sv + Electrum sv_SE |
| Confirmed | bekräftad | adj · Bitcoin Core sv |
| Mempool | mempool | noun · English loanword preferred; common in Swedish wallet UIs. |
| Broadcast | broadcast / broadcasta | verb / noun · English loanword preferred; matches shipped "Broadcasta Transaktion". |
| Block explorer | block explorer | noun · English loanword preferred over "blockutforskare". |
| Onchain | onchain / on-chain | adj · English loanword preferred over "i blockkedjan". |
| Offchain | offchain / off-chain | adj · English loanword preferred over "utanför blockkedjan". |
| **_Fees & fee bumping_** | | |
| Fee | avgift | noun, lowercase · Bitcoin Core sv + Electrum sv_SE |
| Fee Bump | höjning av avgift / höj avgift | noun / verb · Electrum sv_SE "Öka avgiften". |
| RBF | RBF | acronym · gloss: Replace-By-Fee · Bitcoin Core sv keeps as-is. |
| CPFP | CPFP | acronym · gloss: barn betalar för förälder. ⚠️ NOT a verb. |
| Speed Up | påskynda | verb · button label. |
| **_Lightning_** | | |
| Invoice | faktura | noun · Electrum sv_SE + Zeus sv |
| Lightning Invoice | Lightning-faktura | noun · Zeus sv "Lightning faktura". |
| Preimage | Pre-image | noun · English loanword kept (matches shipped UI); cf. en.json "Pre-image". |
| Payment | betalning | noun · ⚠️ NOT verb "betala". |
| Expired | förfallen / utgången | adj · short / alt · Electrum sv_SE "Förfallen"; "utgången" also shipped. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | medundertecknare / medsignerare | noun · ⚠️ NOT "delägare" (co-owner). Matches shipped "Medunderteckna". |
| Quorum | kvorum | noun. |
| PSBT | PSBT | acronym · gloss: delvis signerad Bitcoin-transaktion · Bitcoin Core sv. |
| Provide signature | tillhandahåll signatur / signera | verb · generic / specific. |
| Multisig | Multisig | English loanword kept; not translated. |
| Multisig Vault | Multisig Vault | English compound kept; matches shipped UI direction. |
| BIP47 / Payment Code | BIP47 / Payment Code | acronym kept; "Payment Code" → English loanword preferred over "betalningskod". |
| Notification transaction | aviseringstransaktion | noun · BIP47-specific. |
| SilentPayment | Silent Payments / SilentPayment | protocol name kept English. |
| **_Coin control_** | | |
| Coin Control | Coin Control / myntkontroll | noun · English loanword preferred; "myntkontroll" acceptable as gloss. |
| Frozen | fryst | adj · ⚠️ NOT verb "frysa" · Electrum sv_SE "Adressen är frusen"; Zeus sv "Fryst". |
| **_Security & storage_** | | |
| Encrypted storage | krypterad lagring | noun, lowercase · ⚠️ NOT Title Case. |
| Plausible Deniability | trovärdigt förnekande | noun, lowercase. |
| Biometrics | biometri / biometrisk identifiering | noun, lowercase · Zeus sv "Biometri". |
| Passcode | enhetskod | noun · ⚠️ NOT "lösenord" (= password) — distinct from app password. |
| **_Backup, import & UX_** | | |
| Backup | säkerhetskopia / säkerhetskopiera | noun / verb · Bitcoin Core sv + Electrum sv_SE + Zeus sv |
| Restore | återställ / återställning | verb / noun · Electrum sv_SE "återställ". |
| Import | importera / import | verb / noun · Electrum sv_SE |
| Voucher | kupong | noun, lowercase. |
| Redeem | lös in | verb. |
| Send | skicka | verb · Bitcoin Core sv + Electrum sv_SE |
| Receive | ta emot | verb · Bitcoin Core sv + Electrum sv_SE |
| Settings | inställningar | noun, lowercase · Bitcoin Core sv + Electrum sv_SE |
| Confirm | bekräfta / bekräftelse | verb / noun · Bitcoin Core sv |
| QR Code | QR-kod | noun · Electrum sv_SE + Bitcoin Core sv |
| Clipboard | urklipp | noun, lowercase · Bitcoin Core sv + Electrum sv_SE |
| Memo | memo / notering | noun, lowercase · loanword / localised. |
| Description | beskrivning | noun, lowercase · Electrum sv_SE + Bitcoin Core sv |
| Label | etikett | noun, lowercase · Electrum sv_SE + Bitcoin Core sv |
| Hide | Dölj | verb · preferred over "Göm" in current UI. |
