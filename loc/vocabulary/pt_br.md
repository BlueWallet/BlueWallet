# Portuguese, Brazil translation vocabulary (`pt_br.json`)

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
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. Body text may expand to `satoshi por vByte`. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | carteira | noun, lowercase. |
| Vault | cofre | noun · safe/strongbox sense. Avoid Latin "Vault". App ships "Cofre Multisig" for multisig vault label. |
| Watch-only | somente leitura / somente para assistir | adj · ⚠️ NOT a brand · `somente leitura` per Zeus pt_BR + Cake pt_BR; `somente para assistir` is the form shipped today. |
| Hardware wallet | carteira hardware | noun, lowercase · Cake pt_BR uses `carteira de hardware`. |
| Seed | seed / frase de recuperação | noun · technical / mainstream. App ships loanword `seed`. |
| Mnemonic | frase mnemônica / frase de recuperação | noun · technical / mainstream. |
| Passphrase | frase secreta / frase de segurança | noun · ⚠️ NOT `senha` (= password) · `frase de segurança` per Bitcoin Core pt_BR. |
| Public key | chave pública | noun, lowercase · Bitcoin Core pt_BR + Zeus pt_BR + Cake pt_BR. |
| Private key | chave privada | noun, lowercase · Cake pt_BR. |
| WIF | WIF | acronym · gloss: formato de importação de carteira. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | descritor | noun, lowercase · Bitcoin Core pt_BR (`descritores`). |
| Derivation path | caminho de derivação | noun · Electrum pt_BR + Cake pt_BR. |
| Master fingerprint | impressão digital mestra / fingerprint mestra | noun · ⚠️ shipped `Fingerprint Soberana` mixes English noun with wrong adjective (soberana = sovereign). |
| BIP38 | BIP38 | acronym kept · gloss: chave privada protegida por senha (BIP38). |
| **_On-chain transactions_** | | |
| Transaction | transação | noun, lowercase · Bitcoin Core pt_BR. |
| Address | endereço | noun, lowercase. |
| Input | entrada | noun, lowercase · Bitcoin Core pt_BR + Electrum pt_BR. App ships `Entrada` / `Entradas` in tx details. |
| Output | saída | noun, lowercase · Electrum pt_BR. App ships `Saída` / `Saídas` in tx details. ⚠️ NOT the UI label "Para:". |
| UTXO | UTXO | acronym · gloss: saída de transação não gasta. |
| Change | troco | noun, lowercase · ⚠️ NOT verb "trocar" · Bitcoin Core pt_BR + Electrum pt_BR. |
| Hex | hex / hexadecimal | noun · short / explanatory · ⚠️ NOT "hash" and NOT "dados da transação" · shipped `Hash` is wrong; fix to `Hex` · pt.wikipedia.org/wiki/Sistema_de_numeração_hexadecimal. |
| Pending | pendente | adj/state · Bitcoin Core pt_BR. Avoid noun "pendência". |
| Unconfirmed | não confirmada / não confirmado | adj · feminine (`transação`) / masculine agreement · Bitcoin Core pt_BR + Electrum pt_BR. |
| Confirmed | confirmada / confirmado | adj · feminine / masculine agreement · Bitcoin Core pt_BR. |
| Mempool | mempool | noun, loanword · Electrum pt_BR. |
| Broadcast | transmitir / transmissão | verb / noun · Bitcoin Core pt_BR + Electrum pt_BR. |
| Block explorer | explorador de blocos | noun, lowercase · Electrum pt_BR. |
| Onchain | onchain / na rede principal | adj · compact (chip) / explanatory (body). |
| Offchain | offchain / fora da rede principal | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | taxa | noun, lowercase. |
| Fee Bump | aumento de taxa / aumentar taxa | noun / verb · Cake pt_BR (`Aumentar taxa`). |
| RBF | RBF | acronym · gloss: substituir pela taxa / Replace-By-Fee · Electrum pt_BR. |
| CPFP | CPFP | acronym · gloss: filho paga pelo pai / Child Pays For Parent · Electrum pt_BR. ⚠️ NOT "Criar". |
| Speed Up | acelerar / aumentar taxa | verb · button label. |
| **_Lightning_** | | |
| Invoice | fatura | noun, lowercase · Electrum pt_BR + Zeus pt_BR + Cake pt_BR. |
| Lightning Invoice | fatura Lightning | noun · brand kept Latin. |
| Preimage | pré-imagem | noun, lowercase · Electrum pt_BR + Zeus pt_BR. Shipped `Imagem prévia` is a literal calque; prefer the cryptographic term `pré-imagem`. |
| Payment | pagamento | noun, lowercase · ⚠️ NOT verb "Pagar" · Electrum pt_BR + Zeus pt_BR + Cake pt_BR. |
| Expired | expirada / expirado | adj · feminine (agreeing with `fatura`) / masculine · Electrum pt_BR + Cake pt_BR. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | cossignatário / coassinante | noun · ⚠️ NOT `coassinatura` (= co-signature, the artifact, not the person). Shipped uses `Coassinatura` for the signer role — wrong noun. |
| Quorum | quórum / mínimo de assinaturas | noun · canonical / UI-clear · ⚠️ shipped `Quantidade mínima {m} de máxima {n}` is semantically wrong (m and n are signers-required and total). Suggest `{m} de {n} (quórum)`. |
| PSBT | PSBT | acronym · gloss: transação Bitcoin parcialmente assinada. |
| Provide signature | fornecer assinatura / assinar transação | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / código de pagamento | acronym kept; `Payment Code` → `código de pagamento` (app ships in pt_br.json as `Código de pagamento`). |
| Notification transaction | transação de notificação | noun · BIP47-specific. |
| SilentPayment | Silent Payments / pagamentos silenciosos | protocol name kept English (plural); explanatory `pagamentos silenciosos` if needed. |
| **_Coin control_** | | |
| Coin Control | controle de moedas / controle de UTXO | noun, lowercase · mainstream / technical · ⚠️ NOT Title Case · Electrum pt_BR + Cake pt_BR. |
| Frozen | congelado / congelada | adj · masculine / feminine agreement · ⚠️ NOT verb "congelar" · Electrum pt_BR + Cake pt_BR. |
| **_Security & storage_** | | |
| Encrypted storage | armazenamento criptografado / criptografia de armazenamento | noun, lowercase · ⚠️ NOT Title Case. App ships both forms in different strings. |
| Plausible Deniability | negação plausível | noun, lowercase · ⚠️ NOT Title Case. |
| Biometrics | biometria | noun, lowercase · Cake pt_BR. |
| Passcode | código de acesso | noun · ⚠️ NOT `senha` (= password) — device-level unlock code. App `biometrics_fail` already uses `código de acesso`. |
| **_Backup, import & UX_** | | |
| Backup | backup / fazer backup | noun / verb · loanword widely used · Bitcoin Core pt_BR + Electrum pt_BR + Cake pt_BR. |
| Restore | restaurar / restauração | verb / noun · Bitcoin Core pt_BR + Cake pt_BR. |
| Import | importar / importação | verb / noun · Electrum pt_BR. |
| Voucher | voucher | noun, lowercase, loanword. |
| Redeem | resgatar | verb · Cake pt_BR (`Resgate` / `resgatado`). |
| Send | enviar | verb. |
| Receive | receber | verb. |
| Settings | configurações | noun, lowercase. |
| Confirm | confirmar / confirmação | verb / noun. `confirmações` (plural) = block confirmations. |
| QR Code | código QR / QR Code | noun · explanatory / brand-form · Electrum pt_BR + Cake pt_BR + Bitcoin Core pt_BR. App ships `QR Code`. |
| Clipboard | área de transferência | noun, lowercase · Electrum pt_BR + Bitcoin Core pt_BR + Cake pt_BR. |
| Memo | nota / memorando | noun, lowercase · sender note on outgoing tx. |
| Description | descrição | noun, lowercase · Cake pt_BR. |
| Label | rótulo / etiqueta | noun, lowercase · Bitcoin Core pt_BR + Electrum pt_BR + Cake pt_BR. |
