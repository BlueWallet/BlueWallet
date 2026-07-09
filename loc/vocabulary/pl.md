# Polish translation vocabulary (`pl.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · pl.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand · pl.wikipedia.org/wiki/Lightning_Network |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker · pl.wikipedia.org/wiki/Bitcoin (capital `Bitcoin` for network, lowercase `bitcoin` for the unit). |
| sats | satoshi | noun, lowercase · pl.wikipedia.org/wiki/Bitcoin |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. |
| vByte | vByte | technical unit; Latin kept. |
| **_Wallet, keys & seeds_** | | |
| Wallet | portfel | noun, lowercase. |
| Vault | skarbiec | noun · ⚠️ NOT Latin "Vault"; `skarbiec` = strongbox/safe · matches shipped `multisig_vault` "Skarbiec wielopodpisowy". |
| Watch-only | tylko do odczytu / portfel tylko do odczytu | adj · short / full · Bitcoin Core pl + Zeus pl + Cake pl |
| Hardware wallet | portfel sprzętowy | noun, lowercase · Bitcoin Core pl + Cake pl + Bisq pl |
| Seed | seed / fraza odzyskiwania | noun · technical / mainstream; shipped UI uses `Seed`/`fraza seed`. |
| Mnemonic | fraza mnemoniczna / fraza seed | noun · technical / mainstream · Cake pl. |
| Passphrase | fraza dostępu | noun · ⚠️ NOT `Hasło` (= password) · distinct word required. No consistent upstream: Electrum pl mixes `tekst szyfrujący` and `hasła`; Bitcoin Core pl uses `hasło` (conflates with password); no Trezor pl exists. `fraza dostępu` kept as clearest distinct term. |
| Public key | klucz publiczny | noun, lowercase. |
| Private key | klucz prywatny | noun, lowercase. |
| WIF | WIF | acronym · gloss: format importu portfela. |
| xpub | xpub | acronym, lowercase preferred (shipped string uses `XPUB`). |
| Descriptor | deskryptor | noun, lowercase · Bitcoin Core pl + Bisq pl |
| Derivation path | ścieżka derywacji / ścieżka pochodna | noun · technical / Bitcoin Core form · Bisq pl + Bitcoin Core pl |
| Master fingerprint | główny odcisk palca / odcisk palca klucza głównego | noun, lowercase · short / explanatory · Bitcoin Core pl + Bisq pl + Zeus pl |
| BIP38 | BIP38 | acronym kept · gloss: zaszyfrowany hasłem klucz prywatny. |
| **_On-chain transactions_** | | |
| Transaction | transakcja | noun, lowercase. |
| Address | adres | noun, lowercase · Bitcoin Core pl + Bisq pl |
| Input | wejście / wejście transakcji | noun · short / full · Bitcoin Core pl + Electrum pl + Bisq pl. Shipped UI plural: `Wejścia`. |
| Output | wyjście / wyjście transakcji | noun · short / full · ⚠️ NOT the UI recipient label "Do:" · Bitcoin Core pl + Electrum pl + Bisq pl. Shipped UI plural: `Wyjścia`. |
| UTXO | UTXO | acronym · gloss: niewydane wyjście transakcji. |
| Change | reszta / adres reszty | noun · ⚠️ NOT verb "zmienić" · `reszta` = leftover output; `adres reszty` for change-address field · Bitcoin Core pl + Electrum pl + Bisq pl + Cake pl |
| Hex | hex / postać szesnastkowa | noun · short / explanatory · ⚠️ NOT "hash" / NOT "dane transakcji" · Bitcoin Core pl + Bisq pl |
| Pending | oczekująca / w toku | adj/state · feminine-agreement / Bitcoin Core form · Bitcoin Core pl |
| Unconfirmed | niepotwierdzona / niepotwierdzone | adj · feminine / neuter agreement · Bitcoin Core pl + Bisq pl |
| Confirmed | potwierdzona / potwierdzone | adj · feminine / neuter agreement · Bitcoin Core pl + Bisq pl |
| Mempool | mempool | noun, lowercase · Bitcoin Core pl + Electrum pl + Bisq pl |
| Broadcast | rozgłoś / rozgłoszenie | verb / noun · UI button vs status · Bitcoin Core pl. Shipped UI: `Rozgłoś` button, `Rozgłoszenie` status. |
| Block explorer | eksplorator bloków | noun, lowercase. |
| Onchain | onchain / w łańcuchu bloków | adj · compact (chip) / explanatory (body) · shipped UI: `on-chain` form also used. |
| Offchain | offchain / poza łańcuchem bloków | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | opłata | noun, lowercase · Bitcoin Core pl + Bisq pl + Zeus pl |
| Fee Bump | zwiększenie opłaty | noun · shipped UI label `Zezwól na zwiększanie opłat` keeps verb-phrase form for the toggle. |
| RBF | RBF | acronym · gloss: zastąpienie opłatą / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: dziecko płaci za rodzica · ⚠️ NOT a verb. |
| Speed Up | zwiększ opłatę / przyspiesz | verb · UI-clear / generic. |
| **_Lightning_** | | |
| Invoice | faktura | noun · Bitcoin Core pl + Zeus pl + Cake pl. |
| Lightning Invoice | faktura Lightning | noun · brand `Lightning` + localised noun · shipped UI uses `Faktura Lightning`. |
| Preimage | preimage / obraz pierwotny | noun · technical / explanatory · shipped UI uses `Obraz pierwotny`; Zeus pl keeps `Preimage`. |
| Payment | płatność | noun · ⚠️ NOT verb "Zapłać" · Bitcoin Core pl + Cake pl + Zeus pl |
| Expired | przeterminowana / wygasła | adj · feminine-agreement state forms · ⚠️ NOT verb · Bisq pl + Cake pl |
| **_Multisig & advanced addressing_** | | |
| Co-signer | współsygnatariusz / współpodpisujący | noun · ⚠️ NOT "współwłaściciel" (co-owner) · Bitcoin Core pl + Bisq pl. Shipped UI uses `współsygnatariusz`. |
| Quorum | kworum / próg podpisów | noun · canonical / UI-clear · Bitcoin Core pl |
| PSBT | PSBT | acronym · gloss: częściowo podpisana transakcja Bitcoin. |
| Provide signature | podaj podpis / podpisz transakcję | verb · generic / specific. Shipped UI: `Podaj podpis`. |
| BIP47 / Payment Code | BIP47 / kod płatności | acronym kept; "Payment Code" → "kod płatności" · shipped UI uses `Kod płatności`. |
| Notification transaction | transakcja powiadomienia | noun · BIP47-specific · shipped UI uses this form. |
| SilentPayment | Silent Payments / ciche płatności | protocol name kept English (plural); explanatory `ciche płatności` if needed · shipped UI uses `SilentPayment`. |
| **_Coin control_** | | |
| Coin Control | kontrola UTXO / kontrola monet | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case · Bitcoin Core pl + Electrum pl + Bisq pl. |
| Frozen | zamrożona / zamrożone | adj · feminine / neuter agreement · ⚠️ NOT verb "zamrozić" · Electrum pl + Bisq pl + Cake pl |
| **_Security & storage_** | | |
| Encrypted storage | zaszyfrowane dane / szyfrowanie danych | noun, lowercase · ⚠️ NOT Title Case · shipped UI uses `Włącz szyfrowanie danych` for the toggle. |
| Plausible Deniability | wiarygodna zaprzeczalność / wiarygodne zaprzeczenie | noun, lowercase · ⚠️ NOT Title Case · shipped UI uses `Wiarygodna zaprzeczalność`. |
| Biometrics | biometria | noun, lowercase · Zeus pl. |
| Passcode | kod dostępu | noun · ⚠️ NOT `Hasło` (= password) · distinct word; shipped UI consistent. |
| **_Backup, import & UX_** | | |
| Backup | kopia zapasowa / wykonaj kopię zapasową | noun / verb · Bitcoin Core pl + Electrum pl + Bisq pl. Shipped UI: `Eksport/Kopia zapasowa`. |
| Restore | przywróć / przywracanie | verb / noun · Bitcoin Core pl + Electrum pl + Zeus pl. Shipped UI uses `odtworzyć` for the verb. |
| Import | importuj / import | verb / noun · Electrum pl + Bisq pl. |
| Voucher | voucher | noun, lowercase · shipped UI consistent. |
| Redeem | zrealizuj / aktywuj | verb · ⚠️ NOT "Kup" / NOT "Przelej" · activate/cash-in sense · Cake pl · shipped uses "Odbierz" — drift, see vocabulary.md TODOs |
| Send | wyślij | verb · Electrum pl + Bisq pl + Zeus pl. |
| Receive | odbierz / otrzymaj | verb · Electrum pl + Bisq pl uses `Odbierz`; shipped UI uses `Otrzymaj`. |
| Settings | ustawienia | noun, lowercase. |
| Confirm | potwierdź / potwierdzenie | verb / noun · also "confirmations" = block-count noun. |
| QR Code | kod QR | noun, lowercase · Bitcoin Core pl + Bisq pl |
| Clipboard | schowek | noun, lowercase · Electrum pl + Bisq pl. |
| Memo | notatka | noun, lowercase · Bisq pl. |
| Description | opis | noun, lowercase · Electrum pl + Bisq pl + Zeus pl |
| Label | etykieta | noun, lowercase · Bitcoin Core pl + Electrum pl + Bisq pl. |
