# Hungarian translation vocabulary (`hu_hu.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · hu.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning / Villám | brand kept Latin; `Villám` ("lightning") appears in shipped invoice strings — keep both. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand · normalise casing (was `LNDHub`). |
| LND | LND | brand. |
| LNURL | LNURL | brand · Electrum hu_HU keeps as-is. |
| Tor | Tor | brand · Electrum hu_HU keeps as-is. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit (lowercase) + ticker. |
| sats | satoshi / sats | noun, lowercase; shipped strings use both. |
| sat/vByte | sat/vByte / satoshi vbájtonként | technical unit (chip) / explanatory (body). |
| vByte | vByte / vbájt | technical / mainstream. |
| **_Wallet, keys & seeds_** | | |
| Wallet | tárca / pénztárca | noun, lowercase · Bitcoin Core hu uses `Tárca`; longer form `pénztárca` also shipped. |
| Vault | széf / multisig tárca | noun, lowercase · ⚠️ NOT brand "Trezor" — shipped strings mix `Trezor` / `Vault` / `Széf`; canonicalise on `széf` (safe/strongbox) per vocabulary.md rule. |
| Watch-only | csak megtekintésre / figyelő-tárca | adj · UI / Electrum hu_HU + Bitcoin Core hu (`figyelő`). |
| Hardware wallet | hardveres tárca | noun, lowercase · drop space (was `hardver tárca`). |
| Seed | mag-kifejezés / helyreállítási kifejezés | noun · technical / mainstream · ⚠️ NOT `jelszó sorozat` ("password sequence"); reuses `kifejezés` like Trezor hu. |
| Mnemonic | mnemonikus kifejezés / helyreállítási kifejezés | noun · technical / mainstream · ⚠️ NOT `jelszó sorozat`. |
| Passphrase | jelmondat | noun · ⚠️ distinct from `jelszó` (password) · Bitcoin Core hu (`jelmondat`). |
| Public key | nyilvános kulcs | noun, lowercase · Bitcoin Core hu + hu.wikipedia.org/wiki/Bitcoin |
| Private key | privát kulcs | noun, lowercase · Bitcoin Core hu + hu.wikipedia.org/wiki/Bitcoin |
| WIF | WIF | acronym kept · gloss: tárcaimportáló formátum. |
| xpub | xpub | acronym, lowercase preferred (was `XPUB`). |
| Descriptor | leíró | noun, lowercase · Bitcoin Core hu (`leíró`). |
| Derivation path | származtatási útvonal / derivációs útvonal | noun · Electrum hu_HU (`Származtatási útvonal`) / technical alt. |
| Master fingerprint | mester ujjlenyomat | noun, lowercase. |
| BIP38 | BIP38 | acronym kept · gloss: BIP38 jelszó. |
| **_On-chain transactions_** | | |
| Transaction | tranzakció | noun, lowercase · Bitcoin Core hu + Electrum hu_HU. |
| Address | cím | noun, lowercase · Bitcoin Core hu. |
| Input | bemenet | noun · Bitcoin Core hu + Electrum hu_HU · ⚠️ replaces ambiguous `Bejövő utalás` ("incoming transfer"). |
| Output | kimenet | noun · Electrum hu_HU · ⚠️ replaces ambiguous `Kimenő utalás` ("outgoing transfer"). |
| UTXO | UTXO | acronym · gloss: elköltetlen tranzakciós kimenet. |
| Change | visszajáró / visszajáró cím | noun · Bitcoin Core hu (`Visszajáró`) + Electrum hu_HU · ⚠️ NOT verb `váltás` ("switching"). |
| Hex | hex / hexadecimális | noun · short / explanatory · ⚠️ NOT "hash". |
| Pending | függőben / függőben lévő | adj/state · short / adjective-agreement form · Bitcoin Core hu + Electrum hu_HU. |
| Unconfirmed | megerősítetlen / nem megerősített | adj · Electrum hu_HU (`Nem megerősített`). |
| Confirmed | megerősítve / megerősített | adj/state · ⚠️ NOT noun `megerősítés` ("confirmation"). |
| Mempool | mempool | noun, lowercase · Electrum hu_HU. |
| Broadcast | továbbítani / közzététel | verb / noun · UI / mainstream · Bitcoin Core hu (`közlése`). |
| Block explorer | blokkböngésző | noun, lowercase · Bitcoin Core hu (`blokkböngésző`). |
| Onchain | on-chain / blokkláncon | adj · compact (chip) / explanatory (body) · Electrum hu_HU (`Blokkláncon`). |
| Offchain | off-chain / blokkláncon kívül | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | díj / tranzakciós díj | noun, lowercase · Bitcoin Core hu + Electrum hu_HU. |
| Fee Bump | díj utólagos növelése | noun · Electrum hu_HU. |
| RBF | RBF | acronym · gloss: díj utólagos növelése / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: díjfizetés másodlagos tranzakcióval (Electrum hu_HU) · ⚠️ NOT a verb. |
| Speed Up | gyorsítás | verb · UI button label · ⚠️ NOT `Kiváltási díj (RBF)` (that's the fee-bump noun). |
| **_Lightning_** | | |
| Invoice | számla / fizetési kérelem | noun · mainstream / technical · Electrum hu_HU (`fizetési kérelem`). |
| Lightning Invoice | Lightning számla / Lightning fizetési kérelem | noun · brand kept Latin + Hungarian noun · Electrum hu_HU. |
| Preimage | preimage | noun · Electrum hu_HU keeps English passthrough. |
| Payment | fizetés / kifizetés | noun · ⚠️ NOT verb `fizetni`. |
| Expired | lejárt | adj/state · lowercase. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | társaláíró | noun · Electrum hu_HU (`Társaláíró`) · ⚠️ NOT "co-owner". |
| Quorum | kvórum / aláírási küszöb | noun, lowercase · canonical / UI-clear. |
| PSBT | PSBT | acronym · gloss: részlegesen aláírt Bitcoin tranzakció. |
| Provide signature | aláírás megadása / tranzakció aláírása | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / fizetési kód | acronym kept; "Payment Code" → `fizetési kód`. |
| Notification transaction | értesítési tranzakció | noun · BIP47-specific. |
| SilentPayment | Silent Payments / csendes fizetések | protocol name kept English (plural); explanatory `csendes fizetések` if needed. |
| **_Coin control_** | | |
| Coin Control | érmekezelés / UTXO-kezelés | noun, lowercase · Electrum hu_HU (`Érmekezelés`) · ⚠️ NOT Title Case. |
| Frozen | fagyasztva / befagyasztott | adj · state / adjective-agreement · Electrum hu_HU · ⚠️ NOT verb `fagyasztani`. |
| **_Security & storage_** | | |
| Encrypted storage | titkosított tárhely / tárhely titkosítása | noun, lowercase · ⚠️ NOT Title Case. |
| Plausible Deniability | elfogadható tagadhatóság | noun, lowercase · ⚠️ NOT Title Case. |
| Biometrics | biometrikus azonosítás | noun, lowercase. |
| Passcode | feloldó kód | noun · ⚠️ distinct from `jelszó` (= password) and `jelmondat` (= passphrase). |
| **_Backup, import & UX_** | | |
| Backup | biztonsági mentés / biztonsági mentés készítése | noun / verb-phrase · Bitcoin Core hu + Electrum hu_HU. |
| Restore | visszaállítás / helyreállítás | noun-verb · Bitcoin Core hu. |
| Import | importálás / importálni | noun / verb · Bitcoin Core hu. |
| Voucher | kupon | noun, lowercase. |
| Redeem | beváltás / jóváírás | verb-noun · `beváltás` for activate/cash in; `jóváírás` shipped for Azte.co · ⚠️ NOT "buy to wallet". |
| Send | küldés | verb · Bitcoin Core hu. |
| Receive | fogadás | verb · Bitcoin Core hu. |
| Settings | beállítások | noun, lowercase · Bitcoin Core hu. |
| Confirm | megerősítés / megerősíteni | noun / verb · also "confirmations" = blokk-megerősítések. |
| QR Code | QR-kód | noun · Bitcoin Core hu + Electrum hu_HU · canonicalise on hyphen form. |
| Clipboard | vágólap | noun, lowercase · Bitcoin Core hu. |
| Memo | megjegyzés | noun, lowercase. |
| Description | leírás | noun, lowercase. |
| Label | címke | noun, lowercase · Bitcoin Core hu (`Címke`) · ⚠️ fix shipped typo `Cimke` → `címke`. |
