# Thai translation vocabulary (`th_th.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / บิตคอยน์ | brand kept Latin; บิตคอยน์ in body text · th.wikipedia.org/wiki/บิตคอยน์ |
| Lightning | Lightning | brand kept Latin · Thai script ไลท์นิง only as explanatory gloss. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand acronym. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand · th.wikipedia.org/wiki/Tor_(เครือข่ายนิรนาม) |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | บิตคอยน์ / BTC | noun unit + ticker. |
| sats | แซท / ซาโตชิ | noun · Thai transliteration; ซาโตชิ for full form. |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin (casing matters). |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | กระเป๋าสตางค์ / กระเป๋าเงิน | noun · primary / shorter form · Bitcoin Core th |
| Vault | ห้องนิรภัย / ตู้นิรภัย | noun · safe room / strongbox · ⚠️ NOT brand "Vault". |
| Watch-only | ดูอย่างเดียว / เฝ้าดูเท่านั้น | adj · ⚠️ NOT "view mode"; wallet type · Bitcoin Core th ("กระเป๋าที่ดูอย่างเดียว") |
| Hardware wallet | กระเป๋าฮาร์ดแวร์ / กระเป๋าเงินฮาร์ดแวร์ | noun · Bitcoin Core th |
| Seed | ซีด / วลีกู้คืน | noun · technical / mainstream ("recovery phrase"). |
| Mnemonic | วลีนีโมนิก / วลีกู้คืน | noun · technical / mainstream. |
| Passphrase | วลีรหัสผ่าน | noun · ⚠️ distinct from `รหัสผ่าน` (password) · Bitcoin Core th ("วลีผ่าน/วลีรหัส") + Electrum th_TH |
| Public key | กุญแจสาธารณะ / คีย์สาธารณะ | noun · th.wikipedia.org/wiki/บิตคอยน์ + Electrum th_TH |
| Private key | กุญแจส่วนตัว / คีย์ส่วนตัว | noun · Bitcoin Core th + th.wikipedia.org/wiki/บิตคอยน์ |
| WIF | WIF | acronym · gloss: รูปแบบนำเข้ากระเป๋า (Wallet Import Format). |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | ดิสคริปเตอร์ / ตัวอธิบายเอาต์พุต | noun · transliteration / explanatory. |
| Derivation path | เส้นทางอนุพันธ์ / เส้นทาง derivation | noun · technical / mixed Latin · BIP32 path. |
| Master fingerprint | ลายนิ้วมือต้นแบบ / ลายนิ้วมือกุญแจหลัก | noun · ships `ลายนิ้วมือต้นแบบ`. |
| BIP38 | BIP38 | acronym kept · gloss: รหัสผ่าน BIP38 / รหัสผ่านสำหรับถอดรหัส BIP38. |
| **_On-chain transactions_** | | |
| Transaction | ธุรกรรม | noun. |
| Address | แอดเดรส / ที่อยู่ | noun · transliteration (shipped) / mainstream · th.wikipedia.org/wiki/บิตคอยน์ uses ที่อยู่. |
| Input | อินพุต / อินพุตธุรกรรม | noun · short / full · ⚠️ NOT "login/entrance". |
| Output | เอาต์พุต / เอาต์พุตธุรกรรม | noun · short / full · ⚠️ NOT UI recipient label "ถึง:". |
| UTXO | UTXO | acronym · gloss: เอาต์พุตธุรกรรมที่ยังไม่ถูกใช้. |
| Change | เงินทอน / แอดเดรสเงินทอน | noun · ⚠️ NOT verb "เปลี่ยน"; `เงินทอน` = leftover coin · Bitcoin Core th ("เงินทอน"). |
| Hex | hex / เลขฐานสิบหก | noun · short Latin / Thai explanatory · ⚠️ NOT "hash" / NOT "ข้อมูลธุรกรรม" · th.wikipedia.org/wiki/เลขฐานสิบหก |
| Pending | กำลังดำเนินการ / รอดำเนินการ | adj/state · ships `กำลังดำเนินการ`. |
| Unconfirmed | ยังไม่ยืนยัน / ยังไม่ได้รับการยืนยัน | adj · short / full · Bitcoin Core th ("ยังไม่ได้รับการยืนยัน"). |
| Confirmed | ยืนยันแล้ว | adj/state · Bitcoin Core th. |
| Mempool | เมมพูล / mempool | noun · Thai transliteration / Latin · Bitcoin Core th keeps `mempool`. |
| Broadcast | บรอดคาสต์ / เผยแพร่ | verb · transliteration (shipped) / Thai equivalent. |
| Block explorer | ตัวสำรวจบล็อก / Block Explorer | noun · Thai / Latin. |
| Onchain | ออนเชน / บนบล็อกเชน | adj · compact (chip) / explanatory (body). |
| Offchain | ออฟเชน / นอกบล็อกเชน | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | ค่าธรรมเนียม | noun. |
| Fee Bump | เพิ่มค่าธรรมเนียม | noun. |
| RBF | RBF | acronym · gloss: แทนที่ด้วยค่าธรรมเนียม (Replace-By-Fee). |
| CPFP | CPFP | acronym · gloss: ลูกจ่ายแทนแม่ (Child-Pays-For-Parent). ⚠️ NOT a verb. |
| Speed Up | เพิ่มความเร็ว / เพิ่มค่าธรรมเนียม | verb · button label for RBF. |
| **_Lightning_** | | |
| Invoice | ใบแจ้งหนี้ / อินวอยซ์ | noun · mainstream / technical transliteration · Electrum th_TH ("ใบแจ้งหนี้"). |
| Lightning Invoice | ใบแจ้งหนี้ Lightning / ใบแจ้งหนี้ไลท์นิง | noun · brand Latin + Thai noun. |
| Preimage | พรีอิมเมจ / ภาพต้นแบบ | noun · transliteration / math term. |
| Payment | การชำระเงิน / การจ่ายเงิน | noun · ⚠️ NOT verb "จ่าย" (shipped `จ่าย` is verb — must be noun). |
| Expired | หมดอายุแล้ว | adj/state · ships correctly. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | ผู้ร่วมลงนาม / ผู้ลงนามร่วม | noun · ⚠️ NOT "co-owner" (เจ้าของร่วม). |
| Quorum | องค์ประชุม / เกณฑ์ลายเซ็น | noun · canonical / UI-clear (signature threshold). |
| PSBT | PSBT | acronym · gloss: ธุรกรรม Bitcoin ที่ลงนามบางส่วน · Bitcoin Core th. |
| Provide signature | ใส่ลายเซ็น / ลงนามธุรกรรม | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / รหัสการชำระเงิน | acronym kept; "Payment Code" → "รหัสการชำระเงิน". |
| Notification transaction | ธุรกรรมแจ้งเตือน | noun · BIP47-specific 0-value tx. |
| SilentPayment | Silent Payments / การชำระเงินแบบเงียบ | protocol name kept English (plural); explanatory Thai gloss. |
| **_Coin control_** | | |
| Coin Control | ควบคุมเหรียญ / จัดการ UTXO | noun · mainstream / technical · ⚠️ NOT Title Case · Bitcoin Core th ("การควบคุมเหรียญ") + Electrum th_TH. |
| Frozen | ถูกระงับ / ระงับ | adj/state · ⚠️ NOT verb "ระงับ" alone in active sense; prefer `ถูกระงับ`. |
| **_Security & storage_** | | |
| Encrypted storage | ที่เก็บข้อมูลเข้ารหัส | noun · ⚠️ NOT Title Case · derived from shipped `ที่เก็บข้อมูลของคุณถูกเข้ารหัส`. |
| Plausible Deniability | การปฏิเสธที่เป็นไปได้ / การปฏิเสธอย่างมีเหตุผล | noun · short / full. |
| Biometrics | ไบโอเมตริก / การยืนยันตัวตนทางชีวภาพ | noun · th.wikipedia.org/wiki/ไบโอเมตริกซ์. |
| Passcode | รหัสผ่านอุปกรณ์ / PIN | noun. |
| **_Backup, import & UX_** | | |
| Backup | สำรองข้อมูล / สำรอง | noun / verb · Bitcoin Core th ("สำรองข้อมูล"). |
| Restore | กู้คืน / การกู้คืน | verb / noun · Electrum th_TH ("การกู้คืน BIP39"). |
| Import | นำเข้า / การนำเข้า | verb / noun · ships `นำเข้า`. |
| Voucher | บัตรกำนัล | noun. |
| Redeem | ไถ่ถอน / ใช้บัตร | verb · ⚠️ NOT "ซื้อเข้ากระเป๋า"; for vouchers use `ไถ่ถอน` (shipped). |
| Send | ส่ง | verb. |
| Receive | รับ | verb. |
| Settings | ตั้งค่า / การตั้งค่า | noun. |
| Confirm | ยืนยัน / การยืนยัน | verb / noun. |
| QR Code | คิวอาร์โค้ด / รหัสคิวอาร์ | noun · th.wikipedia.org/wiki/QR_Code. |
| Clipboard | คลิปบอร์ด | noun · Bitcoin Core th + Electrum th_TH. |
| Memo | บันทึกช่วยจำ / โน้ต | noun. |
| Description | คำอธิบาย | noun. |
| Label | ป้ายกำกับ / ป้าย | noun · Bitcoin Core th ("ป้ายกำกับ"). |
