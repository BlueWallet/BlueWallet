# Catalan translation vocabulary (`ca.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · ca.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker · ca.wikipedia.org/wiki/Bitcoin |
| sats | sats | noun, lowercase; ships as `sats` in ca.json. |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin. ⚠️ ca.json ships `Satoshis per vByte` in body text. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | moneder | noun, lowercase · BlueWallet convention (ca.wikipedia uses `cartera electrònica`, but app ships `moneder`). |
| Vault | caixa forta / cofre | noun; safe/strongbox sense. Avoid Latin "Vault". |
| Watch-only | només lectura / només visualització | adj · Bitcoin Core ca |
| Hardware wallet | moneder de maquinari / moneder hardware | noun, lowercase · Bitcoin Core ca uses `cartera de maquinari`; BlueWallet ships `moneder hardware`. |
| Seed | llavor / frase de recuperació | noun · literal / mainstream; ca.json ships `Llavor` and `frase de recuperació`. |
| Mnemonic | frase mnemònica / frase de recuperació | noun · technical / mainstream. |
| Passphrase | frase de contrasenya | noun · ⚠️ NOT just `contrasenya` (= password). Bitcoin Core ca collapses to `contrasenya`; disambiguate here. |
| Public key | clau pública | noun, lowercase. |
| Private key | clau privada | noun, lowercase · Bitcoin Core ca |
| WIF | WIF | acronym · gloss: format d'importació de moneder. |
| xpub | xpub | acronym, lowercase preferred · ⚠️ ca.json ships `XPUB`. |
| Descriptor | descriptor | noun, lowercase. |
| Derivation path | camí de derivació | noun. |
| Master fingerprint | empremta mestra / petjada digital mestra | noun · ⚠️ ca.json ships `Petjada digital mestre`; `empremta mestra` is more natural for fingerprint. |
| BIP38 | BIP38 | acronym kept · gloss: clau privada xifrada amb contrasenya. |
| **_On-chain transactions_** | | |
| Transaction | transacció | noun, lowercase. |
| Address | adreça | noun, lowercase · ⚠️ ca.json mixes `Adreça` and `Direcció` (Spanish-influenced); prefer `adreça`. |
| Input | entrada / entrada de transacció | noun · short / full. ca.json ships plural `Entrades`. |
| Output | sortida / sortida de transacció | noun · short / full. ca.json ships plural `Sortides`. |
| UTXO | UTXO | acronym · gloss: sortida de transacció sense gastar. |
| Change | canvi / adreça de canvi | noun · ⚠️ NOT verb "canviar". `canvi` = leftover; `adreça de canvi` for change-address · Bitcoin Core ca |
| Hex | hex / hexadecimal | noun · short / explanatory · ⚠️ NOT "hash". |
| Pending | pendent | adj/state. |
| Unconfirmed | sense confirmar / no confirmada | adj · short / fem-agreement. |
| Confirmed | confirmada / confirmat | adj · fem / masc-agreement. Noun `confirmacions` = confirmation count. |
| Mempool | mempool | noun, lowercase. |
| Broadcast | emetre / transmetre | verb · UI-clear / technical · Bitcoin Core ca. Noun form: emissió / transmissió. |
| Block explorer | explorador de blocs | noun, lowercase. |
| Onchain | en cadena / a la cadena | adj · compact / explanatory. |
| Offchain | fora de cadena | adj. |
| **_Fees & fee bumping_** | | |
| Fee | comissió | noun, lowercase. |
| Fee Bump | augment de comissió / ampliar la comissió | noun / verb-phrase · ca.json ships `Permeteu ampliar la comissió`. |
| RBF | RBF | acronym · gloss: substitució per comissió / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: el fill paga pel pare. ⚠️ NOT "Crear" — ca.json `cpfp_create` ships `Crear` (button label, not gloss). |
| Speed Up | accelerar | verb. |
| **_Lightning_** | | |
| Invoice | factura | noun, lowercase. |
| Lightning Invoice | factura Lightning | noun · ca.json ships `Factura Lightning`. |
| Preimage | preimatge | noun · math term. |
| Payment | pagament | noun · ⚠️ NOT verb "pagar". |
| Expired | caducada / caducat | adj · fem / masc-agreement. ca.json ships `Caducat`. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | cosignant / signant | noun · ⚠️ NOT "copropietari" (co-owner) · Bitcoin Core ca uses `signants`. |
| Quorum | quòrum / llindar de signatures | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym. |
| Provide signature | aportar signatura / signar la transacció | verb · generic / specific. ca.json ships `Signar una transacció`. |
| BIP47 / Payment Code | BIP47 / codi de pagament | acronym kept; "Payment Code" → "codi de pagament". |
| Notification transaction | transacció de notificació | noun · BIP47-specific. |
| SilentPayment | Silent Payments / pagaments silenciosos | protocol name kept English (plural); explanatory `pagaments silenciosos` if needed. |
| **_Coin control_** | | |
| Coin Control | control de monedes / gestió d'UTXO | noun, lowercase · mainstream / technical · ⚠️ NOT Title Case · Bitcoin Core ca uses `control de les monedes`. |
| Frozen | congelada / bloquejada | adj · state, fem-agreement (sortida/moneda) · ⚠️ NOT verb "congelar". |
| **_Security & storage_** | | |
| Encrypted storage | emmagatzematge xifrat | noun, lowercase · ⚠️ NOT Title Case. |
| Plausible Deniability | negació plausible | noun, lowercase · ⚠️ NOT Title Case. ca.json ships `Negació plausible`. |
| Biometrics | biometria | noun, lowercase. |
| Passcode | codi d'accés | noun · ⚠️ NOT `contrasenya` (= password); ca.json conflates them. |
| **_Backup, import & UX_** | | |
| Backup | còpia de seguretat / fer una còpia de seguretat | noun / verb · Bitcoin Core ca. ⚠️ ca.json ships `Exportar / Guardar` (= export / save). |
| Restore | restaurar / restauració | verb / noun · Bitcoin Core ca |
| Import | importar / importació | verb / noun. |
| Voucher | val / cupó | noun, lowercase · preferred / shipped alt · Bitcoin Core ca + Cake ca use `val`; ca.json mixes `val` and `cupó`. |
| Redeem | bescanviar / activar | verb · ⚠️ NOT `canviar` alone (= "to change/exchange") — ca.json ships `Canviar` which is ambiguous. |
| Send | enviar | verb. |
| Receive | rebre | verb. |
| Settings | configuració | noun, lowercase. |
| Confirm | confirmar / confirmació | verb / noun. |
| QR Code | codi QR | noun · Bitcoin Core ca |
| Clipboard | porta-retalls | noun, lowercase. |
| Memo | nota / comentari | noun, lowercase · ca.json ships `Comentari` (= comment). |
| Description | descripció | noun, lowercase. |
| Label | etiqueta | noun, lowercase · Bitcoin Core ca |
