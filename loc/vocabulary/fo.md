# Faroese translation vocabulary (`fo.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand · fo.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker, lowercase as unit. |
| sats | sats | noun, lowercase · shipped `units.sats` = `sats`. |
| sat/vByte | sat/tBýt | technical unit · shipped UI uses `sat/tBýt` (`units.sat_vbyte`, `send.create_satoshi_per_vbyte`). |
| vByte | tBýt | coined Faroese form for vByte; `být` = byte. |
| **_Wallet, keys & seeds_** | | |
| Wallet | mappa | noun, lowercase · lit. "folder/pouch" · Bitcoin Core fo + shipped fo.json. |
| Vault | virðisgoymsla | noun, lowercase · lit. "value storage" · ⚠️ NOT a brand · shipped `multisig.multisig_vault`. |
| Watch-only | eygleiðingarmappa | noun · "observation wallet" · shipped `wallets.import_success_watchonly` + `transactions.watchOnlyWarningDescription`. |
| Hardware wallet | tólbúnaðarmappa | noun, lowercase · shipped `wallets.details_use_with_hardware_wallet`. |
| Seed | rótorð | noun, lowercase · lit. "root-words" · shipped `_.seed` + `pleasebackup.ask`. |
| Mnemonic | áminningarramsa | noun, lowercase · lit. "reminder-rhyme" · shipped `pleasebackup.text` + `multisig.invalid_mnemonics`. |
| Passphrase | loynisetning | noun · lit. "secret sentence" · ⚠️ distinct from `loyniorð` (password) · shipped `wallets.import_passphrase`. |
| Public key | almennur lykil | noun, lowercase · shipped `_.wallet_key` = "Almennur mappulykil". |
| Private key | privatur lykil | noun, lowercase · shipped `addresses.copy_private_key` + `wallets.looks_like_bip38`. |
| WIF | WIF | acronym · shipped `wallets.import_explanation`. |
| xpub | XPUB | acronym · shipped UI ships uppercase `XPUB` (`wallets.xpub_title`, `details_show_xpub`); vocabulary prefers lowercase but app convention kept. |
| Descriptor | lyklalýsing | noun, lowercase · lit. "key description" · Bitcoin Core fo (`Private keys and addresses can be imported using descriptors` → `lyklalýsingun`). |
| Derivation path | avleiðsluleið | noun, lowercase · lit. "derivation path" · shipped `wallets.details_derivation_path` + `import_derivation_title`. |
| Master fingerprint | høvuðseyðkenni | noun, lowercase · lit. "master identifier" · shipped `wallets.details_master_fingerprint`. |
| BIP38 | BIP38 | acronym · gloss: loyniorðsvarður privatur lykil · shipped `wallets.looks_like_bip38`. |
| **_On-chain transactions_** | | |
| Transaction | flyting | noun, lowercase · lit. "transfer" · shipped `transactions.transaction` + Bitcoin Core fo. |
| Address | adressa | noun, lowercase · shipped `send.details_address` + Bitcoin Core fo. |
| Input | inntøk | noun · lit. "income/intake" · shipped `transactions.details_inputs` + `details_from`. |
| Output | úttøk | noun · lit. "outgo/outlay" · shipped `transactions.details_outputs` + `details_to`. ⚠️ NOT the UI "Til" recipient label. |
| UTXO | UTXO | acronym · gloss: ónýttur flytingar-úttak (Bitcoin Core fo: `ónýtt` = unspent). |
| Change | vekslipeningur | noun, lowercase · lit. "change money" · ⚠️ NOT verb "broyta" · shipped `cc.change` + Bitcoin Core fo (`Change:` → `Vekslipeningur:`). |
| Hex | sekstandatøl / sekstandatalsskipan | noun · short / explanatory · lit. "base-sixteen number" · shipped `send.broadcastNone` + `create_this_is_hex`. ⚠️ NOT "hash". |
| Pending | ávegis / óváttað | adj · lit. "on the way" / "unconfirmed" · shipped `send.broadcastPending` = `Ávegis`; `transactions.pending` = `Óváttað`. |
| Unconfirmed | óváttað | adj · shipped `transactions.pending` + Bitcoin Core fo. |
| Confirmed | váttað | adj · shipped Bitcoin Core fo (`Confirmed` → `Váttað`). |
| Mempool | minnispulja | noun, lowercase · lit. "memory pool" · Bitcoin Core fo (`Memory Pool` → `Minnispulja`; `in memory pool` → `í minnispulju`). |
| Broadcast | útvarpa / útvarping | verb / noun · shipped `send.broadcastButton` (verb) + `errors.broadcast` = `Útvarping` (noun). |
| Block explorer | blokksjóneyka | noun, lowercase · lit. "block viewer" · shipped `settings.block_explorer`. |
| Onchain | áketu | adj · shipped `transactions.onchain` · coined form; no established fo equivalent. |
| Offchain | avketu | adj · shipped `transactions.offchain` · coined form; pairs with `áketu`. |
| **_Fees & fee bumping_** | | |
| Fee | avgjald | noun, lowercase · shipped `send.create_fee` + Bitcoin Core fo (`Fee:` → `Avgjald:`). |
| Fee Bump | avgjaldshækkan | noun, lowercase · shipped `send.details_adv_fee_bump` = `Loyv avgjaldshækkan`. |
| RBF | RBF | acronym · gloss: Replace-By-Fee · shipped `transactions.cancel_explain`, `rbf_explain` keep `RBF—Replace by Fee` · Bitcoin Core fo. |
| CPFP | CPFP | acronym · gloss: Child Pays for Parent · shipped `transactions.cpfp_exp` keeps `CPFP—Child Pays for Parent`. ⚠️ NOT a verb. |
| Speed Up | hækka avgjald | verb · lit. "raise fee" · shipped `transactions.cpfp_title`, `rbf_title`, `status_bump`. |
| **_Lightning_** | | |
| Invoice | gjaldsumbøn | noun, lowercase · lit. "payment request" · shipped `lnd.placeholder`, `errorInvoiceExpired`. |
| Lightning Invoice | Lightning gjaldsumbøn | noun · shipped `lndViewInvoice.lightning_invoice`. |
| Preimage | frumvirði | noun, lowercase · lit. "primary value" · shipped `lndViewInvoice.preimage` · fo.wikipedia.org/wiki/Bitcoin is a stub with no crypto-math term; shipped form is the canonical reference. |
| Payment | gjald | noun, lowercase · shipped `lnd.payment`. ⚠️ NOT verb "rinda". |
| Expired | fyrnað | adj · shipped `lnd.expired` + `lndViewInvoice.wasnt_paid_and_expired`. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | samundirritari | noun, lowercase · lit. "co-signer" · shipped `multisig.shared_key_detected`, `co_sign_transaction`. ⚠️ NOT "samogn" (co-owner). |
| Quorum | undirritanartreyt | noun, lowercase · lit. "signing requirement" · shipped `multisig.quorum_header`. |
| PSBT | PSBT | acronym · gloss: Partvís Undirritað Bitcoin Flyting · shipped `send.psbt_this_is_psbt` + Bitcoin Core fo. |
| Provide signature | útvega undirskrift | verb · shipped `multisig.provide_signature`. |
| BIP47 / Payment Code | BIP47 / gjaldkota | acronym + noun · `gjaldkota` lit. "payment code" · shipped `bip47.payment_code` + `bip47.contacts`. |
| Notification transaction | fráboðanarflyting | noun, lowercase · shipped `bip47.notif_tx` + `notification_tx_unconfirmed`. |
| SilentPayment | SilentPayment | brand kept · shipped `send.cant_send_to_silentpayment_adress` · no Faroese gloss in app. |
| **_Coin control_** | | |
| Coin Control | mynt-val | noun, lowercase · lit. "coin selection" · shipped `cc.header`. ⚠️ NOT Title Case. |
| Frozen | læs / frystur | adj · `læs` = "locked" (shipped `cc.freezeLabel`, `send.details_frozen`); `frystur` = "frozen". ⚠️ NOT verb "læsa/frysta". |
| **_Security & storage_** | | |
| Encrypted storage | bronglað goymsla | noun, lowercase · lit. "encrypted storage" · shipped `_.storage_is_encrypted` and `settings.encrypt_storage_explanation_*` use `goymslubronglan` (the encryption action) and `bronglað goymsla` (the encrypted store). ⚠️ NOT Title Case. |
| Plausible Deniability | haldgóð avsannan | noun, lowercase · lit. "credible denial" · shipped `plausibledeniability.title` + `settings.plausible_deniability`. |
| Biometrics | lívmátilig atgongd | noun, lowercase · lit. "biometric access" · shipped `settings.biometrics`. |
| Passcode | atgonguloynital | noun, lowercase · lit. "access secret-number" · shipped `settings.biom_no_passcode`. ⚠️ NOT `loyniorð` (password). |
| **_Backup, import & UX_** | | |
| Backup | trygdaravrit / trygdaravrita | noun / verb · lit. "security copy" · shipped `pleasebackup.text` (noun) + `wallets.details_export_backup` `Trygdaravrita` (verb) + Bitcoin Core fo. |
| Restore | endurinnles / endurinnlesa | verb / noun · lit. "re-load" · shipped `pleasebackup.text` + Bitcoin Core fo (`Restore Wallet…` → `Endurinnles mappu…`). |
| Import | innles / innlesa | verb / noun · lit. "read in" · shipped `wallets.add_import_wallet`, `import_title`, `import_do_import`. |
| Voucher | virðiskota | noun, lowercase · lit. "value code" · shipped `azteco.codeIs`, `successMessage`. |
| Redeem | útloysa | verb · lit. "release/redeem" · shipped `azteco.redeemButton` = `Útloys`. ⚠️ NOT "keypa" (buy). |
| Send | senda / útgjald | verb / noun · `senda` (verb, Bitcoin Core fo) / `útgjald` (noun, shipped `send.header` + `transactions.outgoing_transaction`). |
| Receive | móttaka / inngjald | verb / noun · `móttaka` (verb) / `inngjald` (noun, shipped `receive.header` + `transactions.incoming_transaction`). |
| Settings | stillingar | noun, lowercase · shipped `settings.header`. |
| Confirm | vátta / váttan | verb / noun · shipped `send.confirm_header` (verb) + `transactions.list_conf` `Váttanir` (plural noun = confirmations). |
| QR Code | QR kota | noun · lit. "QR code" · shipped `receive.qrcode_for_the_address`, `send.qr_error_no_qrcode` + Bitcoin Core fo. |
| Clipboard | setiborð | noun, lowercase · lit. "set-board" · shipped `_.clipboard` + Bitcoin Core fo. |
| Memo | viðmerking | noun, lowercase · lit. "annotation/comment" · shipped `send.create_memo`, `details_note_placeholder`. |
| Description | tekstboð / frágreiðing | noun, lowercase · `tekstboð` lit. "text message" (shipped `receive.details_label`); `frágreiðing` lit. "description" (shipped `lndViewInvoice.for`). |
| Label | spjaldur | noun, lowercase · lit. "card/tag" · shipped `cc.sort_label` + Bitcoin Core fo (`Label` → `Spjaldur`). |
