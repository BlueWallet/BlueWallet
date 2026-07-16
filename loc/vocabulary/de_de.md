# German translation vocabulary (`de_de.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · de.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand · de.wikipedia.org/wiki/Lightning_Network |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | Bitcoin / BTC | noun unit + ticker; `Bitcoin` capitalised as German noun · de.wikipedia.org/wiki/Bitcoin |
| sats | sats | noun, lowercase; English unit retained · Bitcoin Core de |
| sat/vByte | sat/vByte / Satoshi pro vByte | technical unit · compact / explanatory (shipped uses long form). |
| vByte | vByte | technical unit; SegWit-discounted size. |
| **_Wallet, keys & seeds_** | | |
| Wallet | Wallet | noun · English loanword dominant in German crypto UI; `Geldbörse` (dictionary form) reads forced and is avoided · Phoenix de + Trezor de + Electrum de |
| Vault | Tresor / Vault | noun · native `Tresor` preferred per master; brand-style "Vault" acceptable in product contexts. |
| Watch-only | watch-only / Watch-only-Wallet | adj · English loanword retained; short / explanatory compound · ⚠️ NOT `Lesemodus` — it is a wallet type · Phoenix de + Trezor de |
| Hardware wallet | Hardware Wallet | noun · English loanword, two words (no hyphen) · Trezor de + Ledger de |
| Seed | Seed | noun · English loanword; `Wiederherstellungsphrase` reads forced and is avoided · Phoenix de + Trezor de |
| Mnemonic | Mnemonic / Seed | noun · English loanword retained; treated as a synonym of `Seed` · Phoenix de |
| Passphrase | Passphrase | noun · ⚠️ NOT `Passwort` (= password) / NOT `Passcode` (= device code) · Bitcoin Core de + Trezor de |
| Public key | öffentlicher Schlüssel | noun, lowercase adjective · Bitcoin Core de |
| Private key | privater Schlüssel | noun, lowercase adjective · Bitcoin Core de + Electrum de |
| WIF | WIF | acronym · gloss: Wallet Import Format. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | Descriptor / Deskriptor | noun · English loanword preferred; `Deskriptor` is the Germanised form · Green de keeps Latin "Descriptor" |
| Derivation path | Derivation Path / Ableitungspfad | noun · English loanword preferred; Germanised form retained as fallback because shipped strings already use it widely |
| Master fingerprint | Master-Fingerabdruck / Master Fingerprint | noun · native compound preferred; English loanword acceptable in technical contexts · Trezor de + Ledger de |
| BIP38 | BIP38 | acronym kept · gloss: passwortgeschützter privater Schlüssel. ⚠️ NOT a verb / NOT just "Passwort". |
| **_On-chain transactions_** | | |
| Transaction | Transaktion | noun · Bitcoin Core de |
| Address | Adresse | noun · Bitcoin Core de |
| Input | Eingang / Eingabe | ⚠️ NOT Eingang-as-entrance / NOT Login · noun · short / canonical · shipped `details_inputs` uses `Eingänge` · Bitcoin Core de + Electrum de |
| Output | Ausgang / Ausgabe | noun · short / canonical · shipped `details_outputs` uses `Ausgänge` · ⚠️ NOT recipient label "An:" · Bitcoin Core de |
| UTXO | UTXO | acronym · gloss: nicht ausgegebener Transaktionsausgang. |
| Change | Wechselgeld / Wechselgeldadresse | noun · ⚠️ NOT verb `ändern`; coin-change noun. `Wechselgeldadresse` for change-address field · Bitcoin Core de + Bisq de |
| Hex | Hex / Hexadezimal | noun · compact / explanatory · ⚠️ NOT "Hash" / NOT "Rohtransaktion" · Bitcoin Core de + Electrum de |
| Pending | ausstehend | adj/state · Bitcoin Core de + Electrum de |
| Unconfirmed | unbestätigt | adj · Bitcoin Core de |
| Confirmed | bestätigt | adj · Bitcoin Core de |
| Mempool | Mempool | noun · loanword retained · Bitcoin Core de + Electrum de |
| Broadcast | Broadcast / broadcasten | noun / verb · English loanword preferred; `übertragen` retained only in shipped phrasings already using it |
| Block explorer | Block Explorer | noun · English loanword, two words (no hyphen) · Mempool.space de |
| Onchain | Onchain / On-Chain | adj · compact (chip) / hyphenated (body) · Electrum de |
| Offchain | Offchain / Off-Chain | adj · compact (chip) / hyphenated (body) · Electrum de |
| **_Fees & fee bumping_** | | |
| Fee | Gebühr | noun · Bitcoin Core de + Electrum de |
| Fee Bump | Gebührenerhöhung / Gebühr erhöhen | noun / verb · shipped string is more verbose (`Erhöhung TRX-Gebühr nach Senden erlauben`) · Bitcoin Core de + Electrum de |
| RBF | RBF | acronym · gloss: Replace-by-Fee · Bitcoin Core de + Electrum de |
| CPFP | CPFP | acronym · gloss: Child-pays-for-parent · ⚠️ NOT a verb. |
| Speed Up | beschleunigen | verb · UI button label for RBF · Electrum de + Trezor de |
| **_Lightning_** | | |
| Invoice | Rechnung / Zahlungsanforderung | noun · technical / mainstream · Bitcoin Core de + Electrum de + Phoenix de + Zeus de |
| Lightning Invoice | Lightning-Rechnung / Lightning-Zahlungsanforderung | noun, hyphenated compound · technical / mainstream · Phoenix de + Electrum de |
| Preimage | Pre-image | noun · English loanword preferred; `Urbild` (math term) is avoided in UI · Phoenix de |
| Payment | Zahlung | noun · ⚠️ NOT verb `Zahlen` · Bitcoin Core de + Phoenix de |
| Expired | abgelaufen | adj/state · ⚠️ NOT verb form · Bitcoin Core de + Electrum de |
| **_Multisig & advanced addressing_** | | |
| Multisig | Multisig | noun · English loanword retained; `Mehrfachsignatur` / `Multisignatur` avoided · Electrum de + Sparrow de |
| Multisig Vault | Multisignatur Tresor / Multisig Vault | noun · native compound preferred per master; brand-style acceptable. |
| Co-signer | Mitsignierer / Mitunterzeichner | noun · BlueWallet UI / Electrum de · ⚠️ NOT `Miteigentümer` (co-owner). |
| Quorum | Quorum / Signaturschwelle | noun · canonical / UI-clear · shipped uses `signaturfähig` (approximation) · Bitcoin Core de + Electrum de |
| PSBT | PSBT | acronym · gloss: partiell signierte Bitcoin-Transaktion (BIP174). |
| Provide signature | Signatur bereitstellen / Transaktion signieren | verb · generic / specific · ⚠️ NOT `Schlüssel eingeben` (= enter key) · Bitcoin Core de + Electrum de |
| BIP47 / Payment Code | BIP47 / Zahlungscode | acronym kept; `Payment Code` rendered native `Zahlungscode` per master. |
| Notification transaction | Benachrichtigungstransaktion | noun · BIP47-specific 0-value tx · shipped uses this compound. |
| SilentPayment | Silent Payments / stille Zahlungen | protocol name kept English (plural); explanatory `stille Zahlungen` if needed. |
| **_Coin control_** | | |
| Coin Control | Münzkontrolle / Coin Control | noun · native compound preferred per master; loanword acceptable in technical contexts · Electrum de + Zeus de |
| Frozen | eingefroren | adj/state · ⚠️ NOT verb `einfrieren` · Bitcoin Core de + Zeus de |
| **_Security & storage_** | | |
| Encrypted storage | Speicherverschlüsselung | noun, single compound (avoid `verschlüsselte Speicherung`) · shipped `settings.encrypt_storage_explanation_headline` |
| Plausible Deniability | glaubhafte Abstreitbarkeit / glaubhafte Täuschung | ⚠️ NOT Täuschung-as-deception · noun · canonical (matches Wikipedia de) / UI-friendly secondary · shipped uses `Glaubhafte Täuschung` · de.wikipedia.org/wiki/Plausible_Deniability |
| Biometrics | Biometrie | noun · shipped `settings.biometrics` + Trezor de + Zeus de |
| Passcode | Gerätepasscode / Gerätecode | noun · ⚠️ NOT `Passwort` (= app password); device-level code · shipped `settings.biometrics_fail` uses `Gerätepasscode` · Green de + Trezor de |
| **_Backup, import & UX_** | | |
| Backup | Backup / sichern | noun / verb · loanword `Backup` dominant; verb form `sichern` · Bitcoin Core de + Electrum de + Phoenix de |
| Restore | wiederherstellen / Wiederherstellung | verb / noun · Bitcoin Core de + Electrum de |
| Import | importieren / Import | verb / noun · Bitcoin Core de |
| Voucher | Gutschein | noun · shipped `azteco.codeIs` + Zeus de + Cake de |
| Redeem | einlösen | verb · ⚠️ NOT `kaufen` (buy) · activate/cash-in · shipped `azteco.redeemButton` + Zeus de + Cake de |
| Send | senden | verb · Bitcoin Core de uses `Überweisen`; shipped + Electrum + Phoenix use `senden` |
| Receive | empfangen | verb · ⚠️ shipped `receive.header` uses `Erhalten` (passive); prefer `empfangen` (active) · Bitcoin Core de + Electrum de + Phoenix de |
| Settings | Einstellungen | noun · Bitcoin Core de + Electrum de |
| Confirm | bestätigen / Bestätigung | verb / noun · plural noun `Bestätigungen` for on-chain confirmations · Bitcoin Core de |
| QR Code | QR-Code | noun, hyphenated · Bitcoin Core de + Electrum de |
| Clipboard | Zwischenablage | noun · Bitcoin Core de + Electrum de |
| Memo | Notiz | noun · shipped `send.create_memo` + Phoenix de |
| Description | Beschreibung | noun · Bitcoin Core de + Electrum de |
| Label | Bezeichnung / Etikett | noun · shipped uses `Bezeichnung`; Phoenix de `Etikett` · Bitcoin Core de |
