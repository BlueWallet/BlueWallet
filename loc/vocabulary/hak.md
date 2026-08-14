# Hakka translation vocabulary (`hak.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: Hakka (客家話) is written here in Traditional Han characters following the Taiwanese Hakka written standard (per the Taiwan Ministry of Education Hakka dictionary, <https://hakkadict.moe.edu.tw>). CJK has no inter-word spaces. Upstream Bitcoin/Lightning wallets do **not** ship Hakka localizations, so technical terms borrow the shared Traditional-Han renderings used by `zh_tw.json` (verified against Bitcoin Core / Electrum zh_TW) while everyday verbs and function words are rendered idiomatically for Hakka. Brands/acronyms stay Latin. Rows with no upstream wallet citation are best-effort; "(transliteration)" marks borrowed loan spellings.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / 比特幣 | brand kept Latin; 比特幣 in body · hak.wikipedia.org. |
| Lightning | Lightning / 閃電網路 | brand kept Latin; 閃電網路 in body (shared Traditional-Han form). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | 比特幣 / BTC | noun unit + ticker. |
| sats | 聰 | noun · satoshi → 聰, shared Traditional-Han rendering (Bitcoin Core zh_TW). |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. ⚠️ NOT 聰/位元組 (drops the "v"). |
| vByte | vByte | technical unit · SegWit-discounted size. |
| **_Wallet, keys & seeds_** | | |
| Wallet | 錢包 | noun · shared Traditional-Han (Bitcoin Core zh_TW); Hakka 錢 (chhièn) 包. |
| Vault | 保管庫 | noun · safe/strongbox sense; not a brand. |
| Watch-only | 淨看 / 唯讀 | adj · "watch-only" — Hakka 淨 (chhin, "only") + 看; alt 唯讀. ⚠️ NOT "view mode". |
| Hardware wallet | 硬體錢包 | noun · shared Traditional-Han. |
| Seed | 種子 / 復原短語 | noun · technical / mainstream. |
| Mnemonic | 助記詞 / 備份短語 | noun · technical / mainstream · BIP39. |
| Passphrase | 密語 | noun · ⚠️ NOT 密碼 (= password/passcode). |
| Public key | 公鑰 | noun · shared Traditional-Han (Bitcoin Core zh_TW). |
| Private key | 私鑰 | noun · shared Traditional-Han (Bitcoin Core zh_TW). |
| WIF | WIF | acronym · gloss: 錢包匯入格式. |
| xpub | xpub | acronym, lowercase · gloss: 擴展公鑰. |
| Descriptor | 描述符 | noun · output descriptor. |
| Derivation path | 推導路徑 | noun · BIP32 path. |
| Master fingerprint | 主指紋 | noun · first 4 bytes of HASH160(master pubkey). |
| BIP38 | BIP38 | acronym · gloss: BIP38 加密私鑰. |
| **_On-chain transactions_** | | |
| Transaction | 交易 | noun · shared Traditional-Han (Bitcoin Core zh_TW). |
| Address | 地址 | noun · shared Traditional-Han (Bitcoin Core zh_TW). |
| Input | 輸入 / 交易輸入 | noun · short / full. ⚠️ NOT verb "to enter". |
| Output | 輸出 / 交易輸出 | noun · short / full. ⚠️ NOT UI "收款人" label. |
| UTXO | UTXO | acronym · gloss: 吂使用个交易輸出 (Hakka 吂 = "not yet"). |
| Change | 找零 | noun · leftover-output (Bitcoin Core / Electrum zh_TW). ⚠️ NOT verb "改變". |
| Hex | 十六進位 / 十六進制碼 | noun · short / explanatory. ⚠️ NOT "hash". |
| Pending | 處理中 / 等待中 | adj/state · ⚠️ NOT noun "to-do". |
| Unconfirmed | 吂確認 | adj · Hakka 吂 (màng, "not yet") + 確認. ⚠️ NOT verb. |
| Confirmed | 已確認 | adj/state form · ⚠️ NOT bare verb 確認. |
| Mempool | 記憶池 / 記憶體暫存池 | noun · short / full (shared Traditional-Han). |
| Broadcast | 廣播 | verb / noun. |
| Block explorer | 區塊瀏覽器 | noun · ⚠️ NOT "資源管理器" (file explorer). |
| Onchain | 鏈上 / 區塊鏈上 | adj · compact (chip) / explanatory (body). |
| Offchain | 鏈下 / 區塊鏈外 | adj · compact / explanatory · ⚠️ NOT 閃電網路 (Lightning brand). |
| **_Fees & fee bumping_** | | |
| Fee | 手續費 / 費用 | noun · mainstream / generic. |
| Fee Bump | 提高手續費 | noun. |
| RBF | RBF | acronym · gloss: 以新交易取代 (Replace-By-Fee). |
| CPFP | CPFP | acronym · gloss: 子交易為父交易付費. ⚠️ NOT verb "Create". |
| Speed Up | 加速 | verb. ⚠️ NOT collide with Fee Bump. |
| **_Lightning_** | | |
| Invoice | 發票 / 帳單 | noun · technical / mainstream (Electrum zh_TW 發票). |
| Lightning Invoice | Lightning 發票 / 閃電帳單 | noun · technical / mainstream. |
| Preimage | 原像 | noun · math term (hash preimage). |
| Payment | 支付 / 付款 | noun · ⚠️ NOT verb only — must work as noun. |
| Expired | 已過期 | adj/state form. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | 共同簽署者 / 協同簽署者 | noun · Electrum zh_TW. ⚠️ NOT "共同擁有者" (co-owner). |
| Quorum | 法定人數 / 簽署門檻 | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · gloss: 部分簽署个比特幣交易. |
| Provide signature | 提供簽名 / 簽署交易 | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / 支付代碼 | acronym kept; "Payment Code" → 支付代碼. |
| Notification transaction | 通知交易 | noun · BIP47-specific 0-value tx. |
| SilentPayment | Silent Payments / 隱形支付 | protocol name kept English (plural); explanatory 隱形支付 if needed. |
| **_Coin control_** | | |
| Coin Control | 錢幣控制 / UTXO 控制 | noun · mainstream / technical (Bitcoin Core zh_TW 錢幣控制). ⚠️ NOT Title Case. |
| Frozen | 已凍結 / 凍結 | adj / verb · state form preferred. ⚠️ NOT bare verb 凍結. |
| **_Security & storage_** | | |
| Encrypted storage | 加密儲存空間 / 加密儲存 | noun · ⚠️ NOT Title Case. |
| Plausible Deniability | 合理推諉 | noun · ⚠️ NOT Title Case. |
| Biometrics | 生物辨識 / 生物識別 | noun. |
| Passcode | 裝置密碼 / PIN 碼 | noun · ⚠️ NOT bare 密碼 (collides with "password"). |
| **_Backup, import & UX_** | | |
| Backup | 備份 / 匯出備份 | noun / verb. |
| Restore | 復原 / 還原 | verb / noun. |
| Import | 匯入 | verb / noun. |
| Voucher | 兌換券 / 優惠券 | noun · the term itself is just 兌換券. |
| Redeem | 兌換 / 兌贖 | verb · mainstream / shipped form. ⚠️ NOT "buy to wallet". |
| Send | 寄出 / 傳送 | verb · Hakka 寄 (kì, "send") preferred; alt 傳送. |
| Receive | 收款 / 接收 | verb. |
| Settings | 設定 | noun. |
| Confirm | 確認 | verb / noun · also "confirmations" = blocks count. |
| QR Code | QR 碼 / 二維碼 | noun · zh-TW form prefers QR 碼. |
| Clipboard | 剪貼簿 | noun. |
| Memo | 備註 | noun · ⚠️ NOT 訊息 ("message"). |
| Description | 描述 / 說明 | noun. |
| Label | 標籤 | noun. |
