# Ukrainian translation vocabulary (`ua.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / Біткойн | brand kept Latin; Біткойн in explanatory text · uk.wikipedia.org/wiki/Біткойн |
| Lightning | Lightning | brand · uk.wikipedia.org/wiki/Lightning_Network |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand · Electrum uk keeps as-is. |
| Tor | Tor | brand · uk.wikipedia.org/wiki/Tor |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | біткойн / BTC | noun unit + ticker. |
| sats | сатоші | noun, lowercase. |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | гаманець | noun, lowercase. |
| Vault | сейф / сховище | noun; `сейф` for safe/strongbox sense. Avoid Latin "Vault". |
| Watch-only | лише для перегляду / тільки для перегляду | adj · Trezor uk + Green uk |
| Hardware wallet | апаратний гаманець | noun, lowercase · Trezor uk + Green uk |
| Seed | seed-фраза / фраза відновлення | noun; mainstream user-facing form preferred. |
| Mnemonic | мнемонічна фраза / фраза відновлення | noun · technical / mainstream. |
| Passphrase | кодова фраза | noun · ⚠️ distinct from `пароль` (password) · Electrum uk + Trezor uk |
| Public key | публічний ключ | noun, lowercase · Trezor uk + Zeus uk + Cake uk |
| Private key | приватний ключ | noun, lowercase. |
| WIF | WIF | acronym · Cake uk keeps. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | дескриптор | noun, lowercase · Zeus uk. |
| Derivation path | шлях деривації / шлях виведення | noun · canonical BIP32 / alt form · Electrum uk |
| Master fingerprint | відбиток майстер-ключа / відбиток головного ключа | noun · Zeus uk |
| BIP38 | BIP38 | acronym kept · gloss: пароль BIP38 / пароль для розшифрування BIP38. |
| **_On-chain transactions_** | | |
| Transaction | транзакція | noun, lowercase. |
| Address | адреса | noun, lowercase. |
| Input | вхід / вхід транзакції | noun · short / full · Electrum uk + Bitcoin Core uk |
| Output | вихід / вихід транзакції | noun · short / full · ⚠️ NOT "Кому" (that's UI recipient label). |
| UTXO | UTXO | acronym · gloss: невитрачений вихід транзакції. |
| Change | здача / адреса здачі | noun · ⚠️ NOT verb "змінити". `здача` = leftover coin; `адреса здачі` for change-address field. |
| Hex | hex-дані / шістнадцяткові дані | noun · short / explanatory · ⚠️ NOT "hash" / NOT "дані транзакції". |
| Pending | очікує / в очікуванні | adj/state · button vs body. Avoid "Очікування" (noun). |
| Unconfirmed | непідтверджено / непідтверджена | adj · state / feminine-agreement form · Electrum uk + Trezor uk |
| Confirmed | підтверджено / підтверджена | adj · state / feminine-agreement form · Electrum uk + Bitcoin Core uk |
| Mempool | мемпул | noun · Electrum uk |
| Broadcast | надіслати в мережу / транслювати | verb · UI-clear / technical. Noun form: трансляція. |
| Block explorer | оглядач блоків | noun, lowercase · Electrum uk |
| Onchain | он-чейн / у блокчейні | adj · compact (chip) / explanatory (body) |
| Offchain | оф-чейн / поза блокчейном | adj · compact (chip) / explanatory (body) |
| **_Fees & fee bumping_** | | |
| Fee | комісія | noun, lowercase. |
| Fee Bump | збільшення комісії | noun · Electrum uk |
| RBF | RBF | acronym · gloss: замінити за комісією / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: дочірня транзакція платить за батьківську. ⚠️ NOT "Створити". |
| Speed Up | прискорити | verb · Trezor uk |
| **_Lightning_** | | |
| Invoice | інвойс / рахунок | noun · technical / mainstream. |
| Lightning Invoice | інвойс Lightning / платіжний запит Lightning | noun · technical / mainstream. |
| Preimage | преімідж | noun · transliteration of English "preimage". |
| Payment | платіж | noun · ⚠️ NOT verb "Оплатити". |
| Expired | прострочено / термін дії закінчився | adj · short / explanatory. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | співпідписант | noun · ⚠️ NOT "співвласник" (co-owner). |
| Quorum | кворум / поріг підписів | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym. |
| Provide signature | надати підпис / підписати транзакцію | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / платіжний код | acronym kept; "Payment Code" → "платіжний код". |
| Notification transaction | транзакція сповіщення | noun · BIP47-specific. |
| SilentPayment | Silent Payments / тихі платежі | protocol name kept English (plural); explanatory `тихі платежі` if needed. |
| **_Coin control_** | | |
| Coin Control | керування UTXO / керування монетами | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. |
| Frozen | заморожено / заморожений | adj · state / masc-agreement · ⚠️ NOT verb "заморозити". |
| **_Security & storage_** | | |
| Encrypted storage | зашифроване сховище | noun, lowercase · ⚠️ NOT Title Case. |
| Plausible Deniability | правдоподібне заперечення / можливість правдоподібного заперечення | noun, lowercase · short / full. |
| Biometrics | біометрія | noun, lowercase. |
| Passcode | код доступу | noun · ⚠️ NOT "пароль" (= password). |
| **_Backup, import & UX_** | | |
| Backup | резервна копія / зробити резервну копію | noun / verb · Electrum uk + Bitcoin Core uk |
| Restore | відновити / відновлення | verb / noun · Bitcoin Core uk |
| Import | імпортувати / імпорт | verb / noun. |
| Voucher | ваучер | noun, lowercase. |
| Redeem | активувати / погасити | verb · ⚠️ NOT "Купити на гаманець". For vouchers prefer `активувати`. |
| Send | надіслати / відправити | verb. |
| Receive | отримати | verb. |
| Settings | налаштування | noun, lowercase. |
| Confirm | підтвердити / підтвердження | verb / noun. |
| QR Code | QR-код | noun · Electrum uk + Bitcoin Core uk |
| Clipboard | буфер обміну | noun, lowercase. |
| Memo | примітка / нотатка | noun, lowercase. |
| Description | опис | noun, lowercase · Electrum uk |
| Label | мітка / тег | noun, lowercase · Electrum uk |
