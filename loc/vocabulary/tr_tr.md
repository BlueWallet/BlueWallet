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
| Vault | Kasa / Vault | noun · `Kasa` (= safe/strongbox) shipped; English `Vault` accepted in technical contexts. |
| Watch-only | watch-only / yalnızca izleme | adj · English loanword preferred (TR Bitcoin community uses `watch-only`) · explanatory `yalnızca izleme` if needed · ⚠️ NOT "görüntüleme modu". |
| Hardware wallet | hardware wallet / donanım cüzdanı | noun · English loanword preferred in TR Bitcoin community; possessive compound `donanım cüzdanı` accepted. |
| Seed | seed | noun · English loanword preferred · ⚠️ NOT `anımsatıcı` / NOT `tohum`. |
| Mnemonic | mnemonic / mnemonik | noun · English loanword preferred · ⚠️ NOT `anımsatıcı`. |
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
| Block explorer | block explorer / blok tarayıcısı | noun · English loanword preferred in TR Bitcoin community; explanatory `blok tarayıcısı` accepted. |
| Onchain | on-chain | adj · English loanword preferred · ⚠️ NOT `zincir üstü`. |
| Offchain | off-chain | adj · English loanword preferred · ⚠️ NOT `zincir dışı`. |
| Mined | mine edilir | verb (passive) · loanword verb preferred · ⚠️ NOT `madenlenir`. |
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
| Preimage | Pre-image | noun · English loanword preferred · ⚠️ NOT `ön görüntü`. |
| Payment | ödeme | noun · ⚠️ NOT verb `öde` · Electrum tr + Phoenix tr |
| Expired | süresi doldu | adj/state · shipped `lnd.expired`. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | ortak imzalayan | noun · ⚠️ NOT `ortak sahip` (= co-owner) · Electrum tr |
| Quorum | Quorum | noun · English loanword preferred · ⚠️ NOT `yetersayı`. |
| PSBT | PSBT | acronym · gloss: kısmen imzalanmış Bitcoin işlemi (BIP174) · Bitcoin Core tr |
| Provide signature | imza sağla / işlemi imzala | verb · generic / specific · shipped `co_sign_transaction` uses `Bir işlemi imzalayın`. |
| BIP47 / Payment Code | BIP47 / Payment Code | acronym kept; `Payment Code` left English (community preference); explanatory `ödeme kodu` accepted. |
| Notification transaction | bildirim işlemi | noun · BIP47-specific 0-value tx. |
| SilentPayment | Silent Payments / sessiz ödemeler | protocol name kept English (plural); explanatory `sessiz ödemeler` if needed. |
| **_Coin control_** | | |
| Coin Control | Coin Control | noun · English loanword preferred (kept untranslated) · ⚠️ NOT `Coin Kontrolü` / NOT `Para kontrolü`. |
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
