# Russian translation vocabulary (`ru.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / биткойн | brand kept Latin; `биткойн` in explanatory text · ⚠️ when compounding with Cyrillic noun, use hyphen: `Bitcoin-кошелёк`, NOT `Bitcoin кошелёк` · ru.wikipedia.org/wiki/Биткойн |
| Lightning | Lightning | brand · ⚠️ when compounding with Cyrillic noun, use hyphen: `Lightning-кошелёк`, NOT `Lightning кошелёк` · ru.wikipedia.org/wiki/Lightning_Network |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand · Electrum ru keeps as-is. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | биткойн / BTC | noun unit + ticker · ru.wikipedia.org/wiki/Биткойн |
| sats / satoshis | сатоши | noun, lowercase, plural-invariant · ru.wikipedia.org/wiki/Биткойн |
| sat/vByte | sat/vByte / сат/вБайт | technical unit; Latin form in chips, Cyrillic abbrev in body text (both shipped in `ru.json`). |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | кошелёк | noun, lowercase · Electrum ru + Bitcoin Core ru |
| Vault | сейф / хранилище | noun; `сейф` for safe/strongbox sense; `хранилище` used in shipped `multisig.multisig_vault`. Avoid Latin "Vault". |
| Watch-only | только для просмотра | ⚠️ NOT "режим просмотра" · adj · Electrum ru + Bitcoin Core ru. |
| Hardware wallet | аппаратный кошелёк | noun, lowercase · Trezor ru |
| Seed | сид-фраза / фраза восстановления | noun · technical / mainstream. |
| Mnemonic | мнемоническая фраза / фраза восстановления | noun · technical / mainstream · Electrum ru |
| Passphrase | кодовая фраза | noun · ⚠️ NOT "пароль" (= password) · Electrum ru + Trezor ru |
| Public key | публичный ключ | noun, lowercase · Electrum ru + Cake ru |
| Private key | приватный ключ / закрытый ключ | noun, lowercase · `приватный` mainstream / `закрытый` Bitcoin-Core-style · Electrum ru |
| WIF | WIF | acronym · gloss: формат импорта кошелька. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | дескриптор | noun, lowercase · Bitcoin Core ru |
| Derivation path | путь деривации / путь вывода | noun · transliterated / canonical · Electrum ru |
| Master fingerprint | отпечаток мастер-ключа / мастер-отпечаток | noun, lowercase · Electrum ru |
| BIP38 | BIP38 | acronym kept · gloss: пароль BIP38 для расшифрования приватного ключа. ⚠️ NOT a verb / NOT "пароль" alone. |
| **_On-chain transactions_** | | |
| Transaction | транзакция | noun, lowercase · Electrum ru + Bitcoin Core ru |
| Address | адрес | noun, lowercase · Electrum ru + Bitcoin Core ru |
| Input | вход / вход транзакции | noun · short / full · Bitcoin Core ru |
| Output | выход / выход транзакции | noun · short / full · ⚠️ NOT "Кому" (that's UI recipient label). |
| UTXO | UTXO | acronym · gloss: непотраченный выход транзакции. |
| Change | сдача / адрес сдачи | noun · ⚠️ NOT verb "изменить". `сдача` = leftover coin; `адрес сдачи` for change-address field · Electrum ru + Bitcoin Core ru |
| Hex | hex / hex-данные | noun · short / explanatory · ⚠️ NOT "hash" / NOT "данные транзакции". Shipped `HEX` (uppercase) in some strings — body text uses lowercase. |
| Pending | в процессе / в ожидании | adj/state · button vs body · Electrum ru. Avoid noun "ожидание". |
| Unconfirmed | неподтверждённая / не подтверждено | adj · feminine-agreement / state form · Electrum ru |
| Confirmed | подтверждена / подтверждено | adj · feminine-agreement / state form · Bitcoin Core ru |
| Mempool | мемпул | noun, lowercase · Electrum ru |
| Broadcast | отправить в сеть / транслировать | verb · UI-clear / technical. Noun form: передача / трансляция. |
| Block explorer | блокчейн-обозреватель / обозреватель блоков | noun, lowercase · shipped form / Electrum-ru form |
| Onchain | он-чейн / в цепочке | adj · compact (chip) / explanatory (body) — shipped uses `В цепочке`. |
| Offchain | оф-чейн / вне цепочки | adj · compact (chip) / explanatory (body) — shipped uses `Вне цепочки`. |
| **_Fees & fee bumping_** | | |
| Fee | комиссия | noun, lowercase · Electrum ru + Bitcoin Core ru + Bisq ru |
| Fee Bump | повышение комиссии | noun · shipped `Разрешить повышение комиссии`. |
| RBF | RBF | acronym · gloss: replace-by-fee / замена по комиссии. |
| CPFP | CPFP | acronym · gloss: потомок платит за родителя · Electrum ru. ⚠️ NOT a verb "Создать". |
| Speed Up | ускорить / повысить комиссию | verb · short / explanatory. Shipped: `Повысить комиссию (RBF)`. |
| **_Lightning_** | | |
| Invoice | инвойс / счёт | noun · technical / mainstream · Zeus ru. |
| Lightning Invoice | Lightning инвойс / инвойс Lightning | noun · brand stays English; word order varies in shipped strings. |
| Preimage | прообраз / преимидж | noun · math term / transliteration · Electrum ru uses `прообраз`. Shipped: `Преимидж`. |
| Payment | платёж | noun · ⚠️ NOT verb "оплатить" · Electrum ru + Zeus ru |
| Expired | просрочен / срок действия истёк | adj · short / explanatory · Electrum ru |
| **_Multisig & advanced addressing_** | | |
| Co-signer | соподписант | noun, hyphenated · ⚠️ NOT "со-владелец" (co-owner) · Electrum ru |
| Quorum | кворум / порог подписей | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · gloss: частично подписанная Bitcoin-транзакция · Bitcoin Core ru. |
| Provide signature | предоставить подпись / подписать транзакцию | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / код оплаты | acronym kept; "Payment Code" → "код оплаты" (shipped `коды оплаты BIP47`). |
| Notification transaction | транзакция уведомления | noun · BIP47-specific (shipped). |
| SilentPayment | SilentPayment / тихие платежи | protocol name kept English (shipped as-is); optional explanatory `тихие платежи`. |
| **_Coin control_** | | |
| Coin Control | управление UTXO / управление монетами | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. Shipped: `Управление монетами`. |
| Frozen | заморожен / заморожено | adj · masc-agreement / state form · ⚠️ NOT verb "заморозить" · Electrum ru |
| **_Security & storage_** | | |
| Encrypted storage | шифрование хранилища / зашифрованное хранилище | noun, lowercase · process / state · ⚠️ NOT Title Case. |
| Plausible Deniability | двойное дно | noun, lowercase · idiomatic Russian for "hidden compartment"; not a literal calque. Shipped: `Двойное дно`. |
| Biometrics | биометрия | noun, lowercase. |
| Passcode | код устройства / код доступа | noun · device-level unlock · ⚠️ NOT "пароль" (= app password). |
| **_Backup, import & UX_** | | |
| Backup | резервная копия / резервное копирование | noun / verbal-noun · Electrum ru + Bisq ru |
| Restore | восстановить / восстановление | verb / noun · Electrum ru + Bitcoin Core ru |
| Import | импортировать / импорт | verb / noun · Bitcoin Core ru |
| Voucher | ваучер | noun, lowercase. Azte.co context. |
| Redeem | активировать / зачислить | verb · ⚠️ NOT "купить" / NOT "перевести". Shipped uses both: `Активировать` (button) and `Зачислить на кошелёк`. |
| Send | отправить | verb · Electrum ru + Bitcoin Core ru + Zeus ru |
| Receive | получить | verb · Electrum ru + Bitcoin Core ru |
| Settings | настройки | noun, lowercase · Bitcoin Core ru + Zeus ru |
| Confirm | подтвердить / подтверждение | verb / noun · Bitcoin Core ru |
| QR Code | QR-код | noun, hyphenated · Electrum ru + Cake ru |
| Clipboard | буфер обмена | noun, lowercase · Electrum ru |
| Memo | примечание / мемо | noun, lowercase · shipped / transliterated alt. |
| Description | описание | noun, lowercase · Electrum ru |
| Label | метка | noun, lowercase · Electrum ru + Bitcoin Core ru + Bisq ru |
