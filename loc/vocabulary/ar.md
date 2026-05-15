# Arabic translation vocabulary (`ar.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

> RTL locale. Brand names appear in Latin script inside the surrounding script; values below are the rendered form used in `loc/ar.json`.

RTL. Brand names appear in Latin inside Arabic text; the table below gives the Arabic rendering used.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · gloss: بيتكوين · ar.wikipedia.org/wiki/بيتكوين. |
| Lightning | Lightning | brand kept Latin · gloss: البرق (lit. "lightning") used in body text. |
| Electrum | Electrum | Brand. |
| LNDhub | LNDhub | — |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | GroundControl | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats / satoshi | ساتوشي | noun · Transliteration · lowercase per convention. |
| sat/vByte | ساتوشي لكل بايت افتراضي | Lit. "satoshi per virtual byte". |
| vByte | بايت افتراضي | — |
| **_Wallet, keys & seeds_** | | |
| Wallet | محفظة / المحافظ | — |
| Vault | خزنة | noun · "safe/strongbox" · ⚠️ NOT a brand; translated. |
| Watch-only | للقراءة فقط | adj · ⚠️ NOT "view mode" / NOT "read mode" — wallet type. |
| Hardware wallet | محفظة جهاز | noun · external signing device. · Bitcoin Core ar |
| Seed | seed / عبارة الاسترداد | noun · technical / mainstream · BIP39 mnemonic. |
| Mnemonic | عبارة الاسترداد | noun · "recovery phrase". |
| Passphrase | عبارة المرور | ⚠️ NOT كلمة المرور (password) — must be distinct. Lit. "passphrase". · Bitcoin Core ar |
| Public key | المفتاح العام | — |
| Private key | المفتاح الخاص | — |
| WIF | WIF | — |
| xpub | xpub | — |
| Descriptor | واصف | Lit. "descriptor". · Bitcoin Core ar |
| Derivation path | مسار الاشتقاق | Note: shipped has redundant `(derivation path)` parenthetical. |
| Master fingerprint | البصمة الرئيسية | — |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | المعاملة / العملية | noun · canonical / UI alternative · "المعاملة" canonical; app ships "العملية". · Bitcoin Core ar |
| Address | العنوان | — |
| Input | مدخل / مدخلات | tx input (noun). · Bitcoin Core ar |
| Output | مخرج / مخرجات | tx output (noun). ⚠️ NOT the UI label "إلى:" (To:). · Bitcoin Core ar |
| UTXO | UTXO | Acronym kept. Gloss: مخرج معاملة غير منفق. · Bitcoin Core ar |
| Change | الباقي | ⚠️ NOT تغيير (verb "to change/alter"). Shipped `cc.change` ships تغيير — should be الباقي (remainder). |
| Hex | Hex | Latin kept. |
| Pending | قيد الانتظار | — |
| Unconfirmed | غير مؤكدة | — |
| Confirmed | مؤكدة | — |
| Mempool | الذاكرة المعلقة | — |
| Broadcast | بث / إذاعة | verb / noun · button vs status. |
| Block explorer | مستكشف الكتل | noun · web service for on-chain data. · Bitcoin Core ar |
| Onchain | أون-تشين / على السلسلة | adj · compact / explanatory · Layer-1 filter chip. |
| Offchain | أوف-تشين / خارج السلسلة | adj · compact / explanatory · Lightning (L2) filter chip. |
| **_Fees & fee bumping_** | | |
| Fee | الرسوم | — |
| Fee Bump | السماح بزيادة الرسوم | — |
| RBF | RBF — الاستبدال بالرسوم | Acronym + Arabic gloss. |
| CPFP | CPFP | acronym · letters kept · gloss: تسريع المعاملة. |
| Speed Up | تسريع العملية | verb · UI button label. |
| **_Lightning_** | | |
| Invoice | فاتورة / برقية | "فاتورة" for on-chain; "برقية" used specifically for LN invoice. |
| Lightning Invoice | فاتورة Lightning / طلب دفع Lightning | noun · pair "Lightning" (brand) with localised noun · ⚠️ NOT برقية (telegram). |
| Preimage | صورة أولية | Math term: pre-image of a hash. |
| Payment | دفعة / مدفوعات | ⚠️ NOT the verb دفع/يدفع — must be noun. · Bitcoin Core ar · ar.wikipedia.org/wiki/شبكة_البرق |
| Expired | منتهية الصلاحية | — |
| **_Multisig & advanced addressing_** | | |
| Co-signer | شريك التوقيع | ⚠️ NOT شريك ملكية (co-owner) — must be a signer noun. · Electrum ar_SA |
| Quorum | النصاب / عتبة التوقيعات | noun · canonical / UI alternative. |
| PSBT | PSBT | — |
| Provide signature | قدم توقيعًا | — |
| BIP47 / Payment Code | BIP47 / رمز الدفع | Acronym kept; "Payment Code" → رمز الدفع (literal). |
| Notification transaction | معاملة الإشعار | BIP47 0-value announce tx. Literal calque. |
| SilentPayment | Silent Payments / المدفوعات الصامتة | Brand kept in Latin; gloss "silent payments". |
| **_Coin control_** | | |
| Coin Control | التحكم في UTXO / التحكم في العملات | noun · ⚠️ NOT Title Case · technical / mainstream. |
| Frozen | مجمدة | ⚠️ NOT تجميد (gerund "freezing") and NOT verb جمّد — use adj/state form. |
| **_Security & storage_** | | |
| Encrypted storage | التخزين المشفر | Lit. "the encrypted storage". · Bitcoin Core ar (محفظة مشفرة) |
| Plausible Deniability | الإنكار المقبول | noun · ⚠️ NOT Title Case. |
| Biometrics | القياسات الحيوية | — |
| Passcode | رمز المرور | ⚠️ NOT كلمة المرور (app password) — distinct device-level code. |
| **_Backup, import & UX_** | | |
| Backup | النسخ الاحتياطي / إنشاء نسخة احتياطية | noun / verb · save outside app. |
| Restore | استعادة / الاستعادة | verb / noun · recreate from backup. |
| Import | استيراد / الاستيراد | verb / noun · load from backup/external. |
| Voucher | قسيمة | Note: shipped Azteco strings reference `Atze.co` — typo, should be `Azte.co`. |
| Redeem | الاسترداد | ⚠️ NOT "buy to wallet" / NOT "transfer" — sense is "cash in / activate" the voucher. |
| Send | إرسال | — |
| Receive | استلام | — |
| Settings | الإعدادات | — |
| Confirm | تأكيد / التأكيد | verb / noun · button vs status. |
| QR Code | رمز QR / رمز الاستجابة السريعة | Compact + explanatory. · ar.wikipedia.org/wiki/رمز_استجابة_سريعة |
| Clipboard | الحافظة | — |
| Memo | مذكرة | — |
| Description | الوصف | — |
| Label | علامة | — |
