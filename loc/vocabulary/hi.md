# Hindi translation vocabulary (`hi.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: Hindi (हिन्दी), Devanagari script, LTR. Hindi has no letter-casing, so Title-Case warnings only mean "do not force English-style capitalisation of concepts." Bitcoin Core ships a partial `bitcoin_hi.ts`; Electrum has a partial `hi/electrum.po`; hi.wikipedia.org has a Bitcoin article (बिटकॉइन) but no Lightning Network article. Many advanced terms are transliterations, noted accordingly.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; Hindi gloss `बिटकॉइन` per hi.wikipedia.org/wiki/बिटकॉइन (body text only). |
| Lightning | Lightning | brand kept Latin (no hi.wikipedia article for Lightning Network). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | बिटकॉइन / BTC | noun unit + ticker · hi.wikipedia.org/wiki/बिटकॉइन |
| sats | सैट्स / सतोशी | noun · `सैट्स` transliteration of sats; `सतोशी` for satoshi (no upstream wallet citation). Lowercase concept. |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | वॉलेट | noun · transliteration · Bitcoin Core hi / hi.wikipedia.org/wiki/बिटकॉइन |
| Vault | तिजोरी | noun · native Hindi "safe / strongbox" (no upstream wallet citation). ⚠️ NOT a brand. |
| Watch-only | केवल-निगरानी | adj · "watch/observe-only" (no upstream wallet citation). ⚠️ NOT generic "view mode". |
| Hardware wallet | हार्डवेयर वॉलेट | noun · transliteration parallel to Wallet=वॉलेट (no upstream wallet citation). |
| Seed | सीड / रिकवरी फ्रेज़ | noun · transliteration / "recovery phrase" mainstream form (no upstream wallet citation). |
| Mnemonic | निमॉनिक फ्रेज़ / स्मरक वाक्यांश | noun · transliteration / native "mnemonic phrase" (no upstream wallet citation). |
| Passphrase | पासफ्रेज़ | noun · ⚠️ NOT पासवर्ड (password) and NOT पासकोड — distinct transliteration · Bitcoin Core hi uses पासफ़्रेज़ (spelling variant). |
| Public key | सार्वजनिक कुंजी | noun · parallel to निजी कुंजी (Bitcoin Core hi has निजी कुंजी for private). |
| Private key | निजी कुंजी | noun · Bitcoin Core hi |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | डिस्क्रिप्टर | noun · transliteration (no upstream wallet citation). |
| Derivation path | डेरिवेशन पाथ | noun · transliteration (no upstream wallet citation). |
| Master fingerprint | मास्टर फिंगरप्रिंट | noun · transliteration (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. ⚠️ NOT a verb / NOT "password" alone. |
| **_On-chain transactions_** | | |
| Transaction | लेनदेन / ट्रांजैक्शन | noun · native / transliteration · Bitcoin Core hi (लेनदेन); hi.wikipedia.org/wiki/बिटकॉइन uses both. |
| Address | पता | noun · Bitcoin Core hi |
| Input | इनपुट | noun · ⚠️ NOT "login / entrance" · transliteration (no upstream wallet citation). |
| Output | आउटपुट | noun · transliteration parallel to Input=इनपुट. ⚠️ NOT the UI recipient label "To:". |
| UTXO | UTXO | acronym. |
| Change | बाकी / शेष | noun · "remainder / leftover" (no upstream wallet citation). ⚠️ NOT verb बदलना "to change/modify". |
| Hex | हेक्स | noun · transliteration (no upstream wallet citation). ⚠️ NOT "hash". |
| Pending | लंबित | adj/state · "pending" (no upstream wallet citation). ⚠️ NOT a noun. |
| Unconfirmed | अपुष्ट | adj · "unconfirmed" (Bitcoin Core hi uses पुष्टि for confirm). |
| Confirmed | पुष्ट | adj/state form · Bitcoin Core hi (पुष्टि = confirmation). |
| Mempool | मेमपूल | noun · transliteration; hi.wikipedia gloss "मेमोरी पूल". |
| Broadcast | प्रसारण / प्रसारित करें | noun / verb · Bitcoin Core hi (प्रसारण). |
| Block explorer | ब्लॉक एक्सप्लोरर | noun · transliteration (no upstream wallet citation). |
| Onchain | ऑन-चेन | adj · transliteration; no native Hindi term in upstream refs. |
| Offchain | ऑफ-चेन | adj · transliteration; no native Hindi term in upstream refs. |
| **_Fees & fee bumping_** | | |
| Fee | शुल्क | noun · standard Hindi "fee/charge" (Bitcoin Core hi); ⚠️ NOT फी transliteration. |
| Fee Bump | शुल्क वृद्धि | noun · "fee increase" (no upstream wallet citation). |
| RBF | RBF | acronym. |
| CPFP | CPFP | acronym · ⚠️ NOT a verb. |
| Speed Up | तेज़ करें | verb · imperative "speed up" (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | इनवॉइस / भुगतान अनुरोध | noun · transliteration / "payment request" mainstream (no upstream wallet citation). |
| Lightning Invoice | Lightning इनवॉइस | noun · brand kept Latin + localised noun (no upstream wallet citation). |
| Preimage | प्रीइमेज | noun · math term, transliteration (no upstream wallet citation). |
| Payment | भुगतान | noun · standard Hindi (no upstream wallet citation). ⚠️ NOT verb "to pay". |
| Expired | समाप्त / अवधि समाप्त | adj/state · "expired / validity ended" (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | सह-हस्ताक्षरकर्ता | noun · literal "co-signer" (no upstream wallet citation). ⚠️ NOT "co-owner". |
| Quorum | कोरम / सीमा | noun · transliteration / "threshold" (no upstream wallet citation). |
| PSBT | PSBT | acronym. |
| Provide signature | हस्ताक्षर करें | verb · "sign" (hi.wikipedia uses हस्ताक्षर for signature). |
| BIP47 / Payment Code | BIP47 / भुगतान कोड | acronym kept; "Payment Code" translatable noun. |
| Notification transaction | सूचना लेनदेन | noun · BIP47-specific "notification + transaction" (no upstream wallet citation). |
| SilentPayment | Silent Payments / मूक भुगतान | protocol name kept English (plural); explanatory hi gloss "silent/quiet payments". |
| **_Coin control_** | | |
| Coin Control | सिक्का नियंत्रण / UTXO नियंत्रण | noun · "coin control" / technical UTXO form (no upstream wallet citation). Hindi has no casing. |
| Frozen | फ्रोज़न / जमे हुए | adj/state · transliteration / native "frozen" (no upstream wallet citation). ⚠️ NOT verb "to freeze". |
| **_Security & storage_** | | |
| Encrypted storage | एन्क्रिप्टेड स्टोरेज | noun · transliteration (no upstream wallet citation). Hindi has no casing. |
| Plausible Deniability | विश्वसनीय इनकार | noun · "credible denial" (no upstream wallet citation). Abstract privacy concept; Hindi has no casing. |
| Biometrics | बायोमेट्रिक्स | noun · transliteration (no upstream wallet citation). |
| Passcode | पासकोड | noun · transliteration · ⚠️ NOT पासवर्ड (= app password). Distinct word for device unlock code. |
| **_Backup, import & UX_** | | |
| Backup | बैकअप | noun · transliteration · Bitcoin Core hi |
| Restore | पुनर्स्थापित करें / पुनर्स्थापना | verb / noun · standard Hindi (no upstream wallet citation). |
| Import | आयात करें / आयात | verb / noun · standard Hindi "import". |
| Voucher | वाउचर | noun · transliteration (no upstream wallet citation). |
| Redeem | भुनाएं / रिडीम करें | verb · native "cash in" / transliteration (no upstream wallet citation). ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | भेजें | verb · Bitcoin Core hi (भेजें, polite imperative). |
| Receive | प्राप्त करें | verb · Bitcoin Core hi (प्राप्त). |
| Settings | सेटिंग्स | noun · transliteration (standard in Hindi UIs). |
| Confirm | पुष्टि करें | verb · Bitcoin Core hi (पुष्टि). |
| QR Code | QR कोड | noun · transliteration. |
| Clipboard | क्लिपबोर्ड | noun · transliteration. |
| Memo | मेमो / टिप्पणी | noun · transliteration / native "note" (no upstream wallet citation). |
| Description | विवरण | noun · standard Hindi "description". |
| Label | लेबल | noun · transliteration · Bitcoin Core hi |

