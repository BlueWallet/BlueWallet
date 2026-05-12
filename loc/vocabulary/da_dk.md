# Danish translation vocabulary (`da_dk.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · da.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand · ⚠️ NOT "Lightning" (shipped string conflates the two). |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker · da.wikipedia.org/wiki/Bitcoin |
| sats | sats / satoshi | noun, lowercase · da.wikipedia.org/wiki/Bitcoin uses "satoshi". |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | tegnebog / wallet | noun, lowercase · `tegnebog` per Bitcoin Core da + Electrum da_DK; `wallet` loanword ships in da_dk.json. |
| Vault | boks / hvælving | noun · "safe/strongbox" sense; avoid Latin "Vault" · `boks` (everyday) / `hvælving` (bank vault) per da.wikipedia "bankboks". |
| Watch-only | kun-kigge / kigge-tegnebog | adj · short / wallet-type · Bitcoin Core da ("kigge-tegnebøger") + Electrum da_DK ("kun kigge"). |
| Hardware wallet | hardwaretegnebog | noun, lowercase · Bitcoin Core da. |
| Seed | seed / gendannelsesfrase | noun · technical / mainstream · Electrum da_DK keeps "Seed"; mainstream form for recovery phrase. |
| Mnemonic | mnemonisk frase / gendannelsesfrase | noun · technical / mainstream. |
| Passphrase | adgangsfrase | noun · ⚠️ NOT "adgangskode" (= password). Bitcoin Core da conflates with "Adgangskode" — distinct word preferred to avoid collision with `settings.password`. |
| Public key | offentlig nøgle | noun, lowercase · Bitcoin Core da + Electrum da_DK. |
| Private key | privat nøgle | noun, lowercase · Bitcoin Core da + Electrum da_DK. |
| WIF | WIF | acronym · gloss: format til import af tegnebog. |
| xpub | xpub | acronym, lowercase preferred · ⚠️ known discrepancy: shipped JSON ships uppercase `XPUB` — vocabulary prefers lowercase `xpub`. |
| Descriptor | deskriptor | noun, lowercase · standard da transliteration; Danish tech literature uses `deskriptor`. |
| Derivation path | afledningssti | noun, lowercase · `afledning` is standard da math/CS term for derivation; `sti` = path. |
| Master fingerprint | hovednøgle-fingeraftryk | noun, lowercase. |
| BIP38 | BIP38 | acronym kept · ⚠️ NOT a verb · gloss: krypteret privat nøgle. |
| **_On-chain transactions_** | | |
| Transaction | transaktion | noun, lowercase · Bitcoin Core da ("Transaktion"); Electrum da_DK uses "Overførsel" but BlueWallet ships "Transaktion". |
| Address | adresse | noun, lowercase · Bitcoin Core da + Electrum da_DK. |
| Input | input | noun, lowercase · Bitcoin Core da keeps "Input"/"inputs". |
| Output | output | noun, lowercase · Bitcoin Core da keeps "output"/"outputs" · ⚠️ NOT "Til" (UI recipient label). |
| UTXO | UTXO | acronym · gloss: ubrugt transaktionsoutput. |
| Change | byttepenge | noun · Bitcoin Core da · ⚠️ NOT verb "skifte/ændre". |
| Hex | hex | noun, lowercase · shipped da_dk.json · ⚠️ NOT "hash". |
| Pending | afventende | adj/state · Bitcoin Core da. |
| Unconfirmed | ubekræftet | adj · Bitcoin Core da. |
| Confirmed | bekræftet | adj · Bitcoin Core da. |
| Mempool | mempool / hukommelsespulje | noun · loanword / Bitcoin Core da literal. |
| Broadcast | transmitter / rundsend | verb · BlueWallet ships "Transmitter"; Electrum da_DK uses "Rundsend". Bitcoin Core da: "transmitteret". |
| Block explorer | blokudforsker | noun, lowercase · Bitcoin Core da. |
| Onchain | on-chain / i blokkæden | adj · compact / explanatory. |
| Offchain | off-chain / uden for blokkæden | adj · compact / explanatory. |
| **_Fees & fee bumping_** | | |
| Fee | gebyr | noun, lowercase · Bitcoin Core da + Electrum da_DK. |
| Fee Bump | gebyrforøgelse | noun · Bitcoin Core da ("Bekræft gebyrforøgelse"). |
| RBF | RBF | acronym · gloss: erstat-med-gebyr · Bitcoin Core da ("Erstat-med-gebyr"). |
| CPFP | CPFP | acronym · gloss: barn-betaler-for-forælder · ⚠️ NOT a verb like "Opret". |
| Speed Up | fremskynd | verb (imperative) · standard da `fremskynde` (to expedite/speed up). |
| **_Lightning_** | | |
| Invoice | faktura / betalingsanmodning | noun · technical / mainstream. |
| Lightning Invoice | Lightning-faktura / Lightning-betalingsanmodning | noun · technical / mainstream. |
| Preimage | preimage / urbillede | noun · technical / math gloss. |
| Payment | betaling | noun · ⚠️ NOT verb "betale". |
| Expired | udløbet | adj · Electrum da_DK. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | medunderskriver | noun · ⚠️ NOT "medejer" (co-owner). |
| Quorum | kvorum / signaturtærskel | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · Bitcoin Core da keeps. |
| Provide signature | underskriv / lever underskrift | verb · short / explicit. |
| BIP47 / Payment Code | BIP47 / betalingskode | acronym kept; "Payment Code" → "betalingskode". |
| Notification transaction | underretningstransaktion | noun · BIP47-specific. |
| SilentPayment | Silent Payments / stille betalinger | protocol name kept English (plural); explanatory "stille betalinger" if needed. |
| **_Coin control_** | | |
| Coin Control | UTXO-håndtering / møntstyring | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. |
| Frozen | frosset | adj · ⚠️ NOT verb "fryse". |
| **_Security & storage_** | | |
| Encrypted storage | krypteret lager | noun, lowercase · shipped da_dk.json · ⚠️ NOT Title Case. |
| Plausible Deniability | sandsynlig benægtelse | noun, lowercase · shipped da_dk.json · ⚠️ NOT Title Case. |
| Biometrics | biometri | noun, lowercase. |
| Passcode | kode / enheds-PIN | noun · ⚠️ NOT "adgangskode" (= password) — shipped JSON conflates the two; use `kode` or `enheds-PIN` to disambiguate. |
| **_Backup, import & UX_** | | |
| Backup | sikkerhedskopi / backup | noun · Bitcoin Core da ("sikkerhedskopi"); shipped JSON uses loanword "backup". |
| Restore | gendan / gendannelse | verb / noun · Bitcoin Core da. |
| Import | importér / import | verb / noun · Electrum da_DK ("Importér"); shipped JSON: "Importer". |
| Voucher | værdibevis / voucher | noun · native-Danish / loanword · `værdibevis` is the standard da term for prepaid voucher; loanword `voucher` widely used. |
| Redeem | indløs / aktivér | verb · ⚠️ NOT "køb til tegnebog". |
| Send | send | verb · Bitcoin Core da + Electrum da_DK. |
| Receive | modtag | verb · Bitcoin Core da + Electrum da_DK. |
| Settings | indstillinger | noun, lowercase · shipped JSON; Bitcoin Core da also uses "indstillinger" (Electrum da_DK alt: "Opsætning"). |
| Confirm | bekræft / bekræftelse | verb / noun · Bitcoin Core da ("Bekræftelser" = confirmations). |
| QR Code | QR-kode | noun · Bitcoin Core da + Electrum da_DK (hyphenated). |
| Clipboard | udklipsholder | noun, lowercase · Bitcoin Core da + Electrum da_DK. |
| Memo | notat | noun, lowercase. |
| Description | beskrivelse | noun, lowercase · Electrum da_DK. |
| Label | mærkat / etiket | noun, lowercase · `mærkat` per Bitcoin Core da + Electrum da_DK; shipped JSON uses "Etiket". |
