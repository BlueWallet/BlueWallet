# Finnish translation vocabulary (`fi_fi.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · fi.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning / Salama | brand · Latin form per Bitcoin Core fi + fi.wikipedia.org/wiki/Lightning_Network; mainstream Finnish form `Salama` per Zeus fi and shipped BlueWallet strings. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand · standardise on `LNDhub`; drop variant `LNDHub`. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand · Bitcoin Core fi |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit (lowercase) + ticker · fi.wikipedia.org/wiki/Bitcoin |
| sats | satoshi / sattia | noun, lowercase · singular / partitive plural. |
| sat/vByte | sat/vByte | technical unit; Latin kept. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | lompakko | noun, lowercase · Bitcoin Core fi |
| Vault | holvi | noun, lowercase · ⚠️ NOT brand "Vault" — translate to safe/strongbox sense. |
| Watch-only | pelkästään katseltava / katselulompakko | adj / noun-wallet · Bitcoin Core fi (`pelkästään katseltavissa`, `katselulompakot`). ⚠️ NOT "view mode" — wallet type. |
| Hardware wallet | laitelompakko / laitteistolompakko | noun, lowercase · Bitcoin Core fi (`laitelompakko`, `laitteistolompakkoa`). Avoid hybrid `hardware-lompakko`. |
| Seed | siemen / palautuslause | noun · technical / mainstream (recovery phrase). |
| Mnemonic | palautuslause / muistilause / juurisanat | noun · mainstream / technical / Bitcoin Core fi (`juurisanat` for HD seed); UX prefers `palautuslause`. |
| Passphrase | tunnuslause | noun · Bitcoin Core fi · ⚠️ NOT `salasana` (= password). |
| Public key | julkinen avain | noun, lowercase. |
| Private key | yksityinen avain | noun, lowercase. |
| WIF | WIF | acronym · gloss: lompakon tuontimuoto. |
| xpub | xpub | acronym, lowercase preferred (drop UPPERCASE variant). |
| Descriptor | kuvain / deskriptori | noun, lowercase · Bitcoin Core fi (`kuvain`) / technical loan. |
| Derivation path | johdantopolku / johdospolku | noun · shipped form / Zeus fi (`derivaatiopolku`) — `johdantopolku` matches current strings. |
| Master fingerprint | pääavaimen sormenjälki | noun, lowercase · Zeus fi (`Pääavaimen sormenjälki`). Fix shipped `Pää sormenjälki` (mis-spaced). |
| BIP38 | BIP38 | acronym kept · ⚠️ NOT a verb / NOT "password" alone. |
| **_On-chain transactions_** | | |
| Transaction | siirtotapahtuma | noun, lowercase · Bitcoin Core fi |
| Address | osoite | noun, lowercase · Bitcoin Core fi |
| Input | syöte / siirron syöte | noun · short / full. Use singular `syöte`; plural `syötteet` only for lists. |
| Output | ulostulo / siirron ulostulo | noun · short / full · ⚠️ NOT the UI recipient label "Vastaanottaja". |
| UTXO | UTXO | acronym · gloss: käyttämätön siirtotapahtuman ulostulo. |
| Change | vaihtoraha / vaihtoraha-osoite | noun · ⚠️ NOT verb `vaihda` (= to swap/change). `vaihtoraha` = leftover · Bitcoin Core fi (`vaihtoraha`). Fix shipped `vaihto`. |
| Hex | hex / heksadesimaali | noun · short / explanatory · ⚠️ NOT "hash" and NOT "hex-numero" (number). |
| Pending | odottaa / vahvistusta odottava | adj/state · button vs body · Bitcoin Core fi (`Odotetaan:`, `Odottaa vahvistusta`). |
| Unconfirmed | vahvistamaton | adj · Bitcoin Core fi |
| Confirmed | vahvistettu | adj · Bitcoin Core fi · ⚠️ Fix shipped `vahvistukset` (= "confirmations" noun). |
| Mempool | mempool / muistiallas | noun · Latin technical / Bitcoin Core fi gloss (`Muistiallas`). |
| Broadcast | lähetä verkkoon / lähetys | verb / noun · Bitcoin Core fi (`Lähetä Tx`, `valmis lähetettäväksi`). |
| Block explorer | lohkoselain | noun, lowercase · shipped form matches idiom. |
| Onchain | ketjussa / pääketju / pääketjussa | adj (inessive) / noun (chip label) / adj-phrase (body) · Zeus fi · Finnish noun-form `pääketju` acceptable for compact chip. |
| Offchain | salamaverkossa / pääketjun ulkopuolella | adj · compact (Lightning context) / explanatory · Zeus fi (`salamaverkossa`). |
| **_Fees & fee bumping_** | | |
| Fee | siirtomaksu | noun, lowercase · Zeus fi |
| Fee Bump | siirtomaksun nosto / siirtomaksun korotus | noun · shipped / alt-form per Bitcoin Core fi (`korottaa siirtotapahtuman palkkiota`). |
| RBF | RBF | acronym · gloss: Replace-By-Fee · Bitcoin Core fi keeps `Replace-By-Fee` Latin. |
| CPFP | CPFP | acronym · gloss: lapsi maksaa vanhemman puolesta · ⚠️ NOT a verb. |
| Speed Up | nopeuta / nosta siirtomaksua | verb · short button / explanatory action. |
| **_Lightning_** | | |
| Invoice | lasku / maksupyyntö | noun · mainstream / technical · Zeus fi (`Laskut`). |
| Lightning Invoice | Lightning-lasku / Salamalasku | noun · Latin-brand form / mainstream · Zeus fi (`Salamalasku`); shipped strings use `Salamalasku`. |
| Preimage | alkukuva / preimage | noun · shipped Finnish / technical loan · ⚠️ math sense, not "preview image". |
| Payment | maksu | noun · ⚠️ NOT verb `maksaa`. |
| Expired | vanhentunut | adj · Zeus fi · `Erääntynyt` (shipped) implies "due/matured" — prefer `vanhentunut` for invoice expiry. |
| **_Multisig & advanced addressing_** | | |
| Co-signer / Signer | osa-allekirjoittaja / allekirjoittaja | noun · co-signer (specific) / signer (generic, Bitcoin Core fi `allekirjoittaja`). ⚠️ NOT "co-owner". |
| Quorum | kynnys / quorum | noun · UI-clear / Latin technical. ⚠️ Lowercase. |
| PSBT | PSBT | acronym · gloss: osittain allekirjoitettu bitcoin-siirtotapahtuma · Bitcoin Core fi |
| Provide signature | allekirjoita / toimita allekirjoitus | verb · short button / explanatory. |
| BIP47 / Payment Code | BIP47 / maksukoodi | acronym + noun · shipped form. |
| Notification transaction | ilmoitustapahtuma | noun · BIP47-specific; literal compound. |
| SilentPayment | Silent Payments / hiljaiset maksut | protocol name Latin (plural); explanatory `hiljaiset maksut` if needed. |
| **_Coin control_** | | |
| Coin Control | UTXO:iden hallinta / kolikoiden hallinta | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. Bitcoin Core fi (`Kolikoiden valinta`). |
| Frozen | jäädytetty | adj · ⚠️ NOT verb `jäädytä` (= "freeze!"). Zeus fi (`Jäädytetty`). |
| **_Security & storage_** | | |
| Encrypted storage | salattu tallennustila / tallennustilan salaus | noun, lowercase · ⚠️ NOT Title Case · Bitcoin Core fi (`Salaa lompakko`). |
| Plausible Deniability | uskottava kiistettävyys | noun, lowercase · ⚠️ NOT Title Case · en.wikipedia.org/wiki/Plausible_deniability. |
| Biometrics | biometriikka / biometriset tiedot | noun, lowercase · short / full. |
| Passcode | pääsykoodi | noun · ⚠️ NOT `salasana` (= password). Distinct device-unlock term. |
| **_Backup, import & UX_** | | |
| Backup | varmuuskopio / varmuuskopioi | noun / verb · Bitcoin Core fi (`Varmuuskopioi lompakko`). |
| Restore | palauta / palautus | verb / noun · Bitcoin Core fi (`Palauta ja siirrä lompakko`). |
| Import | tuo / tuonti | verb / noun · Bitcoin Core fi |
| Voucher | kuponki | noun, lowercase. |
| Redeem | lunasta / lunastus | verb / noun · ⚠️ NOT "buy to wallet". |
| Send | lähetä | verb · Bitcoin Core fi |
| Receive | vastaanota | verb · Zeus fi |
| Settings | asetukset | noun, lowercase. |
| Confirm | vahvista / vahvistus | verb / noun. |
| QR Code | QR-koodi | noun · Bitcoin Core fi (`QR koodit`). |
| Clipboard | leikepöytä | noun, lowercase · Bitcoin Core fi |
| Memo | muistio / muistiinpano | noun, lowercase · Zeus fi (`muistiota`). |
| Description | kuvaus / selite | noun, lowercase · mainstream / shipped. |
| Label | nimike / merkintä | noun, lowercase · Bitcoin Core fi (`Nimike`) / Zeus fi (`Merkintä`). Replace shipped `Etiketti`. |
