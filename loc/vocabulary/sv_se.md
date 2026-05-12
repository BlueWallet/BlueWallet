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
| Wallet | plånbok | noun, lowercase · Bitcoin Core sv + Electrum sv_SE + sv.wikipedia.org/wiki/Bitcoin |
| Vault | valv | noun, lowercase · sense: safe/strongbox. Avoid Latin "Vault". |
| Watch-only | endast granskning / endast för granskning | adj · short / explanatory · Bitcoin Core sv ("plånböcker som endast ska granskas") |
| Hardware wallet | hårdvaruplånbok | noun, lowercase · Bitcoin Core sv |
| Seed | seed / återställningsfras | noun · technical loanword / mainstream · Bitcoin Core sv keeps "HD-seed"; Electrum sv_SE uses "ordfras / frö". |
| Mnemonic | mnemonisk fras / återställningsfras | noun · technical / mainstream · Electrum sv_SE "ordfras". |
| Passphrase | lösenfras | noun · ⚠️ NOT "lösenord" (= password) · Electrum sv_SE |
| Public key | publik nyckel | noun, lowercase · Electrum sv_SE + Zeus sv |
| Private key | privat nyckel | noun, lowercase · Bitcoin Core sv + Electrum sv_SE |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | deskriptor | noun, lowercase · Bitcoin Core sv ("descriptor wallets" → "deskriptor"-plånböcker). |
| Derivation path | härledningsväg / derivation path | noun · canonical / loanword still common in UI. |
| Master fingerprint | huvudfingeravtryck / master fingerprint | noun · localised / loanword. |
| BIP38 | BIP38 | acronym kept · gloss: BIP38-krypterad privat nyckel. |
| **_On-chain transactions_** | | |
| Transaction | transaktion | noun, lowercase · Bitcoin Core sv + Electrum sv_SE |
| Address | adress | noun, lowercase · Bitcoin Core sv + Electrum sv_SE |
| Input | indata / transaktionsindata | noun · short / full · Bitcoin Core sv "Inmatningar". |
| Output | utdata / transaktionsutdata | noun · short / full · ⚠️ NOT the UI recipient label "Till". |
| UTXO | UTXO | acronym · gloss: oanvänd transaktionsutdata. |
| Change | växel / växeladress | noun · ⚠️ NOT verb "ändra". `växel` = leftover coin; `växeladress` for change-address field · Bitcoin Core sv ("Spendera obekräftad växel"). |
| Hex | hex / hexadecimal | noun · short / explanatory · ⚠️ NOT "hash" / NOT "transaktionsdata" · Bitcoin Core sv "hex". |
| Pending | pågående | adj/state · Bitcoin Core sv |
| Unconfirmed | obekräftad | adj · Bitcoin Core sv + Electrum sv_SE |
| Confirmed | bekräftad | adj · Bitcoin Core sv |
| Mempool | mempool / minnespool | noun · loanword / localised · Bitcoin Core sv "Minnespool"; mempool common in wallet UIs. |
| Broadcast | sänd / sändning | verb / noun · Bitcoin Core sv "Sänd Tx"; Electrum sv_SE "Sänder transaktion". |
| Block explorer | blockutforskare | noun, lowercase · Electrum sv_SE ("Visa i blockutforskare"). |
| Onchain | on-chain / i blockkedjan | adj · compact (chip) / explanatory (body) · Zeus sv "On-chain"; sv.wikipedia.org/wiki/Bitcoin uses "blockkedja". |
| Offchain | off-chain / utanför blockkedjan | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | avgift | noun, lowercase · Bitcoin Core sv + Electrum sv_SE |
| Fee Bump | höjning av avgift / höj avgift | noun / verb · Electrum sv_SE "Öka avgiften". |
| RBF | RBF | acronym · gloss: Replace-By-Fee · Bitcoin Core sv keeps as-is. |
| CPFP | CPFP | acronym · gloss: barn betalar för förälder. ⚠️ NOT a verb. |
| Speed Up | påskynda | verb · button label. |
| **_Lightning_** | | |
| Invoice | faktura | noun · Electrum sv_SE + Zeus sv |
| Lightning Invoice | Lightning-faktura | noun · Zeus sv "Lightning faktura". |
| Preimage | förbild | noun · math sense · cf. Zeus sv → `betalningsförbild` (single compound). |
| Payment | betalning | noun · ⚠️ NOT verb "betala". |
| Expired | förfallen / utgången | adj · short / alt · Electrum sv_SE "Förfallen"; "utgången" also shipped. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | medundertecknare | noun · ⚠️ NOT "delägare" (co-owner). Matches shipped "Medunderteckna". |
| Quorum | kvorum | noun. |
| PSBT | PSBT | acronym · gloss: delvis signerad Bitcoin-transaktion · Bitcoin Core sv. |
| Provide signature | tillhandahåll signatur / signera | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / betalningskod | acronym kept; "Payment Code" → "betalningskod" (shipped). |
| Notification transaction | aviseringstransaktion | noun · BIP47-specific. |
| SilentPayment | Silent Payments / tysta betalningar | protocol name kept English (plural); explanatory "tysta betalningar" if needed. |
| **_Coin control_** | | |
| Coin Control | myntkontroll | noun, lowercase · Bitcoin Core sv · ⚠️ NOT Title Case. |
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
