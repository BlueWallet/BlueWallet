# Armenian translation vocabulary (`hy.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note on sources: Bitcoin Core ships **no** Armenian locale (`bitcoin_hy.ts` 404s). Electrum has a partial `hy_AM/electrum.po` (~65% of common on-chain terms) — cited below as "Electrum hy". Native-script reference: hy.wikipedia.org/wiki/Բիթքոյն (Bitcoin article) gives `գործարք` (transaction), `բլոկչեյն`/`բլոկային շղթա` (blockchain), `կրիպտոարժույթ` (cryptocurrency); no hy.wikipedia article exists for Lightning Network. Armenian common nouns are lowercase (Electrum's sentence-initial capitals are not preserved here). Where no source exists, the value is transliterated or calqued and marked "(transliteration)".

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; Armenian gloss `բիթքոյն` per hy.wikipedia.org/wiki/Բիթքոյն (body text only). |
| Lightning | Lightning | brand kept Latin (no hy.wikipedia article for Lightning Network). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | բիթքոյն / BTC | noun unit + ticker · hy.wikipedia.org/wiki/Բիթքոյն |
| sats | սատոշի | noun · transliteration of satoshi (no upstream wallet citation). |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | դրամապանակ | noun · Electrum hy (`Դրամապանակ`). |
| Vault | սեյֆ / պահարան | noun · "safe / strongbox" (no upstream wallet citation). ⚠️ NOT a brand — translate. |
| Watch-only | միայն դիտման | adj · Electrum hy (`միայն դիտել`). ⚠️ NOT generic "view mode" — specific wallet type. |
| Hardware wallet | ապարատային դրամապանակ | noun · "hardware" = ապարատային, parallel to Wallet (no upstream wallet citation). |
| Seed | սերմ / վերականգնման արտահայտություն | noun · Electrum hy uses `Սերմ`; mainstream form "recovery phrase" preferred in body UI. |
| Mnemonic | մնեմոնիկ արտահայտություն / վերականգնման արտահայտություն | noun · transliteration / "recovery phrase" (no upstream wallet citation). |
| Passphrase | կոդային արտահայտություն | noun · ⚠️ NOT `գաղտնաբառ` (= app password) and NOT passcode. Electrum hy conflates passphrase/password as `Գաղտնաբառ`; use a distinct phrase here. |
| Public key | բաց բանալի / հանրային բանալի | noun · Electrum hy (`Բաց բանալի`); `հանրային` is the more literal "public". |
| Private key | մասնավոր բանալի / գաղտնի բանալի | noun · Electrum hy (`Մասնավոր բանալի`). |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | դեսկրիպտոր | noun · transliteration (no upstream wallet citation). |
| Derivation path | ածանցման ուղի | noun · "derivation" = ածանցում, "path" = ուղի (no upstream wallet citation). |
| Master fingerprint | գլխավոր մատնահետք | noun · "master" = գլխավոր, "fingerprint" = մատնահետք (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. ⚠️ NOT a verb / NOT "password" alone. |
| **_On-chain transactions_** | | |
| Transaction | գործարք | noun · Electrum hy + hy.wikipedia.org/wiki/Բիթքոյն. |
| Address | հասցե | noun · Electrum hy (`Հասցե`). |
| Input | մուտք / գործարքի մուտք | noun · ⚠️ NOT "login / entrance" — pair with "output" form (no upstream wallet citation). |
| Output | ելք / գործարքի ելք | noun · ⚠️ NOT the UI recipient label "To:" (no upstream wallet citation). |
| UTXO | UTXO | acronym. |
| Change | մնացորդ / մանր | noun · "remainder / small change" (no upstream wallet citation). ⚠️ NOT verb "to change/modify" (`փոխել`). |
| Hex | hex / տասնվեցական | noun · short form / "hexadecimal" (no upstream wallet citation). ⚠️ NOT "hash" and NOT "transaction data". |
| Pending | սպասման մեջ | adj/state · "in waiting" (no upstream wallet citation). ⚠️ NOT a noun "expectation". |
| Unconfirmed | չհաստատված | adj · standard Armenian negation of "confirmed" (no upstream wallet citation). |
| Confirmed | հաստատված | adj/state · standard Armenian (no upstream wallet citation). |
| Mempool | mempool | technical term kept Latin (no Armenian upstream rendering). |
| Broadcast | հեռարձակել / հեռարձակում | verb / noun · "broadcast/transmit" (Electrum hy uses generic `Ուղարկել` = send; distinct verb preferred). |
| Block explorer | բլոկների դիտարկիչ | noun · "explorer" = դիտարկիչ (no upstream wallet citation). |
| Onchain | օն-չեյն / շղթայում | adj · compact transliteration / "in the chain" (no upstream wallet citation). |
| Offchain | օֆ-չեյն / շղթայից դուրս | adj · compact transliteration / "off the chain" (no upstream wallet citation). |
| **_Fees & fee bumping_** | | |
| Fee | վճար / միջնորդավճար | noun · Electrum hy (`Վճար`); `միջնորդավճար` = commission for explanatory use. |
| Fee Bump | վճարի բարձրացում | noun · "fee increase" (no upstream wallet citation). |
| RBF | RBF | acronym; gloss "փոխարինում ըստ վճարի". |
| CPFP | CPFP | acronym · ⚠️ NOT a verb. |
| Speed Up | արագացնել | verb · imperative "speed up" (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | հաշիվ-ֆակտուրա / վճարման հարցում | noun · Electrum hy (`Հաշիվ-ֆակտուրա`) / "payment request" mainstream form. |
| Lightning Invoice | Lightning հաշիվ-ֆակտուրա / Lightning վճարման հարցում | noun · brand kept Latin + localised noun. |
| Preimage | նախապատկեր | noun · math term "pre-image" (no upstream wallet citation). |
| Payment | վճարում | noun · standard Armenian (no upstream wallet citation). ⚠️ NOT verb "to pay" (`վճարել`). |
| Expired | ժամկետանց | adj/state · "validity expired" (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | համաստորագրող | noun · "co-signer" (no upstream wallet citation). ⚠️ NOT "co-owner" (`համասեփականատեր`). |
| Quorum | քվորում / ստորագրությունների շեմ | noun · transliteration / "signature threshold" (no upstream wallet citation). |
| PSBT | PSBT | acronym. |
| Provide signature | ստորագրել / ստորագրություն տրամադրել | verb · "sign / provide signature" (no upstream wallet citation). |
| BIP47 / Payment Code | BIP47 / վճարման կոդ | acronym kept; "Payment Code" = վճարման կոդ (translatable noun). |
| Notification transaction | ծանուցման գործարք | noun · BIP47-specific "notification + transaction" (no upstream wallet citation). |
| SilentPayment | Silent Payments / լուռ վճարումներ | protocol name kept English (plural); explanatory gloss "silent payments". |
| **_Coin control_** | | |
| Coin Control | UTXO-ների կառավարում / մետաղադրամների կառավարում | noun · technical UTXO form / "coin management" (no upstream wallet citation). ⚠️ NOT Title Case (Armenian has no Title Case). |
| Frozen | սառեցված | adj/state · "frozen" (no upstream wallet citation). ⚠️ NOT verb "to freeze" (`սառեցնել`). |
| **_Security & storage_** | | |
| Encrypted storage | գաղտնագրված պահեստ | noun · ⚠️ NOT Title Case. "encrypt" = գաղտնագրել (Electrum hy uses `Ծածկագրել`, also valid). |
| Plausible Deniability | ճշմարտանման ժխտում / հավանական ուրացում | noun · ⚠️ NOT Title Case. "plausible denial" — calque (no upstream wallet citation). |
| Biometrics | բիոմետրիա / կենսաչափական նույնականացում | noun · transliteration / "biometric identification" (no upstream wallet citation). |
| Passcode | մուտքի կոդ | noun · ⚠️ NOT `գաղտնաբառ` (= app password) — device unlock code, distinct word (no upstream wallet citation). |
| **_Backup, import & UX_** | | |
| Backup | պահուստային պատճեն / պահուստավորել | noun / verb · "backup copy / to back up" (no upstream wallet citation). |
| Restore | վերականգնել / վերականգնում | verb / noun · standard Armenian (no upstream wallet citation). |
| Import | ներմուծել / ներմուծում | verb / noun · Electrum hy (`Ներմուծել`). |
| Voucher | վաուչեր | noun · transliteration (no upstream wallet citation). |
| Redeem | ակտիվացնել / կանխիկացնել | verb · "activate / cash in" (no upstream wallet citation). ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | ուղարկել | verb · Electrum hy (`Ուղարկել`). |
| Receive | ստանալ | verb · standard Armenian (no upstream wallet citation). |
| Settings | կարգավորումներ | noun · Electrum hy (`Կարգավորումներ`). |
| Confirm | հաստատել | verb · standard Armenian; "confirmations" (plural noun) = հաստատումներ (no upstream wallet citation). |
| QR Code | QR կոդ | noun · standard Armenian (no upstream wallet citation). |
| Clipboard | սեղմատախտակ | noun · calque "clip-board" (no upstream wallet citation). |
| Memo | նշում | noun · "note" (no upstream wallet citation). |
| Description | նկարագրություն | noun · Electrum hy (`Նկարագրություն`). |
| Label | պիտակ | noun · "label/tag" (no upstream wallet citation). |
