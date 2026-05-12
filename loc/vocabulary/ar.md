# Arabic translation vocabulary (`ar.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

> RTL locale. Brand names appear in Latin script inside the surrounding script; values below are the rendered form used in `loc/ar.json`.

RTL. Brand names appear in Latin inside Arabic text; the table below gives the Arabic rendering used.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / بيتكوين | Brand mostly kept in Latin. |
| Lightning | البرق / Lightning | "البرق" (lightning, the natural phenomenon) is used in body text, often with Latin "Lightning" in parens. |
| Electrum | Electrum | Brand. |
| LNDhub | LNDhub | — |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | GroundControl | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | BTC | — |
| sats / satoshi | ساتوشي / بالساتوشي | Transliteration. |
| sat/vByte | ساتوشي لكل بايت افتراضي | Lit. "satoshi per virtual byte". |
| vByte | بايت افتراضي | — |
| **_Wallet, keys & seeds_** | | |
| Wallet | محفظة / المحافظ | — |
| Vault | خزنة متعددة التواقيع | "خزنة" = vault. |
| Watch-only | للقراءة فقط | — |
| Hardware wallet | محفظة جهاز | — |
| Seed | عبارة الاسترداد | Lit. "recovery phrase". |
| Mnemonic | عبارة الاسترداد | Same as Seed. |
| Passphrase | عبارة المرور | Lit. "passphrase" — distinct from password. |
| Public key | المفتاح العام | — |
| Private key | المفتاح الخاص | — |
| WIF | WIF | — |
| xpub | xpub | — |
| Descriptor | TODO | — |
| Derivation path | مسار الاشتقاق | Note: shipped has redundant `(derivation path)` parenthetical. |
| Master fingerprint | البصمة الرئيسية | — |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | العملية / المعاملة | App uses "العملية" (operation); "المعاملة" (transaction) also common. |
| Address | العنوان | — |
| Input | TODO | — |
| Output | TODO | — |
| UTXO | TODO | — |
| Change | الباقي | TODO: shipped `cc.change` "تغيير" (alteration) — wrong context. |
| Hex | Hex | Latin kept. |
| Pending | قيد الانتظار | — |
| Unconfirmed | غير مؤكدة | — |
| Confirmed | مؤكدة | — |
| Mempool | الذاكرة المعلقة | — |
| Broadcast | البث | — |
| Block explorer | مستكشف الكتل | — |
| Onchain | TODO | — |
| Offchain | TODO | — |
| **_Fees & fee bumping_** | | |
| Fee | الرسوم | — |
| Fee Bump | السماح بزيادة الرسوم | — |
| RBF | RBF — الاستبدال بالرسوم | Acronym + Arabic gloss. |
| CPFP | تسريع المعاملة (CPFP) | Lit. "speed up the transaction". |
| Speed Up | تسريع العملية (RBF) | — |
| **_Lightning_** | | |
| Invoice | فاتورة / برقية | "فاتورة" for on-chain; "برقية" used specifically for LN invoice. |
| Lightning Invoice | برقية | Lit. "lightning-message" — creative calque. Note: also means "telegram" normally. |
| Preimage | TODO | Suggest "صورة أولية" or transliteration. |
| Payment | TODO | — |
| Expired | منتهية الصلاحية | — |
| **_Multisig & advanced addressing_** | | |
| Co-signer | TODO | — |
| Quorum | العدد | Lit. "the count". |
| PSBT | PSBT | — |
| Provide signature | قدم توقيعًا | — |
| BIP47 / Payment Code | TODO | — |
| Notification transaction | TODO | — |
| SilentPayment | TODO | — |
| **_Coin control_** | | |
| Coin Control | التحكم في العملات | — |
| Frozen | تجميد | — |
| **_Security & storage_** | | |
| Encrypted storage | TODO | — |
| Plausible Deniability | الإنكار المقبول | — |
| Biometrics | القياسات الحيوية | — |
| Passcode | TODO | — |
| **_Backup, import & UX_** | | |
| Backup | النسخ الاحتياطي | — |
| Restore | استعادة | — |
| Import | الاستيراد | — |
| Voucher | قسيمة | TODO: shipped uses "Atze.co" — typo. |
| Redeem | الاسترداد | — |
| Send | إرسال | — |
| Receive | استلام | — |
| Settings | الإعدادات | — |
| Confirm | التأكيد | — |
| QR Code | TODO | — |
| Clipboard | الحافظة | — |
| Memo | مذكرة | — |
| Description | الوصف | — |
| Label | علامة | — |
