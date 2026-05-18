# Persian translation vocabulary (`fa.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

> RTL locale. Brand names appear in Latin script inside the surrounding script; values below are the rendered form used in `loc/fa.json`.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / بیت‌کوین | brand kept Latin; بیت‌کوین in body text · fa.wikipedia.org/wiki/بیت‌کوین |
| Lightning | Lightning / لایتنینگ | brand kept Latin; transliteration in body text. |
| Electrum | Electrum | brand kept Latin · Persian gloss `الکترام` only in explanatory text. |
| LNDhub | LNDhub | brand kept Latin. |
| LND | LND | brand kept Latin. |
| LNURL | LNURL | brand kept Latin. |
| Tor | Tor | brand kept Latin · fa.wikipedia.org/wiki/تور_(شبکه) |
| Orbot | Orbot | brand kept Latin. |
| GroundControl | GroundControl | brand kept Latin. |
| **_Units & amounts_** | | |
| bitcoin / BTC | بیت‌کوین / BTC | noun unit + ticker; ticker Latin. |
| sats | ساتوشی | noun; transliteration of "satoshi". |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin · gloss: ساتوشی بر بایت مجازی. |
| vByte | vByte | technical unit · gloss: بایت مجازی. |
| **_Wallet, keys & seeds_** | | |
| Wallet | کیف پول | noun · lit. "money bag". |
| Vault | گاوصندوق | noun · lit. "safe/strongbox" · ⚠️ NOT a brand; translated. |
| Watch-only | فقط‌خواندنی / کیف پول ناظر | adj · read-only / observer-wallet sense · Bitcoin Core fa "فقط دیدنی". |
| Hardware wallet | کیف پول سخت‌افزاری | noun. |
| Seed | سید / عبارت بازیابی | noun · technical / mainstream. |
| Mnemonic | عبارت یادیار / عبارت بازیابی | noun · technical / mainstream. |
| Passphrase | عبارت عبور | noun · ⚠️ NOT `گذرواژه` (= password) and NOT `رمز عبور`. App ships `پس‌فریز (Passphrase)` — distinct from password. |
| Public key | کلید عمومی | noun. |
| Private key | کلید خصوصی | noun. |
| WIF | WIF | acronym · gloss: قالب وارد‌کردن کیف پول. |
| xpub | xpub | acronym · prefer lowercase · ⚠️ shipped `XPUB` uppercase — vocabulary prefers `xpub`. |
| Descriptor | توصیف‌گر | noun · math/script-template sense. |
| Derivation path | مسیر اشتقاق | noun. |
| Master fingerprint | اثر انگشت اصلی / اثر انگشت کلید مادر | noun · short / explanatory. |
| BIP38 | BIP38 | acronym · gloss: کلید خصوصی محافظت‌شده با گذرواژه. ⚠️ NOT a verb. |
| **_On-chain transactions_** | | |
| Transaction | تراکنش | noun. |
| Address | آدرس | noun. |
| Input | ورودی / ورودی تراکنش | noun · short / full · ⚠️ NOT "login/entrance" sense. |
| Output | خروجی / خروجی تراکنش | noun · short / full · ⚠️ NOT the UI recipient label "به:". |
| UTXO | UTXO | acronym · gloss: خروجی تراکنش خرج‌نشده. |
| Change | باقی‌مانده / آدرس باقی‌مانده | noun · ⚠️ NOT verb "تغییر دادن". `باقی‌مانده` = leftover; `آدرس باقی‌مانده` for change-address. Bitcoin Core fa. |
| Hex | hex / هگزادسیمال | noun · short / explanatory · Latin `hex` is an intentional loanword (glossary-allowed); target-script form is the explanatory `هگزادسیمال` · ⚠️ NOT "hash" and NOT "دادهٔ تراکنش". |
| Pending | در انتظار ثبت / در انتظار | adj/state · body / chip. ⚠️ NOT noun "انتظار". |
| Unconfirmed | تأییدنشده | adj/state · Bitcoin Core fa. |
| Confirmed | تأییدشده / تأیید | adj/state · recommended `تأییدشده` (adj/state) vs shipped `تأیید` (noun "confirmation") · ⚠️ state form needs the `-شده` suffix. |
| Mempool | حافظهٔ تراکنش‌ها / mempool | noun · explanatory Persian / technical Latin · common noun (not a brand) · Bitcoin Core fa. |
| Broadcast | انتشار / منتشر کردن | noun / verb · button vs status · Electrum fa. |
| Block explorer | مرورگر بلاک / کاوشگر بلاک | noun · short / explanatory. |
| Onchain | آن‌چین / روی زنجیره | adj · compact (chip) / explanatory (body). |
| Offchain | آف‌چین / خارج از زنجیره | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | کارمزد | noun. |
| Fee Bump | افزایش کارمزد | noun. |
| RBF | RBF | acronym · gloss: جایگزینی با کارمزد بالاتر / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: فرزند به‌جای والد می‌پردازد. ⚠️ NOT a verb like "ایجاد". |
| Speed Up | تسریع | verb · UI button label · ⚠️ shipped `افزایش کارمزد` collides with `Fee Bump` — use `تسریع` to disambiguate. |
| **_Lightning_** | | |
| Invoice | صورت‌حساب / فاکتور | noun · mainstream / technical · Electrum fa uses `فاکتور`. |
| Lightning Invoice | صورت‌حساب Lightning / فاکتور Lightning | noun · brand kept Latin + Persian noun. |
| Preimage | پیش‌تصویر / preimage | noun · math-translation / technical Latin · ⚠️ NOT "تصویر پیشین". |
| Payment | پرداخت | noun · ⚠️ NOT verb "پرداختن". |
| Expired | منقضی‌شده / منقضی | adj/state. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | هم‌امضاکننده / امضاکنندهٔ مشترک | noun · ⚠️ NOT "هم‌مالک" (co-owner) · Bitcoin Core fa "امضاکننده". |
| Quorum | حد نصاب / آستانهٔ امضا | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · gloss: تراکنش بیت‌کوینی به‌صورت جزئی امضاشده. |
| Provide signature | ارائهٔ امضا / امضای تراکنش | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / کد پرداخت | acronym kept Latin; "Payment Code" → `کد پرداخت`. ⚠️ shipped `بیپ47` (transliteration) — prefer Latin `BIP47`. |
| Notification transaction | تراکنش اعلان / تراکنش آگاه‌سازی | noun · BIP47-specific. |
| SilentPayment | Silent Payments / پرداخت‌های خاموش | protocol name kept Latin (plural); explanatory `پرداخت‌های خاموش`. |
| **_Coin control_** | | |
| Coin Control | مدیریت UTXO / مدیریت کوین‌ها | noun · technical / mainstream · ⚠️ NOT Title Case. |
| Frozen | مسدودشده / مسدود | adj/state · ⚠️ NOT verb "مسدودکردن". |
| **_Security & storage_** | | |
| Encrypted storage | فضای ذخیره‌سازی رمزگذاری‌شده | noun · ⚠️ NOT Title Case. |
| Plausible Deniability | انکار موجه / امکان انکار موجه | noun · short / explanatory · ⚠️ NOT Title Case. |
| Biometrics | بیومتریک / احراز هویت بیومتریک | noun · short / explanatory. |
| Passcode | رمز دستگاه / کد عبور دستگاه | noun · ⚠️ NOT `گذرواژه` (= app password) — shipped `گذرواژه` collides with password; use a distinct device-level word. |
| **_Backup, import & UX_** | | |
| Backup | نسخهٔ پشتیبان / تهیهٔ نسخهٔ پشتیبان | noun / verb. |
| Restore | بازیابی / بازیابی کردن | noun / verb. |
| Import | وارد کردن / وارد‌سازی | verb / noun. |
| Voucher | بن / کوپن | noun · ⚠️ shipped `کد تخفیف` (= discount code) — fix. `بن` = voucher; `کوپن` = coupon-style fallback. |
| Redeem | فعال‌سازی / نقد کردن | verb · activate / cash-in · matches glossary intent. App ships `فعال‌سازی` — OK. |
| Send | ارسال / فرستادن | verb. |
| Receive | دریافت | verb. |
| Settings | تنظیمات | noun. |
| Confirm | تأیید / تأیید کردن | noun / verb · `تأییدیه` (plural `تأییدیه‌ها`) for tx-block confirmations. |
| QR Code | کد QR | noun. |
| Clipboard | کلیپ‌بورد / حافظهٔ موقت | noun · loanword / explanatory. |
| Memo | یادداشت | noun. |
| Description | توضیحات / شرح | noun · standard / shipped. |
| Label | برچسب | noun. |
