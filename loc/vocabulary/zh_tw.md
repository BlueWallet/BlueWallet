# Chinese, Traditional translation vocabulary (`zh_tw.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / 比特幣 | brand kept Latin; 比特幣 in body · zh.wikipedia.org/wiki/比特幣 |
| Lightning | Lightning / 閃電網路 | brand kept Latin; 閃電網路 in body · zh.wikipedia.org/wiki/閃電網絡 (zh-TW form) |
| Electrum | Electrum | — |
| LNDhub | LNDhub | — |
| LND | LND | — |
| LNURL | LNURL | — |
| Tor | Tor | — |
| Orbot | Orbot | — |
| GroundControl | GroundControl | — |
| **_Units & amounts_** | | |
| bitcoin / BTC | 比特幣 / BTC | noun unit + ticker. |
| sats | 聰 | noun · Bitcoin Core zh_TW "satoshi" → 聰. |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. ⚠️ NOT 聰/位元組 (drops the "v" prefix). |
| vByte | vByte | technical unit · SegWit-discounted size. |
| **_Wallet, keys & seeds_** | | |
| Wallet | 錢包 | noun · Bitcoin Core zh_TW. |
| Vault | 保管庫 | noun · safe/strongbox sense; not a brand. |
| Watch-only | 僅觀察 / 唯讀 | adj · Bitcoin Core zh_TW `僅觀察` + Zeus zh-TW `唯讀錢包`. ⚠️ NOT "view mode". |
| Hardware wallet | 硬體錢包 | noun. |
| Seed | 種子 / 復原短語 | noun · technical / mainstream. |
| Mnemonic | 助記詞 / 備份短語 | noun · technical / mainstream · zh.wikipedia.org/wiki/BIP39. |
| Passphrase | 密語 | noun · Electrum zh_TW `密語`. ⚠️ NOT `密碼` (= password/passcode). |
| Public key | 公鑰 | noun · Bitcoin Core zh_TW. |
| Private key | 私鑰 | noun · Bitcoin Core zh_TW. |
| WIF | WIF | acronym · gloss: 錢包匯入格式. |
| xpub | xpub | acronym, lowercase · gloss: 擴展公鑰. ⚠️ shipped `錢包公鑰` is ambiguous. |
| Descriptor | 描述符 | noun · output descriptor. |
| Derivation path | 推導路徑 | noun · BIP32 path. |
| Master fingerprint | 主指紋 | noun · first 4 bytes of HASH160(master pubkey). |
| BIP38 | BIP38 | acronym · gloss: BIP38 加密私鑰. |
| **_On-chain transactions_** | | |
| Transaction | 交易 | noun · Bitcoin Core zh_TW. ⚠️ shipped `轉賬` mixes Simplified `账`; prefer 交易. |
| Address | 地址 | noun · Bitcoin Core zh_TW. |
| Input | 輸入 / 交易輸入 | noun · short / full · Bitcoin Core zh_TW. ⚠️ NOT verb "to enter". |
| Output | 輸出 / 交易輸出 | noun · short / full. ⚠️ NOT UI "收件人" label. |
| UTXO | UTXO | acronym · gloss: 未花費的交易輸出 · Bitcoin Core zh_TW. |
| Change | 找零 | noun · Bitcoin Core zh_TW + Electrum zh_TW. ⚠️ NOT verb "更變/改變"; must be the leftover-output noun. |
| Hex | 十六進位 / 十六進制碼 | noun · short / explanatory · Bitcoin Core zh_TW. ⚠️ NOT "hash". |
| Pending | 待處理 / 等待中 | adj/state · ⚠️ shipped `待辦` (= "to-do") is wrong sense. |
| Unconfirmed | 未確認 | adj · Bitcoin Core zh_TW + Electrum zh_TW. |
| Confirmed | 已確認 | adj/state form · ⚠️ shipped `確認` is verb "to confirm"; prefer `已確認`. |
| Mempool | 記憶池 / 記憶體暫存池 | noun · short / full · Bitcoin Core zh_TW + Zeus zh-TW. |
| Broadcast | 廣播 | verb / noun. |
| Block explorer | 區塊瀏覽器 | noun · ⚠️ shipped `資源管理器` is wrong (= "resource manager/file explorer"). |
| Onchain | 鏈上 / 區塊鏈上 | adj · compact (chip) / explanatory (body). |
| Offchain | 鏈下 / 區塊鏈外 | adj · compact / explanatory · ⚠️ NOT `閃電網路` (conflates with Lightning brand). |
| **_Fees & fee bumping_** | | |
| Fee | 手續費 / 費用 | noun · mainstream / generic. |
| Fee Bump | 提高手續費 | noun · Zeus zh-TW. |
| RBF | RBF | acronym · gloss: 以新交易取代 (Replace-By-Fee) · Electrum zh_TW. |
| CPFP | CPFP | acronym · gloss: 子交易為父交易付費. ⚠️ NOT verb "Create". |
| Speed Up | 加速 | verb · Zeus zh-TW `加速交易`. ⚠️ shipped `對碰費用` is unidiomatic. |
| **_Lightning_** | | |
| Invoice | 發票 / 帳單 | noun · technical / mainstream · Electrum zh_TW `發票` + Zeus zh-TW `帳單`. ⚠️ shipped `賬單` mixes Simplified `账`; prefer 帳單. |
| Lightning Invoice | Lightning 發票 / 閃電帳單 | noun · technical / mainstream. |
| Preimage | 原像 | noun · math term (hash preimage); Zeus zh-TW uses contextual `驗證碼`. |
| Payment | 支付 / 付款 | noun · ⚠️ NOT verb only — must work as noun. |
| Expired | 已過期 | adj/state form. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | 共同簽署者 / 協同簽署者 | noun · Electrum zh_TW. ⚠️ NOT "共同擁有者" (co-owner). |
| Quorum | 法定人數 / 簽署門檻 | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · gloss: 部分簽署的比特幣交易. |
| Provide signature | 提供簽名 / 簽署交易 | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / 支付代碼 | acronym kept; "Payment Code" → `支付代碼`. |
| Notification transaction | 通知交易 | noun · BIP47-specific 0-value tx. |
| SilentPayment | Silent Payments / 隱形支付 | protocol name kept English (plural); explanatory `隱形支付` if needed. |
| **_Coin control_** | | |
| Coin Control | 幣的控制 / UTXO 控制 | noun · mainstream / technical · ⚠️ NOT Title Case · shipped `币的控制` mixes Simplified `币`; fix to 幣. Bitcoin Core zh_TW uses `錢幣控制`. |
| Frozen | 已凍結 / 凍結 | adj / verb · state form preferred · ⚠️ NOT verb "凍結"; for adj/state prefer `已凍結`. |
| **_Security & storage_** | | |
| Encrypted storage | 加密儲存空間 / 加密儲存 | noun · ⚠️ NOT Title Case. |
| Plausible Deniability | 合理推諉 | noun · ⚠️ NOT Title Case · zh.wikipedia.org/wiki/合理推諉. |
| Biometrics | 生物辨識 / 生物識別 | noun · Zeus zh-TW `生物辨識` (more idiomatic in zh-TW). |
| Passcode | 裝置密碼 / PIN 碼 | noun · ⚠️ shipped `密碼` collides with "password"; prefer `裝置密碼` or `PIN 碼` (Zeus zh-TW). |
| **_Backup, import & UX_** | | |
| Backup | 備份 / 匯出備份 | noun / verb. |
| Restore | 復原 / 還原 | verb / noun. |
| Import | 匯入 | verb / noun. |
| Voucher | 優惠券 / 兌換券 | noun · ⚠️ shipped `兌贖Azte.co優惠券` mashes verb+brand+noun; the term itself is just `優惠券`. |
| Redeem | 兌換 / 兌贖 | verb · mainstream / shipped form. ⚠️ NOT "buy to wallet". |
| Send | 傳送 / 發送 | verb. |
| Receive | 收款 / 接收 | verb. |
| Settings | 設定 | noun. |
| Confirm | 確認 | verb / noun · also "confirmations" = blocks count. |
| QR Code | QR 碼 / 二維碼 | noun · zh-TW prefers `QR 碼` (Zeus zh-TW); `二維碼` is more zh-CN. |
| Clipboard | 剪貼簿 | noun. |
| Memo | 備註 | noun · Zeus zh-TW. ⚠️ shipped `訊息` (= "message") is wrong sense. |
| Description | 描述 / 說明 | noun. |
| Label | 標籤 | noun. |
