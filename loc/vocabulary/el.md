# Greek translation vocabulary (`el.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · el.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand · acronym kept Latin. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; lowercase unit name. |
| sats | sats | noun, lowercase · ships in el.json. |
| sat/vByte | sat/vByte | technical unit; Latin kept. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | πορτοφόλι | noun, lowercase · el.wikipedia.org/wiki/Bitcoin |
| Vault | χρηματοκιβώτιο / θησαυροφυλάκιο | noun · safe/strongbox sense · ⚠️ distinct from `πορτοφόλι` (wallet). |
| Watch-only | μόνο για παρακολούθηση / μόνο ανάγνωσης | adj · Electrum el_GR + Zeus el ("Πορτοφόλι μόνο για ανάγνωση"). |
| Hardware wallet | πορτοφόλι υλικού / πορτοφόλι hardware | noun · Greek leftmost preferred; Bitcoin Core el keeps `hardware πορτοφόλι` mixed as fallback. |
| Seed | μνημονική φράση / φράση ανάκτησης | noun · mainstream user-facing form preferred. |
| Mnemonic | μνημονική φράση / φράση απομνημόνευσης | noun · technical / shipped form in el.json. |
| Passphrase | κωδική φράση | noun · ⚠️ NOT `κωδικός` (= password / passcode) · Bitcoin Core el: `φράση πρόσβασης`. |
| Public key | δημόσιο κλειδί | noun, lowercase · el.wikipedia.org/wiki/Bitcoin + Electrum el_GR |
| Private key | ιδιωτικό κλειδί | noun, lowercase · Electrum el_GR + Bitcoin Core el |
| WIF | WIF | acronym · gloss: μορφή εισαγωγής πορτοφολιού. |
| xpub | xpub | acronym, lowercase preferred · shipped UI uses uppercase `XPUB` (see TODOs). |
| Descriptor | περιγραφέας | noun, lowercase · output descriptor sense. |
| Derivation path | μονοπάτι παραγωγής / διαδρομή παραγωγής | noun · BIP32 path · Zeus el: `Διαδρομή προέλευσης`. |
| Master fingerprint | αποτύπωμα κύριου κλειδιού | noun · Zeus el: `Δακτυλικό αποτύπωμα κύριου κλειδιού`. |
| BIP38 | BIP38 | acronym kept · gloss: κωδικός BIP38 για αποκρυπτογράφηση ιδιωτικού κλειδιού. |
| **_On-chain transactions_** | | |
| Transaction | συναλλαγή | noun, lowercase · Electrum el_GR + Bitcoin Core el |
| Address | διεύθυνση | noun, lowercase · Electrum el_GR + Bitcoin Core el |
| Input | είσοδος / είσοδος συναλλαγής | noun · short / full · ⚠️ NOT `Εισερχόμενες διευθύνσεις` (verbose & inaccurate — that's an address-side label, not a tx input). |
| Output | έξοδος / έξοδος συναλλαγής | noun · short / full · ⚠️ NOT `Εξερχόμενες διευθύνσεις` (verbose & inaccurate). |
| UTXO | UTXO | acronym · gloss: μη ξοδεμένη έξοδος συναλλαγής. |
| Change | ρέστα / διεύθυνση ρεστών | noun · ⚠️ NOT `Αλλαγή` (= "change/modify"). Bitcoin Core el: `ρέστα`. |
| Hex | hex / δεκαεξαδική μορφή | noun · short / explanatory · ⚠️ NOT "hash" / NOT "δεδομένα συναλλαγής". |
| Pending | σε εκκρεμότητα / εκκρεμεί | adj/state · Bitcoin Core el: `Εκκρεμούν` · shipped `Σε επεξεργασία` is acceptable but loose. |
| Unconfirmed | ανεπιβεβαίωτη / μη επικυρωμένη | adj · feminine agreement w/ `συναλλαγή` · Bitcoin Core el + Zeus el |
| Confirmed | επιβεβαιωμένη / επικυρωμένη | adj · feminine agreement · ⚠️ NOT the noun `επιβεβαιώσεις` (= "confirmations") · Bitcoin Core el |
| Mempool | mempool / δεξαμενή μνήμης | noun · technical / explanatory · Bitcoin Core el: `Δεξαμενή μνήμης`. |
| Broadcast | μεταδίδω / μετάδοση | verb / noun · imperative `μετάδωσέ το στο δίκτυο` · Electrum el_GR + Bitcoin Core el |
| Block explorer | εξερευνητής μπλοκ | noun, lowercase · Electrum el_GR |
| Onchain | on-chain / εντός αλυσίδας | adj · compact (chip) / explanatory (body) · Zeus el: `Εντός της αλυσίδας`. |
| Offchain | off-chain / εκτός αλυσίδας | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | προμήθεια / χρέωση | noun, lowercase · Electrum el_GR + el.wikipedia.org/wiki/Bitcoin (`χρέωση`). Shipped `Κόστος` is loose. |
| Fee Bump | αύξηση προμήθειας | noun. |
| RBF | RBF | acronym · gloss: αντικατάσταση με υψηλότερη προμήθεια / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: το παιδί πληρώνει για τον γονέα · ⚠️ NOT `Δημιουργία` (shipped string is wrong — it means "Create"). |
| Speed Up | επιτάχυνση | verb · button label for RBF. |
| **_Lightning_** | | |
| Invoice | τιμολόγιο / αίτημα πληρωμής | noun · technical / mainstream · Electrum el_GR + Zeus el |
| Lightning Invoice | τιμολόγιο Lightning / αίτημα πληρωμής Lightning | noun · technical / mainstream. |
| Preimage | προεικόνα | noun · math term · Zeus el: `Προεικόνα R`. |
| Payment | πληρωμή | noun · ⚠️ NOT the verb "πληρώνω". Electrum el_GR + Zeus el |
| Expired | έληξε / έχει λήξει | adj/state · Electrum el_GR + Zeus el |
| **_Multisig & advanced addressing_** | | |
| Co-signer | συν-υπογράφων | noun · ⚠️ NOT "συν-ιδιοκτήτης" (co-owner). |
| Quorum | απαρτία / όριο υπογραφών | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · ships kept Latin. |
| Provide signature | παροχή υπογραφής / υπόγραψε συναλλαγή | verb · generic / specific · matches shipped string. |
| BIP47 / Payment Code | BIP47 / κωδικός πληρωμής | acronym kept; "Payment Code" → `κωδικός πληρωμής` (matches shipped). |
| Notification transaction | συναλλαγή ειδοποίησης | noun · BIP47-specific. |
| SilentPayment | Silent Payments / σιωπηλές πληρωμές | protocol name kept English (plural); explanatory Greek gloss optional. |
| **_Coin control_** | | |
| Coin Control | διαχείριση UTXO / διαχείριση νομισμάτων | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case. Bitcoin Core el: `δυνατοτήτων επιλογής κερμάτων`. |
| Frozen | παγωμένη / δεσμευμένη | adj · feminine state agreement w/ έξοδος · ⚠️ NOT verb "πάγωσε". |
| **_Security & storage_** | | |
| Encrypted storage | κρυπτογραφημένη αποθήκευση | noun, lowercase · ⚠️ NOT Title Case · Bitcoin Core el: `κρυπτογράφηση του πορτοφολιού`. |
| Plausible Deniability | εύλογη δυνατότητα άρνησης | noun, lowercase · shipped form is correct. |
| Biometrics | βιομετρικά | noun, lowercase · matches shipped. |
| Passcode | κωδικός πρόσβασης / PIN | noun · ⚠️ shipped `Κωδικός` collides with "password" — disambiguate to `κωδικός πρόσβασης συσκευής` where the screen is the OS-level lock. |
| **_Backup, import & UX_** | | |
| Backup | αντίγραφο ασφαλείας / δημιούργησε αντίγραφο ασφαλείας | noun / verb · imperative for verb slot · Electrum el_GR + Bitcoin Core el |
| Restore | επαναφορά / επανάκτηση | verb / noun · Electrum el_GR + Bitcoin Core el |
| Import | εισάγω / εισαγωγή | verb / noun · matches shipped. |
| Voucher | κουπόνι | noun, lowercase · ⚠️ shipped `κωδικός κουπονιού` = "voucher code" (longer form, OK if context demands). |
| Redeem | εξαργύρωσε / ενεργοποίησε | verb · imperative · matches shipped. |
| Send | στείλε / αποστολή | verb / noun · Electrum el_GR + Bitcoin Core el |
| Receive | λαμβάνω / λήψη | verb / noun · matches shipped. |
| Settings | ρυθμίσεις | noun, lowercase · Bitcoin Core el |
| Confirm | επιβεβαίωσε / επιβεβαίωση | verb / noun · Bitcoin Core el. ⚠️ shipped uses `Επικύρωση` ("validation/ratification") — `επιβεβαίωση` is more idiomatic and consistent with `confirmations`. |
| QR Code | κωδικός QR | noun, lowercase · Electrum el_GR + Bitcoin Core el |
| Clipboard | πρόχειρο | noun, lowercase · Electrum el_GR + Bitcoin Core el |
| Memo | σημείωση | noun, lowercase · matches shipped. |
| Description | περιγραφή | noun, lowercase · Electrum el_GR. |
| Label | ετικέτα | noun, lowercase · Electrum el_GR + Bitcoin Core el |
