# Khmer translation vocabulary (`km.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: Khmer (ខ្មែរ) is written in the Khmer script and runs left-to-right. Khmer has **no inter-word spaces** — words are written continuously and spaces mark phrase/clause boundaries only. Do not insert spaces between Khmer words; keep spaces only around Latin brand names, numbers and placeholders. Khmer has no upper/lower casing, so the "natural casing" convention reduces to "do not invent casing". Upstream wallet coverage is thin: Bitcoin Core ships an incomplete `bitcoin_km.ts`; Electrum/Phoenix/Zeus/Trezor/Green/Bisq do **not** ship Khmer. km.wikipedia.org has **no Bitcoin article** (no kmwiki sitelink on Wikidata Q131723), so there is no Wikipedia anchor for this locale; the transliteration `ប៊ីតខូអ៊ីន` follows common Khmer press usage (VOA/RFA Khmer). Rows without a solid upstream source are marked `(transliteration)` or `(no upstream wallet citation)`.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; Khmer gloss `ប៊ីតខូអ៊ីន` (transliteration per Khmer press usage; no km.wikipedia article — use in body text only). |
| Lightning | Lightning | brand kept Latin (no km.wikipedia article for Lightning Network). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | ប៊ីតខូអ៊ីន / BTC | noun unit + ticker · transliteration per Khmer press usage (no km.wikipedia article). |
| sats | សាតូស៊ី | noun · transliteration of "satoshi" (no upstream wallet citation). |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | កាបូប | noun · "purse/wallet" — standard Khmer (no upstream wallet citation). |
| Vault | ទូដែក | noun · "safe / strongbox" — generic Khmer noun. ⚠️ NOT a brand. |
| Watch-only | មើលតែប៉ុណ្ណោះ | adj · "view only" (no upstream wallet citation). ⚠️ NOT generic "view mode". |
| Hardware wallet | កាបូបហាតវែរ | noun · កាបូប + transliteration of "hardware" (no upstream wallet citation). |
| Seed | គ្រាប់ពូជ / ឃ្លាសង្គ្រោះ | noun · literal "seed" / "recovery phrase"; mainstream UI prefers ឃ្លាសង្គ្រោះ (no upstream wallet citation). |
| Mnemonic | ឃ្លាសង្គ្រោះ | noun · "recovery phrase" (no upstream wallet citation). |
| Passphrase | ឃ្លាសម្ងាត់ | noun · "secret phrase". ⚠️ NOT ពាក្យសម្ងាត់ (password) — distinct term (no upstream wallet citation). |
| Public key | កូនសោសាធារណៈ | noun · សោ "key" + សាធារណៈ "public" (no upstream wallet citation). |
| Private key | កូនសោឯកជន | noun · សោ "key" + ឯកជន "private" (no upstream wallet citation). |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | ឌីស្ក្រីបទ័រ | noun · transliteration (no upstream wallet citation). |
| Derivation path | ផ្លូវដេរីវេសិន | noun · ផ្លូវ "path" + transliteration (no upstream wallet citation). |
| Master fingerprint | ស្នាមម្រាមដៃមេ | noun · ស្នាមម្រាមដៃ "fingerprint" + មេ "master" (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | ប្រតិបត្តិការ | noun · standard Khmer banking term "transaction" (no upstream wallet citation). |
| Address | អាសយដ្ឋាន | noun · standard Khmer "address" (no upstream wallet citation). |
| Input | ធាតុចូល | noun · "input element". ⚠️ NOT "login / entrance" (no upstream wallet citation). |
| Output | ធាតុចេញ | noun · "output element", parallel to ធាតុចូល. ⚠️ NOT the UI recipient label "To:" (no upstream wallet citation). |
| UTXO | UTXO | acronym. |
| Change | ប្រាក់អាប់ | noun · "change money / leftover" — standard Khmer. ⚠️ NOT verb "to change/modify" (no upstream wallet citation). |
| Hex | ហិច / គោលដប់ប្រាំមួយ | noun · transliteration / "base-16". ⚠️ NOT "hash" (no upstream wallet citation). |
| Pending | កំពុងរង់ចាំ | adj/state · "pending/waiting" (no upstream wallet citation). |
| Unconfirmed | មិនទាន់បានបញ្ជាក់ | adj · "not yet confirmed" (no upstream wallet citation). |
| Confirmed | បានបញ្ជាក់ | adj/state · "confirmed" (no upstream wallet citation). |
| Mempool | mempool | technical term kept Latin (no Khmer upstream rendering). |
| Broadcast | ផ្សាយ / ផ្សាយចេញ | verb / verb · "broadcast / broadcast out" (no upstream wallet citation). |
| Block explorer | កម្មវិធីរុករកប្លុក | noun · "block explorer app" (no upstream wallet citation). |
| Onchain | លើខ្សែ / on-chain | adj · literal "on the chain" / Latin fallback (no upstream wallet citation). |
| Offchain | ក្រៅខ្សែ / off-chain | adj · literal "off the chain" / Latin fallback (no upstream wallet citation). |
| **_Fees & fee bumping_** | | |
| Fee | ថ្លៃសេវា | noun · "service fee" — standard Khmer (no upstream wallet citation). |
| Fee Bump | ការបង្កើនថ្លៃសេវា | noun · "fee increase" (no upstream wallet citation). |
| RBF | RBF | acronym. |
| CPFP | CPFP | acronym · ⚠️ NOT a verb. |
| Speed Up | បង្កើនល្បឿន | verb · "increase speed" (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | វិក្កយបត្រ | noun · standard Khmer "invoice/bill" (no upstream wallet citation). |
| Lightning Invoice | វិក្កយបត្រ Lightning | noun · localised noun + brand kept Latin (no upstream wallet citation). |
| Preimage | ព្រីអ៊ីមេជ | noun · math term; transliteration, uncertain Khmer rendering (no upstream wallet citation). |
| Payment | ការទូទាត់ | noun · "payment". ⚠️ NOT verb ទូទាត់/បង់ប្រាក់ "to pay" (no upstream wallet citation). |
| Expired | ផុតកំណត់ | adj/state · "expired / past deadline" (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | អ្នកចុះហត្ថលេខារួម | noun · "joint signer". ⚠️ NOT "co-owner" (no upstream wallet citation). |
| Quorum | កូរ៉ុម | noun · transliteration (no upstream wallet citation). |
| PSBT | PSBT | acronym. |
| Provide signature | ផ្តល់ហត្ថលេខា | verb · "provide signature" (no upstream wallet citation). |
| BIP47 / Payment Code | BIP47 / កូដទូទាត់ | acronym kept; "Payment Code" → translatable noun កូដទូទាត់ (no upstream wallet citation). |
| Notification transaction | ប្រតិបត្តិការជូនដំណឹង | noun · "notification transaction" (no upstream wallet citation). |
| SilentPayment | Silent Payments / ការទូទាត់ស្ងាត់ | protocol name kept English (plural); explanatory Khmer gloss "silent payment" (no upstream wallet citation). |
| **_Coin control_** | | |
| Coin Control | ការគ្រប់គ្រងកាក់ | noun · "coin management" (no upstream wallet citation). |
| Frozen | បានបង្កក | adj/state · "frozen". ⚠️ NOT verb "to freeze" (no upstream wallet citation). |
| **_Security & storage_** | | |
| Encrypted storage | ការផ្ទុកដែលបានអ៊ិនគ្រីប | noun · "storage that has been encrypted" (no upstream wallet citation). |
| Plausible Deniability | ការបដិសេធដែលអាចជឿបាន | noun · "believable denial" — abstract privacy concept, uncertain idiomatic Khmer rendering (no upstream wallet citation). |
| Biometrics | ជីវមាត្រ | noun · standard Khmer "biometrics" (no upstream wallet citation). |
| Passcode | លេខកូដសម្ងាត់ | noun · "secret code". ⚠️ NOT ពាក្យសម្ងាត់ (= app password) — distinct device-unlock term (no upstream wallet citation). |
| **_Backup, import & UX_** | | |
| Backup | ការបម្រុងទុក / បម្រុងទុក | noun / verb · "backup" (no upstream wallet citation). |
| Restore | ស្ដារ / ការស្ដារ | verb / noun · "restore" (no upstream wallet citation). |
| Import | នាំចូល | verb / noun · "import" (no upstream wallet citation). |
| Voucher | ប័ណ្ណ | noun · "voucher/coupon" (no upstream wallet citation). |
| Redeem | ដោះយក | verb · "redeem / cash in". ⚠️ NOT "buy to wallet" / NOT "transfer" (no upstream wallet citation). |
| Send | ផ្ញើ | verb · standard Khmer "send" (no upstream wallet citation). |
| Receive | ទទួល | verb · standard Khmer "receive" (no upstream wallet citation). |
| Settings | ការកំណត់ | noun · standard Khmer "settings" (no upstream wallet citation). |
| Confirm | បញ្ជាក់ | verb · "confirm" (no upstream wallet citation). |
| QR Code | កូដ QR | noun · "QR code" (no upstream wallet citation). |
| Clipboard | ក្ដារតម្បៀតខ្ទាស់ | noun · standard Khmer "clipboard" (no upstream wallet citation). |
| Memo | កំណត់ចំណាំ | noun · "note/memo" (no upstream wallet citation). |
| Description | ការពិពណ៌នា | noun · "description" (no upstream wallet citation). |
| Label | ស្លាក | noun · "label/tag" (no upstream wallet citation). |
