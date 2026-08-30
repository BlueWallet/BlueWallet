# Georgian translation vocabulary (`ka.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: Georgian uses the Mkhedruli script and has **no letter casing** (no upper/lower distinction), so the "natural casing" rule is satisfied automatically. Bitcoin Core ships a Georgian locale (`bitcoin_ka.ts`) that anchors most on-chain terms; Electrum, Phoenix, Zeus and the other wallet projects do not ship Georgian. Georgian Wikipedia has a Bitcoin article (`ბიტკოინი`). Rows without an upstream citation are marked "(transliteration)" or a generic native rendering.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; Georgian gloss `ბიტკოინი` per ka.wikipedia.org/wiki/ბიტკოინი (body text only). |
| Lightning | Lightning | brand kept Latin (no ka.wikipedia article for Lightning Network). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | ბიტკოინი / BTC | noun unit + ticker · ka.wikipedia.org/wiki/ბიტკოინი |
| sats | სატოში | noun · transliteration of satoshi; lowercase `sat` kept in `sat/vByte`. |
| sat/vByte | sat/vByte | technical fee-rate unit; UI keeps Latin. |
| vByte | vByte | technical unit kept Latin. |
| **_Wallet, keys & seeds_** | | |
| Wallet | საფულე | noun · Bitcoin Core ka |
| Vault | სეიფი | noun · Georgian word for "safe / strongbox". ⚠️ NOT a brand — translated. |
| Watch-only | მხოლოდ-სანახავი | adj · "view-only" (no upstream wallet citation). ⚠️ NOT generic "view mode" — a wallet type. |
| Hardware wallet | აპარატული საფულე | noun · "hardware" + საფულე (Bitcoin Core ka). |
| Seed | საწყისი ფრაზა / seed-ფრაზა | noun · "recovery phrase" preferred over transliteration (no upstream wallet citation). |
| Mnemonic | მნემონიკური ფრაზა | noun · transliteration of "mnemonic" + ფრაზა (no upstream wallet citation). |
| Passphrase | საკვანძო ფრაზა | noun · ⚠️ NOT `პაროლი` (password) and NOT the device passcode. Bitcoin Core ka uses `საიდუმლო ფრაზა` (wallet-encryption context); we keep the established distinct term. |
| Public key | საჯარო გასაღები | noun · Bitcoin Core ka |
| Private key | პირადი გასაღები | noun · Bitcoin Core ka |
| WIF | WIF | acronym (Wallet Import Format). |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | დესკრიპტორი | noun · transliteration (no upstream wallet citation). |
| Derivation path | წარმოების გზა | noun · "derivation path" (no upstream wallet citation). |
| Master fingerprint | ძირითადი თითის ანაბეჭდი | noun · "master" + "fingerprint" (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. ⚠️ NOT a verb / NOT "password" alone. |
| **_On-chain transactions_** | | |
| Transaction | ტრანზაქცია | noun · modern standard spelling (Bitcoin Core ka uses variant ტრანსაქცია). |
| Address | მისამართი | noun · Bitcoin Core ka |
| Input | შემავალი / შესავალი | noun · tx input. ⚠️ NOT "login / entrance" (no upstream wallet citation). |
| Output | გამავალი / გასავალი | noun · tx output. ⚠️ NOT the UI recipient label "To:" (no upstream wallet citation). |
| UTXO | UTXO | acronym (Unspent Transaction Output). |
| Change | ხურდა | noun · Bitcoin Core ka. ⚠️ NOT the verb "to change/modify". |
| Hex | hex / თექვსმეტობითი | noun · short form / "hexadecimal" (no upstream wallet citation). ⚠️ NOT "hash". |
| Pending | მოლოდინში | adj/state · "in waiting" (no upstream wallet citation). ⚠️ NOT a noun. |
| Unconfirmed | დაუდასტურებელი | adj · negated form of Bitcoin Core ka დადასტურებული. |
| Confirmed | დადასტურებული | adj/state · Bitcoin Core ka (ships დადასტურებულია "is confirmed"). |
| Mempool | mempool | technical term kept Latin (no Georgian upstream rendering). |
| Broadcast | გავრცელება / გაავრცელე | noun / verb · "dissemination / disseminate" (no upstream wallet citation). |
| Block explorer | ბლოკების მკვლევარი | noun · "block explorer" (no upstream wallet citation). |
| Onchain | on-chain / ქსელშიდა | adj · compact Latin / "in-network" explanatory (no upstream wallet citation). |
| Offchain | off-chain / ქსელგარე | adj · compact Latin / "off-network" explanatory (no upstream wallet citation). |
| **_Fees & fee bumping_** | | |
| Fee | საკომისიო | noun · Bitcoin Core ka |
| Fee Bump | საკომისიოს გაზრდა | noun · "fee increase" (umbrella for RBF + CPFP; no upstream wallet citation). |
| RBF | RBF | acronym (Replace-by-fee, BIP125). |
| CPFP | CPFP | acronym (Child-pays-for-parent). ⚠️ NOT a verb. |
| Speed Up | დაჩქარება | verb · "speed up" — RBF button label (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | ინვოისი / გადახდის მოთხოვნა | noun · transliteration / "payment request" (no upstream wallet citation). |
| Lightning Invoice | Lightning ინვოისი | noun · brand kept Latin + localised noun (no upstream wallet citation). |
| Preimage | წინასახე | noun · math term for "preimage" (transliteration of concept; uncertain). |
| Payment | გადახდა | noun · standard Georgian. ⚠️ NOT the verb "to pay" (`გადაიხადე`). |
| Expired | ვადაგასული | adj/state · "expired / out of validity" (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | თანახელმომწერი | noun · literal "co-signer". ⚠️ NOT "co-owner" (no upstream wallet citation). |
| Quorum | ქვორუმი / ხელმოწერების ზღვარი | noun · transliteration / "signature threshold" (no upstream wallet citation). |
| PSBT | PSBT | acronym (Partially Signed Bitcoin Transaction, BIP174). |
| Provide signature | ხელის მოწერა | verb · "sign / provide signature" (no upstream wallet citation). |
| BIP47 / Payment Code | BIP47 / გადახდის კოდი | acronym kept; "Payment Code" translatable noun (no upstream wallet citation). |
| Notification transaction | შეტყობინების ტრანზაქცია | noun · BIP47 "notification" + transaction (no upstream wallet citation). |
| SilentPayment | Silent Payments / ჩუმი გადახდები | protocol name kept English (plural); explanatory ka gloss "silent payments". |
| **_Coin control_** | | |
| Coin Control | UTXO-ს მართვა / მონეტების მართვა | noun · technical "UTXO management" / "coin management" (no upstream wallet citation). Georgian has no casing. |
| Frozen | გაყინული | adj/state · "frozen". ⚠️ NOT the verb "to freeze" (no upstream wallet citation). |
| **_Security & storage_** | | |
| Encrypted storage | დაშიფრული საცავი | noun · "encrypted storage" (Bitcoin Core ka დაშიფვრა "encrypt"). Georgian has no casing. |
| Plausible Deniability | დამაჯერებელი უარყოფა | noun · "plausible denial" (no upstream wallet citation). Georgian has no casing. |
| Biometrics | ბიომეტრია | noun · standard Georgian "biometrics" (no upstream wallet citation). |
| Passcode | წვდომის კოდი | noun · "access code". ⚠️ NOT `პაროლი` (app password) — distinct term (no upstream wallet citation). |
| **_Backup, import & UX_** | | |
| Backup | სარეზერვო ასლი / სარეზერვო ასლის შექმნა | noun / verb · "backup copy / make a backup" (no upstream wallet citation). |
| Restore | აღდგენა | verb / noun · "restore / restoration" (no upstream wallet citation). |
| Import | იმპორტი / იმპორტირება | noun / verb · transliteration (no upstream wallet citation). |
| Voucher | ვაუჩერი | noun · transliteration (no upstream wallet citation). |
| Redeem | განაღდება / გააქტიურება | verb · "cash in / activate". ⚠️ NOT "buy to wallet" / NOT "transfer" (no upstream wallet citation). |
| Send | გაგზავნა | verb · Bitcoin Core ka |
| Receive | მიღება | verb · Bitcoin Core ka |
| Settings | პარამეტრები | noun · standard Georgian "settings / parameters" (no upstream wallet citation). |
| Confirm | დადასტურება | verb / noun · "confirm"; confirmations = `დადასტურებები` (Bitcoin Core ka). |
| QR Code | QR კოდი | noun · QR + "code" (no upstream wallet citation). |
| Clipboard | ბუფერი | noun · "buffer / clipboard" (no upstream wallet citation). |
| Memo | შენიშვნა | noun · "note" — sender note on outgoing tx (no upstream wallet citation). |
| Description | აღწერა | noun · "description" (no upstream wallet citation). |
| Label | ნიშნული | noun · Bitcoin Core ka |

