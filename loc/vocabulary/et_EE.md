# Estonian translation vocabulary (`et_EE.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · et.wikipedia.org/wiki/Bitcoin (uppercase = network, lowercase = unit). |
| Lightning | Lightning | brand. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand/acronym. |
| Tor | Tor | brand · et.wikipedia.org/wiki/Tor |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker · et.wikipedia.org/wiki/Bitcoin (lowercase for unit). |
| sats | satid / satoshid | noun, lowercase · Estonian plural form, but `sats` may be kept untranslated in UI chips. |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | rahakott | noun, lowercase · Bitcoin Core et + et.wikipedia.org/wiki/Krüptoraha |
| Vault | seif / hoidla | noun; `seif` for safe/strongbox sense. Avoid Latin "Vault". |
| Watch-only | ainult vaatamiseks / vaatlusrežiim | adj · short / wallet-type · Bitcoin Core et `ainult vaatamiseks`. |
| Hardware wallet | riistvaraline rahakott | noun, lowercase · et.wikipedia.org/wiki/Krüptoraha (inferred standard form). |
| Seed | seeme / taastefraas | noun; shipped UI uses `Seeme`. Mainstream form: `taastefraas` (recovery phrase). |
| Mnemonic | mnemooniline fraas / taastefraas | noun · technical / mainstream. |
| Passphrase | salafraas | noun · ⚠️ NOT `parool` (= password) · Bitcoin Core et. |
| Public key | avalik võti | noun, lowercase · et.wikipedia.org/wiki/Krüptoraha |
| Private key | privaatvõti | noun, lowercase · Bitcoin Core et. Shipped `võti` is too generic — should specify private. |
| WIF | WIF | acronym · gloss: rahakoti impordi formaat. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | deskriptor | noun, lowercase · Estonian tech literature standard transliteration. |
| Derivation path | tuletustee / tuletusrada | noun · BIP32 path · constructed from `tuletus` (derivation, standard et math/CS term) + `tee`/`rada` (path). |
| Master fingerprint | põhivõtme sõrmejälg | noun · constructed from `põhivõti` (master key) + `sõrmejälg` (fingerprint). |
| BIP38 | BIP38 | acronym kept · gloss: BIP38 parool / krüpteeritud privaatvõti. |
| **_On-chain transactions_** | | |
| Transaction | tehing | noun, lowercase · Bitcoin Core et + et.wikipedia.org/wiki/Bitcoin |
| Address | aadress | noun, lowercase · Bitcoin Core et. |
| Input | sisend | noun, lowercase · Bitcoin Core et. |
| Output | väljund | noun, lowercase · Bitcoin Core et · ⚠️ NOT "Saaja" (= recipient UI label). |
| UTXO | UTXO | acronym · gloss: kulutamata tehingu väljund. |
| Change | vahetusraha / tagastusaadress | noun · ⚠️ NOT verb "muuta". `vahetusraha` = change coin (Bitcoin Core et); `tagastusaadress` for change-address field. |
| Hex | hex / kuueteistkümnendsüsteem | noun · short / explanatory · ⚠️ NOT "hash" / NOT "tehingu andmed". |
| Pending | ootel | adj/state · Bitcoin Core et. Avoid noun "ootamine". |
| Unconfirmed | kinnitamata | adj · Bitcoin Core et. |
| Confirmed | kinnitatud | adj · Bitcoin Core et. |
| Mempool | mempool / tehingute ootejärjekord | noun · technical loanword / explanatory ("transaction wait-queue"). |
| Broadcast | leviedasta / saada võrku | verb · UI-clear. Noun: levitamine. ⚠️ Shipped `Ülekanne` (= "transfer") is wrong sense — fix to `leviedastus` / `saada võrku`. |
| Block explorer | plokiuurija / plokiahela uurija | noun, lowercase · constructed from et.wikipedia.org/wiki/Bitcoin `plokiahel`. |
| Onchain | ahelas / plokiahelas | adj · compact (chip) / explanatory (body) · from `plokiahel`. |
| Offchain | väljaspool ahelat / off-chain | adj · explanatory / compact (chip). |
| **_Fees & fee bumping_** | | |
| Fee | tasu / võrgutasu | noun, lowercase · Bitcoin Core et. |
| Fee Bump | tasu suurendamine | noun · constructed from `tasu` (fee) + `suurendamine` (increase). |
| RBF | RBF | acronym · gloss: tasu asendamine / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: laps maksab vanema eest. ⚠️ NOT a verb. |
| Speed Up | kiirenda | verb (imperative) · standard et `kiirendama` (to speed up). |
| **_Lightning_** | | |
| Invoice | arve / maksenõue | noun · mainstream / explanatory · `arve` is standard et invoice term; `maksenõue` = payment demand. |
| Lightning Invoice | Lightning arve / Lightningi maksenõue | noun · brand + localised noun. |
| Preimage | eelpilt / preimage | noun · et math literature `eelpilt` (preimage of a function) / English fallback. |
| Payment | makse | noun · ⚠️ NOT verb "maksta". |
| Expired | aegunud | adj/state form. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | kaasallkirjastaja | noun · ⚠️ NOT "kaasomanik" (co-owner). From `allkirjastaja` (Bitcoin Core et `allkirjasta`). |
| Quorum | kvoorum / allkirjade lävi | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · gloss: osaliselt allkirjastatud Bitcoini tehing. |
| Provide signature | anna allkiri / allkirjasta tehing | verb · generic / specific · Bitcoin Core et `allkiri` / `allkirjasta`. |
| BIP47 / Payment Code | BIP47 / maksekood | acronym kept; "Payment Code" → "maksekood". |
| Notification transaction | teavitustehing | noun · BIP47-specific; constructed. |
| SilentPayment | Silent Payments / vaiksed maksed | protocol name kept English (plural); explanatory `vaiksed maksed` if needed. |
| **_Coin control_** | | |
| Coin Control | UTXO haldus / müntide haldus | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. |
| Frozen | külmutatud | adj · state form · ⚠️ NOT verb "külmutada". |
| **_Security & storage_** | | |
| Encrypted storage | krüpteeritud hoidla | noun, lowercase · shipped · ⚠️ NOT Title Case. |
| Plausible Deniability | usutav eitatavus / usutava eitamise võimalus | noun, lowercase · short / full · constructed. |
| Biometrics | biomeetria | noun, lowercase. |
| Passcode | pääsukood | noun · ⚠️ NOT `parool` (= password). Shipped `parool` collides with password — recommend `pääsukood`. |
| **_Backup, import & UX_** | | |
| Backup | varundus / varunda | noun / verb · Bitcoin Core et `varunda` / `varundamine`. |
| Restore | taasta / taastamine | verb / noun · Bitcoin Core et. |
| Import | impordi / import | verb / noun. |
| Voucher | vautšer | noun, lowercase · shipped. |
| Redeem | lunasta | verb (imperative) · shipped · ⚠️ NOT "osta rahakotti". |
| Send | saada | verb · Bitcoin Core et. |
| Receive | võta vastu | verb · Bitcoin Core et. |
| Settings | seaded | noun, lowercase · Bitcoin Core et. |
| Confirm | kinnita / kinnitus | verb / noun · plural kinnitused = confirmations. |
| QR Code | QR-kood | noun · Bitcoin Core et + et.wikipedia.org/wiki/QR-kood (alt: `ruutkood`). |
| Clipboard | lõikelaud | noun, lowercase · standard Estonian software term · ⚠️ shipped Bitcoin Core et uses `vahemälu` (= cache) which is incorrect — prefer `lõikelaud`. |
| Memo | märkus / memo | noun, lowercase. |
| Description | kirjeldus | noun, lowercase. |
| Label | silt / märgis | noun, lowercase · Bitcoin Core et. |
