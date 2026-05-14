# Portuguese, Portugal translation vocabulary (`pt_pt.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · pt.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand · pt.wikipedia.org/wiki/Lightning_Network |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; lowercase as unit. |
| sats | sats | noun, lowercase. |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. Body text may expand to `satoshi por vByte` (app ships this in `send/create_satoshi_per_vbyte`). |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | carteira | noun, lowercase. Plural `carteiras`. |
| Vault | cofre | noun · safe/strongbox sense. App ships `Cofre Multiassinatura` for multisig vault label. Avoid Latin "Vault". |
| Watch-only | só de observação / carteira de visualização | adj · technical / mainstream · ⚠️ NOT a brand · `só de observação` per Bitcoin Core pt; `carteira de visualização` is the form shipped today. |
| Hardware wallet | carteira de hardware | noun, lowercase · Bitcoin Core pt + Electrum pt_PT. ⚠️ avoid Title Case `Carteira de Hardware`. |
| Seed | seed / semente | noun · technical loanword / mainstream · Electrum pt_PT uses `semente`. App ships `Seed` today. |
| Mnemonic | frase mnemónica / frase de recuperação | noun · technical / mainstream · PT-PT spelling `mnemónica` (Acordo Ortográfico 1990). |
| Passphrase | frase-passe / frase de segurança | noun · ⚠️ NOT `palavra-passe` (= password) and NOT `senha` · `frase-passe` per Electrum pt_PT; `frase de segurança` per Bitcoin Core pt. App ships English `Passphrase` today. |
| Public key | chave pública | noun, lowercase · Electrum pt_PT. |
| Private key | chave privada | noun, lowercase · Bitcoin Core pt + Electrum pt_PT. |
| WIF | WIF | acronym · gloss: formato de importação de carteira. |
| xpub | xpub | acronym, lowercase preferred. App ships uppercase `XPUB` in some screens. |
| Descriptor | descritor | noun, lowercase · Bitcoin Core pt (`descritores`). |
| Derivation path | caminho de derivação | noun · app ships `caminho de derivação` (lowercase in body, capitalised at start of label). |
| Master fingerprint | impressão digital mestra | noun · ⚠️ shipped `Master Fingerprint` is not localised; replace with `Impressão digital mestra` (PT-PT). |
| BIP38 | BIP38 | acronym kept · gloss: chave privada protegida por palavra-passe (BIP38). ⚠️ NOT a verb. |
| **_On-chain transactions_** | | |
| Transaction | transação | noun, lowercase · Bitcoin Core pt + Electrum pt_PT. App ships `Transação` (sentence-case). |
| Address | endereço | noun, lowercase · Bitcoin Core pt + Electrum pt_PT. |
| Input | entrada / entrada da transação | noun · short / full · ⚠️ shipped `Inputs` is English-passthrough; PT-PT form is `entrada` / `entradas`. |
| Output | saída / saída da transação | noun · short / full · ⚠️ shipped `Outputs` is English-passthrough; PT-PT form is `saída` / `saídas`. NOT the UI label "Para:" (separate string). |
| UTXO | UTXO | acronym · gloss: saída de transação não gasta. |
| Change | troco / endereço de troco | noun · ⚠️ NOT verb "trocar" · `troco` per Bitcoin Core pt + Electrum pt_PT. Use `endereço de troco` for the change-address field. |
| Hex | hex / hexadecimal | noun · short / explanatory · ⚠️ NOT "hash" and NOT "dados da transação". |
| Pending | pendente | adj/state · app ships `Pendente`. Avoid noun form `pendência`. |
| Unconfirmed | não confirmada / não confirmado | adj · feminine (agreeing with `transação`) / masculine · Bitcoin Core pt + Electrum pt_PT. |
| Confirmed | confirmada / confirmado | adj · feminine / masculine agreement · Bitcoin Core pt. |
| Mempool | mempool | noun, loanword kept · Bitcoin Core pt keeps `Mempool`. |
| Broadcast | transmitir / transmissão | verb / noun · Bitcoin Core pt + Electrum pt_PT. App ships `Difundir` / `Transmissão` in some screens — `transmitir` is the more established form. |
| Block explorer | explorador de blocos | noun, lowercase · app ships Title Case `Explorador de Blocos`; PT-PT form should be lowercase. |
| Onchain | onchain / na blockchain | adj · compact (chip) / explanatory (body). |
| Offchain | offchain / fora da blockchain | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | taxa | noun, lowercase · Bitcoin Core pt + Electrum pt_PT. App ships `Taxa` (sentence-case). |
| Fee Bump | aumento de taxa / permitir aumentar a taxa | noun · short / verb-phrase used in `send/details_adv_fee_bump`. |
| RBF | RBF | acronym · gloss: Substituição por Taxa / Replace by Fee. App ships `Substituição da Taxa` and `Replace by Fee` in `transactions/cancel_explain`. |
| CPFP | CPFP | acronym · gloss: Filho paga pelo pai / Child Pays For Parent. ⚠️ NOT a verb like "Criar". |
| Speed Up | aumentar a taxa | verb · UI label for RBF in tx detail. App ships `Aumentar taxa (RBF)`. |
| **_Lightning_** | | |
| Invoice | fatura | noun, lowercase · Electrum pt_PT. App ships `Fatura` (sentence-case). |
| Lightning Invoice | fatura Lightning | noun · brand kept + localised noun · app ships `Fatura Lightning`. |
| Preimage | pré-imagem | noun, lowercase · math/crypto term; app ships `Pré-imagem`. |
| Payment | pagamento | noun · Bitcoin Core pt. ⚠️ NOT verb `Pagar` — must be a noun. |
| Expired | expirada / expirado | adj · feminine (agreeing with `fatura`) / masculine state form · app ships `Expirado` / `Expirada`. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | co-signatário | noun, lowercase · ⚠️ NOT "co-proprietário" (co-owner). App ships `Co-signatário`. |
| Quorum | quórum | noun, lowercase · PT-PT accent · app ships `Quórum`. |
| PSBT | PSBT | acronym · Bitcoin Core pt keeps as-is. Gloss: transação Bitcoin parcialmente assinada. |
| Provide signature | fornecer assinatura / assinar transação | verb · generic / specific. App ships `Fornecer assinatura`. |
| BIP47 / Payment Code | BIP47 / código de pagamento | acronym kept; `Payment Code` → `código de pagamento` (lowercase). App ships `Código de Pagamento` (Title Case). |
| Notification transaction | transação de notificação | noun · BIP47-specific 0-value tx. |
| SilentPayment | Silent Payments / pagamentos silenciosos | protocol name kept English (plural); explanatory `pagamentos silenciosos` if needed. |
| **_Coin control_** | | |
| Coin Control | controlo de moedas / gestão de UTXO | noun, lowercase · technical / mainstream · Electrum pt_PT (`Controlo da moeda`) + Bitcoin Core pt. ⚠️ NOT Title Case. PT-PT uses `controlo` (BR uses `controle`). |
| Frozen | congelado / congelada | adj · masculine / feminine agreement · ⚠️ NOT verb "congelar" · Electrum pt_PT. App ships `Congelado` / `congeladas`. |
| **_Security & storage_** | | |
| Encrypted storage | encriptação de armazenamento | noun, lowercase · ⚠️ NOT Title Case. App ships `Ativar Encriptação de Armazenamento` as headline. PT-PT spelling `encriptação` (Electrum pt_PT). |
| Plausible Deniability | negação plausível | noun, lowercase · app ships sentence-case `Negação plausível` in body, `Negação Plausível` in headlines. |
| Biometrics | biometria | noun, lowercase · app ships `Biometria`. |
| Passcode | código de acesso | noun · ⚠️ NOT `palavra-passe` (= password) and NOT `senha` (BR form). App ships `senha` / `palavra-passe` ambiguously — needs disambiguation. |
| **_Backup, import & UX_** | | |
| Backup | cópia de segurança / fazer cópia de segurança | noun / verb · Bitcoin Core pt + Electrum pt_PT. App ships English loanword `Backup`; PT-PT idiomatic form is `cópia de segurança`. |
| Restore | restaurar / restauro | verb / noun · Bitcoin Core pt + Electrum pt_PT. App ships `Restaurar` / `recuperar`. |
| Import | importar / importação | verb / noun · app ships `Importar`. |
| Voucher | voucher | noun, lowercase · loanword (Azte.co). |
| Redeem | resgatar | verb · Bitcoin Core pt. App ships `Resgatar`. ⚠️ NOT "comprar para a carteira". |
| Send | enviar | verb · Bitcoin Core pt + Electrum pt_PT. |
| Receive | receber | verb · Bitcoin Core pt + Electrum pt_PT. |
| Settings | definições | noun, lowercase · PT-PT term (BR uses `configurações`). App ships `Definições`. |
| Confirm | confirmar / confirmação | verb / noun. Also "confirmations" → `confirmações` (plural). |
| QR Code | código QR | noun · Bitcoin Core pt + Electrum pt_PT (`Código QR`). |
| Clipboard | área de transferência | noun, lowercase · Bitcoin Core pt + Electrum pt_PT. App ships Title Case `Área de Transferência`. |
| Memo | nota / nota pessoal | noun, lowercase · app ships `Nota pessoal`. |
| Description | descrição | noun, lowercase · app ships `Descrição`. |
| Label | etiqueta | noun, lowercase · Bitcoin Core pt + Electrum pt_PT. |
