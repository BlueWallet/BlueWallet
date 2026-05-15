# Turkish translation vocabulary (`tr_tr.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · tr.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand kept Latin · tr.wikipedia.org/wiki/Lightning_Network |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker · tr.wikipedia.org/wiki/Bitcoin |
| sats | sat / satoshi | noun, lowercase · singular / plural · shipped singular `sat` · units.sats |
| sat/vByte | sat/vByte | technical unit, Latin kept; SegWit-aware. |
| vByte | vByte | technical unit; SegWit-discounted size. |
| **_Wallet, keys & seeds_** | | |
| Wallet | cüzdan | noun · shipped casing inconsistent (Title vs lower) · Bitcoin Core tr + Electrum tr |
| Vault | Kasa | noun · `Kasa` (= safe/strongbox) — master ships native. |
| Watch-only | yalnızca izleme / watch-only | adj · native compound preferred; English loanword acceptable in quotes · ⚠️ NOT "görüntüleme modu". |
| Hardware wallet | donanım cüzdanı | noun · native possessive compound preferred. |
| Seed | seed | noun · loanword retained for Bitcoin context; native equivalent rare. |
| Mnemonic | mnemonik | noun · transliterated loanword (Turkish-flavored). |
| Passphrase | parola | noun · ⚠️ NOT `şifre` (= app password) / NOT `PIN` (= passcode) — distinct word · Trezor tr + tr.wikipedia.org/wiki/Parola |
| Public key | açık anahtar | noun, lowercase · Electrum tr (Bitcoin Core tr uses `Ortak Anahtar`) |
| Private key | gizli anahtar | noun, lowercase · Bitcoin Core tr + Electrum tr |
| WIF | WIF | acronym · gloss: Wallet Import Format. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | descriptor / çıktı tanımlayıcı | noun · loanword / explanatory · Bitcoin Core tr keeps `descriptor` |
| Derivation path | türetme yolu | noun · Bitcoin Core tr + Electrum tr + Trezor tr |
| Master fingerprint | Ana Parmak İzi / fingerprint | noun · shipped `Ana Parmak İzi`; standalone `fingerprint` accepted as English loanword. |
| BIP38 | BIP38 | acronym kept · gloss: parola korumalı özel anahtar. ⚠️ NOT a verb / NOT just "parola". |
| **_On-chain transactions_** | | |
| Transaction | işlem | noun · shipped `transactions.transaction` · Bitcoin Core tr + Electrum tr |
| Address | adres | noun · shipped `details_address` · Bitcoin Core tr + Electrum tr |
| Input | girdi | noun · ⚠️ NOT "giriş" (login) when ambiguous · shipped `details_from` uses `Girdi` · Bitcoin Core tr + Electrum tr |
| Output | çıktı | noun · shipped `details_to` uses `Çıktı` · ⚠️ NOT recipient label "Kime:" · Bitcoin Core tr + Electrum tr |
| UTXO | UTXO | acronym · gloss: harcanmamış işlem çıktısı. |
| Change | para üstü | noun · ⚠️ NOT verb `değiştir` (= to change/modify) — coin-change noun · Electrum tr |
| Hex | hex / onaltılık | noun · compact / explanatory · shipped `broadcastNone` uses `Hex` · ⚠️ NOT "hash". |
| Pending | beklemede | adj/state · shipped `transactions.pending`. |
| Unconfirmed | onaylanmamış | adj · Bitcoin Core tr + Electrum tr |
| Confirmed | onaylanmış | adj/state · Electrum tr (Bitcoin Core tr uses `Doğrulandı`) |
| Mempool | mempool | noun · English loanword preferred · ⚠️ NOT `bellek havuzu`. |
| Broadcast | yayınla / yayın | verb / noun · button vs status · shipped `broadcastButton` `Yayınla`, `errors.broadcast` `Yayın`. |
| Block explorer | blok tarayıcısı | noun · native compound preferred; English loanword acceptable in technical contexts. |
| Onchain | zincir üstü / on-chain | adj · native preferred; English loanword in quoted contexts. |
| Offchain | zincir dışı / off-chain | adj · native preferred; English loanword in quoted contexts. |
| Mined | madenlenir / mine edilir | verb (passive) · native preferred; loanword acceptable. |
| ETA | ETA | acronym kept untranslated · ⚠️ NOT `Tahmini`. |
| **_Fees & fee bumping_** | | |
| Fee | ücret | noun · shipped `create_fee` `Ücret` · Bitcoin Core tr + Electrum tr |
| Fee Bump | ücret artırımı / ücret artırımına izin ver | compact / shipped explanatory · noun form preferred · Electrum tr (`Komisyonu yeniden ayarlayabilme`) |
| RBF | RBF—Replace by Fee | acronym + English gloss · ⚠️ NOT `Ücret-ile-Değiştirme`. |
| CPFP | CPFP—Child Pays for Parent | acronym + English gloss · ⚠️ NOT a verb · ⚠️ NOT `Çocuğun Ebeveyne Ödemesi`. |
| Speed Up | hızlandır | verb · UI button label for RBF · Phoenix tr + Trezor tr |
| **_Lightning_** | | |
| Invoice | fatura | noun · shipped `lightning_invoice` · Bitcoin Core tr + Electrum tr + Phoenix tr |
| Lightning Invoice | Lightning faturası | noun, possessive suffix · shipped `lndViewInvoice.lightning_invoice` |
| Preimage | Pre-image | noun · English loanword kept (no established native form). |
| Payment | ödeme | noun · ⚠️ NOT verb `öde` · Electrum tr + Phoenix tr |
| Expired | süresi doldu | adj/state · shipped `lnd.expired`. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | ortak imzalayan | noun · ⚠️ NOT `ortak sahip` (= co-owner) · Electrum tr |
| Quorum | yetersayı / Quorum | noun · native preferred; loanword acceptable in technical contexts. |
| PSBT | PSBT | acronym · gloss: kısmen imzalanmış Bitcoin işlemi (BIP174) · Bitcoin Core tr |
| Provide signature | imza sağla / işlemi imzala | verb · generic / specific · shipped `co_sign_transaction` uses `Bir işlemi imzalayın`. |
| BIP47 / Payment Code | BIP47 / ödeme kodu | acronym kept; `Payment Code` rendered native `ödeme kodu`. |
| Notification transaction | bildirim işlemi | noun · BIP47-specific 0-value tx. |
| SilentPayment | Silent Payments / sessiz ödemeler | protocol name kept English (plural); explanatory `sessiz ödemeler` if needed. |
| **_Coin control_** | | |
| Coin Control | Para kontrolü / Coin Control | noun · native compound preferred; loanword acceptable. |
| Frozen | donmuş | adj/state · ⚠️ NOT verb `dondur` (= to freeze) · Electrum tr |
| **_Security & storage_** | | |
| Encrypted storage | şifreli depolama | noun · ⚠️ NOT Title Case · shipped `_.storage_is_encrypted` uses `Depolama alanınız şifrelenmiş`. |
| Plausible Deniability | makul ret / makul inkâr edilebilirlik | noun · ⚠️ NOT Title Case · shipped / canonical · tr.wikipedia.org/wiki/Makul_inkar_edilebilirlik |
| Biometrics | biyometrikler / biyometrik doğrulama | noun · shipped `settings.biometrics` · Phoenix tr (`Biyometrik doğrulama`) |
| Passcode | PIN / cihaz kodu | noun · ⚠️ NOT `şifre` / NOT `parola` — device-level code · Electrum tr + Trezor tr (`PIN kodu`) |
| **_Backup, import & UX_** | | |
| Backup | yedek / yedekle | noun / verb · shipped `export_title` uses verb `yedekle`. |
| Restore | geri yükle / geri yükleme | verb / noun · Bitcoin Core tr + Electrum tr |
| Import | içe aktar / içeri yükle | verb · shipped uses both `İçe Aktar` (`import_do_import`) and `içeri yükle` (`import_title`). |
| Voucher | kupon | noun · shipped `azteco.title` (`Azte.co kuponu`). |
| Redeem | bozdur / yükle | verb · ⚠️ NOT "satın al" — activate/cash-in · shipped `azteco.redeem` `Cüzdana yükle`, `redeemButton` `Yükle`. |
| Send | gönder | verb · shipped `send.header`. |
| Receive | al | verb · shipped `receive.header`. |
| Settings | ayarlar | noun · shipped `settings.header`. |
| Confirm | onayla / onay | verb / noun · plural noun `onaylar` for on-chain confirmations · shipped `confirm_header` `Onayla`. |
| QR Code | QR kodu | noun · Bitcoin Core tr + Electrum tr |
| Clipboard | pano | noun · shipped `_.clipboard` · Bitcoin Core tr + Electrum tr |
| Memo | not | noun · shipped `send.create_memo`. |
| Description | açıklama | noun · shipped `receive.details_label`. |
| Label | etiket | noun · shipped `cc.sort_label` · Electrum tr + Trezor tr |
