# Swahili translation vocabulary (`sw.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: Bitcoin Core ships a partial Swahili locale (`bitcoin_sw.ts`) which is the primary on-chain source for this table; Electrum's `sw/electrum.po` is sparse. Swahili is written in Latin script, so brand/protocol names keep their English spelling. Where a term is a recent loanword with no native equivalent and no upstream citation, it is marked `(transliteration)`. Swahili sentence-medial nouns are lowercase; the table reflects that (only proper nouns/brands are capitalised).

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin; Swahili gloss "Sarafu ya Bit" per sw.wikipedia.org/wiki/Bitcoin (body text only). |
| Lightning | Lightning | brand kept Latin (no sw.wikipedia article for Lightning Network). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker · sw.wikipedia.org/wiki/Bitcoin |
| sats | sats | noun · unit kept lowercase Latin; no established Swahili rendering. |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin (casing matters). |
| vByte | vByte | technical unit kept Latin. |
| **_Wallet, keys & seeds_** | | |
| Wallet | pochi | noun · "purse/wallet"; widespread in Swahili mobile-money UX (M-Pesa "Pochi"). Bitcoin Core sw uses pochi / mkoba. |
| Vault | sefu | noun · "safe / strongbox" — generic Swahili noun. ⚠️ NOT a brand; NOT Latin "Vault". |
| Watch-only | kutazama tu | adj · descriptive "view-only". ⚠️ NOT a generic "view mode" — specifically a wallet type (no upstream wallet citation). |
| Hardware wallet | pochi ya kifaa | noun · "device wallet"; parallel to Wallet=pochi (no upstream wallet citation). |
| Seed | mbegu / kifungu cha kurejesha | noun · literal "seed" / mainstream "recovery phrase" (no upstream wallet citation). |
| Mnemonic | kifungu cha kumbukumbu | noun · "memory phrase" for the BIP39 word list (no upstream wallet citation). |
| Passphrase | kaulisiri | noun · distinct compound "secret phrase". ⚠️ NOT nenosiri (password) and NOT the device passcode (no upstream wallet citation). |
| Public key | ufunguo wa umma | noun · "public key"; parallel to ufunguo wa faragha (no upstream wallet citation). |
| Private key | ufunguo wa faragha | noun · "private key" · Bitcoin Core sw (ufunguo wa kibinafsi). |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | kielezi | noun · "descriptor" from -eleza (describe) (no upstream wallet citation). |
| Derivation path | njia ya utoaji | noun · "derivation path" (no upstream wallet citation). |
| Master fingerprint | alama kuu ya kidole | noun · "master fingerprint" (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | muamala | noun · standard financial term (plural miamala) · Bitcoin Core sw (also shughuli za malipo) · sw.wikipedia.org/wiki/Bitcoin |
| Address | anwani | noun · Bitcoin Core sw |
| Input | ingizo | noun · "input" from -ingiza (enter). ⚠️ NOT "login / entrance" (no upstream wallet citation). |
| Output | toleo | noun · "output" parallel to Input=ingizo. ⚠️ NOT the UI recipient label "To:" (no upstream wallet citation). |
| UTXO | UTXO | acronym. |
| Change | chenji | noun · "money change / leftover" (established Swahili loanword). ⚠️ NOT verb "to change/modify" (Bitcoin Core sw uses badilisha for the verb). |
| Hex | heksa | noun · "hexadecimal" form. ⚠️ NOT "hash" (no upstream wallet citation). |
| Pending | inasubiri | adj/state · "is waiting/pending". ⚠️ NOT a noun (no upstream wallet citation). |
| Unconfirmed | haijathibitishwa | adj/state · "not confirmed" · Bitcoin Core sw (negation of -thibitisha). |
| Confirmed | imethibitishwa | adj/state · "has been confirmed" · Bitcoin Core sw |
| Mempool | mempool | technical term kept Latin (no Swahili upstream rendering). |
| Broadcast | tangaza / sambaza | verb · "announce / distribute" (no upstream wallet citation). |
| Block explorer | kichunguzi cha block | noun · "block explorer"; "block" kept Latin (no upstream wallet citation). |
| Onchain | ndani ya mnyororo | adj · "on the chain" (mnyororo = chain) (no upstream wallet citation). |
| Offchain | nje ya mnyororo | adj · "off the chain" (no upstream wallet citation). |
| **_Fees & fee bumping_** | | |
| Fee | ada | noun · Bitcoin Core sw |
| Fee Bump | kuongeza ada | noun · "fee increase" (no upstream wallet citation). |
| RBF | RBF | acronym. |
| CPFP | CPFP | acronym · ⚠️ NOT a verb. |
| Speed Up | ongeza kasi | verb · imperative "speed up" (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | ankra | noun · "invoice / bill" (no upstream wallet citation). |
| Lightning Invoice | ankra ya Lightning | noun · brand kept Latin + localised noun (no upstream wallet citation). |
| Preimage | chanzo-asili | noun · "pre-image" of the payment hash; uncertain rendering (no upstream wallet citation). |
| Payment | malipo | noun · standard Swahili. ⚠️ NOT verb "to pay" (lipa) (no upstream wallet citation). |
| Expired | imekwisha muda | adj/state · "time has ended / expired" (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | mtia saini mwenza | noun · "co-signer". ⚠️ NOT "co-owner" (no upstream wallet citation). |
| Quorum | akidi | noun · standard Swahili "quorum" (no upstream wallet citation). |
| PSBT | PSBT | acronym. |
| Provide signature | tia saini | verb · "sign / provide signature" (no upstream wallet citation). |
| BIP47 / Payment Code | BIP47 / msimbo wa malipo | acronym kept; "Payment Code" → translatable noun (no upstream wallet citation). |
| Notification transaction | muamala wa arifa | noun · BIP47-specific "notification + transaction" (no upstream wallet citation). |
| SilentPayment | Silent Payments / malipo kimya | protocol name kept English (plural); explanatory sw gloss "silent payments" (no upstream wallet citation). |
| **_Coin control_** | | |
| Coin Control | udhibiti wa sarafu | noun · "coin control". ⚠️ NOT Title Case (Swahili nouns lowercase mid-sentence) (no upstream wallet citation). |
| Frozen | imegandishwa | adj/state · "has been frozen". ⚠️ NOT verb "to freeze" (ganda) (no upstream wallet citation). |
| **_Security & storage_** | | |
| Encrypted storage | hifadhi iliyosimbwa fiche | noun · "encrypted storage" (-simba fiche = encrypt). ⚠️ NOT Title Case (no upstream wallet citation). |
| Plausible Deniability | ukanushaji unaowezekana | noun · "plausible deniability"; abstract concept, uncertain idiomatic rendering. ⚠️ NOT Title Case (no upstream wallet citation). |
| Biometrics | baiometriki | noun · transliteration (no upstream wallet citation). |
| Passcode | nambari ya siri | noun · device "passcode". ⚠️ NOT nenosiri (app password) — distinct word (no upstream wallet citation). |
| **_Backup, import & UX_** | | |
| Backup | nakala rudufu / cheleza | noun / verb · "backup copy" / verb -cheleza · Bitcoin Core sw (cheleza / hifadhi). |
| Restore | rejesha | verb · "restore / bring back" (no upstream wallet citation). |
| Import | ingiza / leta | verb · "import / bring in" (no upstream wallet citation). |
| Voucher | vocha | noun · established Swahili loanword (airtime vouchers) (no upstream wallet citation). |
| Redeem | komboa | verb · "redeem / cash in". ⚠️ NOT "buy to wallet" / NOT "transfer" (no upstream wallet citation). |
| Send | tuma | verb · Bitcoin Core sw |
| Receive | pokea | verb · Bitcoin Core sw |
| Settings | mipangilio | noun · Bitcoin Core sw |
| Confirm | thibitisha | verb · Bitcoin Core sw (-thibitisha) |
| QR Code | msimbo wa QR | noun · "QR code"; QR kept Latin (no upstream wallet citation). |
| Clipboard | klipbodi | noun · transliteration (no upstream wallet citation). |
| Memo | noti | noun · "note/memo" (no upstream wallet citation). |
| Description | maelezo | noun · "description / details" (no upstream wallet citation). |
| Label | lebo | noun · Bitcoin Core sw (lebo / chapa) |
