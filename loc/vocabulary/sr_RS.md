# Serbian translation vocabulary (`sr_RS.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · sr.wikipedia "Bitkoin" used in explanatory text only. |
| Lightning | Lightning | brand. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; Latin script per shipped UI. |
| sats | sats / satoši | noun, lowercase · technical / mainstream. |
| sat/vByte | sat/vByte | technical unit kept Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | novčanik | noun, lowercase · matches shipped `sr_RS.json` + Bitcoin Core sr. |
| Vault | sef / kasa | noun · `sef` for safe/strongbox sense; `kasa` as alternative — avoid `trezor` (collides with Trezor hardware-wallet brand). |
| Watch-only | samo za posmatranje | adj · Bitcoin Core sr convention. |
| Hardware wallet | hardverski novčanik | noun, lowercase · Bitcoin Core sr. |
| Seed | seed fraza / fraza za oporavak | noun · technical / mainstream. |
| Mnemonic | mnemonička fraza / fraza za oporavak | noun · technical / mainstream. |
| Passphrase | pristupna fraza | noun · ⚠️ NOT `lozinka` (= password) · Bitcoin Core sr. |
| Public key | javni ključ | noun, lowercase · Bitcoin Core sr. |
| Private key | privatni ključ | noun, lowercase · Bitcoin Core sr. |
| WIF | WIF | acronym · gloss: format za uvoz novčanika. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | deskriptor | noun, lowercase · Bitcoin Core sr transliteration. |
| Derivation path | putanja derivacije | noun · Bitcoin Core sr. |
| Master fingerprint | otisak glavnog ključa | noun · Bitcoin Core sr (`Главни отисак`). |
| BIP38 | BIP38 | acronym kept · gloss: BIP38 lozinka. |
| **_On-chain transactions_** | | |
| Transaction | transakcija | noun, lowercase · Latinized from Bitcoin Core sr "Трансакција". |
| Address | adresa | noun, lowercase · Bitcoin Core sr. |
| Input | ulaz / ulaz transakcije | noun · short / full · Bitcoin Core sr. |
| Output | izlaz / izlaz transakcije | noun · short / full · ⚠️ NOT "Prima" (UI recipient label). |
| UTXO | UTXO | acronym · gloss: nepotrošeni izlaz transakcije. |
| Change | kusur / adresa kusura | noun · ⚠️ NOT verb "promeniti". `kusur` = leftover · Bitcoin Core sr. |
| Hex | hex / heksadecimalni podaci | noun · short / explanatory · ⚠️ NOT "hash" · Bitcoin Core sr. |
| Pending | na čekanju | adj/state · Bitcoin Core sr. |
| Unconfirmed | nepotvrđeno | adj · Bitcoin Core sr. |
| Confirmed | potvrđeno | adj · Bitcoin Core sr. |
| Mempool | mempool | noun · technical term kept Latin; Bitcoin Core sr uses descriptive "удружена меморија" but UI prefers mainstream loanword. |
| Broadcast | emituj / emitovanje | verb / noun · Bitcoin Core sr. |
| Block explorer | istraživač blokova | noun, lowercase · Bitcoin Core sr. |
| Onchain | on-chain / na blokčejnu | adj · compact (chip) / explanatory (body) · loanword + sr.wikipedia "блокчејн". |
| Offchain | off-chain / van blokčejna | adj · compact (chip) / explanatory (body) · loanword + sr.wikipedia "блокчејн". |
| **_Fees & fee bumping_** | | |
| Fee | naknada / provizija | noun, lowercase · Bitcoin Core sr ("Provizija"); `naknada` more standard for "network fee". |
| Fee Bump | povećanje naknade | noun · constructed from `naknada` (fee) + `povećanje` (increase). |
| RBF | RBF | acronym · gloss: zamena po naknadi / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: dete plaća za roditelja. ⚠️ NOT verb. |
| Speed Up | ubrzaj | verb (imperative) · Bitcoin Core sr `убрзати`. |
| **_Lightning_** | | |
| Invoice | faktura / račun | noun · technical / mainstream · standard sr commercial terms. |
| Lightning Invoice | Lightning faktura / Lightning račun | noun · technical / mainstream. |
| Preimage | preimage / praslika | noun · technical (English) / math term `praslika` (sr math literature). |
| Payment | plaćanje | noun · ⚠️ NOT verb "platiti". |
| Expired | isteklo | adj/state · Bitcoin Core sr. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | sapotpisnik | noun · ⚠️ NOT "suvlasnik" (co-owner). |
| Quorum | kvorum / prag potpisa | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym. |
| Provide signature | obezbedi potpis / potpiši transakciju | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / kod za plaćanje | acronym kept; "Payment Code" → "kod za plaćanje". |
| Notification transaction | transakcija obaveštenja | noun · BIP47-specific. |
| SilentPayment | Silent Payments / tiha plaćanja | protocol name kept English (plural); explanatory `tiha plaćanja`. |
| **_Coin control_** | | |
| Coin Control | upravljanje UTXO / upravljanje novčićima | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. |
| Frozen | zamrznuto | adj · ⚠️ NOT verb "zamrznuti". |
| **_Security & storage_** | | |
| Encrypted storage | šifrovano skladište | noun, lowercase · ⚠️ NOT Title Case · Bitcoin Core sr ("Шифриран"). |
| Plausible Deniability | uverljivo poricanje | noun, lowercase · sr.wikipedia "уверљиво порицање". |
| Biometrics | biometrija | noun, lowercase. |
| Passcode | pristupni kod | noun · ⚠️ NOT "lozinka" (= password). |
| **_Backup, import & UX_** | | |
| Backup | rezervna kopija / napravi rezervnu kopiju | noun / verb · Bitcoin Core sr. |
| Restore | vrati / vraćanje | verb / noun · Bitcoin Core sr ("Поврати"). |
| Import | uvezi / uvoz | verb / noun · Bitcoin Core sr. |
| Voucher | vaučer | noun, lowercase. |
| Redeem | aktiviraj / iskoristi | verb · ⚠️ NOT "kupi u novčanik". For vouchers prefer `aktiviraj`. |
| Send | pošalji | verb · Bitcoin Core sr. |
| Receive | primi | verb · Bitcoin Core sr. |
| Settings | podešavanja | noun, lowercase · Bitcoin Core sr. |
| Confirm | potvrdi / potvrda | verb / noun · Bitcoin Core sr. |
| QR Code | QR kod | noun · Bitcoin Core sr. |
| Clipboard | clipboard / međuspremnik | noun, lowercase · technical/Latin kept; `međuspremnik` per Bitcoin Core sr. |
| Memo | beleška | noun, lowercase · Bitcoin Core sr. |
| Description | opis | noun, lowercase · Bitcoin Core sr. |
| Label | oznaka | noun, lowercase · Bitcoin Core sr. |
