# Czech translation vocabulary (`cs_cz.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; inflected ("bitcoinovou") in body · cs.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand · cs.wikipedia.org/wiki/Lightning_Network |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand · Bitcoin Core cs + Electrum cs keep as-is. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; inflected in body. |
| sats | sats / satoshi | noun, lowercase; `satoshi` in explanatory text. |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | peněženka | noun, lowercase · Bitcoin Core cs + Electrum cs |
| Vault | trezor / úložiště | noun; `trezor` = safe/strongbox sense (matches glossary; current app ships `Úložiště`). |
| Watch-only | pouze pro sledování | adj · Bitcoin Core cs + Electrum cs |
| Hardware wallet | hardwarová peněženka | noun, lowercase · Electrum cs |
| Seed | seed / fráze pro obnovení | noun; mainstream form preferred. Current app keeps `Seed`. |
| Mnemonic | mnemotechnická fráze | noun · Electrum cs |
| Passphrase | přístupová fráze | noun · ⚠️ NOT `heslo` (= password) · Bitcoin Core cs uses `přístupová fráze`. |
| Public key | veřejný klíč | noun, lowercase · Bitcoin Core cs + Electrum cs |
| Private key | soukromý klíč | noun, lowercase · Bitcoin Core cs |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred (current app ships `XPUB`). |
| Descriptor | deskriptor | noun, lowercase · Bitcoin Core cs uses `deskriptor`. |
| Derivation path | derivační cesta | noun. |
| Master fingerprint | hlavní otisk / otisk hlavního klíče | noun · short / explanatory. |
| BIP38 | BIP38 | acronym kept · gloss: heslem chráněný soukromý klíč. |
| **_On-chain transactions_** | | |
| Transaction | transakce | noun, lowercase · Bitcoin Core cs + Electrum cs |
| Address | adresa | noun, lowercase · Bitcoin Core cs |
| Input | vstup / vstup transakce | noun · short / full · Bitcoin Core cs |
| Output | výstup / výstup transakce | noun · short / full · ⚠️ NOT the UI recipient label "Komu". |
| UTXO | UTXO | acronym · gloss: neutracený transakční výstup. |
| Change | drobné / adresa drobných | noun · ⚠️ NOT verb "změnit". `drobné` = leftover coin output · Bitcoin Core cs (`Drobné`). |
| Hex | hex / hex data | noun · short / explanatory · ⚠️ NOT "hash" / NOT "transakční data". |
| Pending | čekající / čeká | adj/state. Avoid noun "čekání". |
| Unconfirmed | nepotvrzená / nepotvrzeno | adj · feminine-agreement / state · Bitcoin Core cs |
| Confirmed | potvrzená / potvrzeno | adj · feminine-agreement / state · Bitcoin Core cs + Electrum cs |
| Mempool | mempool | noun, lowercase · Bitcoin Core cs + Electrum cs keep `Mempool`. |
| Broadcast | odeslat do sítě / odvysílat | verb · UI-clear / technical. Noun form: odeslání / vysílání. |
| Block explorer | průzkumník bloků / block explorer | noun, lowercase · Bitcoin Core cs uses `block explorer`. |
| Onchain | on-chain / v blockchainu | adj · compact (chip) / explanatory (body) · Electrum cs |
| Offchain | off-chain / mimo blockchain | adj · compact (chip) / explanatory (body) · Electrum cs |
| **_Fees & fee bumping_** | | |
| Fee | poplatek | noun, lowercase · Bitcoin Core cs + Electrum cs |
| Fee Bump | navýšení poplatku | noun · Electrum cs |
| RBF | RBF | acronym · gloss: nahrazení vyšším poplatkem / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: potomek platí za rodiče. ⚠️ NOT a verb like "Vytvořit". |
| Speed Up | zrychlit | verb (button label) · ⚠️ current app `Poplatek za popostrčení` used both for RBF and CPFP — prefer `zrychlit` for the RBF button. |
| **_Lightning_** | | |
| Invoice | faktura / platební požadavek | noun · technical / mainstream · Electrum cs uses `faktura`. |
| Lightning Invoice | Lightning faktura / Lightning platební požadavek | noun · technical / mainstream · `Lightning` brand + `faktura` (Electrum cs) / `platební požadavek`. |
| Preimage | předobraz | noun · math term · Electrum cs |
| Payment | platba | noun · ⚠️ NOT verb "zaplatit" · Electrum cs |
| Expired | expirováno / vypršela platnost | adj/state · compact / explanatory · canonical Czech form is `vypršela platnost` (alt. `prošlá platnost`); `expirováno` is colloquial. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | spolupodepisující / spolupodepisovatel | noun · ⚠️ NOT "spolumajitel" (co-owner) · Electrum cs uses `spolupodepisující`. |
| Quorum | kvórum / práh podpisů | noun · canonical / UI-clear · Electrum cs |
| PSBT | PSBT | acronym · gloss: částečně podepsaná bitcoinová transakce. |
| Provide signature | poskytnout podpis / podepsat transakci | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / platební kód | acronym kept; "Payment Code" → "platební kód" · Electrum cs |
| Notification transaction | oznamovací transakce | noun · BIP47-specific. |
| SilentPayment | Silent Payments / tiché platby | protocol name kept English (plural); optional explanatory `tiché platby`. |
| **_Coin control_** | | |
| Coin Control | správa UTXO / správa mincí | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case · Bitcoin Core cs uses `Ovládání mincí`. |
| Frozen | zmrazeno / zmrazený | adj · state / masc-agreement · ⚠️ NOT verb "zmrazit" · Bitcoin Core cs (`Zmrazeno`). |
| **_Security & storage_** | | |
| Encrypted storage | šifrované úložiště / šifrování úložiště | noun, lowercase · ⚠️ NOT Title Case. |
| Plausible Deniability | věrohodná popiratelnost | noun, lowercase · ⚠️ NOT Title Case · cs.wikipedia.org/wiki/Věrohodná_popiratelnost. |
| Biometrics | biometrie | noun, lowercase · Electrum cs |
| Passcode | přístupový kód | noun · ⚠️ NOT `heslo` (= password) · Electrum cs |
| **_Backup, import & UX_** | | |
| Backup | záloha / zálohovat | noun / verb. |
| Restore | obnovit / obnovení | verb / noun · Bitcoin Core cs |
| Import | importovat / import | verb / noun. |
| Voucher | voucher / poukaz | noun, lowercase; both forms shipped in app strings. |
| Redeem | uplatnit | verb · ⚠️ NOT "koupit do peněženky" · Electrum cs |
| Send | odeslat | verb · Bitcoin Core cs |
| Receive | přijmout | verb · Bitcoin Core cs |
| Settings | nastavení | noun, lowercase. |
| Confirm | potvrdit / potvrzení | verb / noun. |
| QR Code | QR kód | noun · Electrum cs |
| Clipboard | schránka | noun, lowercase · Electrum cs |
| Memo | poznámka | noun, lowercase · Electrum cs |
| Description | popis | noun, lowercase · Electrum cs |
| Label | popisek / označení | noun, lowercase · Electrum cs uses `Popisek`, Bitcoin Core cs uses `Označení`. |
