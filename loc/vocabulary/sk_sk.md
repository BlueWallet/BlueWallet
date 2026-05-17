# Slovak translation vocabulary (`sk_sk.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · sk.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand · Electrum sk_SK keeps as `Lightning` / `sieť Lightning` |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker, lowercase · Electrum sk_SK uses lowercase `bitcoiny` for the unit. |
| sats | sats / satoshi | noun, lowercase · Electrum sk_SK uses `satoshi` in body text. |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | peňaženka | noun, lowercase · Bitcoin Core sk + Electrum sk_SK |
| Vault | trezor / sejf | noun, lowercase · safe/strongbox sense · ⚠️ NOT Latin "Vault". |
| Watch-only | iba na sledovanie / peňaženka iba na sledovanie | adj · short / full · Electrum sk_SK: "Peňaženka iba na sledovanie" |
| Hardware wallet | hardvérová peňaženka | noun, lowercase · Electrum sk_SK uses "Hardvérové Zariadenie" · ⚠️ shipped "hardwarová" is a common anglicism, recommended `hardvérová`. |
| Seed | seed fráza / seedová fráza | noun, lowercase · Electrum sk_SK uses "seedová fráza"; current shipped `Semienko` (= seedling) is misleading and should be replaced. |
| Mnemonic | mnemonická fráza / zálohovacia fráza | noun · technical / mainstream · shipped uses `zálohovacia fráza`. |
| Passphrase | prístupová fráza | noun · ⚠️ NOT `heslo` (= password) · Electrum sk_SK: "prístupová fráza"; Bitcoin Core sk also "prístupová fráza". |
| Public key | verejný kľúč | noun, lowercase · Bitcoin Core sk + Electrum sk_SK |
| Private key | súkromný kľúč | noun, lowercase · Bitcoin Core sk + Electrum sk_SK |
| WIF | WIF | acronym · gloss: formát pre import súkromného kľúča. |
| xpub | xpub | acronym, lowercase preferred · shipped `XPUB` keeps screaming caps; Electrum sk_SK keeps `xpub`. |
| Descriptor | deskriptor | noun, lowercase · technical Bitcoin Core term. |
| Derivation path | derivačná cesta | noun, lowercase · Electrum sk_SK: "Derivačná cesta" |
| Master fingerprint | odtlačok hlavného kľúča | noun, lowercase · ⚠️ shipped `Hlavný odtlačok prsta` literally = "main fingerprint of a finger"; recommend `odtlačok hlavného kľúča` (master-key hash, not a biometric finger). |
| BIP38 | BIP38 | acronym kept · gloss: heslom šifrovaný súkromný kľúč. |
| **_On-chain transactions_** | | |
| Transaction | transakcia | noun, lowercase · Bitcoin Core sk + Electrum sk_SK |
| Address | adresa | noun, lowercase · Bitcoin Core sk + Electrum sk_SK |
| Input | vstup / vstup transakcie | noun · short / full · Electrum sk_SK: "Vstupy" |
| Output | výstup / výstup transakcie | noun · short / full · ⚠️ NOT the UI recipient label "Cieľ" · Electrum sk_SK: "Výstupy" |
| UTXO | UTXO | acronym · gloss: neminutý výstup transakcie · Bitcoin Core sk keeps `UTXO`. |
| Change | drobné / adresa drobných | noun · ⚠️ NOT verb "zmeniť". `drobné` = leftover coin · Electrum sk_SK: "Drobné". |
| Hex | hex / hexadecimálne dáta | noun · short / explanatory · ⚠️ NOT "hash" / NOT "dáta transakcie". |
| Pending | čakajúce / čakajúca | adj · neuter / fem-agreement · Bitcoin Core sk: "Čakajúce potvrdenie" · ⚠️ shipped `čaká` is 3sg verb ("it waits"), not adjective; standalone form should be `čakajúce` (neut) or `čakajúca` (fem) to agree with noun; alt explanatory: `čaká na potvrdenie`. |
| Unconfirmed | nepotvrdené / nepotvrdená | adj · state / fem-agreement · Bitcoin Core sk + Electrum sk_SK · ⚠️ shipped `nepotvrdenej` is genitive case from a longer phrase; standalone form should be `nepotvrdené`. |
| Confirmed | potvrdené / potvrdená | adj · state / fem-agreement · Bitcoin Core sk + Electrum sk_SK |
| Mempool | mempool | noun, lowercase · Electrum sk_SK keeps `mempool`. |
| Broadcast | odoslať / zverejniť | verb · UI-clear / technical · Electrum sk_SK: "Zverejniť" · noun form: vysielanie. |
| Block explorer | prieskumník blokov | noun, lowercase · Electrum sk_SK: "Pozrieť v prieskumníkovi blokov" |
| Onchain | on-chain / v blockchaine | adj · compact (chip) / explanatory (body) |
| Offchain | off-chain / mimo blockchainu | adj · compact (chip) / explanatory (body) |
| **_Fees & fee bumping_** | | |
| Fee | poplatok | noun, lowercase. |
| Fee Bump | navýšenie poplatku | noun · Electrum sk_SK: "Navýšiť poplatok" / "Increase fee" |
| RBF | RBF | acronym · gloss: nahradiť za poplatok / Replace-By-Fee · shipped `Zrušiť transakciu (RBF)` is the UI label for cancel-via-RBF, not the term itself. |
| CPFP | CPFP | acronym · gloss: dieťa platí za rodiča / Child Pays For Parent · ⚠️ NOT a verb · Electrum sk_SK keeps `CPFP`. |
| Speed Up | zrýchliť / navýšiť poplatok | verb · UI button label for RBF. |
| **_Lightning_** | | |
| Invoice | faktúra / platobná požiadavka | noun · technical / mainstream · Electrum sk_SK: "Faktúry"; shipped uses `Faktúra`. |
| Lightning Invoice | faktúra Lightning / platobná požiadavka Lightning | noun · technical / mainstream. |
| Preimage | predobraz / preimage | noun · math term · Electrum sk_SK: "Predobraz - Preimage" |
| Payment | platba | noun · ⚠️ NOT verb "zaplatiť" · Electrum sk_SK: "Platba Lightning" |
| Expired | expirovaná / s uplynutou platnosťou | adj · short / explanatory · Electrum sk_SK: "Platnosť faktúry uplynula" |
| **_Multisig & advanced addressing_** | | |
| Co-signer | spolupodpisovateľ | noun · ⚠️ NOT "spoluvlastník" (co-owner) · Electrum sk_SK: "spolupodpisovateľ" |
| Quorum | kvórum / prah podpisov | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym. |
| Provide signature | poskytnúť podpis / podpísať transakciu | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / platobný kód | acronym kept; "Payment Code" → "platobný kód". |
| Notification transaction | oznamovacia transakcia | noun · BIP47-specific. |
| SilentPayment | Silent Payments / tiché platby | protocol name kept English (plural); explanatory `tiché platby` if needed. |
| **_Coin control_** | | |
| Coin Control | správa UTXO / správa mincí | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. |
| Frozen | zmrazené / zmrazená | adj · state / fem-agreement · ⚠️ NOT verb "zmraziť" · Electrum sk_SK: "Adresa je zmrazená" |
| **_Security & storage_** | | |
| Encrypted storage | zašifrované úložisko | noun, lowercase · shipped matches. |
| Plausible Deniability | hodnoverná popierateľnosť | noun, lowercase · ⚠️ shipped `Plausible deniability` is English passthrough; Slovak rendering exists per sk.wikipedia.org/wiki/Hodnoverná_popierateľnosť. |
| Biometrics | biometria | noun, lowercase. |
| Passcode | prístupový kód | noun · ⚠️ NOT `heslo` (= password); shipped collapses both to `Heslo`. Use distinct word. |
| **_Backup, import & UX_** | | |
| Backup | záloha / zálohovať | noun / verb · Bitcoin Core sk: "Zálohovanie peňaženky" / "Zálohovať peňaženku" |
| Restore | obnoviť / obnovenie | verb / noun · Bitcoin Core sk: "Restore Wallet" → "Obnoviť"; Electrum sk_SK: "&Nový/Obnoviť" |
| Import | importovať / import | verb / noun. |
| Voucher | voucher / poukaz | noun, lowercase · BlueWallet's azteco context keeps `voucher`. |
| Redeem | uplatniť / aktivovať | verb · ⚠️ NOT "Odobrať" / NOT "Prevziať"; for vouchers prefer `uplatniť`. |
| Send | poslať / odoslať | verb · shipped uses `Poslať`. |
| Receive | prijať | verb. |
| Settings | nastavenia | noun, lowercase. |
| Confirm | potvrdiť / potvrdenie | verb / noun · plural confirmations: potvrdenia. |
| QR Code | QR kód | noun · Electrum sk_SK: "QR kód" |
| Clipboard | schránka | noun, lowercase · ⚠️ shipped `schránky` is genitive ("do schránky"); standalone form is `schránka`. |
| Memo | poznámka | noun, lowercase · ⚠️ shipped collapses memo/description/label all to `Popis`; recommend `poznámka` for sender's note. |
| Description | popis | noun, lowercase · Bitcoin Core sk + Electrum sk_SK |
| Label | menovka / označenie | noun, lowercase · Electrum sk_SK: "Menovka"; Bitcoin Core sk uses "Popis" (collision with description). |
