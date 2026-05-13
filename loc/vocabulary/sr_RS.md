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
| Wallet | Wallet / novčanik | noun · `Wallet` kept English in product strings; `novčanik` as descriptive prose form. Established Serbian crypto community usage. |
| Vault | Trezor | noun · established Serbian crypto term for Bitcoin Vault (BlueWallet multisig). ⚠️ NOT `sef`/`kasa` — `Trezor` is the community-accepted rendering despite the hardware-wallet brand collision. |
| Watch-only | watch-only | adj · loanword kept English; established Serbian crypto community usage. |
| Hardware wallet | hardverski novčanik | noun, lowercase · Bitcoin Core sr. |
| Seed | seed | noun, lowercase · loanword kept English; mainstream Serbian crypto usage. |
| Mnemonic | mnemonic / mnemonička fraza | noun · `mnemonic` loanword preferred in technical UI; `mnemonička fraza` for explanatory prose. |
| Passphrase | pristupna fraza | noun · ⚠️ NOT `lozinka` (= password) · Bitcoin Core sr. |
| Public key | javni ključ | noun, lowercase · Bitcoin Core sr. |
| Private key | privatni ključ | noun, lowercase · Bitcoin Core sr. |
| WIF | WIF | acronym · gloss: format za uvoz novčanika. |
| XPUB / xpub | XPUB | acronym · uppercase preferred per community usage. |
| Descriptor | deskriptor | noun, lowercase · Bitcoin Core sr transliteration. |
| Derivation path | putanja derivacije | noun · Bitcoin Core sr. |
| Master fingerprint | glavni otisak | noun · short Bitcoin Core sr form. |
| BIP38 | BIP38 | acronym kept · gloss: BIP38 lozinka. |
| **_On-chain transactions_** | | |
| Transaction | transakcija | noun, lowercase · Latinized from Bitcoin Core sr "Трансакција". |
| Address | adresa | noun, lowercase · Bitcoin Core sr. |
| Input | ulaz / ulaz transakcije | noun · short / full · Bitcoin Core sr. |
| Output | izlaz / izlaz transakcije | noun · short / full · ⚠️ NOT "Prima" (UI recipient label). |
| UTXO | UTXO | acronym · gloss: nepotrošeni izlaz transakcije. |
| Change | Kusur / Promeni | noun · ⚠️ NOT verb "promeniti" when meaning UTXO change. `Kusur` = leftover · Bitcoin Core sr. |
| Hex | hex / heksadecimalni podaci | noun · short / explanatory · ⚠️ NOT "hash" · Bitcoin Core sr. |
| Pending | na čekanju | adj/state · Bitcoin Core sr. |
| Unconfirmed | nepotvrđeno | adj · Bitcoin Core sr. |
| Confirmed | potvrđeno | adj · Bitcoin Core sr. |
| Mempool | mempool | noun · technical term kept Latin; Bitcoin Core sr uses descriptive "удружена меморија" but UI prefers mainstream loanword. |
| Broadcast | Pošalji / broadcast | verb · ⚠️ UI prefers `Pošalji` ("Send") for button labels; `broadcast` loanword acceptable in technical prose. |
| Block explorer | block explorer | noun · loanword kept English; established Serbian crypto community usage. |
| Onchain | on-chain | adj · loanword kept English (hyphenated); established Serbian crypto community usage. |
| Offchain | off-chain | adj · loanword kept English (hyphenated); established Serbian crypto community usage. |
| **_Fees & fee bumping_** | | |
| Fee | provizija | noun, lowercase · established Serbian commerce term; matches Bitcoin Core sr ("Provizija"). ⚠️ NOT `naknada` — `provizija` is the community-accepted rendering. |
| Fee Bump | povećanje provizije | noun · constructed from `provizija` (fee) + `povećanje` (increase). |
| RBF | RBF | acronym · gloss: zamena po proviziji / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: dete plaća za roditelja. ⚠️ NOT verb. |
| Speed Up | povećaj proviziju / ubrzaj | verb · `povećaj proviziju` for RBF/CPFP UI; `ubrzaj` generic. |
| **_Lightning_** | | |
| Invoice | faktura / račun | noun · technical / mainstream · standard sr commercial terms. |
| Lightning Invoice | Lightning faktura / Lightning račun | noun · technical / mainstream. |
| Preimage | Pre-image | noun · loanword kept English (hyphenated form per community usage). |
| Payment | plaćanje | noun · ⚠️ NOT verb "platiti". |
| Expired | isteklo | adj/state · Bitcoin Core sr. |
| **_Multisig & advanced addressing_** | | |
| Multisig | Multisig | noun · loanword kept English; established Serbian crypto community usage. |
| Co-signer | co-signer | noun · loanword kept English; ⚠️ NOT `sapotpisnik` — `co-signer` is the community-accepted rendering. |
| Quorum | kvorum / prag potpisa | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym. |
| Provide signature | pruži potpis / potpiši transakciju | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / Payment kod | acronym kept; "Payment Code" → "Payment kod" — `Payment` kept English per community usage. |
| Notification transaction | notifikaciona transakcija | noun · BIP47-specific. |
| SilentPayment | SilentPayment / tiha plaćanja | protocol name kept English; explanatory `tiha plaćanja`. |
| **_Coin control_** | | |
| Coin Control | kontrola coinova / upravljanje UTXO | noun, lowercase · ⚠️ NOT Title Case. |
| Frozen | zamrznuto | adj · ⚠️ NOT verb "zamrznuti". |
| **_Security & storage_** | | |
| Storage | memorija | noun, lowercase · ⚠️ NOT `skladište` — `memorija` is the community-accepted rendering. |
| Encrypted storage | šifrovana memorija | noun, lowercase · ⚠️ NOT Title Case. |
| Plausible Deniability | verodostojna negacija | noun, lowercase. |
| Biometrics | biometrija | noun, lowercase. |
| Passcode | pristupni kod | noun · ⚠️ NOT "lozinka" (= password). |
| **_Backup, import & UX_** | | |
| Backup | backup | noun · loanword kept English; established Serbian crypto community usage. |
| Restore | obnovi / obnova | verb / noun. |
| Import | uvezi / uvoz | verb / noun · Bitcoin Core sr. |
| Voucher | vaučer | noun, lowercase. |
| Redeem | Iskoristi | verb · ⚠️ NOT `Aktiviraj` (= activate — semantic drift). `Iskoristi` = redeem/use up, the accurate Serbian rendering for vouchers. |
| Send | pošalji | verb · Bitcoin Core sr. |
| Receive | primi | verb · Bitcoin Core sr. |
| Settings | podešavanja | noun, lowercase · Bitcoin Core sr. |
| Confirm | potvrdi / potvrda | verb / noun · Bitcoin Core sr. |
| QR Code | QR kod | noun · Bitcoin Core sr. |
| Clipboard | privremena memorija / clipboard | noun, lowercase · `privremena memorija` for UI prose; `clipboard` kept English where compact label needed. |
| Memo | beleška | noun, lowercase · Bitcoin Core sr. |
| Description | opis | noun, lowercase · Bitcoin Core sr. |
| Label | oznaka | noun, lowercase · Bitcoin Core sr. |
| **_Rates & currency_** | | |
| Rate (exchange rate) | kurs | noun, lowercase · ⚠️ NOT `stopa` when meaning exchange rate. `stopa` reserved for `fee rate` (stopa provizije). |
