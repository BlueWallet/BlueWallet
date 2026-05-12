# Hebrew translation vocabulary (`he.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

> RTL locale. Hebrew has no letter case; "lowercase" rules don't apply. Brand rows stay in Latin script. Acronyms keep English letters. Hebrew is gendered — noun forms here default to the form used in the shipped `loc/he.json`.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / ביטקוין | brand kept Latin; ביטקוין in explanatory text · he.wikipedia.org/wiki/ביטקוין |
| Lightning | Lightning / ברק | brand · shipped UI uses native ברק ("lightning bolt"); Latin Lightning acceptable · he.wikipedia.org/wiki/רשת_הברק |
| Electrum | Electrum | brand · keep Latin (shipped אלקטרום is a transliteration). |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | ביטקוין / BTC | noun unit + ticker. |
| sats | סאטושי / sats | noun · transliteration / Latin · plural also סאטושיים. |
| sat/vByte | sat/vByte | technical unit; keep Latin · ⚠️ shipped `סאטושי עבור vByte` drops the `v` semantics — prefer Latin token. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | ארנק | noun · singular form; shipped header uses plural ארנקים. |
| Vault | כספת / כספת רבת-חתימות | noun · ⚠️ NOT a brand; כספת = "safe/strongbox". Long form clarifies multisig context. |
| Watch-only | לצפייה בלבד / ארנק לצפייה בלבד | adj · short / full · Bitcoin Core he + Electrum he |
| Hardware wallet | ארנק חומרה | noun · Electrum he |
| Seed | גרעין / מילות שחזור | noun · technical (lit. "kernel", shipped) / mainstream "recovery words". Avoid זרע (Electrum he) — sexual connotation in modern Hebrew UI. |
| Mnemonic | פסוקית מנמונית / מילות שחזור | noun · technical / mainstream. |
| Passphrase | מילת צופן / ביטוי סיסמה | noun · ⚠️ NOT סיסמה (= password) · Bitcoin Core he uses "החלפת מילת צופן" for Change Passphrase. Shipped `סיסמה` collides with password — TODO in he.json. |
| Public key | מפתח ציבורי | noun · Electrum he + Bitcoin Core he |
| Private key | מפתח פרטי | noun · Electrum he + Bitcoin Core he |
| WIF | WIF | acronym · gloss: פורמט ייבוא ארנק. |
| xpub | xpub | acronym, prefer lowercase · ⚠️ shipped `מפתח צפייה` ("view key") conflates with watch-only — keep `xpub` as the term. |
| Descriptor | דסקריפטור / מתאר פלט | noun · transliteration / explanatory. |
| Derivation path | נתיב גזירה | noun · Electrum he + Bitcoin Core he (shipped). |
| Master fingerprint | טביעת אצבע ראשית | noun · Electrum he (shipped). |
| BIP38 | BIP38 | acronym · gloss: מפתח פרטי מוצפן בסיסמה. |
| **_On-chain transactions_** | | |
| Transaction | עסקה | noun · ⚠️ FIX: shipped `פעולה` (= "action") is non-standard. Bitcoin Core he + Electrum he + he.wikipedia.org/wiki/ביטקוין all use עסקה. |
| Address | כתובת | noun · Bitcoin Core he + Electrum he |
| Input | קלט / קלט עסקה | noun · short / full · Electrum he |
| Output | פלט / פלט עסקה | noun · short / full · ⚠️ NOT the UI "To:" label · Electrum he |
| UTXO | UTXO | acronym · gloss: פלט עסקה לא מנוצל. |
| Change | עודף / כתובת עודף | noun · ⚠️ NOT verb "לשנות"; עודף = leftover. `כתובת עודף` for change-address · Electrum he (shipped). |
| Hex | הקסדצימלי / hex | noun · ⚠️ FIX: shipped `קלט גיבוב פעולה` means "tx hash input" — wrong. Use Latin `hex` or transliteration. ⚠️ NOT "hash" / NOT "נתוני העסקה" (= "transaction data"). |
| Pending | ממתין / ממתינה | adj · masc / fem · shipped. |
| Unconfirmed | לא מאושרת / לא אושרה | adj · adj-form / state · Electrum he `לא מאושר` |
| Confirmed | מאושרת / אושרה | adj · adj-form / state · shipped uses אושר/לא אושרה inconsistently. |
| Mempool | ממפול / מאגר עסקאות לא מאושרות | noun · transliteration / explanatory · Electrum he uses long form. |
| Broadcast | שידור / לשדר | noun / verb · shipped uses שידור (noun) for button label. |
| Block explorer | סייר בלוקים | noun · shipped. |
| Onchain | בשרשרת / על השרשרת | adj · compact (chip) / explanatory · Electrum he `בשרשרת` / `שרשרתית`. |
| Offchain | מחוץ לשרשרת | adj · explanatory · Lightning (L2) filter. |
| **_Fees & fee bumping_** | | |
| Fee | עמלה | noun · Bitcoin Core he + Electrum he. |
| Fee Bump | הקפצת עמלה / העלאת עמלה | noun · shipped / alt · Bitcoin Core he uses "החלפה על ידי עמלה" for RBF. |
| RBF | RBF | acronym · gloss: החלפה על ידי עמלה / Replace-By-Fee · Bitcoin Core he. |
| CPFP | CPFP | acronym · gloss: עסקת ילד משלמת על ההורה · ⚠️ NOT a verb. |
| Speed Up | האצה / להאיץ | noun / verb · button label. Shipped `העלאת עמלה` = "raise fee" — semantically OK but verbose. |
| **_Lightning_** | | |
| Invoice | חשבונית | noun · Electrum he + Bitcoin Core he. |
| Lightning Invoice | חשבונית Lightning / חשבונית ברק | noun · Latin brand / native shipped form. |
| Preimage | תמונה מקורית / preimage | noun · math term (lit. "pre-image") / Latin fallback acceptable in technical UI · he.wikipedia hash-function article frames it as `קושי בהיפוך` (preimage resistance); Latin form preferred when terse. |
| Payment | תשלום | noun · ⚠️ NOT verb "לשלם" · shipped. |
| Expired | פג / פג תוקף | adj · short (shipped) / explanatory · Electrum he `פג התוקף`. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | חותם משותף / חותם-שותף | noun · ⚠️ NOT "שותף" (= partner) alone · Electrum he `חותֵם-במשותף`. Shipped חותם-שותף acceptable. |
| Quorum | קוורום / סף חתימות | noun · transliteration / UI-clear. |
| PSBT | PSBT | acronym · gloss: עסקת ביטקוין חתומה חלקית · Bitcoin Core he. |
| Provide signature | לספק חתימה / חתימה | verb / noun · shipped imperative `ספקו חתימה`. |
| BIP47 / Payment Code | BIP47 / קוד תשלום | acronym kept; "Payment Code" → "קוד תשלום". |
| Notification transaction | עסקת התראה | noun · BIP47-specific (was `פעולת התראה`). |
| SilentPayment | Silent Payments / תשלום שקט | brand kept English (plural); explanatory shipped `תשלום שקט`. |
| **_Coin control_** | | |
| Coin Control | ניהול UTXO / שליטת מטבעות | noun · technical / mainstream (shipped). |
| Frozen | מוקפא / מוקפאת | adj · masc / fem · ⚠️ NOT verb "להקפיא". Shipped also uses noun הקפאה for the action. |
| **_Security & storage_** | | |
| Encrypted storage | אחסון מוצפן / הצפנת אחסון | noun · shipped uses both forms. |
| Plausible Deniability | יכולת הכחשה סבירה | noun · shipped · en.wikipedia.org/wiki/Plausible_deniability. |
| Biometrics | זיהוי ביומטרי / ביומטריה | noun · shipped (long form). |
| Passcode | קוד גישה / קוד מכשיר | noun · ⚠️ NOT סיסמה (= password); shipped `סיסמה` collides — TODO in he.json. |
| **_Backup, import & UX_** | | |
| Backup | גיבוי / לגבות | noun / verb · Bitcoin Core he + Electrum he. |
| Restore | שחזור / לשחזר | noun / verb · Bitcoin Core he (`שחזור ארנק`). |
| Import | ייבוא / לייבא | noun / verb · Electrum he `ייבא`; shipped uses יבוא (defective spelling) — prefer ייבוא. |
| Voucher | שובר | noun · shipped. |
| Redeem | לממש / מימוש | verb / noun · ⚠️ NOT "לקנות" (buy); shipped `מימוש`. |
| Send | שליחה / לשלוח | noun / verb · shipped noun for nav label; Electrum he `שלח`. |
| Receive | קבלה / לקבל | noun / verb · shipped noun for nav label; Electrum he `קבל`. |
| Settings | הגדרות | noun · Electrum he + shipped. |
| Confirm | אישור / לאשר | noun / verb · shipped. |
| QR Code | קוד QR | noun · Electrum he + Bitcoin Core he. |
| Clipboard | לוח / לוח גזירים | noun · short (Electrum he) / explanatory (Bitcoin Core he, shipped). Avoid Latin "clipboard" transliteration `קליפבורד`. |
| Memo | תזכיר / הערה | noun · shipped / alt. |
| Description | תיאור | noun · Electrum he + shipped. |
| Label | תווית | noun · Electrum he + shipped. |
