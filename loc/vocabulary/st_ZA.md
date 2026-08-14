# Sesotho translation vocabulary (`st_ZA.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: upstream wallet projects (Bitcoin Core, Electrum, Phoenix, Zeus, Trezor, Cake, Bisq, Green, Breez) do **not** ship Sesotho (Southern Sotho) localizations — all locale files 404 for `st` / `st_ZA`. The only native-script reference is Wikipedia st (st.wikipedia.org), which has minimal Bitcoin/Lightning coverage. Sesotho uses the Latin script (LTR), so brand and acronym rows keep their English spelling. Most rows below are best-effort native renderings or transliterations and are marked "(transliteration)" / "(no upstream wallet citation)"; where a genuine Sesotho word exists (e.g. `peo` = seed, `lopolla` = redeem) it is preferred over a loanword.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin (Sesotho uses Latin script). |
| Lightning | Lightning | brand kept Latin. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; unit lowercase, ticker uppercase (no upstream wallet citation). |
| sats | sats | noun; lowercase, kept as-is (no Sesotho upstream rendering). |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin per convention. |
| vByte | vByte | technical unit; kept Latin. |
| **_Wallet, keys & seeds_** | | |
| Wallet | sepache | noun · native Sesotho "purse/wallet" (no upstream wallet citation). |
| Vault | Polokelo / polokelo e sireletsehileng | noun · compact / explanatory; UI capitalises *Polokelo* on multisig screens (e.g. "Polokelo ya Multisig", "Senotlolo sa Polokelo"); distinct from `polokelo e patilweng` (encrypted storage); ⚠️ NOT a brand (no upstream wallet citation). |
| Watch-only | ho shebella feela | adj · "to watch/view only"; ⚠️ NOT generic "view mode" — a wallet type (no upstream wallet citation). |
| Hardware wallet | sepache sa hardware | noun · native "wallet" + Latin "hardware" (no upstream wallet citation). |
| Seed | peo | noun · native Sesotho word for "seed" (no upstream wallet citation). |
| Mnemonic | polelwana ya peo | noun · "seed phrase" (no upstream wallet citation). |
| Passphrase | polelwana ya phasewete | noun · ⚠️ NOT `phasewete` (password) alone — distinct phrase (no upstream wallet citation). |
| Public key | senotlolo sa sechaba | noun · senotlolo = key, sechaba = public (no upstream wallet citation). |
| Private key | senotlolo sa lekunutu | noun · lekunutu = secret/private (no upstream wallet citation). |
| WIF | WIF | acronym kept. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | sehlalosi | noun · "descriptor/describer" (no upstream wallet citation). |
| Derivation path | tsela ya tlhahiso | noun · "derivation path" (no upstream wallet citation). |
| Master fingerprint | letshwao la motheo | noun · "master/root mark" (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | tshebetsano | noun · "transaction/dealing" (no upstream wallet citation). |
| Address | aterese | noun · transliteration (no upstream wallet citation). |
| Input | tse kenang | noun · "those entering"; ⚠️ NOT "login/entrance" (no upstream wallet citation). |
| Output | tse tswang | noun · "those exiting"; ⚠️ NOT the UI recipient label "To:" (no upstream wallet citation). |
| UTXO | UTXO | acronym kept. |
| Change | tjhelete e setseng | noun · "leftover money/change"; ⚠️ NOT verb "to change/modify" (no upstream wallet citation). |
| Hex | hex | noun · kept Latin short form; ⚠️ NOT "hash" (no upstream wallet citation). |
| Pending | e emetse | adj/state · "is waiting/pending"; ⚠️ NOT a noun (no upstream wallet citation). |
| Unconfirmed | ha e a netefatswa | adj · "not confirmed" (no upstream wallet citation). |
| Confirmed | e netefaditswe | adj/state · "has been confirmed" (no upstream wallet citation). |
| Mempool | mempool | technical term kept Latin (no Sesotho upstream rendering). |
| Broadcast | phatlalatsa | noun / verb · "broadcast/announce" (no upstream wallet citation). |
| Block explorer | sehlahlobi sa diblock | noun · "block explorer/inspector" (no upstream wallet citation). |
| Onchain | onchain | adj · kept Latin; no native Sesotho term in upstream refs. |
| Offchain | offchain | adj · kept Latin; no native Sesotho term in upstream refs. |
| **_Fees & fee bumping_** | | |
| Fee | tefiso | noun · "fee/charge" (no upstream wallet citation). |
| Fee Bump | ho phahamisa tefiso | noun · "raising the fee" (no upstream wallet citation). |
| RBF | RBF | acronym kept. |
| CPFP | CPFP | acronym kept; ⚠️ NOT a verb. |
| Speed Up | potlakisa | verb · "speed up/hasten" (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | invoisi / kopo ya tefo | noun · transliteration / "payment request" (no upstream wallet citation). |
| Lightning Invoice | invoisi ya Lightning | noun · brand kept Latin + localised noun (no upstream wallet citation). |
| Preimage | preimage | math term kept Latin; uncertain Sesotho rendering (no upstream wallet citation). |
| Payment | tefo | noun · "payment"; ⚠️ NOT the verb "to pay" (no upstream wallet citation). |
| Expired | e felile | adj/state · "has expired/ended" (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | mosaeni-mmoho | noun · "co-signer" (saena = sign); ⚠️ NOT "co-owner" (no upstream wallet citation). |
| Quorum | korame | noun · transliteration (no upstream wallet citation). |
| PSBT | PSBT | acronym kept. |
| Provide signature | fana ka tshaeno | verb · "give a signature" (no upstream wallet citation). |
| BIP47 / Payment Code | BIP47 / khoutu ya tefo | acronym kept; "Payment Code" translatable noun (no upstream wallet citation). |
| Notification transaction | tshebetsano ya tsebiso | noun · "notification transaction" (no upstream wallet citation). |
| SilentPayment | Silent Payments | protocol name kept English (plural); no Sesotho gloss (no upstream wallet citation). |
| **_Coin control_** | | |
| Coin Control | taolo ya dikhoine | noun · "coin control" (no upstream wallet citation). |
| Frozen | e kwetswe | adj/state · "is locked/frozen"; ⚠️ NOT verb "to freeze" (no upstream wallet citation). |
| **_Security & storage_** | | |
| Encrypted storage | polokelo e patilweng | noun · "encrypted/hidden storage" (no upstream wallet citation). |
| Plausible Deniability | ho latola ho ka kgolwehang | noun · "believable denial"; abstract concept, uncertain idiomatic rendering (no upstream wallet citation). |
| Biometrics | dibaeometriki | noun · transliteration (no upstream wallet citation). |
| Passcode | khoutu ya ho kena | noun · "access code"; ⚠️ NOT app "password" (no upstream wallet citation). |
| **_Backup, import & UX_** | | |
| Backup | backup / kgopi ya tshireletso | noun · UI ships the loanword `backup`; native gloss "safety copy" second (no upstream wallet citation). |
| Restore | tsosolosa | verb · "restore/revive" (no upstream wallet citation). |
| Import | kenya | verb / noun · "bring in/import" (no upstream wallet citation). |
| Voucher | vautjha | noun · transliteration (no upstream wallet citation). |
| Redeem | lopolla | verb · native Sesotho "redeem/ransom"; ⚠️ NOT "buy to wallet" / NOT "transfer" (no upstream wallet citation). |
| Send | romela | verb · native Sesotho "send" (no upstream wallet citation). |
| Receive | amohela | verb · native Sesotho "receive/accept" (no upstream wallet citation). |
| Settings | ditlhophiso | noun · "settings/configurations" (no upstream wallet citation). |
| Confirm | netefatsa | verb · "confirm/verify" (no upstream wallet citation). |
| QR Code | khoutu ya QR | noun · "QR code" (no upstream wallet citation). |
| Clipboard | clipboard | noun · kept Latin (no Sesotho upstream rendering). |
| Memo | lengolwana | noun · "short note/memo" (no upstream wallet citation). |
| Description | tlhaloso | noun · "description/explanation" (no upstream wallet citation). |
| Label | leibole | noun · transliteration "label"; ⚠️ NOT verb "to label" (no upstream wallet citation). |
