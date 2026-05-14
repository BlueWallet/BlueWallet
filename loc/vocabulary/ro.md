# Romanian translation vocabulary (`ro.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / bitcoin | brand / unit · ro.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker · ro.wikipedia.org/wiki/Bitcoin |
| sats | sats / satoshi | compact / full · noun, lowercase · ticker kept Latin in ro.json `units.sats`. |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. Shipped `Satoshi per vByte` is the spelled-out form. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | portofel | noun, lowercase (singular). Plural `portofele` ships in list titles. |
| Vault | seif | noun · ro.json ships `Seif multisig`. ⚠️ NOT Latin "Vault". |
| Watch-only | doar citire / doar de văzut | adj · Bitcoin Core ro / Electrum ro. ⚠️ NOT a wallet noun. |
| Hardware wallet | portofel hardware | noun, lowercase · Bitcoin Core ro |
| Seed | seed / frază de recuperare | noun · technical / mainstream. ro.json ships `Seed`. |
| Mnemonic | frază mnemonică / frază de recuperare | noun, lowercase · technical / mainstream · Bitcoin Core ro |
| Passphrase | frază de acces | noun · ⚠️ distinct from `parolă` (password) · Bitcoin Core ro + Electrum ro |
| Public key | cheie publică | noun, lowercase · ro.wikipedia.org/wiki/Bitcoin |
| Private key | cheie privată | noun, lowercase · ro.wikipedia.org/wiki/Bitcoin |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. ro.json ships `XPUB`. |
| Descriptor | descriptor | noun, lowercase. |
| Derivation path | cale de derivare | noun, lowercase · ro.json ships `calea de derivare`. |
| Master fingerprint | amprentă principală | noun, lowercase · ro.json ships `Amprenta principală`. |
| BIP38 | BIP38 | acronym kept · gloss: parolă BIP38 pentru decriptare. |
| **_On-chain transactions_** | | |
| Transaction | tranzacție | noun, lowercase. |
| Address | adresă | noun, lowercase. |
| Input | intrare / intrare tranzacție | noun · short / full. ro.json currently keeps `Input` Latin. |
| Output | ieșire / ieșire tranzacție | noun · short / full. ⚠️ NOT "Către" (recipient UI label). ro.json currently keeps `Output` Latin. |
| UTXO | UTXO | acronym · gloss: ieșire de tranzacție necheltuită. |
| Change | rest / adresă de rest | noun · ⚠️ NOT verb "a schimba". `rest` = leftover; `adresă de rest` for change-address · ro.wikipedia.org/wiki/Bitcoin. ro.json ships `Schimb` (semantically wrong — should be `Rest`). |
| Hex | hex / date hex | noun · short / explanatory · ⚠️ NOT "hash". |
| Pending | în așteptare | adj/state · Avoid noun "așteptare" alone. |
| Unconfirmed | neconfirmată / neconfirmat | adj · fem / masc agreement form. |
| Confirmed | confirmată / confirmat | adj · fem / masc agreement · ⚠️ NOT `confirmări` (noun plural "confirmations") · ro.json `transactions.confirmations_lowercase` and adjective form must not collide. |
| Mempool | mempool | noun, lowercase · Bitcoin Core ro uses `Pool Memorie`; Electrum/community use `mempool`. |
| Broadcast | difuzează / difuzare | verb / noun · ro.json. |
| Block explorer | explorator de blocuri | noun, lowercase · ro.json keeps Latin `Block explorer`. |
| Onchain | on-chain / pe blockchain | adj · compact (chip) / explanatory (body). |
| Offchain | off-chain / în afara blockchainului | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | comision | noun, lowercase · Bitcoin Core ro + Electrum ro + ro.wikipedia.org/wiki/Bitcoin |
| Fee Bump | creșterea comisionului | noun · ro.json. |
| RBF | RBF | acronym · gloss: înlocuiește prin comision / Replace-By-Fee · ro.json `transactions.cancel_explain`. |
| CPFP | CPFP | acronym · gloss: copilul plătește pentru părinte · ro.json. ⚠️ NOT a verb. |
| Speed Up | accelerează / crește comisionul | verb · ro.json ships `Crește comisionul`. |
| **_Lightning_** | | |
| Invoice | factură | noun, lowercase · Electrum ro + ro.json. |
| Lightning Invoice | factură Lightning | noun · ro.json ships `Factură Lightning`. |
| Preimage | preimagine | noun · math sense (cf. `imagine`/`preimagine` in matematică ro). |
| Payment | plată | noun · ⚠️ NOT verb "a plăti" · Electrum ro. |
| Expired | expirat / expirată | adj · masc / fem · ro.json. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | cosemnatar | noun · ⚠️ NOT "coproprietar" · Electrum ro. |
| Quorum | cvorum / prag de semnături | noun · canonical / UI-clear · ro.json. |
| PSBT | PSBT | acronym. |
| Provide signature | furnizează semnătură / semnează tranzacția | verb · generic / specific · ro.json. |
| BIP47 / Payment Code | BIP47 / cod de plată | acronym kept; "Payment Code" → `cod de plată`. |
| Notification transaction | tranzacție de notificare | noun · BIP47-specific. |
| SilentPayment | Silent Payments / plăți silențioase | protocol name kept English (plural); explanatory `plăți silențioase` if needed. |
| **_Coin control_** | | |
| Coin Control | controlul UTXO-urilor / controlul monedelor | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. ro.json ships `Controlul monedelor`. |
| Frozen | înghețat / înghețată | adj · masc / fem · ⚠️ NOT verb "îngheață". ro.json `cc.freeze`/`cc.freezeLabel` ships verb `Îngheață` (button label OK; state should be `Înghețat`). |
| **_Security & storage_** | | |
| Encrypted storage | spațiu de stocare criptat | noun, lowercase · ⚠️ NOT Title Case · ro.json `_.storage_is_encrypted`. |
| Plausible Deniability | negare plauzibilă | noun, lowercase · ro.json. |
| Biometrics | biometrie | noun, lowercase · ro.json ships `Biometrici` (plural; standard form is `biometrie`). |
| Passcode | cod de acces | noun · ⚠️ NOT `parolă` (= password) · ro.json `settings.password` ships `Parolă` for the app password. |
| **_Backup, import & UX_** | | |
| Backup | copie de rezervă / export | noun · native / alt accepted (ro.json ships `Exportă/Backup`) · Electrum ro. Verb form: `face copie de rezervă`. |
| Restore | restaurează / restaurare | verb / noun · Electrum ro + Bitcoin Core ro. |
| Import | importă / import | verb / noun · ro.json. |
| Voucher | voucher | noun, lowercase · ro.json. |
| Redeem | revendică / activează | verb · ⚠️ NOT "cumpără" · ro.json ships `Revendică`. |
| Send | trimite | verb · ro.json. |
| Receive | primește | verb · ro.json. |
| Settings | setări | noun, lowercase · ro.json. |
| Confirm | confirmă / confirmare | verb / noun · ro.json. |
| QR Code | cod QR | noun · Bitcoin Core ro + Electrum ro. |
| Clipboard | clipboard | noun, lowercase · ro.json keeps Latin (no widespread native equivalent). |
| Memo | notă / memo | noun, lowercase · native / English-passthrough. ro.json ships `Memo`. |
| Description | descriere | noun, lowercase · ro.json. |
| Label | etichetă | noun, lowercase · Bitcoin Core ro + Electrum ro. |
