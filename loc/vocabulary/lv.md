# Latvian translation vocabulary (`lv.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: Bitcoin Core ships a partial Latvian locale (`bitcoin_lv.ts`) and Electrum ships `lv/electrum.po`; both are incomplete but were consulted for on-chain vocabulary. Latvian Wikipedia (lv.wikipedia.org) has a Bitcoin article (`Bitkoins`) used to validate culturally-natural renderings. Latvian uses sentence case for ordinary nouns (no English-style Title Case), Latin script, LTR. Rows without an upstream citation are marked "(transliteration)" or note the native term chosen.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; Latvian gloss `bitkoins` per lv.wikipedia.org/wiki/Bitkoins (use in body text only). |
| Lightning | Lightning | brand kept Latin (no lv.wikipedia article for Lightning Network). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitkoins / BTC | noun unit + ticker · lv.wikipedia.org/wiki/Bitkoins |
| sats | sati | noun · plural of "sats"; satoshi → satoši (transliteration). |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin (lowercase `sat`, capital `B`). |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | maks | noun · native Latvian "purse/wallet" · matches Bitcoin Core lv. ⚠️ NOT Title Case. |
| Vault | seifs | noun · "safe / strongbox" — native Latvian noun. ⚠️ NOT a brand. |
| Watch-only | tikai skatīšanās | adj · descriptive "view-only" — specifically a wallet type. ⚠️ NOT "view mode". |
| Hardware wallet | aparatūras maks | noun · "hardware" + maks (parallel to Wallet=maks). |
| Seed | sēkla / atjaunošanas frāze | noun · literal "seed" / mainstream "recovery phrase"; prefer recovery-phrase form in mainstream UI. |
| Mnemonic | mnemoniskā frāze | noun · "mnemonic phrase" (transliteration of mnemonic). |
| Passphrase | ieejas frāze | noun · ⚠️ NOT "parole" (password) and NOT device "piekļuves kods" — distinct term for BIP39 25th word. |
| Public key | publiskā atslēga | noun · parallel to privātā atslēga · Bitcoin Core lv. |
| Private key | privātā atslēga | noun · Bitcoin Core lv. |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | deskriptors | noun · transliteration. |
| Derivation path | atvasināšanas ceļš | noun · "derivation" + "path" (native Latvian). |
| Master fingerprint | galvenais nospiedums | noun · "master" + "fingerprint" (native Latvian). |
| BIP38 | BIP38 | acronym kept. ⚠️ NOT a verb / NOT "parole". |
| **_On-chain transactions_** | | |
| Transaction | darījums | noun · Bitcoin Core lv / lv.wikipedia.org/wiki/Bitkoins. |
| Address | adrese | noun · Bitcoin Core lv. |
| Input | ievade | noun · tx input. ⚠️ NOT "login / entrance". |
| Output | izvade | noun · tx output (parallel to ievade). ⚠️ NOT the UI recipient label "Saņēmējam:". |
| UTXO | UTXO | acronym. |
| Change | atlikums | noun · "remainder / leftover" (change output). ⚠️ NOT verb "mainīt" (to change/modify). |
| Hex | hex / heksadecimāls | noun · short form / explanatory "hexadecimal". ⚠️ NOT "hash" / NOT "transaction data". |
| Pending | gaida | adj/state · "pending/waiting". ⚠️ NOT a noun. |
| Unconfirmed | neapstiprināts | adj · Bitcoin Core lv. |
| Confirmed | apstiprināts | adj/state form · Bitcoin Core lv. |
| Mempool | mempool | technical term kept Latin (no native Latvian rendering). |
| Broadcast | izsūtīt / izsūtīšana | verb / noun · "send out / broadcast". |
| Block explorer | bloku pārlūks | noun · "blocks" + "browser/explorer". |
| Onchain | ķēdē / blokķēdē | adj · compact "in-chain" / explanatory "in the blockchain". |
| Offchain | ārpus ķēdes / ārpus blokķēdes | adj · compact "off-chain" / explanatory "outside the blockchain". |
| **_Fees & fee bumping_** | | |
| Fee | maksa / komisijas maksa | noun · compact (shipped UI: "Maksa", "Tīkla maksa") / explanatory "commission fee". |
| Fee Bump | maksas palielināšana | noun · "fee increase". |
| RBF | RBF | acronym. |
| CPFP | CPFP | acronym · ⚠️ NOT a verb. |
| Speed Up | paātrināt | verb · imperative "speed up" (RBF label). |
| **_Lightning_** | | |
| Invoice | rēķins | noun · native Latvian "invoice/bill". |
| Lightning Invoice | Lightning rēķins | noun · brand kept Latin + localised noun. |
| Preimage | pirmtēls | noun · math term "pre-image" (LV mathematics term; ⚠️ NOT "priekštēls" = role model/exemplar). |
| Payment | maksājums | noun · standard Latvian. ⚠️ NOT verb "maksāt" (to pay). |
| Expired | beidzies | adj/state · "expired / ended". |
| **_Multisig & advanced addressing_** | | |
| Co-signer | līdzparakstītājs | noun · literal "co-signer". ⚠️ NOT "līdzīpašnieks" (co-owner). |
| Quorum | kvorums / parakstu slieksnis | noun · canonical "quorum" / UI alternative "signature threshold". |
| PSBT | PSBT | acronym. |
| Provide signature | sniegt parakstu | verb · "provide signature / sign". |
| BIP47 / Payment Code | BIP47 / maksājuma kods | acronym kept; "Payment Code" → translatable noun. |
| Notification transaction | paziņojuma darījums | noun · BIP47-specific "notification + transaction". |
| SilentPayment | Silent Payments / klusie maksājumi | protocol name kept English (plural); explanatory Latvian gloss. |
| **_Coin control_** | | |
| Coin Control | monētu kontrole / UTXO pārvaldība | noun · "coin control" / technical "UTXO management". ⚠️ NOT Title Case. |
| Frozen | iesaldēts | adj/state · "frozen". ⚠️ NOT verb "iesaldēt" (to freeze). |
| **_Security & storage_** | | |
| Encrypted storage | šifrēta krātuve | noun · "encrypted storage". ⚠️ NOT Title Case. |
| Plausible Deniability | ticama noliedzamība | noun · "plausible deniability". ⚠️ NOT Title Case. |
| Biometrics | biometrija | noun · standard Latvian. |
| Passcode | piekļuves kods | noun · device unlock code · ⚠️ NOT "parole" (app password). |
| **_Backup, import & UX_** | | |
| Backup | dublējums / dublēt | noun / verb · "backup copy" / "to back up". |
| Restore | atjaunot / atjaunošana | verb / noun · "restore". |
| Import | importēt / imports | verb / noun · standard Latvian. |
| Voucher | vaučers | noun · transliteration (Azte.co prepaid voucher). |
| Redeem | izpirkt | verb · "redeem / cash in". ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | sūtīt | verb · Bitcoin Core lv. |
| Receive | saņemt | verb · Bitcoin Core lv. |
| Settings | iestatījumi | noun · Bitcoin Core lv. |
| Confirm | apstiprināt | verb · Bitcoin Core lv. |
| QR Code | QR kods | noun · "QR" + native "kods". |
| Clipboard | starpliktuve | noun · standard Latvian "clipboard". |
| Memo | piezīme | noun · "note / memo". |
| Description | apraksts | noun · standard Latvian. |
| Label | etiķete | noun · "label / tag". ⚠️ NOT verb "etiķetēt". |
