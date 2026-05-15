# Nepali translation vocabulary (`ne.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / बिटकोइन | brand kept Latin; बिटकोइन in explanatory text · ne.wikipedia.org/wiki/बिटकोइन |
| Lightning | Lightning / लाइटनिङ | brand kept Latin; लाइटनिङ in explanatory text. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | बिटकोइन / BTC | noun unit + ticker. |
| sats | sats / सातोशी | noun; English `sats` preferred in UI (matches ne.json), `सातोशी` in body text (Devanagari has no casing). |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | वालेट | noun; shipped UI uses `वालेट` (also plural `वालेटहरू`). |
| Vault | भल्ट | noun · canonical: `भल्ट` (matches English /ɔː/ → भ); shipped UI mixes `भल्ट` and `वाल्ट` — prefer `भल्ट`. Avoid Latin "Vault". |
| Watch-only | केवल हेर्ने | adj · "view-only" gloss; no upstream Nepali reference, but semantically accurate. |
| Hardware wallet | हार्डवेयर वालेट | noun. |
| Seed | सीड | noun, transliteration; shipped UI uses `सीड`. |
| Mnemonic | निमोनिक फ्रेज | noun, transliteration; shipped UI. |
| Passphrase | पासफ्रेज | noun · ⚠️ distinct from `पासवर्ड` (password). Bitcoin Core ne uses `पासफ्रेज`. |
| Public key | सार्वजनिक कुञ्जी | noun; pairs with `निजी कुञ्जी`. TODO: not in shipped JSON. |
| Private key | निजी कुञ्जी | noun; shipped UI. |
| WIF | WIF | acronym · gloss: वालेट इम्पोर्ट फरम्याट. |
| xpub | xpub | acronym, lowercase preferred · ⚠️ shipped UI uses uppercase `XPUB`. |
| Descriptor | डिस्क्रिप्टर | noun · transliteration (technical term, no native equivalent). |
| Derivation path | डेरिभेसन पथ | noun · transliteration of "derivation" + native `पथ` (path). |
| Master fingerprint | मास्टर फिंगरप्रिन्ट | noun; shipped UI. |
| BIP38 | BIP38 | acronym kept · gloss: पासवर्ड संरक्षित निजी कुञ्जी। |
| **_On-chain transactions_** | | |
| Transaction | लेनदेन / कारोबार | noun · shipped UI uses `लेनदेन`; Bitcoin Core ne uses `कारोबार`. |
| Address | ठेगाना | noun · Bitcoin Core ne. |
| Input | इनपुट | noun · transliteration (standard technical usage in Nepali tech writing). |
| Output | आउटपुट | noun · transliteration (standard technical usage). ⚠️ NOT recipient label "लागी". |
| UTXO | UTXO | acronym · gloss: नखर्चिएको लेनदेन आउटपुट। |
| Change | फिर्ता / बाँकी रकम | noun · ⚠️ NOT verb "परिवर्तन" (to change). `फिर्ता` = leftover returned. shipped UI uses `परिवर्तन` which is wrong. |
| Hex | हेक्स / हेक्स डाटा | noun, transliteration · compact / explanatory · ⚠️ NOT "hash". |
| Pending | विचाराधीन | adj/state · standard spelling (विचार + अधीन, long ī). ⚠️ shipped UI uses misspelled `पेनदिंग`. |
| Unconfirmed | अपुष्ट | adj; shipped UI. |
| Confirmed | पुष्टि भएको | adj/state · ⚠️ shipped UI uses noun `पुष्टिकरण` (confirmation). Adjective form preferred. |
| Mempool | मेमपूल | noun · transliteration (protocol-specific term). |
| Broadcast | प्रसारण गर्नुहोस् / प्रसारण | verb / noun · shipped UI; Bitcoin Core ne `प्रसारण`. |
| Block explorer | ब्लक एक्सप्लोरर | noun · transliteration; no native Nepali rendering in upstream refs (Bitcoin Core ne lacks the entry). |
| Onchain | अन-चेन / ब्लकचेनमा | adj · compact transliteration / explanatory ("on the blockchain"); no native term in upstream refs. |
| Offchain | अफ-चेन / ब्लकचेन बाहिर | adj · compact transliteration / explanatory ("outside the blockchain"). |
| **_Fees & fee bumping_** | | |
| Fee | शुल्क | noun · Bitcoin Core ne. |
| Fee Bump | शुल्क वृद्धि / शुल्क बढाउनुहोस् | noun (canonical) / verb (button action) · ⚠️ shipped UI uses transliterated `शुल्क बम्प`. |
| RBF | RBF | acronym · gloss: शुल्क-द्वारा-प्रतिस्थापन। |
| CPFP | CPFP | acronym · gloss: सन्तानले अभिभावकको शुल्क तिर्छ। ⚠️ NOT "सिर्जना". |
| Speed Up | छिटो बनाउनुहोस् | verb (button label). |
| **_Lightning_** | | |
| Invoice | इनभ्वाइस | noun, transliteration; shipped UI. |
| Lightning Invoice | लाइटनिङ इनभ्वाइस | noun; shipped UI. |
| Preimage | प्रीइमेज | noun · transliteration (cryptographic term, no native math equivalent). |
| Payment | भुक्तानी | noun; shipped UI · ⚠️ NOT verb "तिर्नु". |
| Expired | म्याद सकियो | adj/state phrase; shipped UI. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | सह-हस्ताक्षरकर्ता | noun · literal "co-signatory" (सह + हस्ताक्षरकर्ता). ⚠️ NOT "सह-स्वामी" (co-owner). |
| Quorum | कोरम / हस्ताक्षर सीमा | noun · canonical transliteration `कोरम` / UI-clear gloss `हस्ताक्षर सीमा` ("signature threshold"). Prefer `कोरम` in technical contexts, `हस्ताक्षर सीमा` in user-facing UI. |
| PSBT | PSBT | acronym; shipped UI. |
| Provide signature | हस्ताक्षर गर्नुहोस् | verb; shipped UI. |
| BIP47 / Payment Code | BIP47 / भुक्तानी कोड | acronym kept; "Payment Code" → `भुक्तानी कोड` (shipped UI). |
| Notification transaction | सूचना लेनदेन | noun · BIP47-specific (literal: "notification transaction"). |
| SilentPayment | Silent Payments | protocol name kept English (plural); explanatory gloss `मौन भुक्तानी` if needed. |
| **_Coin control_** | | |
| Coin Control | सिक्का नियन्त्रण | noun; shipped UI · ⚠️ source English uses Title Case but Devanagari has no casing. |
| Frozen | फ्रिज गरिएको | adj · ⚠️ NOT verb "फ्रिज गर्नुहोस्". shipped UI inconsistent (`फ्रिज` / `फ्रोजन`) — pick `फ्रिज गरिएको` (state). |
| **_Security & storage_** | | |
| Encrypted storage | इन्क्रिप्टेड स्टोरेज | noun; shipped UI · ⚠️ source English uses Title Case but Devanagari has no casing. |
| Plausible Deniability | विश्वसनीय इन्कार | noun · `विश्वसनीय` (plausible/credible) + `इन्कार` (denial). ⚠️ shipped UI uses `व्यावहारिक अस्वीकार्यता` ("practical unacceptability") which is awkward and shifts meaning. |
| Biometrics | बायोमेट्रिक्स | noun; shipped UI. |
| Passcode | पासकोड | noun · ⚠️ shipped UI uses `पासवर्ड` (collides with password). Distinct word preferred. |
| **_Backup, import & UX_** | | |
| Backup | ब्याकअप | noun, transliteration; shipped UI. |
| Restore | पुनर्स्थापना गर्नुहोस् / पुनर्स्थापना | verb / noun; shipped UI. |
| Import | आयात गर्नुहोस् / आयात | verb / noun; shipped UI. |
| Voucher | भाउचर | noun, transliteration; shipped UI. |
| Redeem | रिडिम गर्नुहोस् | verb · ⚠️ NOT "किन्नुहोस्". shipped UI uses `रिडिम`. |
| Send | पठाउनुहोस् | verb; shipped UI. |
| Receive | प्राप्त गर्नुहोस् | verb; shipped UI · Bitcoin Core ne. |
| Settings | सेटिङहरू | noun; shipped UI. |
| Confirm | पुष्टि गर्नुहोस् / पुष्टि | verb / noun · ⚠️ shipped UI uses `पक्का` ("sure") for confirmation header — informal. Prefer `पुष्टि गर्नुहोस्`. |
| QR Code | QR कोड | noun · ne.wikipedia.org/wiki/क्यूआर_कोड (alt: `क्यूआर कोड`). |
| Clipboard | क्लिपबोर्ड | noun; shipped UI. |
| Memo | मेमो | noun; shipped UI. |
| Description | विवरण | noun; shipped UI. |
| Label | लेबल | noun · Bitcoin Core ne. |
