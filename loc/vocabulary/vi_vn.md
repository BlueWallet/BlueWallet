# Vietnamese translation vocabulary (`vi_vn.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · vi.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand · vi.wikipedia.org/wiki/Lightning_Network keeps Latin. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand · Zeus vi keeps `Tor`. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; lowercase unit. |
| sats | sats | lowercase, kept Latin per convention. |
| sat/vByte | sat/vByte | technical unit; kept Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | ví | noun, lowercase. Plural via `các ví`. |
| Vault | két / két an toàn | noun · ⚠️ NOT brand; Vietnamese word for safe/strongbox. |
| Watch-only | chỉ xem | adj · Zeus vi `Chỉ Xem`. |
| Hardware wallet | ví phần cứng | noun, lowercase. |
| Seed | cụm từ khôi phục / seed | noun · mainstream / loanword · ⚠️ NOT `hạt giống` (botanical). |
| Mnemonic | cụm từ ghi nhớ / cụm từ khôi phục | noun · technical / mainstream. |
| Passphrase | cụm mật khẩu | noun · ⚠️ NOT `mật khẩu` (= password) and NOT `mã PIN` (= passcode). |
| Public key | khóa công khai | noun, lowercase. |
| Private key | khóa riêng tư | noun, lowercase · prefer `riêng tư` over `cá nhân` for asymmetric-crypto sense. |
| WIF | WIF | acronym · gloss: định dạng nhập ví. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | bộ mô tả | noun, lowercase · script-template sense. |
| Derivation path | đường dẫn dẫn xuất | noun, lowercase · BIP32 path. |
| Master fingerprint | vân tay khóa chính | noun · Zeus vi `Vân tay khóa chính`. |
| BIP38 | BIP38 | acronym kept · gloss: khóa riêng tư mã hóa bằng mật khẩu. |
| **_On-chain transactions_** | | |
| Transaction | giao dịch | noun, lowercase. |
| Address | địa chỉ | noun, lowercase. |
| Input | đầu vào / đầu vào giao dịch | noun · short / full. ⚠️ NOT "đăng nhập" (= login). |
| Output | đầu ra / đầu ra giao dịch | noun · short / full · ⚠️ NOT the UI recipient label "Đến:". |
| UTXO | UTXO | acronym · gloss: đầu ra giao dịch chưa tiêu · Zeus vi keeps `UTXO`. |
| Change | tiền thừa / địa chỉ tiền thừa | noun · ⚠️ NOT verb `thay đổi`. `tiền thừa` = leftover; `địa chỉ tiền thừa` for change-address. |
| Hex | hex / dữ liệu hex | noun · short / explanatory · ⚠️ NOT `hash` and NOT `dữ liệu giao dịch`; shipped `hex` (Latin) acceptable as compact form. |
| Pending | đang chờ | adj/state · ⚠️ NOT noun "sự chờ đợi". |
| Unconfirmed | chưa xác nhận | adj/state. |
| Confirmed | đã xác nhận | adj/state. |
| Mempool | mempool | noun · kept Latin (no native rendering); Zeus vi keeps `Mempool`. |
| Broadcast | phát đi mạng / truyền tải | verb · UI-clear / technical · Zeus vi `Truyền tải`. |
| Block explorer | trình khám phá khối | noun, lowercase · Zeus vi `Trình khám phá khối`. |
| Onchain | onchain / trên chuỗi | adj · compact (chip) / explanatory (body) · Zeus vi `Trên chuỗi`. |
| Offchain | offchain / ngoài chuỗi | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | phí | noun, lowercase. |
| Fee Bump | tăng phí | noun, lowercase. |
| RBF | RBF | acronym · gloss: thay thế bằng phí cao hơn / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: con trả phí cho cha · ⚠️ NOT a verb. |
| Speed Up | tăng tốc | verb · button label. |
| **_Lightning_** | | |
| Invoice | hóa đơn / yêu cầu thanh toán | noun · technical / mainstream · Zeus vi `Hoá đơn`. |
| Lightning Invoice | hóa đơn Lightning / yêu cầu thanh toán Lightning | noun · technical / mainstream. |
| Preimage | nghịch ảnh / preimage | noun · math term / loanword · ⚠️ NOT `tiền ảnh` (reads as "virtual money"). Zeus vi keeps `Preimage`. |
| Payment | khoản thanh toán / thanh toán | noun · noun / colloquial-verb-as-noun · ⚠️ NOT bare verb `thanh toán` (= to pay). |
| Expired | hết hạn | adj/state. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | người đồng ký / người đồng ký kết | noun · ⚠️ NOT `đồng sở hữu` (co-owner). |
| Quorum | túc số / ngưỡng chữ ký | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym. |
| Provide signature | cung cấp chữ ký / ký giao dịch | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / mã thanh toán | acronym kept; `Payment Code` → `mã thanh toán`. |
| Notification transaction | giao dịch thông báo | noun · BIP47-specific. |
| SilentPayment | Silent Payments / thanh toán im lặng | protocol name kept English (plural); explanatory `thanh toán im lặng` if needed. |
| **_Coin control_** | | |
| Coin Control | kiểm soát UTXO / kiểm soát coin | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. |
| Frozen | đã đóng băng | adj/state · ⚠️ NOT verb `đóng băng`. Zeus vi `Đóng băng`. |
| **_Security & storage_** | | |
| Encrypted storage | lưu trữ được mã hóa | noun, lowercase · ⚠️ NOT Title Case. |
| Plausible Deniability | khả năng phủ nhận hợp lý / sự từ chối hợp lý | noun, lowercase · short / full. |
| Biometrics | sinh trắc học | noun, lowercase · Zeus vi `Sinh trắc học`. |
| Passcode | mã PIN / mã mở khóa | noun · ⚠️ NOT `mật khẩu` (= password). |
| **_Backup, import & UX_** | | |
| Backup | bản sao lưu / sao lưu | noun / verb. |
| Restore | khôi phục / việc khôi phục | verb / noun. |
| Import | nhập / việc nhập | verb / noun. |
| Voucher | phiếu / voucher | noun, lowercase · mainstream / loanword. |
| Redeem | đổi / kích hoạt | verb · ⚠️ NOT "mua vào ví" / NOT "chuyển". |
| Send | gửi | verb. |
| Receive | nhận | verb. |
| Settings | cài đặt | noun, lowercase. |
| Confirm | xác nhận / sự xác nhận | verb / noun (also "confirmations" = blocks). |
| QR Code | mã QR | noun, lowercase. |
| Clipboard | bảng tạm | noun, lowercase. |
| Memo | ghi chú | noun, lowercase · Zeus vi `Ghi chú`. |
| Description | mô tả | noun, lowercase. |
| Label | nhãn / mác | noun, lowercase. |
