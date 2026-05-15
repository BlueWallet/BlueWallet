# Japanese translation vocabulary (`jp_jp.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / ビットコイン | brand kept Latin; ビットコイン in body text · ja.wikipedia.org/wiki/ビットコイン |
| Lightning | Lightning / ライトニング | brand mostly Latin; katakana when followed by a Japanese noun. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | ビットコイン / BTC | noun unit (katakana) + Latin ticker. |
| sats | sats | noun, Latin lowercase (matches shipped). |
| sat/vByte | sat/vByte / vByteあたりsatoshi | technical unit; Latin chip / JP-style explanatory · shipped uses the JP form. |
| vByte | vByte | technical unit, Latin. |
| **_Wallet, keys & seeds_** | | |
| Wallet | ウォレット | noun, katakana (not 財布) · Bitcoin Core ja_JP. |
| Vault | 金庫 / マルチシグ金庫 | noun; 金庫 = vault/safe. Pair with マルチシグ when context requires. |
| Watch-only | 閲覧専用 / ウォッチオンリー | adj · mainstream kanji / katakana · Electrum ja_JP + shipped `transactions/watchOnlyWarningDescription` already uses 閲覧専用. |
| Hardware wallet | ハードウェアウォレット | noun, katakana compound. |
| Seed | シード | noun, katakana of "seed". |
| Mnemonic | シードフレーズ / ニーモニックフレーズ | noun · mainstream / technical · shipped mixes both. |
| Passphrase | パスフレーズ | noun · ⚠️ NOT パスワード (password). |
| Public key | 公開鍵 | noun, kanji · standard · Bitcoin Core ja_JP. |
| Private key | 秘密鍵 | noun, kanji · standard · Bitcoin Core ja_JP. |
| WIF | WIF | acronym · gloss: ウォレットインポート形式 (秘密鍵). |
| xpub | xpub | acronym, lowercase preferred · ⚠️ shipped UI uses `XPUB`; vocabulary prefers lowercase `xpub`. |
| Descriptor | ディスクリプター | noun, katakana · Electrum ja_JP. |
| Derivation path | 派生パス | noun · Electrum ja_JP · ⚠️ drop shipped redundant English `(derivation path)` parenthetical. |
| Master fingerprint | マスターフィンガープリント | noun, katakana · Electrum ja_JP (with long vowel — shipped マスタ misses it). |
| BIP38 | BIP38 | acronym kept · gloss: パスワードで暗号化された秘密鍵 (BIP38). ⚠️ NOT a verb / NOT "password" alone. |
| **_On-chain transactions_** | | |
| Transaction | 取引 / トランザクション | noun · kanji / katakana · shipped mixes both; 取引 = mainstream, トランザクション = technical. |
| Address | アドレス | noun, katakana · Bitcoin Core ja_JP. |
| Input | 入力 | noun · ⚠️ NOT 入金 (deposit) — strictly tx-input sense. |
| Output | 出力 | noun · ⚠️ NOT the UI recipient label 宛先. |
| UTXO | UTXO | acronym · gloss: 未使用トランザクション出力. |
| Change | お釣り / 釣り銭 | noun · Electrum ja_JP uses お釣り · ⚠️ NOT verb 変更. Shipped チェンジ (katakana) is ambiguous; お釣り/釣り銭 preferred. |
| Hex | Hex / 16進数 | noun · short / explanatory · Latin per shipped, 16進数 for body · ⚠️ NOT "hash". |
| Pending | 保留中 | adj/state · Electrum ja_JP · ⚠️ shipped 試行中 ("trying") is wrong meaning; 保留中 is the standard form (also matches `transactions/pending_transaction` shipped). |
| Unconfirmed | 未承認 | adj · Bitcoin Core ja + shipped. |
| Confirmed | 承認済み | adj · Bitcoin Core ja + shipped. |
| Mempool | メモリプール | noun · Zeus ja + shipped. |
| Broadcast | ブロードキャスト | verb / noun · katakana · Bitcoin Core ja + shipped. |
| Block explorer | ブロックエクスプローラー | noun · Bitcoin Core ja. |
| Onchain | オンチェーン / ブロックチェーン上 | adj · compact / explanatory · katakana / kanji body form. |
| Offchain | オフチェーン / ブロックチェーン外 | adj · compact / explanatory · katakana / kanji body form. |
| **_Fees & fee bumping_** | | |
| Fee | 手数料 | noun, kanji · standard. |
| Fee Bump | 手数料の引き上げ | noun · Bitcoin Core ja · ⚠️ shipped `details_adv_fee_bump` uses 費用のバンプ(増加) — recommend simplifying to 手数料の引き上げ. |
| RBF | RBF | acronym · gloss: 手数料による置き換え (Replace-By-Fee). |
| CPFP | CPFP | acronym · gloss: 子が親の手数料を負担 (Child-Pays-For-Parent) · ⚠️ NOT a verb. |
| Speed Up | 高速化 / 手数料を引き上げる | verb · Bitcoin Core ja · ⚠️ shipped `transactions/rbf_title` "手数料をバンプ (RBF)" is awkward; 高速化 fits the button. |
| **_Lightning_** | | |
| Invoice | インボイス / 請求書 | noun · technical / mainstream · shipped uses both. |
| Lightning Invoice | ライトニングインボイス | noun, full katakana · shipped. |
| Preimage | プリイメージ | noun, katakana · shipped + Zeus ja (Electrum uses プレイメージ; プリイメージ is more common in JP Lightning literature). |
| Payment | 支払い | noun · ⚠️ NOT verb 支払う. |
| Expired | 失効 | adj/state · shipped `lnd/expired`. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | 共同署名者 | noun · Electrum ja_JP · ⚠️ shipped 共同署名 means "co-signature" (the act); 共同署名者 is the participant. |
| Quorum | 定足数 | noun · standard JP term · shipped. |
| PSBT | PSBT | acronym · gloss: 部分的に署名されたビットコイントランザクション. |
| Provide signature | 署名を提供 / 署名する | verb · noun-phrase / plain verb · shipped. |
| BIP47 / Payment Code | BIP47 / 支払いコード | acronym kept; "Payment Code" → 支払いコード · shipped. |
| Notification transaction | 通知トランザクション | noun · BIP47-specific · shipped. |
| SilentPayment | Silent Payments / サイレントペイメント | protocol name kept English (plural); katakana gloss optional. |
| **_Coin control_** | | |
| Coin Control | コイン管理 / コインコントロール | noun · mainstream / technical · ⚠️ NOT Title Case · shipped uses コイン管理. |
| Frozen | フリーズ済み / フリーズ | adj/state · shipped uses bare フリーズ (verb-leaning); prefer フリーズ済み for adjective state · ⚠️ NOT verb フリーズする. |
| **_Security & storage_** | | |
| Encrypted storage | ストレージ暗号化 | noun · ⚠️ NOT Title Case · shipped + Bitcoin Core ja. |
| Plausible Deniability | 隠匿設定 | noun · ⚠️ NOT Title Case · lit. "concealment setting" · shipped. |
| Biometrics | 生体認証 | noun · shipped + standard. |
| Passcode | パスコード | noun, katakana · ⚠️ NOT パスワード (= app password). |
| **_Backup, import & UX_** | | |
| Backup | バックアップ | noun / verb · Bitcoin Core ja + shipped. |
| Restore | 復元 | verb / noun · Bitcoin Core ja + shipped. |
| Import | インポート | verb / noun · katakana · shipped. |
| Voucher | バウチャー | noun, katakana · shipped. |
| Redeem | 交換する / 引き換える | verb · shipped uses 交換する; 引き換える is also valid · ⚠️ NOT 購入 (buy). |
| Send | 送金 / 送る | verb · 送金 = remit (preferred for tx), 送る = general · shipped. |
| Receive | 入金 / 受け取る | verb · 入金 = deposit (preferred for tx), 受け取る = general · shipped. |
| Settings | 設定 | noun · standard · shipped. |
| Confirm | 確認 | verb / noun · also "confirmations" = 承認 (plural). |
| QR Code | QRコード | noun · Bitcoin Core ja + shipped. |
| Clipboard | クリップボード | noun, katakana · shipped. |
| Memo | メモ | noun, katakana · shipped. |
| Description | 説明 | noun · Bitcoin Core ja · ⚠️ shipped `receive/details_label` uses 概要 ("summary/overview") — should be 説明. |
| Label | ラベル | noun, katakana · Bitcoin Core ja + shipped. |
