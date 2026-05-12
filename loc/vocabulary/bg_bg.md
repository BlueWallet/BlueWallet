# Bulgarian translation vocabulary (`bg_bg.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / биткойн | brand kept Latin; `биткойн` in explanatory text and as unit · bg.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand kept Latin · not covered by bg Wikipedia article. |
| Electrum | Electrum | brand kept Latin. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | биткойн / BTC | noun unit + ticker · bg.wikipedia.org/wiki/Bitcoin |
| sats | сатоши | noun, lowercase · plural sense. |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | портфейл | noun, lowercase. |
| Vault | сейф / хранилище | noun · `сейф` for safe/strongbox sense; avoid Latin "Vault". |
| Watch-only | само за наблюдение | adj · Electrum bg_BG. |
| Hardware wallet | хардуерен портфейл | noun, lowercase · Bitcoin Core bg. |
| Seed | сийд / фраза за възстановяване | noun · technical / mainstream · Electrum bg_BG (Сийд). |
| Mnemonic | мнемонична фраза / фраза за възстановяване | noun · technical / mainstream. |
| Passphrase | тайна фраза | noun · ⚠️ NOT `парола` (= password) · Electrum bg_BG. |
| Public key | публичен ключ | noun, lowercase · Electrum bg_BG. |
| Private key | частен ключ | noun, lowercase · Electrum bg_BG. |
| WIF | WIF | acronym · gloss: формат за импорт на портфейл. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | дескриптор | noun, lowercase. |
| Derivation path | път на деривация | noun, lowercase. |
| Master fingerprint | отпечатък на главния ключ | noun, lowercase. |
| BIP38 | BIP38 | acronym kept · gloss: парола BIP38. |
| **_On-chain transactions_** | | |
| Transaction | транзакция | noun, lowercase · Electrum bg_BG; variant `трансакция` exists. |
| Address | адрес | noun, lowercase · Bitcoin Core bg + Electrum bg_BG. |
| Input | вход / вход на транзакция | noun · short / full · Electrum bg_BG (Входове). |
| Output | изход / изход на транзакция | noun · short / full · ⚠️ NOT "До:" (recipient UI label). |
| UTXO | UTXO | acronym · gloss: неизразходван изход на транзакция. |
| Change | ресто / адрес за ресто | noun · ⚠️ NOT verb "промени"; `ресто` = leftover coin · Electrum bg_BG. |
| Hex | hex / шестнадесетични данни | noun · short / explanatory · ⚠️ NOT "hash". |
| Pending | в очакване | adj/state · Bitcoin Core bg · avoid noun "очакване". |
| Unconfirmed | непотвърдена | adj · feminine to agree with `транзакция` · Electrum bg_BG. |
| Confirmed | потвърдена / потвърдено | adj · feminine (за транзакция) / neuter (за плащане) · Bitcoin Core bg. |
| Mempool | мемпул / Mempool | noun · Cyrillic / Latin (per Electrum bg_BG). |
| Broadcast | излъчване / излъчи | noun / verb · Electrum bg_BG. |
| Block explorer | блок експлорър / блоков обозревател | noun, lowercase · Electrum bg_BG. |
| Onchain | он-чейн / в блокчейна | adj · compact (chip) / explanatory (body). |
| Offchain | оф-чейн / извън блокчейна | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | такса | noun, lowercase · Bitcoin Core bg + Electrum bg_BG. |
| Fee Bump | увеличаване на таксата | noun, lowercase. |
| RBF | RBF | acronym · gloss: замяна с по-висока такса / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: детето плаща за родителя. ⚠️ NOT verb "Създай". |
| Speed Up | ускори | verb · button label. |
| **_Lightning_** | | |
| Invoice | фактура / платежна заявка | noun · mainstream / technical. |
| Lightning Invoice | фактура Lightning / платежна заявка Lightning | noun · brand kept Latin + localised noun. |
| Preimage | прообраз | noun · cryptographic preimage (math term). |
| Payment | плащане | noun · ⚠️ NOT verb "Плати" (current shipped value is verb form). |
| Expired | изтекла / изтекъл | adj · feminine (фактура) / masculine · Electrum bg_BG. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | съподписващ | noun · ⚠️ NOT "съсобственик" (co-owner) · Electrum bg_BG. |
| Quorum | кворум / праг на подписите | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · Bitcoin Core bg; drop Cyrillic `ЧПБТ` — non-standard. |
| Provide signature | предостави подпис / подпиши транзакцията | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / платежен код | acronym kept; "Payment Code" → "платежен код". |
| Notification transaction | транзакция за уведомление | noun · BIP47-specific. |
| SilentPayment | Silent Payments / тихи плащания | protocol name kept Latin (plural); explanatory `тихи плащания` if needed. |
| **_Coin control_** | | |
| Coin Control | управление на UTXO / управление на монетите | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. |
| Frozen | замразена / замразен | adj · feminine (транзакция/монета) / masculine · ⚠️ NOT verb "замрази" · Electrum bg_BG. |
| **_Security & storage_** | | |
| Encrypted storage | криптирано хранилище | noun, lowercase · ⚠️ NOT Title Case. |
| Plausible Deniability | правдоподобно отричане | noun, lowercase · currently English-passthrough in shipped strings. |
| Biometrics | биометрични данни | noun, lowercase. |
| Passcode | код за достъп | noun · ⚠️ NOT `парола` (= password). |
| **_Backup, import & UX_** | | |
| Backup | резервно копие / архивирай | noun / verb · Electrum bg_BG (Архивиране) + Bitcoin Core bg (Бекъп). |
| Restore | възстанови / възстановяване | verb / noun · ⚠️ NOT shipped misspelling `въстанови` · Bitcoin Core bg + Electrum bg_BG. |
| Import | импортирай / импортиране | verb / noun · Electrum bg_BG. |
| Voucher | ваучер | noun, lowercase · ⚠️ NOT shipped `ваучър` (misspelling). |
| Redeem | осребри / активирай | verb · ⚠️ NOT "купи в портфейла". |
| Send | изпрати | verb · Bitcoin Core bg + Electrum bg_BG. |
| Receive | получи / получаване | verb / noun · Bitcoin Core bg (Получи) + Electrum bg_BG (Получаване). |
| Settings | настройки | noun, lowercase · Bitcoin Core bg + Electrum bg_BG. |
| Confirm | потвърди / потвърждение | verb / noun. Plural "потвърждения" for tx confirmations. |
| QR Code | QR код | noun · Electrum bg_BG. |
| Clipboard | клипборд | noun, lowercase · Bitcoin Core bg + Electrum bg_BG. |
| Memo | бележка | noun, lowercase. |
| Description | описание | noun, lowercase · Electrum bg_BG. |
| Label | етикет | noun, lowercase · Bitcoin Core bg + Electrum bg_BG. |
