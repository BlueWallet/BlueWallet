# French translation vocabulary (`fr_fr.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · fr.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand · fr.wikipedia.org/wiki/Lightning_Network |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker, lowercase. |
| sats | sats | noun, lowercase; kept as English unit. |
| sat/vByte | sat/vByte | technical fee-rate unit; UI keeps Latin (casing matters). |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | portefeuille | noun, lowercase. |
| Vault | coffre-fort | noun · ⚠️ NOT Latin "Vault"; `coffre-fort` = safe/strongbox. |
| Watch-only | lecture seule / portefeuille en lecture seule | adj · compact / explanatory · Zeus fr + Electrum fr (`spectateur` alt) |
| Hardware wallet | portefeuille matériel | noun, lowercase · Cake fr + Phoenix-ecosystem usage |
| Seed | graine / phrase de récupération | noun · literal / mainstream. |
| Mnemonic | phrase mnémonique / phrase de récupération | noun · technical / mainstream · Electrum fr |
| Passphrase | phrase secrète | noun · ⚠️ NOT "mot de passe" (= password) · Electrum fr + Bitcoin Core fr (`phrase de passe`) |
| Public key | clé publique | noun, lowercase. |
| Private key | clé privée | noun, lowercase. |
| WIF | WIF | acronym · gloss: format d'importation de portefeuille. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | descripteur / descripteur de sortie | noun, lowercase · canonical / full · Phoenix fr |
| Derivation path | chemin de dérivation | noun, lowercase · Electrum fr + Phoenix fr + Cake fr |
| Master fingerprint | empreinte maîtresse / empreinte digitale maîtresse | noun, lowercase · compact / full · Electrum fr · ⚠️ FIX shipped `Empreinte maitresse` (missing circumflex). |
| BIP38 | BIP38 | acronym kept · gloss: clé privée chiffrée par mot de passe. |
| **_On-chain transactions_** | | |
| Transaction | transaction | noun, lowercase. |
| Address | adresse | noun, lowercase. |
| Input | entrée / entrée de transaction | noun · short / full · Electrum fr (`Entrées`) + fr.wikipedia.org/wiki/Bitcoin (`entrées (inputs)`) · ⚠️ NOT "saisie / connexion". |
| Output | sortie / sortie de transaction | noun · short / full · Electrum fr (`Sorties`) + fr.wikipedia.org/wiki/Bitcoin (`sorties (outputs)`) · ⚠️ NOT the UI recipient label "À :". |
| UTXO | UTXO | acronym · gloss: sortie de transaction non dépensée. |
| Change | monnaie / monnaie rendue | noun · short / explicit · ⚠️ NOT the verb "changer / modifier"; `monnaie` = leftover coin · ⚠️ FIX shipped `monnaie rendu` → `monnaie rendue` (feminine agreement) · Electrum fr |
| Hex | hex / hexadécimal | noun · compact / explanatory · ⚠️ NOT "hash" / NOT "données de transaction". |
| Pending | en cours / en attente | adj/state · UI button / body · Electrum fr + Phoenix fr |
| Unconfirmed | non confirmé / non confirmée | adj · masc / fem-agreement · Electrum fr + Bitcoin Core fr |
| Confirmed | confirmé / confirmée | adj · masc / fem-agreement · Bitcoin Core fr |
| Mempool | mempool | noun, lowercase loanword · Electrum fr + Phoenix fr |
| Broadcast | diffuser / diffusion | verb / noun · Electrum fr + Bitcoin Core fr |
| Block explorer | explorateur de blocs | noun, lowercase. |
| Onchain | onchain / en chaîne | adj · compact (chip) / explanatory (body). |
| Offchain | offchain / hors chaîne | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | frais | noun, masculine plural form used. |
| Fee Bump | augmentation des frais | noun · Electrum fr (`Augmenter les frais`) · ⚠️ FIX shipped `Autoriser le Fee Bum` → `Autoriser le Fee Bump` (missing "p"). |
| RBF | RBF | acronym · gloss: remplacement par frais (Replace-By-Fee). |
| CPFP | CPFP | acronym · gloss: l'enfant paie pour le parent · Electrum fr · ⚠️ NOT a verb. |
| Speed Up | accélérer | verb · button label for RBF · Phoenix fr (`Accélération de transactions`) |
| **_Lightning_** | | |
| Invoice | facture / requête de paiement | noun · technical / mainstream · Electrum fr + Phoenix fr |
| Lightning Invoice | facture Lightning / requête de paiement Lightning | noun · technical / mainstream · Electrum fr + Phoenix fr · ⚠️ FIX shipped `Facture Ligthning` (typo) → `Facture Lightning`. |
| Preimage | préimage | noun, lowercase · per Phoenix fr (`paymentdetails_preimage_label` = `Préimage`) + fr.wikipedia.org/wiki/Image_réciproque (lists `préimage` alongside `image réciproque`); hyphenated `pré-image` is not the established form. |
| Payment | paiement | noun · ⚠️ NOT verb "payer" · Electrum fr + Phoenix fr |
| Expired | expiré / expirée | adj · masc / fem-agreement · Electrum fr + Phoenix fr |
| **_Multisig & advanced addressing_** | | |
| Co-signer | cosignataire | noun · ⚠️ NOT "copropriétaire" (co-owner) · Electrum fr |
| Quorum | quorum / seuil de signatures | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · gloss: transaction Bitcoin partiellement signée. |
| Provide signature | fournir la signature / signer la transaction | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / code de paiement | acronym kept; "Payment Code" → "code de paiement". |
| Notification transaction | transaction de notification | noun · BIP47-specific. |
| SilentPayment | Silent Payments / paiements silencieux | protocol name kept English (plural); explanatory `paiements silencieux` if needed. |
| **_Coin control_** | | |
| Coin Control | contrôle des UTXO / contrôle des pièces | noun, lowercase · technical / mainstream · Zeus fr (`Contrôle des pièces`) + Cake fr · ⚠️ NOT Title Case · ⚠️ FIX shipped `Controle des UTXO` → `Contrôle des UTXO`. |
| Frozen | gelé / gelée | adj · masc / fem-agreement · Zeus fr · ⚠️ NOT verb "geler". |
| **_Security & storage_** | | |
| Encrypted storage | stockage chiffré / chiffrement du stockage | noun, lowercase · ⚠️ NOT Title Case. |
| Plausible Deniability | déni plausible | noun, lowercase · ⚠️ NOT Title Case. |
| Biometrics | biométrie / authentification biométrique | noun, lowercase · compact / explanatory · Cake fr + Green fr |
| Passcode | code d'accès | noun · ⚠️ NOT "mot de passe" (= app password) · matches shipped `biom_no_passcode` ("code d'accès"). |
| **_Backup, import & UX_** | | |
| Backup | sauvegarde / sauvegarder | noun / verb. |
| Restore | restaurer / restauration | verb / noun. |
| Import | importer / importation | verb / noun. |
| Voucher | bon | noun, lowercase · Azte.co prepaid voucher · ⚠️ FIX shipped `azteco/title` `Azte.com` → `Azte.co`. |
| Redeem | utiliser / activer | verb · ⚠️ NOT "collecter" alone (current shipped `Collecter` is too narrow); Cake fr uses `échanger / remboursement`. For vouchers prefer `utiliser` / `activer`. |
| Send | envoyer | verb. |
| Receive | recevoir | verb. |
| Settings | réglages / paramètres | noun, lowercase · app-style / general · app uses "Réglages" (Apple-style). |
| Confirm | confirmer / confirmation | verb / noun. |
| QR Code | code QR | noun, lowercase · Zeus fr + Phoenix fr · word order inverted. |
| Clipboard | presse-papier / presse-papiers | noun, lowercase · Zeus fr (`Presse-papiers`). |
| Memo | mémo / note | noun, lowercase · loanword / native · Zeus fr (`Note`). |
| Description | description | noun, lowercase. |
| Label | étiquette | noun, lowercase · Zeus fr. |
