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
| Vault | kasa | noun · ⚠️ NOT Latin "Vault"; `kasa` = safe/strongbox in Turkish. |
| Watch-only | yalnızca izleme / yalnızca izlenen cüzdan | adj · short / explanatory · ⚠️ NOT "görüntüleme modu" — it's a wallet type · Bitcoin Core tr + Trezor tr |
| Hardware wallet | donanım cüzdanı | noun, possessive compound · Bitcoin Core tr + Trezor tr |
| Seed | seed / kurtarma ifadesi | noun · technical loanword / mainstream "recovery phrase" · shipped `_.seed` keeps `Seed` |
| Mnemonic | anımsatıcı ifade / kurtarma ifadesi | noun · technical / mainstream · Electrum tr uses `Tohum` for seed |
| Passphrase | parola | noun · ⚠️ NOT `şifre` (= app password) / NOT `PIN` (= passcode) — distinct word · Trezor tr + tr.wikipedia.org/wiki/Parola |
| Public key | açık anahtar | noun, lowercase · Electrum tr (Bitcoin Core tr uses `Ortak Anahtar`) |
| Private key | gizli anahtar | noun, lowercase · Bitcoin Core tr + Electrum tr |
| WIF | WIF | acronym · gloss: Wallet Import Format. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | descriptor / çıktı tanımlayıcı | noun · loanword / explanatory · Bitcoin Core tr keeps `descriptor` |
| Derivation path | türetme yolu | noun · Bitcoin Core tr + Electrum tr + Trezor tr |
| Master fingerprint | ana parmak izi | noun · Trezor tr uses `Parmak izi` |
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
| Mempool | bellek havuzu / mempool | noun · explanatory / loanword · Electrum tr + Bitcoin Core tr (`Bellek Alanı`) |
| Broadcast | yayınla / yayın | verb / noun · button vs status · shipped `broadcastButton` `Yayınla`, `errors.broadcast` `Yayın` · Bitcoin Core tr + Electrum tr |
| Block explorer | blok tarayıcısı | noun · Bitcoin Core tr |
| Onchain | zincir üstü / on-chain | adj · compact (chip) / loanword (body). |
| Offchain | zincir dışı / off-chain | adj · compact (chip) / loanword (body). |
| **_Fees & fee bumping_** | | |
| Fee | ücret | noun · shipped `create_fee` `Ücret` · Bitcoin Core tr + Electrum tr |
| Fee Bump | ücret artırımı / ücret artırımına izin ver | compact / shipped explanatory · noun form preferred · Electrum tr (`Komisyonu yeniden ayarlayabilme`) |
| RBF | RBF | acronym · gloss: ücret-ile-değiştirme (komisyonu yeniden ayarlayabilme) · Electrum tr |
| CPFP | CPFP | acronym · gloss: ebeveyn için çocuk ödeme · ⚠️ NOT a verb · Electrum tr |
| Speed Up | hızlandır | verb · UI button label for RBF · Phoenix tr + Trezor tr |
| **_Lightning_** | | |
| Invoice | fatura | noun · shipped `lightning_invoice` · Bitcoin Core tr + Electrum tr + Phoenix tr |
| Lightning Invoice | Lightning faturası | noun, possessive suffix · shipped `lndViewInvoice.lightning_invoice` |
| Preimage | ön görüntü / preimage | noun · math term / loanword · cryptographic preimage. |
| Payment | ödeme | noun · ⚠️ NOT verb `öde` · Electrum tr + Phoenix tr |
| Expired | süresi doldu | adj/state · shipped `lnd.expired`. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | ortak imzalayan | noun · ⚠️ NOT `ortak sahip` (= co-owner) · Electrum tr |
| Quorum | yetersayı / imza eşiği | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · gloss: kısmen imzalanmış Bitcoin işlemi (BIP174) · Bitcoin Core tr |
| Provide signature | imza sağla / işlemi imzala | verb · generic / specific · shipped `co_sign_transaction` uses `Bir işlemi imzalayın`. |
| BIP47 / Payment Code | BIP47 / ödeme kodu | acronym kept; `Payment Code` → `ödeme kodu`. |
| Notification transaction | bildirim işlemi | noun · BIP47-specific 0-value tx. |
| SilentPayment | Silent Payments / sessiz ödemeler | protocol name kept English (plural); explanatory `sessiz ödemeler` if needed. |
| **_Coin control_** | | |
| Coin Control | coin control / para kontrolü | noun · ⚠️ NOT Title Case · loanword / mainstream · Bitcoin Core tr (`Para kontrolü`) + Electrum tr (`Para yönetimi`) |
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
