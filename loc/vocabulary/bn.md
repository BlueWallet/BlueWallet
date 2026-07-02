# Bengali translation vocabulary (`bn.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: Bengali (বাংলা) uses the Bengali script and is written LTR. Bengali has no upper/lower casing, so the "natural casing" convention just means using ordinary noun spelling (no English-style Title Case). Upstream coverage is partial: Bitcoin Core ships a usable `bitcoin_bn.ts`; Electrum's `bn/electrum.po` is largely unfinished; `bn.wikipedia.org` has a Bitcoin article (বিটকয়েন) but no Lightning Network article. Rows sourced from those are cited; everything else is a Bengali transliteration of the English loanword (the common register for tech vocabulary in Bengali UIs) and marked "(transliteration)".

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; Bengali gloss `বিটকয়েন` per bn.wikipedia.org/wiki/বিটকয়েন (body text only). |
| Lightning | Lightning | brand kept Latin (no bn.wikipedia article for Lightning Network). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | বিটকয়েন / BTC | noun unit + ticker · bn.wikipedia.org/wiki/বিটকয়েন |
| sats | স্যাটস | noun · transliteration of "sats" (no upstream wallet citation). |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | ওয়ালেট | noun · Bitcoin Core bn |
| Vault | সিন্দুক | noun · native Bengali "safe / strongbox" (no upstream wallet citation). ⚠️ NOT a brand. |
| Watch-only | কেবল-দেখার | adj · descriptive "view-only" (no upstream wallet citation). ⚠️ NOT generic "view mode". |
| Hardware wallet | হার্ডওয়্যার ওয়ালেট | noun · transliteration parallel to Wallet=ওয়ালেট. |
| Seed | সিড / পুনরুদ্ধার বাক্যাংশ | noun · transliteration / "recovery phrase" (no upstream wallet citation). |
| Mnemonic | নিমোনিক ফ্রেজ | noun · transliteration (no upstream wallet citation). |
| Passphrase | পাসফ্রেজ | noun · ⚠️ NOT পাসওয়ার্ড (password) — distinct transliteration · Bitcoin Core bn |
| Public key | পাবলিক কী | noun · transliteration parallel to প্রাইভেট কী (no upstream wallet citation). |
| Private key | প্রাইভেট কী | noun · transliteration (no upstream wallet citation). |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | ডেসক্রিপ্টর | noun · transliteration (no upstream wallet citation). |
| Derivation path | ডেরিভেশন পাথ | noun · transliteration (no upstream wallet citation). |
| Master fingerprint | মাস্টার ফিঙ্গারপ্রিন্ট | noun · transliteration (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | লেনদেন | noun · Bitcoin Core bn · bn.wikipedia.org/wiki/বিটকয়েন |
| Address | ঠিকানা | noun · Bitcoin Core bn |
| Input | ইনপুট | noun · ⚠️ NOT "login / entrance" · transliteration. |
| Output | আউটপুট | noun · transliteration parallel to Input=ইনপুট. ⚠️ NOT the UI recipient label "To:". |
| UTXO | UTXO | acronym. |
| Change | খুচরা | noun · native "small change / leftover" (no upstream wallet citation). ⚠️ NOT verb "to change/modify". |
| Hex | হেক্স | noun · transliteration. ⚠️ NOT "hash". |
| Pending | অপেক্ষমাণ | adj/state · "awaiting" (no upstream wallet citation). ⚠️ NOT a noun. |
| Unconfirmed | নিশ্চিত হয়নি | adj/state · "not confirmed" (parallel to Bitcoin Core bn নিশ্চিত হয়েছে). |
| Confirmed | নিশ্চিত হয়েছে | adj/state · Bitcoin Core bn |
| Mempool | মেমপুল | noun · transliteration (no native Bengali rendering). |
| Broadcast | সম্প্রচার / সম্প্রচার করুন | noun / verb · standard Bengali সম্প্রচার (no upstream wallet citation). |
| Block explorer | ব্লক এক্সপ্লোরার | noun · transliteration (no upstream wallet citation). |
| Onchain | অন-চেইন | adj · transliteration; no native Bengali term. |
| Offchain | অফ-চেইন | adj · transliteration; no native Bengali term. |
| **_Fees & fee bumping_** | | |
| Fee | ফি | noun · common loanword for transaction fee. (Bitcoin Core bn uses পারিশ্রমিক = "remuneration", awkward for network fee; ফি preferred for UI.) |
| Fee Bump | ফি বৃদ্ধি | noun · "fee increase" (no upstream wallet citation). |
| RBF | RBF | acronym. |
| CPFP | CPFP | acronym · ⚠️ NOT a verb. |
| Speed Up | গতি বাড়ান | verb · imperative "speed up" (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | ইনভয়েস / চালান | noun · transliteration / native (bill) (no upstream wallet citation). |
| Lightning Invoice | Lightning ইনভয়েস | noun · brand kept Latin + localised noun. |
| Preimage | প্রিইমেজ | noun · math term transliteration (no upstream wallet citation). |
| Payment | পেমেন্ট | noun · common loanword (native অর্থপ্রদান). ⚠️ NOT verb "to pay". |
| Expired | মেয়াদ উত্তীর্ণ | adj/state · "validity ended" (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | সহ-স্বাক্ষরকারী | noun · literal "co-signer" (no upstream wallet citation). ⚠️ NOT "co-owner". |
| Quorum | কোরাম | noun · transliteration (no upstream wallet citation). |
| PSBT | PSBT | acronym. |
| Provide signature | স্বাক্ষর দিন | verb · "give signature" (no upstream wallet citation). |
| BIP47 / Payment Code | BIP47 / পেমেন্ট কোড | acronym kept; "Payment Code" translatable noun (no upstream wallet citation). |
| Notification transaction | বিজ্ঞপ্তি লেনদেন | noun · "notification" + লেনদেন (Bitcoin Core bn). |
| SilentPayment | Silent Payments | protocol name kept English (plural); native gloss নীরব পেমেন্ট optional. |
| **_Coin control_** | | |
| Coin Control | কয়েন কন্ট্রোল | noun · transliteration loanword. ⚠️ Bengali has no casing. |
| Frozen | ফ্রিজ করা | adj/state · "frozen" (no upstream wallet citation). ⚠️ NOT verb "to freeze". |
| **_Security & storage_** | | |
| Encrypted storage | এনক্রিপ্ট করা স্টোরেজ | noun · Encrypt=এনক্রিপ্ট (Bitcoin Core bn) + storage transliteration. ⚠️ Bengali has no casing. |
| Plausible Deniability | যুক্তিযুক্ত অস্বীকৃতি | noun · "reasonable denial" (no upstream wallet citation). ⚠️ Bengali has no casing. |
| Biometrics | বায়োমেট্রিক্স | noun · transliteration (no upstream wallet citation). |
| Passcode | পাসকোড | noun · transliteration · ⚠️ NOT পাসওয়ার্ড (= app password). Distinct word for device unlock code. |
| **_Backup, import & UX_** | | |
| Backup | ব্যাকআপ | noun · Bitcoin Core bn |
| Restore | পুনরুদ্ধার / পুনরুদ্ধার করুন | noun / verb (no upstream wallet citation). |
| Import | আমদানি / আমদানি করুন | noun / verb · native "import" (no upstream wallet citation). |
| Voucher | ভাউচার | noun · transliteration (no upstream wallet citation). |
| Redeem | রিডিম করুন | verb · transliteration (no upstream wallet citation). ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | পাঠান | verb · Bitcoin Core bn (পাঠানো; polite imperative পাঠান for UI buttons). |
| Receive | গ্রহণ করুন | verb · Bitcoin Core bn (গ্রহণ). |
| Settings | সেটিংস | noun · Bitcoin Core bn |
| Confirm | নিশ্চিত করুন | verb · Bitcoin Core bn (নিশ্চিত করা). |
| QR Code | QR কোড | noun · transliteration. |
| Clipboard | ক্লিপবোর্ড | noun · transliteration. |
| Memo | মেমো | noun · transliteration (no upstream wallet citation). |
| Description | বিবরণ | noun · standard Bengali (no upstream wallet citation). |
| Label | লেবেল | noun · Bitcoin Core bn |
