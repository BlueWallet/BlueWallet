# Chinese, Simplified translation vocabulary (`zh_cn.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / 比特币 | brand kept Latin; 比特币 in body text · zh.wikipedia.org/wiki/比特币 |
| Lightning | Lightning / 闪电网络 | brand · 闪电网络 in body text · zh.wikipedia.org/wiki/闪电网络 |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand · drop the verbose "闪电网络守护节点集线器" gloss; not standard. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | 比特币 / BTC | noun unit + ticker. Lowercase unit name; `BTC` uppercase. |
| sats | 聪 | noun · canonical CN rendering of satoshi · Bitcoin Core zh_CN. |
| sat/vByte | 聪/vByte | technical unit · ⚠️ shipped `聪/字节` drops the SegWit-aware "v" prefix; vByte should be kept Latin. |
| vByte | vByte | technical unit · keep Latin (no established CN form distinct from 字节). |
| **_Wallet, keys & seeds_** | | |
| Wallet | 钱包 | noun · Bitcoin Core zh_CN. |
| Vault | 金库 / 多重签名金库 | noun · short / explanatory · `金库` = safe/strongbox, used for multisig wallet. |
| Watch-only | 仅查看 / 观察钱包 | adj / noun · chip / wallet-type · Green zh_CN + Bitcoin Core zh_CN. |
| Hardware wallet | 硬件钱包 | noun · Bitcoin Core zh_CN + Trezor zh_CN. |
| Seed | 助记词 / 恢复短语 | noun · technical / mainstream · standard CN crypto term. |
| Mnemonic | 助记词 | noun · same as Seed in shipped strings. |
| Passphrase | 密码短语 | noun · ⚠️ NOT `密码` (= password) · Trezor zh_CN. |
| Public key | 公钥 | noun · Bitcoin Core zh_CN. |
| Private key | 私钥 | noun · Bitcoin Core zh_CN. |
| WIF | WIF | acronym · gloss: 钱包导入格式. |
| xpub | xpub | acronym · lowercase preferred. |
| Descriptor | 输出描述符 / 描述符 | noun · full / short · Bitcoin Core zh_CN. |
| Derivation path | 派生路径 | noun · Electrum zh_CN + Trezor zh_CN. |
| Master fingerprint | 主密钥指纹 / 主指纹 | noun · BlueWallet form / Electrum zh_CN form. |
| BIP38 | BIP38 | acronym · gloss: BIP38 加密私钥 / 受密码保护的私钥. ⚠️ NOT a verb. |
| **_On-chain transactions_** | | |
| Transaction | 交易 | noun · Bitcoin Core zh_CN. |
| Address | 地址 | noun · Bitcoin Core zh_CN. |
| Input | 输入 | noun · ⚠️ NOT the verb "to input/enter"; here it is the tx input. |
| Output | 输出 | noun · ⚠️ NOT UI recipient label "收款人". |
| UTXO | UTXO | acronym · gloss: 未花费的交易输出 · Electrum zh_CN. |
| Change | 找零 | noun · ⚠️ NOT verb `更改/修改` (= modify). `找零` = leftover-coin/change-output · Bitcoin Core zh_CN. |
| Hex | 十六进制 | noun · Bitcoin Core zh_CN. ⚠️ NOT "hash". |
| Pending | 待处理 | adj/state · ⚠️ keep as state form, not the verb "待办". |
| Unconfirmed | 未确认 | adj/state. |
| Confirmed | 已确认 | adj/state. |
| Mempool | 内存池 | noun · Bitcoin Core zh_CN + Electrum zh_CN. |
| Broadcast | 广播 | verb / noun · Bitcoin Core zh_CN. |
| Block explorer | 区块浏览器 | noun. |
| Onchain | 链上 / 在链上 | adj · compact / explanatory. |
| Offchain | 链下 / 在链下 | adj · compact / explanatory. |
| **_Fees & fee bumping_** | | |
| Fee | 矿工费 / 手续费 | noun · mining-fee / generic-fee · both shipped; `矿工费` preferred for on-chain. |
| Fee Bump | 追加矿工费 | noun · Electrum zh_CN (`追加手续费`). |
| RBF | RBF | acronym · gloss: 费用替换 / Replace-by-Fee. |
| CPFP | CPFP | acronym · gloss: 子交易支付父交易. ⚠️ NOT a verb like "创建". |
| Speed Up | 加速 / 追加矿工费 | verb · short button / explanatory · for RBF action. |
| **_Lightning_** | | |
| Invoice | 发票 / 付款请求 | noun · technical / mainstream · Electrum zh_CN + Zeus zh_CN. |
| Lightning Invoice | 闪电网络发票 | noun. |
| Preimage | 原像 | noun · math term · shipped. |
| Payment | 付款 / 支付 | noun · ⚠️ NOT verb-only `去支付`. Both forms ship. |
| Expired | 已过期 | adj/state. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | 联合签名者 | noun · ⚠️ NOT `共有人` (co-owner). Trim shipped `共享联合签名者` (redundant `共享`). |
| Quorum | 法定数 / 签名阈值 | noun · canonical / UI-clear (m-of-n threshold). |
| PSBT | PSBT | acronym · gloss: 部分签名的比特币交易. |
| Provide signature | 提供签名 | verb. |
| BIP47 / Payment Code | BIP47 / 支付码 | acronym kept; `Payment Code` → `支付码`. |
| Notification transaction | 通知交易 | noun · BIP47-specific. |
| SilentPayment | Silent Payments / 静默支付 | protocol name kept English (plural); explanatory CN gloss `静默支付` if needed. |
| **_Coin control_** | | |
| Coin Control | 选币 / 选币功能 | noun · technical / UI-friendly · shipped is `选币功能` (verified — earlier note about `币的控制` was incorrect for current zh_cn.json) · Electrum zh_CN. |
| Frozen | 已冻结 | adj/state · ⚠️ NOT verb `冻结` (= to freeze). |
| **_Security & storage_** | | |
| Encrypted storage | 存储加密 | noun · ⚠️ NOT Title Case · shipped `启用存储加密` includes verb `启用` (= enable); drop for bare noun. |
| Plausible Deniability | 可合理否认 | noun · ⚠️ NOT Title Case. |
| Biometrics | 生物识别认证 | noun. |
| Passcode | 设备密码 | noun · device-level · ⚠️ distinct from app `密码` (password). |
| **_Backup, import & UX_** | | |
| Backup | 备份 | noun / verb · same form. |
| Restore | 恢复 | verb / noun. |
| Import | 导入 | verb / noun. |
| Voucher | 券码 / 代金券 | noun · shipped / mainstream (Zeus zh_CN). |
| Redeem | 领取 / 兑换 | verb · ⚠️ NOT `购买` (buy). `领取` = claim, `兑换` = exchange/redeem · Zeus zh_CN. |
| Send | 发送 | verb. |
| Receive | 接收 | verb. |
| Settings | 设置 | noun. |
| Confirm | 确认 | verb / noun · also "confirmations" = blocks. |
| QR Code | 二维码 | noun · standard CN term. |
| Clipboard | 剪贴板 | noun. |
| Memo | 备注 | noun. |
| Description | 描述 | noun. |
| Label | 标签 | noun. |
