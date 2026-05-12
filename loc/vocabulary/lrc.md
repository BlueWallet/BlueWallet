# Northern Luri translation vocabulary (`lrc.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

> RTL locale. Brand names appear in Latin script inside the surrounding script; values below are the rendered form used in `loc/lrc.json`.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · gloss: بیت کوین · lrc.wikipedia.org/wiki/Bitcoin. |
| Lightning | Lightning | brand kept Latin · gloss: لایتنینگ. |
| Electrum | Electrum | brand kept Latin · gloss: الکترام. |
| LNDhub | LNDhub | brand kept Latin. |
| LND | LND | brand kept Latin. |
| LNURL | LNURL | brand kept Latin. |
| Tor | Tor | brand kept Latin. |
| Orbot | Orbot | brand kept Latin. |
| GroundControl | GroundControl | brand kept Latin. |
| **_Units & amounts_** | | |
| bitcoin / BTC | بیت کوین | — |
| sats | ساتۊشی | — |
| sat/vByte | ساتۊشی/بایت مجازی | — |
| vByte | بایت مجازی | — |
| **_Wallet, keys & seeds_** | | |
| Wallet | کیف پیلٛ | Lit. "money pocket". |
| Vault | گاوصندوق | noun · lit. "safe/strongbox" · ⚠️ NOT a brand; translated · borrowed from fa: Luri shares vocabulary with Persian. |
| Watch-only | کیف پیلٛ ناظر | adj/noun · observer-wallet sense · ⚠️ NOT "view mode" · borrowed from fa: کیف پول ناظر. |
| Hardware wallet | کیف پیلٛ سخت ٱفزاری | noun · borrowed from fa: کیف پول سخت‌افزاری. |
| Seed | سید | — |
| Mnemonic | عبارت بازیابی | noun · "recovery phrase" · borrowed from fa: عبارت بازیابی. |
| Passphrase | پس فریز | — |
| Public key | کلٛیل عمومی | noun · uses lrc کلٛیل (key, per `_.wallet_key`) · borrowed from fa: کلید عمومی. |
| Private key | کلٛیل خصوصی | noun · borrowed from fa: کلید خصوصی. |
| WIF | WIF | acronym · letters kept. |
| xpub | xpub | acronym · lowercase per convention. |
| Descriptor | توصیف گر | noun · output descriptor · borrowed from fa: توصیف‌گر. |
| Derivation path | تۏر موشتق بیؽن | — |
| Master fingerprint | TODO | — |
| BIP38 | BIP38 | — |
| **_On-chain transactions_** | | |
| Transaction | تراکونش | — |
| Address | آدرس | — |
| Input | ورودی | noun · ⚠️ NOT "login/entrance" · borrowed from fa: ورودی. |
| Output | خروجی | noun · ⚠️ NOT the UI recipient label "و" (to:) · borrowed from fa: خروجی. |
| UTXO | UTXO | acronym · letters kept. |
| Change | باقی منه | Lit. "remaining". |
| Hex | هگزادسیمال | noun · ⚠️ NOT "hash" · borrowed from fa: هگزادسیمال. |
| Pending | د انتظار | adj/state · ⚠️ NOT noun "انتظار" · borrowed from fa: در انتظار. |
| Unconfirmed | تایید نبیه | adj/state · parallels lrc `مونقزی بیه` (expired) pattern · borrowed from fa: تأییدنشده. |
| Confirmed | تایید بیه | adj/state · ⚠️ shipped `تایید` is noun — adj/state needs `بیه` · borrowed from fa: تأییدشده. |
| Mempool | mempool | noun · technical Latin loan · borrowed from fa: mempool/حافظهٔ تراکنش‌ها. |
| Broadcast | مونتشر | — |
| Block explorer | گشت گر بلاک | noun · matches lrc `گشت گر` (explorer) in shipped strings. |
| Onchain | آنچین | adj · transliteration · borrowed from fa: آن‌چین. |
| Offchain | آفچین | adj · transliteration · borrowed from fa: آف‌چین. |
| **_Fees & fee bumping_** | | |
| Fee | کارمزد | — |
| Fee Bump | افزایش کارمزد | noun · borrowed from fa: افزایش کارمزد. |
| RBF | RBF | acronym · letters kept. |
| CPFP | CPFP | acronym · letters kept · ⚠️ NOT a verb. |
| Speed Up | تسریع | verb · UI button label · borrowed from fa: تسریع. |
| **_Lightning_** | | |
| Invoice | سۊرت هساو | Lit. "bill". |
| Lightning Invoice | سۊرت هساو لایتنینگ | — |
| Preimage | preimage | noun · technical Latin loan · borrowed from fa: preimage / پیش‌تصویر. |
| Payment | پرداخت | — |
| Expired | مونقزی بیه | — |
| **_Multisig & advanced addressing_** | | |
| Co-signer | امزا کوݩ هومبهر | — |
| Quorum | حد نصاب | noun · borrowed from fa: حد نصاب. |
| PSBT | PSBT | acronym · letters kept. |
| Provide signature | دین امزا | — |
| BIP47 / Payment Code | کود پرداخت | — |
| Notification transaction | تراکونش اعلان | noun · BIP47-specific · borrowed from fa: تراکنش اعلان. |
| SilentPayment | Silent Payments | brand kept Latin (plural per protocol name). |
| **_Coin control_** | | |
| Coin Control | مدیریت UTXO / مدیریت سکه‌ها | noun · ⚠️ NOT Title Case · borrowed from fa: مدیریت UTXO. |
| Frozen | مسدۊد | adj/state · "blocked" · ⚠️ NOT verb · borrowed from fa: مسدودشده / مسدود. |
| **_Security & storage_** | | |
| Encrypted storage | TODO | — |
| Plausible Deniability | انکار مووجه | noun · ⚠️ NOT Title Case · borrowed from fa: انکار موجه. |
| Biometrics | بیومتریک | — |
| Passcode | کد دسترسی | noun · ⚠️ NOT app password · borrowed from fa: کد دسترسی. |
| **_Backup, import & UX_** | | |
| Backup | نۏسخه لادرار | — |
| Restore | بازیابی | verb / noun · borrowed from fa: بازیابی. |
| Import | و مؽن اووردن | — |
| Voucher | بن / ووچر | noun · Azte.co prepaid voucher · borrowed from fa: بن / ووچر. |
| Redeem | فعال کردن | "activate". |
| Send | کلٛ کردن | — |
| Receive | گرتن | — |
| Settings | سامونیا | — |
| Confirm | تایید | — |
| QR Code | QR کود | noun · matches bqi pattern. |
| Clipboard | ویرگه | — |
| Memo | ویرداشت | — |
| Description | توضیحات | noun · borrowed from fa: توضیحات. |
| Label | برچسب | noun · ⚠️ must be noun, not verb · borrowed from fa: برچسب. |
