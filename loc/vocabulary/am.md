# Amharic translation vocabulary (`am.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: Amharic (አማርኛ) is written in the Geʽez/Ethiopic script and is left-to-right. Upstream wallet projects ship little to no Amharic localization — `bitcoin_am.ts` exists in Bitcoin Core but is largely unfinished, and Electrum/Phoenix/Zeus/Cake `am` files are absent or 404. The only reliable native-script references are am.wikipedia.org (Bitcoin article) and general Amharic technical usage. Brand/protocol names stay Latin. Where no upstream source exists the rendering is a careful Amharic translation or transliteration, marked "(transliteration)".

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; Amharic gloss `ቢትኮይን` per am.wikipedia.org/wiki/ቢትኮይን (use in body text only). |
| Lightning | Lightning | brand kept Latin (no am.wikipedia article for Lightning Network). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | ቢትኮይን / BTC | noun unit + ticker · am.wikipedia.org/wiki/ቢትኮይን |
| sats | ሳት | noun · transliteration of "sat"; plural "ሳቶች" where natural. |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin per convention. |
| vByte | vByte | technical unit kept Latin. |
| **_Wallet, keys & seeds_** | | |
| Wallet | ቦርሳ | noun · standard Amharic for "wallet/purse"; lowercase usage (Amharic has no casing). |
| Vault | ካዝና | noun · "safe / strongbox / treasury" — native Amharic word. ⚠️ NOT a brand. |
| Watch-only | ለመመልከት ብቻ | adj · "for viewing only" (no upstream wallet citation). ⚠️ NOT generic "view mode". |
| Hardware wallet | ሃርድዌር ቦርሳ | noun · transliteration "hardware" + ቦርሳ (no upstream wallet citation). |
| Seed | ዘር / የመልሶ ማግኛ ሐረግ | noun · literal "seed" / mainstream "recovery phrase" (no upstream wallet citation). |
| Mnemonic | የመልሶ ማግኛ ሐረግ | noun · "recovery phrase"; transliteration `ማኒሞኒክ` possible (no upstream wallet citation). |
| Passphrase | የይለፍ ሐረግ | noun · "pass phrase" · ⚠️ NOT የይለፍ ቃል (= app password) — distinct term. |
| Public key | የይፋ ቁልፍ | noun · "public key"; parallel to የግል ቁልፍ (no upstream wallet citation). |
| Private key | የግል ቁልፍ | noun · "private key" (no upstream wallet citation). |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | ዲስክሪፕተር | noun · transliteration (no upstream wallet citation). |
| Derivation path | የመነሻ መንገድ | noun · "derivation path"; transliteration `ዴሪቬሽን ፓዝ` possible (no upstream wallet citation). |
| Master fingerprint | ዋና የጣት አሻራ | noun · "master fingerprint" (የጣት አሻራ = fingerprint) (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | ግብይት | noun · standard Amharic "transaction/trade" · am.wikipedia.org/wiki/ቢትኮይን |
| Address | አድራሻ | noun · standard Amharic "address". |
| Input | ግብዓት | noun · "input" · ⚠️ NOT "login / entrance" (no upstream wallet citation). |
| Output | ውጤት | noun · "output"; parallel to ግብዓት (no upstream wallet citation). ⚠️ NOT the UI recipient label "To:". |
| UTXO | UTXO | acronym. |
| Change | መልስ | noun · "change / money returned" (no upstream wallet citation). ⚠️ NOT verb "to change/modify". |
| Hex | ሄክስ | noun · transliteration (no upstream wallet citation). ⚠️ NOT "hash". |
| Pending | በመጠባበቅ ላይ | adj/state · "pending / awaiting" (no upstream wallet citation). ⚠️ NOT a noun. |
| Unconfirmed | ያልተረጋገጠ | adj · "unconfirmed" (no upstream wallet citation). |
| Confirmed | የተረጋገጠ / ተረጋግጧል | adj / state · "confirmed" (no upstream wallet citation). |
| Mempool | mempool | technical term kept Latin (no Amharic upstream rendering). |
| Broadcast | ማሰራጨት / አሰራጭ | noun / verb · "broadcast / disseminate" (no upstream wallet citation). |
| Block explorer | ብሎክ ኤክስፕሎረር | noun · transliteration (no upstream wallet citation). |
| Onchain | ኦንቼን / በሰንሰለቱ ላይ | adj · transliteration / "on the chain" (no upstream wallet citation). |
| Offchain | ኦፍቼን / ከሰንሰለቱ ውጪ | adj · transliteration / "off the chain" (no upstream wallet citation). |
| **_Fees & fee bumping_** | | |
| Fee | ክፍያ | noun · "fee/charge" (no upstream wallet citation). |
| Fee Bump | ክፍያ መጨመር | noun · "fee increase" (no upstream wallet citation). |
| RBF | RBF | acronym. |
| CPFP | CPFP | acronym · ⚠️ NOT a verb. |
| Speed Up | አፋጥን | verb · imperative "speed up" (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | ደረሰኝ / ኢንቮይስ | noun · native "receipt/bill" / transliteration (no upstream wallet citation). |
| Lightning Invoice | Lightning ደረሰኝ | noun · brand kept Latin + localised noun (no upstream wallet citation). |
| Preimage | ቅድመ-ምስል | noun · math term "pre-image" (no upstream wallet citation). |
| Payment | ክፍያ | noun · "payment" (no upstream wallet citation). ⚠️ NOT verb "to pay". Shares form with Fee=ክፍያ; rely on context. |
| Expired | ጊዜው አልፎበታል | adj/state · "validity has passed" (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | ተባባሪ ፈራሚ | noun · "co-signer" (ፈራሚ = signer) (no upstream wallet citation). ⚠️ NOT "co-owner". |
| Quorum | ኮረም / የፈራሚዎች ብዛት | noun · transliteration / "number of signers" (no upstream wallet citation). |
| PSBT | PSBT | acronym. |
| Provide signature | ፊርማ አቅርብ | verb · "provide signature" (no upstream wallet citation). |
| BIP47 / Payment Code | BIP47 / የክፍያ ኮድ | acronym kept; "Payment Code" → የክፍያ ኮድ (no upstream wallet citation). |
| Notification transaction | የማሳወቂያ ግብይት | noun · "notification transaction" (no upstream wallet citation). |
| SilentPayment | Silent Payments | protocol name kept English (plural); explanatory gloss `ጸጥታ ክፍያዎች` possible. |
| **_Coin control_** | | |
| Coin Control | የኮይን ቁጥጥር | noun · "coin control" (no upstream wallet citation). ⚠️ NOT Title Case (Amharic has no casing). |
| Frozen | የቀዘቀዘ / ቀዝቅዟል | adj/state · "frozen" (no upstream wallet citation). ⚠️ NOT verb "to freeze". |
| **_Security & storage_** | | |
| Encrypted storage | የተመሰጠረ ማከማቻ | noun · "encrypted storage" (no upstream wallet citation). ⚠️ NOT Title Case. |
| Plausible Deniability | አሳማኝ ማስተባበያ | noun · "plausible denial" (no upstream wallet citation). ⚠️ NOT Title Case. |
| Biometrics | ባዮሜትሪክስ | noun · transliteration (no upstream wallet citation). |
| Passcode | የይለፍ ኮድ | noun · "passcode" · ⚠️ NOT የይለፍ ቃል (= app password). Distinct word for device unlock code. |
| **_Backup, import & UX_** | | |
| Backup | መጠባበቂያ / ምትኬ | noun · "reserve (copy)" — form the app ships / common Android-Amharic "backup" (no upstream wallet citation). |
| Restore | መልሶ ማግኘት / መልስ | noun / verb · "restore / recover" (no upstream wallet citation). |
| Import | ማስመጣት | noun / verb · "import" (no upstream wallet citation). |
| Voucher | ቫውቸር | noun · transliteration (no upstream wallet citation). |
| Redeem | ማስመንዘር | verb · "cash in / redeem" (no upstream wallet citation). ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | ላክ | verb · imperative "send" (no upstream wallet citation). |
| Receive | ተቀበል | verb · imperative "receive" (no upstream wallet citation). |
| Settings | ቅንብሮች | noun · "settings" (no upstream wallet citation). |
| Confirm | አረጋግጥ | verb · imperative "confirm" (no upstream wallet citation). |
| QR Code | QR ኮድ | noun · "QR code" (ኮድ = code). |
| Clipboard | ቅንጥብ ሰሌዳ | noun · "clipboard"; transliteration `ክሊፕቦርድ` possible (no upstream wallet citation). |
| Memo | ማስታወሻ | noun · "note / memo" (no upstream wallet citation). |
| Description | መግለጫ | noun · "description" (no upstream wallet citation). |
| Label | መለያ / ስያሜ | noun · "label / designation" (no upstream wallet citation). |
