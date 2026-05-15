# Belarusian (Taraškievica) translation vocabulary (`be@tarask.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | — |
| Lightning | Lightning | brand — kept Latin · be-tarask.wikipedia.org has no Lightning Network article. |
| Electrum | Electrum | brand — kept Latin. |
| LNDhub | LNDhub | brand — kept Latin. |
| LND | LND | brand — kept Latin. |
| LNURL | LNURL | acronym — letters kept. |
| Tor | Tor | brand — kept Latin · be-tarask.wikipedia.org has no Tor (network) article. |
| Orbot | Orbot | brand — kept Latin. |
| GroundControl | GroundControl | brand — kept Latin. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | unit — lowercase `bitcoin`, uppercase `BTC` per glossary. |
| sats | sats | lowercase per glossary. |
| sat/vByte | sat/vByte | casing kept per glossary. |
| vByte | vByte | casing kept per glossary. |
| **_Wallet, keys & seeds_** | | |
| Wallet | кашалёк | shipped value; Bitcoin Core be / be-tarask.wikipedia.org/wiki/Біткойн use `гаманец` — both valid Belarusian, кашалёк is more colloquial. |
| Vault | сэйф | "safe / strongbox" — Tarask `э`. Vault is NOT a brand per glossary. |
| Watch-only | толькі для прагляду | ⚠️ NOT "view mode" — specifically a wallet type. |
| Hardware wallet | апаратны кашалёк | matches shipped Wallet=кашалёк · technical phrase, target-locale lowercase. |
| Seed | Сід-фраза / фраза-аднаўленьня | technical / mainstream · established crypto loanword `Сід-фраза` (shipped via locsync31 cleanup); фраза-аднаўленьня = recovery phrase (Tarask `-ньне` suffix) · ⚠️ NOT `семя` (biological seed/semen — wrong register). |
| Mnemonic | мнэмоніка / фраза-аднаўленьня | technical / mainstream · be-tarask.wikipedia.org spelling `мнэмоніка` (Tarask `э`); фраза-аднаўленьня = recovery phrase (Tarask `-ньне` suffix). |
| Passphrase | кодавая фраза | ⚠️ NOT "password" (пароль) and NOT device passcode · Bitcoin Core be uses `Кодавая фраза`. |
| Public key | публічны ключ | target-locale lowercase. |
| Private key | прыватны ключ | target-locale lowercase · Bitcoin Core be uses `Прыватныя ключы`. |
| WIF | WIF | acronym — letters kept (Wallet Import Format). |
| xpub | xpub | acronym — lowercase per glossary. |
| Descriptor | дэскрыптар | Tarask `э`; output descriptor. |
| Derivation path | шлях дэрывацыі | technical phrase; Tarask `э`. |
| Master fingerprint | майстар-адбітак | "master fingerprint"; Tarask `майстар` (vs regular `майстер`). |
| BIP38 | BIP38 | acronym — letters kept · ⚠️ NOT a verb / NOT "password". |
| **_On-chain transactions_** | | |
| Transaction | трансакцыя | Tarask form (per shipped `трансляцыі`-style spelling with `с`) · Electrum be_BY uses `Трансакцыя`; Bitcoin Core be uses `Транзакцыя`. Tarask convention prefers `трансакцыя`. |
| Address | адрас | target-locale lowercase · Bitcoin Core be, Electrum be_BY both use `Адрас` · be-tarask.wikipedia.org/wiki/Біткойн uses `адрас`. |
| Input | уваход / уваход трансакцыі | ⚠️ NOT "login / entrance" — tx input. Pair short/full forms per glossary rule. |
| Output | выхад / выхад трансакцыі | ⚠️ NOT the UI label "To:" — tx output noun. |
| UTXO | UTXO | acronym — letters kept (Unspent Transaction Output). |
| Change | рэшта | ⚠️ NOT the verb "to change/modify" — must be the noun "leftover/change-output". Tarask `э`. |
| Hex | hex / шаснаццатковы | short / explanatory · ⚠️ NOT "hash" and NOT "transaction data". |
| Pending | у чаканьні | adjective/state form; Tarask `-ньні` suffix · ⚠️ NOT noun "expectation". |
| Unconfirmed | непацьверджаная | adjective/state form; Tarask `пацьв-` (soft sign) · Electrum be_BY uses `Непацверджана` (regular spelling). |
| Confirmed | пацьверджаная | adjective/state form; Tarask `пацьв-` · Electrum be_BY uses `Пацверджана`. |
| Mempool | mempool | technical term — typically kept Latin in Slavic locales. |
| Broadcast | трансляцыя / транслюваць | shipped noun; verb form `транслюваць` for button labels (noun / verb per glossary). |
| Block explorer | аглядальнік блёкаў | Tarask `блёк` (with `ё`) per be-tarask.wikipedia.org/wiki/Біткойн; `аглядальнік` = explorer/viewer. |
| Onchain | он-чэйн / у блёкчэйне | compact / explanatory · Tarask `блёк-` and `э`. |
| Offchain | оф-чэйн / па-за блёкчэйнам | compact / explanatory · Tarask `блёк-` and `э`. |
| **_Fees & fee bumping_** | | |
| Fee | камісія | Bitcoin Core be / Electrum be_BY use `Камісія` — target-locale lowercase here. |
| Fee Bump | павышэньне камісіі | Tarask `-ньне` suffix; "raising of fee" umbrella term for RBF + CPFP. |
| RBF | RBF | acronym — letters kept; gloss "замяніць па камісіі" available in Notes. |
| CPFP | CPFP | acronym — letters kept · ⚠️ NOT a verb like "Create". |
| Speed Up | паскорыць | verb form for tx detail button label (RBF action). |
| **_Lightning_** | | |
| Invoice | інвойс / рахунак | technical / mainstream · "інвойс" common in BY fintech; "рахунак" = bill/invoice noun. |
| Lightning Invoice | інвойс Lightning / рахунак Lightning | brand "Lightning" + localised noun. |
| Preimage | прообраз | math term (preimage of a hash function) · matches Slavic math vocabulary convention (ru/uk/be wikipedias use `прообраз` for math preimage). |
| Payment | плацёж | ⚠️ NOT the verb "to pay" (плаціць) — must be a noun. Tarask spelling preserves `ё`. |
| Expired | пратэрмінаваны / састарэлы | adj · ⚠️ shipped `Скончыўся` is past-tense verb ("ended") — should be adjective state form. Flag for fix. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | сападпісант | ⚠️ NOT "co-owner" (сууладальнік) — must be a signer noun. Tarask `сапа-` prefix. |
| Quorum | кворум / парог подпісаў | canonical / UI alternative (threshold of signatures). |
| PSBT | PSBT | acronym — letters kept (Partially Signed Bitcoin Transaction, BIP174). |
| Provide signature | падпісаць | verb: sign a PSBT. |
| BIP47 / Payment Code | BIP47 / плацежны код | acronym + translatable noun · "плацежны код" with Tarask `ё`-preserving stem. |
| Notification transaction | трансакцыя-паведамленьне | BIP47-specific 0-value notification tx · Tarask `-ньне` suffix on `паведамленьне` (notification). Preferred over `натыфікацыйная` (anglicism) per native Tarask preference. |
| SilentPayment | Silent Payments / ціхія плацяжы | brand kept English (note plural); explanatory Tarask gloss. |
| **_Coin control_** | | |
| Coin Control | кіраваньне UTXO / кіраваньне манэтамі | technical / mainstream · ⚠️ NOT Title Case · Tarask `-ньне` suffix, `э` in `манэта`. |
| Frozen | замарожаны | ⚠️ NOT the verb "to freeze" (замарозіць) — must be adjective/state form. |
| **_Security & storage_** | | |
| Encrypted storage | сховішча зашыфравана | shipped value · ⚠️ NOT Title Case · matches storage_is_encrypted in be@tarask.json. |
| Plausible Deniability | праўдападобнае адмаўленьне | Tarask `-ньне` suffix; ⚠️ NOT Title Case · matches en.wikipedia.org/wiki/Plausible_deniability concept. |
| Biometrics | біяметрыя | be-tarask.wikipedia.org spelling `Біяметрыя`. |
| Passcode | код доступу | ⚠️ NOT "password" (пароль) — distinct word for device unlock code. Shipped `пароль` collides with app password; flag for fix. |
| **_Backup, import & UX_** | | |
| Backup | рэзервовая копія / зрабіць рэзервовую копію | noun / verb · Electrum be_BY uses `Рэзервовая копія`. Tarask `э`. |
| Restore | аднавіць / аднаўленьне | verb / noun · Tarask `-ньне` suffix. |
| Import | імпартаваць / імпарт | verb / noun · Electrum be_BY uses `Імпарт`. |
| Voucher | ваўчар | shipped value (azteco.codeIs). |
| Redeem | перавесьці | shipped value (decapitalised); ⚠️ NOT "buy to wallet" / NOT "transfer" — but shipped UI uses Tarask `перавесьці` (lit. "transfer"). Acceptable as locale's "cash in" rendering. |
| Send | даслаць | shipped JSON uses `daslac`-style for "send" elsewhere · Electrum be_BY `Даслаць`. |
| Receive | атрымаць | Electrum be_BY uses `Атрымаць`. |
| Settings | налады | Tarask form (vs Bitcoin Core be `Наладкі`). |
| Confirm | пацьвердзіць / пацьверджаньне | verb / noun · Tarask `пацьв-` (soft sign) and `-ньне` suffix. |
| QR Code | QR-код | be-tarask.wikipedia.org/wiki/QR-код form. |
| Clipboard | буфер абмену | shipped value (decapitalised per target-locale lowercase). |
| Memo | нататка | sender note on outgoing tx; ⚠️ NOT "remember" verb. |
| Description | апісаньне | free-text label on receive invoice; Tarask `-ньне` suffix. |
| Label | метка / цэтлік | label noun · Bitcoin Core be / Electrum be_BY use `Метка` / `Адмеціны`. |
