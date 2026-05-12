# Spanish translation vocabulary (`es.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · es.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning / red Lightning | brand · `red Lightning` in explanatory text · es.wikipedia.org/wiki/Lightning_Network |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand · kept Latin (es.json `groundcontrol_explanation` already keeps it). |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; lowercase for the unit. |
| sats | sats / satoshis | noun, lowercase · short / full plural · Cake es + Electrum es. |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | cartera / monedero | noun, lowercase · app standardises on `cartera`; `monedero` is a synonym seen in Bitcoin Core es. |
| Vault | bóveda / caja fuerte | noun · ⚠️ NOT Latin "Vault". Shipped strings still say `Vault multifirma`; recommend migrating to `bóveda multifirma`. |
| Watch-only | solo lectura / solo observación | adj · UI / explanatory · Bitcoin Core es uses `solo de observación`. |
| Hardware wallet | cartera de hardware / monedero de hardware | noun, lowercase · Bitcoin Core es. |
| Seed | semilla / frase de recuperación | noun · technical / mainstream. |
| Mnemonic | frase mnemónica / frase mnemotécnica | noun · es.json uses both forms. |
| Passphrase | frase de contraseña / frase de seguridad | noun · ⚠️ NOT `contraseña` alone (= password) · Bitcoin Core es + Electrum es. Shipped strings still keep English `Passphrase`. |
| Public key | llave pública / clave pública | noun, lowercase · app uses `llave`; `clave` is the Bitcoin Core es form. |
| Private key | llave privada / clave privada | noun, lowercase. |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase. |
| Descriptor | descriptor | noun, lowercase · Electrum es + Bitcoin Core es. |
| Derivation path | ruta de derivación | noun, lowercase. |
| Master fingerprint | huella maestra / huella dactilar maestra | noun, lowercase · short / shipped form. |
| BIP38 | BIP38 | acronym · gloss: contraseña BIP38. |
| **_On-chain transactions_** | | |
| Transaction | transacción | noun, lowercase · ⚠️ shipped `Transaccion` missing accent — fix. |
| Address | dirección | noun, lowercase. |
| Input | entrada / entrada de transacción | noun · short / full · Electrum es + Cake es · ⚠️ NOT "inicio de sesión". Shipped es.json uses English `Inputs`. |
| Output | salida / salida de transacción | noun · short / full · Bitcoin Core es + Electrum es · ⚠️ NOT the UI recipient label "Para:". Shipped es.json uses English `Outputs`. |
| UTXO | UTXO | acronym · gloss: salida de transacción no gastada. |
| Change | cambio / dirección de cambio | noun · ⚠️ NOT verb "cambiar". `cambio` = leftover coin; `dirección de cambio` for change-address field · Electrum es. |
| Hex | hex / hexadecimal | noun · short / explanatory · ⚠️ NOT "hash" / NOT "datos de transacción". Shipped `broadcastNone` says `hash` — fix to `hex`. |
| Pending | pendiente / en espera | adj/state · short / body. Avoid verb forms. |
| Unconfirmed | sin confirmar / no confirmada | adj · short / feminine-agreement · Bitcoin Core es + Electrum es. |
| Confirmed | confirmada / confirmado | adj · feminine (transacción) / masculine · Bitcoin Core es + Electrum es. |
| Mempool | mempool | noun, lowercase · Electrum es + Zeus es (kept Latin). |
| Broadcast | emitir / transmitir | verb · UI / technical · Bitcoin Core es + Electrum es. Noun form: emisión / transmisión. |
| Block explorer | explorador de bloques | noun, lowercase · Bitcoin Core es + Electrum es. |
| Onchain | on-chain / en la cadena | adj · compact (chip) / explanatory (body). |
| Offchain | off-chain / fuera de la cadena | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | comisión / tarifa | noun, lowercase · app uses `comisión`; `tarifa` is a synonym. |
| Fee Bump | aumento de comisión / permitir aumentar la comisión | noun · canonical / shipped phrasing. |
| RBF | RBF | acronym · gloss: reemplazo por comisión / Replace-By-Fee. |
| CPFP | CPFP | acronym · gloss: el hijo paga por el padre. ⚠️ NOT a verb like "Crear". |
| Speed Up | acelerar / incrementar comisión | verb · short / shipped phrasing. |
| **_Lightning_** | | |
| Invoice | factura / solicitud de pago | noun · technical / mainstream. |
| Lightning Invoice | factura Lightning / solicitud de pago Lightning | noun · ⚠️ shipped `Factura Lighting` typo — fix to `Factura Lightning`. |
| Preimage | preimagen | noun, lowercase · Electrum es + Zeus es. |
| Payment | pago | noun, lowercase · ⚠️ NOT verb "Pagar" · Zeus es. |
| Expired | caducada / caducado | adj · feminine (factura) / masculine · alt: expirada / expirado · Bitcoin Core es + Electrum es. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | cofirmante / cosignatario | noun, lowercase · ⚠️ NOT "copropietario" (co-owner) · Electrum es uses `cosignatario`. |
| Quorum | quórum / umbral de firmas | noun, lowercase · canonical / UI-clear. |
| PSBT | PSBT | acronym. |
| Provide signature | proporcionar firma / firmar transacción | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / código de pago | acronym kept; "Payment Code" → `código de pago`. |
| Notification transaction | transacción de notificación | noun · BIP47-specific. |
| SilentPayment | Silent Payments / pagos silenciosos | protocol name kept English (plural); explanatory `pagos silenciosos` if needed. |
| **_Coin control_** | | |
| Coin Control | control de monedas / selección de monedas | noun, lowercase · technical / mainstream · ⚠️ NOT Title Case · Cake es + Electrum es. Shipped `cc.header` is still `Coin control`. |
| Frozen | congelado / congelada | adj · masc / fem-agreement · ⚠️ NOT verb "congelar" · Electrum es. |
| **_Security & storage_** | | |
| Encrypted storage | almacenamiento cifrado | noun, lowercase · ⚠️ NOT Title Case. |
| Plausible Deniability | negación plausible | noun, lowercase · ⚠️ NOT Title Case. |
| Biometrics | biometría | noun, lowercase. |
| Passcode | código de acceso | noun, lowercase · ⚠️ NOT `contraseña` (= app password). |
| **_Backup, import & UX_** | | |
| Backup | copia de seguridad / hacer copia de seguridad | noun / verb · Bitcoin Core es. Shipped `details_export_backup` says `Exportar / Guardar`. |
| Restore | restaurar / restauración | verb / noun. |
| Import | importar / importación | verb / noun. |
| Voucher | cupón | noun, lowercase. |
| Redeem | canjear | verb · ⚠️ NOT "comprar" / NOT "transferir" · Cake es. |
| Send | enviar | verb. |
| Receive | recibir | verb. |
| Settings | ajustes / configuración | noun, lowercase · app uses `ajustes`; `configuración` is a synonym. |
| Confirm | confirmar / confirmación | verb / noun. |
| QR Code | código QR | noun, lowercase. |
| Clipboard | portapapeles | noun, lowercase. |
| Memo | comentario / nota | noun, lowercase · app uses `comentario`; `nota` also seen. |
| Description | descripción | noun, lowercase. |
| Label | etiqueta | noun, lowercase · Cake es. |
