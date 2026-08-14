# Urdu translation vocabulary (`ur.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

> RTL locale (Arabic script). Brand names appear in Latin script inside the surrounding Urdu text; the values below are the rendered form used in `loc/ur.json`. Urdu shares much technical/financial vocabulary with Arabic and Persian, so several renderings parallel `ar.md`; cross-checked against Bitcoin Core `bitcoin_ur.ts`, Electrum `ur/electrum.po` and ur.wikipedia.org where available.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · gloss: بٹ کوائن · ur.wikipedia.org/wiki/بٹ_کوائن (use in body text only). |
| Lightning | Lightning | brand kept Latin · gloss: لائٹننگ used in body text. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | noun unit + ticker; gloss بٹ کوائن · ur.wikipedia.org/wiki/بٹ_کوائن |
| sats / satoshi | ساتوشی | noun · transliteration · lowercase per convention. |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | بٹوہ / والٹ | noun · native "purse" / transliteration. |
| Vault | تجوری / خزانہ | noun · "safe / strongbox" · ⚠️ NOT a brand; translated. |
| Watch-only | صرف مشاہدہ | adj · "view-only" · ⚠️ NOT generic "view mode" / "read mode" — wallet type. |
| Hardware wallet | ہارڈ ویئر والٹ | noun · external signing device. |
| Seed | seed / بحالی فقرہ | noun · technical / mainstream · BIP39 mnemonic. |
| Mnemonic | یادداشتی فقرہ / بحالی فقرہ | noun · "recovery phrase". |
| Passphrase | خفیہ فقرہ | noun · ⚠️ NOT پاس ورڈ (password) — must be distinct. · Bitcoin Core ur |
| Public key | عوامی کلید | noun · target-locale lowercase. |
| Private key | نجی کلید | noun · target-locale lowercase. |
| WIF | WIF | acronym kept. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | ڈسکرپٹر | noun · output descriptor (transliteration; no native ur upstream). |
| Derivation path | اخذ کرنے کا راستہ | noun · BIP32 path. |
| Master fingerprint | ماسٹر فنگر پرنٹ | noun · root-key identifier (transliteration). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | لین دین | noun · standard Urdu for "transaction" · ur.wikipedia.org/wiki/بٹ_کوائن |
| Address | پتہ | noun. |
| Input | اِن پُٹ / مدخل | noun · tx input · ⚠️ NOT "login / entrance". |
| Output | آؤٹ پُٹ / مخرج | noun · tx output · ⚠️ NOT the UI recipient label "To:". |
| UTXO | UTXO | acronym kept; gloss: غیر خرچ شدہ لین دین کا مخرج. |
| Change | بقیہ | noun · "remainder / leftover" · ⚠️ NOT verb "to change/modify". |
| Hex | Hex / ہیکس | noun · Latin kept; transliteration in body · ⚠️ NOT "hash". |
| Pending | زیر التواء | adj/state · "pending" · ⚠️ NOT a noun. |
| Unconfirmed | غیر مصدقہ | adj · "unconfirmed". |
| Confirmed | مصدقہ | adj/state · "confirmed". |
| Mempool | میم پول | noun · transliteration (no native ur rendering). |
| Broadcast | نشر / نشر کریں | noun / verb · status vs button. |
| Block explorer | بلاک ایکسپلورر | noun · web service for on-chain data (transliteration). |
| Onchain | آن چین / بلاک چین پر | adj · compact / explanatory · Layer-1 filter chip. |
| Offchain | آف چین / بلاک چین سے باہر | adj · compact / explanatory · Lightning (L2) filter chip. |
| **_Fees & fee bumping_** | | |
| Fee | فیس | noun · network/mining fee. |
| Fee Bump | فیس میں اضافہ | noun · "fee increase". |
| RBF | RBF | acronym · gloss: فیس سے تبدیلی. |
| CPFP | CPFP | acronym · letters kept · ⚠️ NOT a verb · gloss: لین دین تیز کرنا. |
| Speed Up | تیز کریں | verb · UI button label. |
| **_Lightning_** | | |
| Invoice | انوائس / بل | noun · technical / mainstream. |
| Lightning Invoice | Lightning انوائس / Lightning ادائیگی کی درخواست | noun · pair "Lightning" (brand) with localised noun. |
| Preimage | پیش عکس | noun · math term: pre-image of a hash. |
| Payment | ادائیگی | noun · ⚠️ NOT the verb ادا کرنا — must be a noun. |
| Expired | میعاد ختم | adj/state · "validity ended". |
| **_Multisig & advanced addressing_** | | |
| Co-signer | شریک دستخط کنندہ | noun · ⚠️ NOT "co-owner" — must be a signer noun. |
| Quorum | نصاب / دستخط کی حد | noun · canonical / UI alternative. |
| PSBT | PSBT | acronym kept. |
| Provide signature | دستخط فراہم کریں | verb · sign a PSBT as co-signer. |
| BIP47 / Payment Code | BIP47 / ادائیگی کوڈ | acronym kept; "Payment Code" → ادائیگی کوڈ. |
| Notification transaction | اطلاعی لین دین | noun · BIP47 0-value announce tx (calque). |
| SilentPayment | Silent Payments / خاموش ادائیگیاں | brand kept Latin (plural); gloss "silent payments". |
| **_Coin control_** | | |
| Coin Control | کوائن کنٹرول / UTXO کنٹرول | noun · ⚠️ NOT Title Case (Urdu has no casing) · mainstream / technical. |
| Frozen | منجمد | adj/state · ⚠️ NOT verb "to freeze". |
| **_Security & storage_** | | |
| Encrypted storage | خفیہ کردہ اسٹوریج | noun · ⚠️ NOT Title Case · whole-app encryption. |
| Plausible Deniability | قابلِ یقین انکار | noun · ⚠️ NOT Title Case · deniable fake storage. |
| Biometrics | بایومیٹرکس | noun · Face ID / Touch ID / fingerprint (transliteration). |
| Passcode | پاس کوڈ | noun · ⚠️ NOT پاس ورڈ (app password) — distinct device-level code. |
| **_Backup, import & UX_** | | |
| Backup | بیک اپ / بیک اپ بنائیں | noun / verb · save outside app. |
| Restore | بحال کریں / بحالی | verb / noun · recreate from backup. |
| Import | درآمد / درآمد کریں | verb / noun · load from backup/external. |
| Voucher | واؤچر | noun · Azte.co prepaid voucher. |
| Redeem | بھنائیں | verb · "cash in / activate" · ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | بھیجیں | verb. |
| Receive | وصول کریں | verb. |
| Settings | ترتیبات | noun · app preferences. |
| Confirm | تصدیق کریں / تصدیق | verb / noun · button vs status; "confirmations" = تصدیقات. |
| QR Code | QR کوڈ | noun. |
| Clipboard | کلپ بورڈ | noun · OS clipboard (transliteration). |
| Memo | میمو / یادداشت | noun · sender note. |
| Description | تفصیل | noun · free-text label on a receive invoice. |
| Label | لیبل | noun · free-text annotation. |
