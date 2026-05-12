# Italian translation vocabulary (`it.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand · it.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker · it.wikipedia.org/wiki/Bitcoin |
| sats | sat / satoshi | noun, lowercase · singular `sat` preferred in chips. |
| sat/vByte | sat/vByte | technical unit; keep Latin casing. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | portafoglio | noun, lowercase · Bitcoin Core it |
| Vault | cassaforte | noun, lowercase · safe/strongbox sense · ⚠️ NOT brand. Avoid Latin "Vault". |
| Watch-only | sola lettura / solo osservazione | adj · mainstream / technical · ⚠️ NOT "modalità lettura" — it's a wallet type · Trezor it + Zeus it + Cake it |
| Hardware wallet | portafoglio hardware | noun, lowercase · Bitcoin Core it + Cake it |
| Seed | seed / frase di recupero | noun · technical / mainstream. |
| Mnemonic | frase mnemonica / frase di recupero | noun · technical / mainstream. |
| Passphrase | passphrase / frase segreta | noun · ⚠️ NOT `password` (app) and NOT `PIN` (device passcode) · Electrum it ("frase segreta") + Bitcoin Core it ("passphrase") |
| Public key | chiave pubblica | noun, lowercase. |
| Private key | chiave privata | noun, lowercase. |
| WIF | WIF | acronym · gloss: Wallet Import Format. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | descriptor / descrittore di output | noun · technical / explanatory; `descriptor` is widely kept English in IT wallet UIs. |
| Derivation path | percorso di derivazione | noun, lowercase · Electrum it + Zeus it + Cake it + Trezor it |
| Master fingerprint | master fingerprint / impronta della chiave master | noun · technical / explanatory · Trezor it ("impronta digitale" for fingerprint). |
| BIP38 | BIP38 | acronym kept · gloss: chiave privata cifrata con password · ⚠️ NOT a verb / NOT just "password". |
| **_On-chain transactions_** | | |
| Transaction | transazione | noun, lowercase, feminine · it.wikipedia.org/wiki/Bitcoin |
| Address | indirizzo | noun, lowercase · it.wikipedia.org/wiki/Bitcoin |
| Input | input | noun, masculine · Italian wallets keep English `input` · Electrum it + Trezor it + Cake it |
| Output | output | noun, masculine · ⚠️ NOT the UI recipient label "A:" · Electrum it + Trezor it + Cake it |
| UTXO | UTXO | acronym · gloss: output di transazione non speso · Electrum it + Trezor it |
| Change | resto / indirizzo di resto | noun, masculine · ⚠️ NOT verb "cambiare". `resto` = leftover coin; `indirizzo di resto` for change-address field · Bitcoin Core it + Electrum it |
| Hex | hex / dati esadecimali | noun · short / explanatory · ⚠️ NOT "hash" / NOT "dati della transazione" · Cake it + Trezor it |
| Pending | in attesa / in sospeso | adj/state · UI / body · Bitcoin Core it ("In attesa") + Trezor it ("In sospeso"). |
| Unconfirmed | non confermato / non confermata | adj · masc / fem-agreement (transazione) · Electrum it + Cake it + Trezor it |
| Confirmed | confermato / confermata | adj · masc / fem-agreement · Bitcoin Core it + Cake it + Trezor it |
| Mempool | mempool | noun, lowercase · Electrum it + Trezor it |
| Broadcast | trasmetti / trasmissione | verb / noun · button vs status · Bitcoin Core it |
| Block explorer | block explorer / esploratore di blocchi | noun · loanword / explanatory · Bitcoin Core it + Electrum it keep English `block explorer`. |
| Onchain | on-chain / sulla blockchain | adj · compact (chip) / explanatory · Zeus it. |
| Offchain | off-chain / fuori blockchain | adj · compact (chip) / explanatory. |
| **_Fees & fee bumping_** | | |
| Fee | commissione | noun, lowercase, feminine · Bitcoin Core it + Electrum it + Zeus it + Cake it |
| Fee Bump | aumento della commissione | noun · Electrum it ("Aumenta commissione"). |
| RBF | RBF | acronym · gloss: sostituisci con commissione / Replace-by-Fee · Electrum it. |
| CPFP | CPFP | acronym · gloss: figlio paga per genitore. ⚠️ NOT a verb like "Aumenta". |
| Speed Up | accelera / velocizza | verb · button label · Trezor it ("Accelerazione" noun form). |
| **_Lightning_** | | |
| Invoice | fattura / richiesta di pagamento | noun · technical / mainstream · Electrum it + Zeus it ("Fattura"). |
| Lightning Invoice | fattura Lightning | noun · Electrum it + Zeus it. |
| Preimage | preimage / preimmagine | noun · loanword / Italian math term · Electrum it + Zeus it keep `Preimage`. |
| Payment | pagamento | noun · ⚠️ NOT verb "pagare" · Bitcoin Core it + Electrum it + Zeus it + Cake it. |
| Expired | scaduto / scaduta | adj · masc / fem-agreement (fattura) · Electrum it + Zeus it + Cake it. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | cofirmatario / firmatario | noun · ⚠️ NOT "co-proprietario" (co-owner) · Electrum it ("Cofirmatario") + Bitcoin Core it ("firmatari"). |
| Quorum | quorum / soglia di firme | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · gloss: Transazione Bitcoin Parzialmente Firmata (already used in shipped it.json). |
| Provide signature | fornisci la firma / firma | verb · specific / generic · already shipped. |
| BIP47 / Payment Code | BIP47 / codice di pagamento | acronym kept; "Payment Code" → "codice di pagamento" (already shipped) · Zeus it. |
| Notification transaction | transazione di notifica | noun · BIP47-specific. |
| SilentPayment | Silent Payments / pagamenti silenziosi | protocol name kept English (plural); explanatory `pagamenti silenziosi` if needed · Cake it keeps `Silent Payment`. |
| **_Coin control_** | | |
| Coin Control | coin control / controllo delle monete | noun · technical (kept English in app) / mainstream · ⚠️ NOT Title Case in body text · Electrum it + Zeus it ("Controllo delle monete") + Cake it ("Controllo valute") + Trezor it ("Controllo coin"). |
| Frozen | congelato / congelata | adj · masc / fem-agreement · ⚠️ NOT verb "congelare" · Electrum it + Zeus it + Cake it. |
| **_Security & storage_** | | |
| Encrypted storage | archivio cifrato / cifratura dell'archivio | noun, lowercase · canonical (Encrypted Storage) / Storage Encryption sense · ⚠️ NOT Title Case · Electrum it ("Cifrato"). |
| Plausible Deniability | negazione plausibile | noun, lowercase · ⚠️ NOT Title Case · Zeus it. |
| Biometrics | dati biometrici / autenticazione biometrica | noun · short (shipped) / explanatory · Zeus it ("Biometrico") + Trezor it. |
| Passcode | codice di accesso / PIN | noun · ⚠️ NOT `password` (app password) · Zeus it + Trezor it + Cake it use `PIN` for device unlock. |
| **_Backup, import & UX_** | | |
| Backup | backup / esegui il backup | noun / verb · Bitcoin Core it + Electrum it + Zeus it + Cake it. |
| Restore | ripristina / ripristino | verb / noun · Bitcoin Core it + Electrum it + Zeus it + Cake it. |
| Import | importa / importazione | verb / noun · Electrum it + Zeus it + Cake it. |
| Voucher | voucher | noun, lowercase · loanword · ⚠️ shipped `azteco/title` references `Atze.co` — typo for `Azte.co`. |
| Redeem | riscatta / riscattare | verb · ⚠️ NOT "acquista nel portafoglio" / NOT "trasferisci" · Zeus it + Cake it ("Riscatta"/"Riscattato"). |
| Send | invia | verb · Bitcoin Core it + Electrum it + Zeus it + Cake it. |
| Receive | ricevi | verb · Bitcoin Core it + Electrum it + Zeus it + Cake it. |
| Settings | impostazioni | noun, lowercase · Bitcoin Core it + Electrum it + Zeus it + Cake it. |
| Confirm | conferma / conferme | verb · noun "conferma/conferme" used for tx confirmations · Bitcoin Core it + Electrum it. |
| QR Code | codice QR | noun, lowercase noun + uppercase acronym · Electrum it + Zeus it + Cake it + Trezor it. |
| Clipboard | appunti | noun, lowercase, plural · Bitcoin Core it + Electrum it + Zeus it + Cake it + Bisq it. |
| Memo | nota / memo | noun, lowercase · mainstream / loanword · Zeus it + Cake it. |
| Description | descrizione | noun, lowercase · Electrum it + Zeus it + Cake it. |
| Label | etichetta | noun, lowercase · Bitcoin Core it + Electrum it + Zeus it + Cake it + Trezor it. |
