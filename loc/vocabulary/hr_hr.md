# Croatian translation vocabulary (`hr_hr.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · hr.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; lowercase unit. |
| sats | sats / satoshiji | noun, lowercase; `sats` widely kept in UI. |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | novčanik | noun, lowercase · Bitcoin Core hr + Cake hr + hr.wikipedia.org/wiki/Bitcoin. ⚠️ Shipped `Volet` is colloquial — replace. |
| Vault | trezor / sef | noun · safe/strongbox sense; avoid Latin "Vault". `trezor` is preferred for vault-as-strongbox sense — note collision with Trezor hardware-wallet brand. |
| Watch-only | samo gledanje / promatrački novčanik | adj · Bitcoin Core hr ("adrese koje su isključivo za promatranje"). ⚠️ NOT view mode / read mode. |
| Hardware wallet | hardverski novčanik | noun, lowercase · Bitcoin Core hr + Cake hr. |
| Seed | sjeme / sigurnosna fraza | noun · Bitcoin Core hr (`Sjeme`) + Cake hr. ⚠️ Shipped `Izvor` (= source) is wrong — replace. |
| Mnemonic | mnemonička fraza / sigurnosna fraza | noun · technical / mainstream · Cake hr. |
| Passphrase | kodna fraza | noun · Bitcoin Core hr. ⚠️ NOT `lozinka` (= password); Bitcoin Core hr uses `Lozinka` for passphrase but collides with password in BlueWallet UI. |
| Public key | javni ključ | noun, lowercase · Cake hr. |
| Private key | privatni ključ | noun, lowercase · Bitcoin Core hr + Cake hr. |
| WIF | WIF | acronym · gloss: format za uvoz novčanika. |
| xpub | xpub | acronym, lowercase preferred. Shipped `XPUB` may stay uppercase per convention. |
| Descriptor | deskriptor | noun, lowercase · standard hr transliteration; hr.wikipedia "deskriptor". |
| Derivation path | put derivacije | noun · Cake hr. |
| Master fingerprint | otisak glavnog ključa | noun, lowercase · constructed from `otisak` (fingerprint) + `glavni ključ` (master key) per hr cryptography conventions. |
| BIP38 | BIP38 | acronym kept · gloss: BIP38 lozinka za dešifriranje. |
| **_On-chain transactions_** | | |
| Transaction | transakcija | noun, lowercase · Bitcoin Core hr + Cake hr + hr.wikipedia.org/wiki/Bitcoin. |
| Address | adresa | noun, lowercase · Bitcoin Core hr + Cake hr. |
| Input | ulaz / ulaz transakcije | noun · short / full · Bitcoin Core hr (`ulaz`). |
| Output | izlaz / izlaz transakcije | noun · short / full · ⚠️ NOT UI recipient label "Za:". |
| UTXO | UTXO | acronym · gloss: nepotrošeni izlaz transakcije. |
| Change | ostatak / vraćeno | noun · Bitcoin Core hr (`Vraćeno/ostatak`). ⚠️ NOT verb `promijeniti` and NOT `promjena` (= "alteration"). |
| Hex | hex / heksadekadski zapis | noun · short / explanatory · ⚠️ NOT "hash". |
| Pending | u tijeku / na čekanju | adj/state. Avoid noun `čekanje`. |
| Unconfirmed | nepotvrđeno | adj/state · Bitcoin Core hr. |
| Confirmed | potvrđeno | adj/state · Bitcoin Core hr. |
| Mempool | mempool / memorijski bazen | noun · Latin kept (mainstream) / Bitcoin Core hr gloss. |
| Broadcast | objavi / emitiraj | verb · UI / technical · Bitcoin Core hr (`Objavi`). Noun: objava. |
| Block explorer | preglednik blokova | noun, lowercase · constructed; standard hr software term `preglednik` (browser/explorer). |
| Onchain | on-chain / na lancu | adj · compact (chip) / explanatory (body) · loanword + hr.wikipedia "lanac blokova". |
| Offchain | off-chain / izvan lanca | adj · compact (chip) / explanatory (body) · loanword + hr.wikipedia "lanac blokova". |
| **_Fees & fee bumping_** | | |
| Fee | naknada | noun, lowercase · Bitcoin Core hr + Cake hr + Zeus hr. |
| Fee Bump | povećanje naknade | noun · constructed from `naknada` (fee) + `povećanje` (increase). |
| RBF | RBF | acronym · gloss: zamjena naknadom / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: dijete plaća za roditelja. ⚠️ NOT verb `Stvori`. |
| Speed Up | ubrzaj | verb. |
| **_Lightning_** | | |
| Invoice | faktura / račun | noun · technical / mainstream · Zeus hr (`Faktura`) / shipped `račun`. |
| Lightning Invoice | Lightning faktura / Lightning račun | noun · brand + localised noun. |
| Preimage | preimage / prethodna slika | noun · Latin kept (Zeus hr) / explanatory math gloss. |
| Payment | plaćanje | noun · Zeus hr · ⚠️ NOT verb `platiti`. |
| Expired | isteklo | adj/state · shipped `Isteklo` already correct (lowercase in body). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | supotpisnik | noun · ⚠️ NOT `suvlasnik` (= co-owner) · standard hr legal/notary term. |
| Quorum | kvorum / prag potpisa | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym. |
| Provide signature | priloži potpis / potpiši transakciju | verb · generic / specific · Bitcoin Core hr (`Potpis` / `Potpiši`). |
| BIP47 / Payment Code | BIP47 / kod plaćanja | acronym kept; "Payment Code" → `kod plaćanja`. |
| Notification transaction | obavijesna transakcija | noun · BIP47-specific; constructed from `obavijest` (notification). |
| SilentPayment | Silent Payments / tiha plaćanja | protocol name kept English (plural); explanatory `tiha plaćanja` if needed. |
| **_Coin control_** | | |
| Coin Control | upravljanje UTXO-ima / upravljanje kovanicama | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. |
| Frozen | zamrznuto | adj · state form · ⚠️ NOT verb `zamrznuti`. |
| **_Security & storage_** | | |
| Encrypted storage | šifrirani spremnik | noun, lowercase · Bitcoin Core hr (`Šifrirani novčanik`). Shipped `spremnik je kriptiran` is a full sentence — prefer noun form. |
| Plausible Deniability | uvjerljivo poricanje | noun, lowercase. ⚠️ Shipped `Fejk volet` is slang ("fake wallet") — replace. |
| Biometrics | biometrija | noun, lowercase. |
| Passcode | kod za otključavanje / PIN | noun · ⚠️ NOT `lozinka` (= password). Shipped uses `Lozinka` from `settings/password` — collides; recommend distinct word. |
| **_Backup, import & UX_** | | |
| Backup | sigurnosna kopija / izraditi sigurnosnu kopiju | noun / verb · Bitcoin Core hr + Cake hr. Shipped `Izvoz / bekap` is colloquial. |
| Restore | obnovi / obnova | verb / noun · Cake hr (`Vratiti` / `Oporavi`). |
| Import | uvezi / uvoz | verb / noun · Bitcoin Core hr (`Uvoziti`) + Cake hr (`Uvoz`). Shipped `Unesi` ("enter") is weaker. |
| Voucher | bon / vaučer | noun, lowercase · `bon` standard hr commercial term / `vaučer` loanword; Cake hr uses `poklon kartica` (gift card) but Azteco context differs. |
| Redeem | iskoristi / aktiviraj | verb · ⚠️ NOT "kupiti" / NOT "prebaciti" · standard hr commercial term for redeeming vouchers. |
| Send | pošalji / šalji | verb · Bitcoin Core hr (`Pošalji`). Shipped `Šalji` is imperative-imperfective. |
| Receive | primi | verb · Bitcoin Core hr + Cake hr. |
| Settings | postavke | noun, lowercase · Bitcoin Core hr. |
| Confirm | potvrdi / potvrda | verb / noun · Bitcoin Core hr. |
| QR Code | QR kod | noun · Bitcoin Core hr + Cake hr. |
| Clipboard | međuspremnik | noun, lowercase · Bitcoin Core hr + Cake hr. |
| Memo | bilješka | noun, lowercase. |
| Description | opis | noun, lowercase · Cake hr. |
| Label | oznaka | noun, lowercase · Bitcoin Core hr + Cake hr. |
