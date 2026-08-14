# Azerbaijani translation vocabulary (`az.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: Azerbaijani (Azərbaycan dili) is written in the Latin alphabet (LTR). Upstream wallet coverage is partial — Bitcoin Core ships a (largely incomplete) `bitcoin_az.ts` and Electrum ships `az/electrum.po`; az.wikipedia.org has a "Bitkoin" article. Where a row is filled from these it is cited; otherwise the value is the natural Azerbaijani term and marked "(transliteration)" when it is a borrowed/transliterated form. Brand and protocol names stay in the Latin spelling used in English. Azerbaijani uses ordinary lowercase for common nouns (not English Title Case).

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; az body-text gloss `Bitkoin` per az.wikipedia.org/wiki/Bitkoin. |
| Lightning | Lightning | brand kept Latin. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; unit lowercase, ticker uppercase. |
| sats | satoşi | noun · transliteration of "satoshi". |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin casing. |
| vByte | vByte | technical unit; keep Latin. |
| **_Wallet, keys & seeds_** | | |
| Wallet | cüzdan | noun · standard Azerbaijani word for wallet/purse. |
| Vault | seyf | noun · "safe / strongbox". ⚠️ NOT a brand — translated. |
| Watch-only | yalnız-izləmə | adj · "watch-only". ⚠️ NOT generic "view mode" — a wallet type. |
| Hardware wallet | aparat cüzdanı | noun · "device wallet" (transliteration of hardware → aparat). |
| Seed | toxum / bərpa ifadəsi | noun · literal "seed" / "recovery phrase" (mainstream). |
| Mnemonic | mnemonik ifadə | noun · transliteration "mnemonic phrase". |
| Passphrase | keçid ifadəsi | noun · ⚠️ NOT `parol`/`şifrə` (password) — distinct term. |
| Public key | açıq açar | noun · "açar" = key · parallel to gizli açar. |
| Private key | gizli açar | noun · "secret key". |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | deskriptor | noun · transliteration. |
| Derivation path | törəmə yolu | noun · "derivation path". |
| Master fingerprint | əsas barmaq izi | noun · "barmaq izi" = fingerprint; əsas = master. |
| BIP38 | BIP38 | acronym kept. ⚠️ NOT a verb / NOT "password". |
| **_On-chain transactions_** | | |
| Transaction | tranzaksiya / əməliyyat | noun · transliteration / native banking term. |
| Address | ünvan | noun · standard Azerbaijani "address". |
| Input | giriş | noun · ⚠️ NOT "login / entrance" — tx input; pair with çıxış (output). |
| Output | çıxış | noun · ⚠️ NOT the UI recipient label "To:". |
| UTXO | UTXO | acronym. |
| Change | qalıq | noun · "remainder / leftover". ⚠️ NOT verb "to change/modify". |
| Hex | hex / onaltılıq | noun · short / "hexadecimal". ⚠️ NOT "hash". |
| Pending | gözləmədə | adj/state · "in waiting". ⚠️ NOT a noun. |
| Unconfirmed | təsdiqlənməmiş | adj · "not confirmed". |
| Confirmed | təsdiqlənmiş | adj/state · "confirmed". |
| Mempool | mempool | technical term kept Latin. |
| Broadcast | yayım / yayımlamaq | noun / verb · "broadcast". |
| Block explorer | blok izləyicisi | noun · "block explorer" (izləyici = tracker/explorer). |
| Onchain | on-chain / zəncirdə | adj · compact / "in the chain". |
| Offchain | off-chain / zəncirdən kənar | adj · compact / "outside the chain". |
| **_Fees & fee bumping_** | | |
| Fee | komissiya | noun · "commission/fee". |
| Fee Bump | komissiya artımı | noun · "fee increase". |
| RBF | RBF | acronym. |
| CPFP | CPFP | acronym · ⚠️ NOT a verb. |
| Speed Up | sürətləndir | verb · imperative "speed up". |
| **_Lightning_** | | |
| Invoice | faktura / ödəniş sorğusu | noun · "invoice" / "payment request". |
| Lightning Invoice | Lightning fakturası | noun · brand Latin + localised noun. |
| Preimage | ilkin təsvir / preimage | noun · math term "preimage" (transliteration). |
| Payment | ödəniş | noun · ⚠️ NOT verb "to pay". |
| Expired | müddəti bitib | adj/state · "validity ended". |
| **_Multisig & advanced addressing_** | | |
| Co-signer | birgə imzalayan | noun · ⚠️ NOT "co-owner" — a signer. |
| Quorum | kvorum | noun · transliteration. |
| PSBT | PSBT | acronym. |
| Provide signature | imza təqdim et | verb · "provide signature". |
| BIP47 / Payment Code | BIP47 / ödəniş kodu | acronym kept; "payment code" translatable noun. |
| Notification transaction | bildiriş tranzaksiyası | noun · BIP47 "notification transaction". |
| SilentPayment | Silent Payments / səssiz ödənişlər | protocol name kept English (plural); az gloss. |
| **_Coin control_** | | |
| Coin Control | sikkə nəzarəti | noun · "coin control" (sikkə = coin). ⚠️ NOT Title Case. |
| Frozen | dondurulmuş | adj/state · "frozen". ⚠️ NOT verb "to freeze". |
| **_Security & storage_** | | |
| Encrypted storage | şifrələnmiş yaddaş | noun · ⚠️ NOT Title Case. |
| Plausible Deniability | ağlabatan inkar | noun · "plausible denial". ⚠️ NOT Title Case. |
| Biometrics | biometrika | noun · transliteration. |
| Passcode | keçid kodu | noun · ⚠️ NOT `parol` (app password) — device unlock code. |
| **_Backup, import & UX_** | | |
| Backup | ehtiyat nüsxə / ehtiyat nüsxə çıxar | noun / verb · "backup copy". |
| Restore | bərpa et / bərpa | verb / noun · "restore". |
| Import | idxal et / idxal | verb / noun · "import". |
| Voucher | vauçer | noun · transliteration. |
| Redeem | nağdlaşdır / istifadə et | verb · "cash in / use". ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | göndər | verb · "send". |
| Receive | qəbul et / al | verb · "receive / get". |
| Settings | ayarlar | noun · "settings". |
| Confirm | təsdiq et | verb · "confirm"; "təsdiqlər" = confirmations (noun pl). |
| QR Code | QR kodu | noun · "QR code". |
| Clipboard | mübadilə buferi | noun · "clipboard". |
| Memo | qeyd | noun · "note". |
| Description | açıqlama | noun · "description". |
| Label | etiket | noun · "label". |
