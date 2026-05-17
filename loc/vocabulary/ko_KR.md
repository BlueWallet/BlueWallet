# Korean translation vocabulary (`ko_KR.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / 비트코인 | brand · Latin in chrome; 비트코인 in body · ko.wikipedia.org/wiki/비트코인 |
| Lightning | Lightning / 라이트닝 | brand · Latin in chrome; 라이트닝 in body · ko.wikipedia.org/wiki/라이트닝_네트워크 |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | 비트코인 / BTC | noun unit + ticker. |
| sats | 사토시 | noun · Hangul of "satoshi". |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin (avoids 가상바이트 ambiguity). |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | 지갑 | noun · ⚠️ standardise on 지갑; NOT "월렛" loanword · Bitcoin Core ko_KR. |
| Vault | 금고 | noun · "safe/strongbox" sense · ⚠️ NOT Latin "Vault". |
| Watch-only | 보기 전용 / 감시 전용 | adj · UI / technical · Electrum ko_KR uses 감시 전용. |
| Hardware wallet | 하드웨어 지갑 | noun. |
| Seed | 시드 / 복구 문구 | noun · technical / mainstream. |
| Mnemonic | 니모닉 / 시드 문구 / 복구 문구 | noun · technical / mainstream · ⚠️ mnemonic backup screen mixes English "mnemonic phrase" — localise. |
| Passphrase | 패스프레이즈 / 시드 패스프레이즈 | noun · ⚠️ NOT "암호" (= password). Distinct from app password/passcode. |
| Public key | 공개 키 | noun · "공개 키" is the standard CS form (vs literal "공용 키") · Bitcoin Core ko_KR. |
| Private key | 개인 키 | noun · "개인 키" is the standard CS form (vs "비밀키") · Bitcoin Core ko_KR. |
| WIF | WIF | acronym · gloss: 지갑 가져오기 형식. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | 디스크립터 | noun · transliteration; "기술자" too literal for output-descriptor sense. |
| Derivation path | 유도 경로 | noun. |
| Master fingerprint | 마스터 지문 | noun · "지문" = fingerprint. |
| BIP38 | BIP38 | acronym · gloss: BIP38 암호 / 복호화 비밀번호. |
| **_On-chain transactions_** | | |
| Transaction | 트랜잭션 / 거래 | noun · technical / mainstream. |
| Address | 주소 | noun · Bitcoin Core ko_KR. |
| Input | 입력 | noun · shipped `transactions.details_inputs` = "입력" · Electrum ko_KR. |
| Output | 출력 | noun · shipped `transactions.details_outputs` = "출력" · Electrum ko_KR · ⚠️ NOT recipient UI label. |
| UTXO | UTXO | acronym · gloss: 미사용 트랜잭션 출력. |
| Change | 거스름돈 | noun · ⚠️ NOT verb "변경" (= to change/alter). Fix shipped `cc.change` = "변경". |
| Hex | 16진수 / 헥스 | noun · explanatory / short · shipped strings use 16진수 · ⚠️ NOT "hash". |
| Pending | 대기 중 / 보류 중 | adj/state · UI / alt. Avoid noun "보류". |
| Unconfirmed | 미확인 / 미확정 | adj · standard / shipped variant. |
| Confirmed | 확인됨 / 확정됨 | adj/state · ⚠️ "확인" alone collides with "Confirm" button — prefer "-됨" state form. |
| Mempool | 멤풀 / 메모리 풀 | noun · short / explanatory · Electrum ko_KR = 메모리 풀. |
| Broadcast | 브로드캐스트 / 네트워크에 전파 | verb / noun · button vs explanatory. |
| Block explorer | 블록 탐색기 | noun. |
| Onchain | 온체인 / 블록체인상 | adj · compact (chip) / explanatory (body) · 블록체인상 no space. |
| Offchain | 오프체인 / 블록체인 외부 | adj · compact (chip) / explanatory (body) · 블록체인 외부 with space. |
| **_Fees & fee bumping_** | | |
| Fee | 수수료 | noun. |
| Fee Bump | 수수료 인상 / 수수료 올리기 | noun / verb · ⚠️ shipped `send/details_adv_fee_bump` = "수수료 인상 허락하기" (= "allow fee bump") — verb-phrase OK in context. |
| RBF | RBF | acronym · gloss: 수수료 교체 / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: 자식이 부모의 수수료를 지불 · ⚠️ NOT "급행 수수료" alone. |
| Speed Up | 속도 올리기 / 가속 | verb · RBF user-facing label · ⚠️ shipped `transactions/rbf_title` = "급행 수수료(CPFP)" references CPFP but feature is RBF — fix acronym. |
| **_Lightning_** | | |
| Invoice | 청구서 / 인보이스 | noun · mainstream / technical. |
| Lightning Invoice | 라이트닝 청구서 / Lightning 인보이스 | noun · mainstream / technical. |
| Preimage | 프리이미지 | noun · transliteration. |
| Payment | 결제 | noun · ⚠️ NOT verb "결제하다". |
| Expired | 만료됨 / 만료되었습니다 | adj · short state / full sentence. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | 공동 서명자 | noun · ⚠️ NOT "공동 소유자" (= co-owner). |
| Quorum | 정족수 / 서명 임계값 | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · gloss: 부분 서명 비트코인 트랜잭션. |
| Provide signature | 서명 제공하기 / 서명하기 | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / 결제 코드 | acronym + noun. |
| Notification transaction | 알림 트랜잭션 | noun · BIP47-specific. |
| SilentPayment | Silent Payments | brand kept Latin · protocol name kept English (plural); transliteration `사일런트 페이먼트` not in widespread use — optional explanatory gloss `침묵의 결제` only if needed. |
| **_Coin control_** | | |
| Coin Control | UTXO 관리 / 코인 관리 | noun · technical / mainstream · ⚠️ NOT Title Case. |
| Frozen | 동결됨 | adj/state · ⚠️ NOT verb "동결하다". Prefer "-됨" state form over bare "동결". |
| **_Security & storage_** | | |
| Encrypted storage | 저장소 암호화 | noun · ⚠️ NOT Title Case. |
| Plausible Deniability | 그럴듯한 부인 / 당위적 거부 | noun · ⚠️ NOT Title Case · standard CS / shipped variant · ko.wikipedia.org/wiki/그럴듯한_부인 |
| Biometrics | 생체 인증 / 바이오메트릭 | noun · mainstream / transliteration · shipped `biom_no_passcode` uses 생체 인식. |
| Passcode | 기기 암호 / PIN | noun · ⚠️ NOT bare "암호" (collides with password/passphrase). Device-level unlock. |
| **_Backup, import & UX_** | | |
| Backup | 백업 / 백업하기 | noun / verb. |
| Restore | 복원하기 / 복원 | verb / noun. |
| Import | 가져오기 | verb / noun · ⚠️ shipped "들여오기" is archaic — prefer "가져오기" (standard SW). |
| Voucher | 바우처 | noun · ⚠️ fix shipped `azteco/title` = "제목" (= "title", leftover placeholder) → "바우처" or "Azte.co 바우처". |
| Redeem | 사용하기 / 교환하기 | verb · ⚠️ NOT "구매" (= buy). For vouchers prefer "사용하기" (activate/cash in). |
| Send | 보내기 | verb. |
| Receive | 받기 | verb. |
| Settings | 설정 | noun. |
| Confirm | 확인 / 확인하기 | verb / noun · also "확정" for tx confirmations (plural blocks). |
| QR Code | QR 코드 | noun. |
| Clipboard | 클립보드 | noun · ⚠️ shipped uses "붙여넣기판" (= "paste board") — non-standard; use 클립보드. |
| Memo | 메모 | noun. |
| Description | 설명 | noun · ⚠️ fix shipped `receive/details_label` = "형태" (= "form/shape") → "설명". |
| Label | 라벨 / 레이블 | noun · UI / formal. |
