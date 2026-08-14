# Guaraní translation vocabulary (`gug_PY.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

Note: upstream wallet projects (Bitcoin Core, Electrum, Phoenix, Zeus, Trezor, Cake, Bisq, Green, Breez) do **not** ship Paraguayan Guaraní (`gug` / Avañeʼẽ) localizations — every locale file 404s. The only native references are gn.wikipedia.org articles, which are sparse for Bitcoin/Lightning terminology. Almost every row is therefore best-effort native Guaraní or a transliteration, tagged `(transliteration)` / `(no upstream wallet citation)`. Paraguayan Guaraní in everyday tech/finance speech is heavily **Jopará** — a natural code-mix with Spanish loanwords (e.g. *factura*, *firma*, *transaksión*, *llave*). These loanwords are accepted here where they are the genuine spoken form; such rows are tagged `· Jopará`. Guaraní orthography uses the puso `ʼ` (U+02BC) for the glottal stop and the tilde for nasal vowels (ã, ẽ, ĩ, õ, ũ, ỹ); brand/acronym rows stay Latin.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin. |
| Lightning | Lightning | brand kept Latin (no gn.wikipedia article). |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; unit lowercase, ticker uppercase. |
| sats | sats | noun, lowercase; kept Latin (no native Guaraní rendering). |
| sat/vByte | sat/vByte | technical unit; UI keeps Latin (casing matters). |
| vByte | vByte | technical unit kept Latin. |
| **_Wallet, keys & seeds_** | | |
| Wallet | viru ryru | noun · lit. "money container" (*viru* = money, *ryru* = container); native compound (no upstream wallet citation). |
| Vault | kaha mbarete | noun · "strong safe/strongbox" (*kaha* < Sp. *caja* · Jopará). ⚠️ NOT a brand. |
| Watch-only | maʼẽ-hag̃uánte | adj · lit. "only for looking" (*maʼẽ* = to look); descriptive (no upstream wallet citation). ⚠️ NOT generic "view mode". |
| Hardware wallet | viru ryru hardware | noun · *hardware* kept Latin (no upstream wallet citation). |
| Seed | raʼỹi | noun · native "seed/grain"; used for the recovery seed (no upstream wallet citation). |
| Mnemonic | ñeʼẽ momanduʼaha | noun · lit. "words that make remember" = mnemonic phrase (no upstream wallet citation). |
| Passphrase | ñeʼẽñemi pukukue | noun · "long secret phrase"; distinct from password (no upstream wallet citation). ⚠️ NOT the app password (*ñeʼẽñemi*) nor the device passcode. |
| Public key | llave pública | noun · *llave* < Sp. "key" (fem., agreement kept) · Jopará. ⚠️ NOT title case. |
| Private key | llave ñemi | noun · *llave* (Sp.) + *ñemi* (Guaraní "secret") · Jopará. |
| WIF | WIF | acronym kept. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | descriptor | noun · technical term kept (transliteration; no upstream wallet citation). |
| Derivation path | tape derivación | noun · *tape* = path (Guaraní) + *derivación* (Sp.) · Jopará. |
| Master fingerprint | huella maestra | noun · "master fingerprint" · Jopará (no native crypto term). |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | transaksión | noun · transliteration of Sp. *transacción* · Jopará (no native term); plural via *-kuéra*. |
| Address | renda | noun · native "place/location" used for destination address (no upstream wallet citation). |
| Input | jeike | noun · native "entry" (tx input). ⚠️ NOT "login / entrance to the app". |
| Output | ñesẽ | noun · native "exit/going-out" (tx output). ⚠️ NOT the UI recipient label "To:". |
| UTXO | UTXO | acronym. |
| Change | rembyre | noun · native "leftover/remainder" = change-output (no upstream wallet citation). ⚠️ NOT verb "to change/modify". |
| Hex | hex | noun · kept Latin (transliteration). ⚠️ NOT "hash". |
| Pending | ohaʼarõ | adj/state · "is waiting/pending" (*haʼarõ* = to wait). ⚠️ NOT a noun. |
| Unconfirmed | moneĩʼỹ | adj · "without confirmation" (*moneĩ* = approve/confirm) (no upstream wallet citation). |
| Confirmed | oñemoneĩma | adj/state · "has been confirmed" (no upstream wallet citation). |
| Mempool | mempool | technical term kept Latin. |
| Broadcast | ñemyasãi / emyasãi | noun / verb · native *myasãi* = "to spread/diffuse" (no upstream wallet citation). |
| Block explorer | bloque kundahára | noun · *kundahára* = explorer/browser (Guaraní) + *bloque* (Sp.) · Jopará. |
| Onchain | onchain | adj · kept Latin; native gloss "kadénape" (in the chain). |
| Offchain | offchain | adj · kept Latin. |
| **_Fees & fee bumping_** | | |
| Fee | tepy | noun · native "price/cost" used for network fee (no upstream wallet citation). |
| Fee Bump | tepy ñemboheta | noun · "fee increase" (no upstream wallet citation). |
| RBF | RBF | acronym. |
| CPFP | CPFP | acronym. ⚠️ NOT a verb. |
| Speed Up | embopyaʼe | verb · "make fast" (*pyaʼe* = fast); button label (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | factura | noun · Sp. loanword, universal in Paraguay · Jopará. |
| Lightning Invoice | Factura Lightning | noun · brand kept Latin + localised noun · Jopará. |
| Preimage | preimagen | noun · math term, transliteration of Sp. *preimagen* · Jopará. |
| Payment | jehepymeʼẽ | noun · "payment" (*hepy* = price + *meʼẽ* = to give). ⚠️ NOT verb "to pay" (*ehepymeʼẽ*). |
| Expired | opáma | adj/state · "it is over/ended" (no upstream wallet citation). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | co-firmante | noun · *firma* (Sp. "signature") · Jopará. ⚠️ NOT "co-owner". |
| Quorum | quórum | noun · Latin/Sp. term kept. |
| PSBT | PSBT | acronym. |
| Provide signature | emeʼẽ firma | verb · "give the signature" (*firma* < Sp.) · Jopará. |
| BIP47 / Payment Code | BIP47 / código de pago | acronym kept; "Payment Code" = *código de pago* · Jopará. |
| Notification transaction | transaksión momarandu | noun · *momarandu* = notification (Guaraní) + *transaksión* · Jopará. |
| SilentPayment | Silent Payments | brand/protocol name kept English (plural). |
| **_Coin control_** | | |
| Coin Control | viru ñangareko | noun · "coin management" (*viru* = coin + *ñangareko* = care/management). ⚠️ NOT title case (Guaraní has no such convention). |
| Frozen | jokopyre | adj/state · "held/blocked" (*joko* = to hold back). ⚠️ NOT verb "to freeze" (*joko*). |
| **_Security & storage_** | | |
| Encrypted storage | ñongatuha encriptado | noun · *ñongatuha* = storage (Guaraní) + *encriptado* (Sp.) · Jopará. ⚠️ NOT title case. |
| Plausible Deniability | ñembotove ikatúva | noun · "deniability that is possible/plausible" (*mbotove* = to deny); uncertain idiomatic rendering. ⚠️ NOT title case. |
| Biometrics | biometría | noun · Sp. loanword · Jopará. |
| Passcode | passcode | noun · kept Latin, as shipped in `gug_PY.json` (device PIN); native gloss *papapy jeike* ("entry number"). ⚠️ NOT the app password (*ñeʼẽñemi*). |
| **_Backup, import & UX_** | | |
| Backup | respaldo | noun · Sp. loanword, universal in Paraguay · Jopará. |
| Restore | emoĩjey / ñemoĩjey | verb / noun · "put back again" (*moĩ* = put + *jey* = again) (no upstream wallet citation). |
| Import | egueru / ñegueru | verb / noun · "bring in" (*gueru* = to bring) (no upstream wallet citation). |
| Voucher | cupón | noun · Sp. loanword · Jopará. |
| Redeem | embohepy | verb · "turn into money/cash in" (*hepy* = price). ⚠️ NOT "buy to wallet" / NOT "transfer". |
| Send | mondo / emondo | verb · "send" (*mondo*); imperative *emondo* for buttons (no upstream wallet citation). |
| Receive | japyhy / ejapyhy | verb · "receive/take" (*japyhy*); imperative *ejapyhy* (no upstream wallet citation). |
| Settings | ñemboheko | noun · "configuration/arrangement" (*mboheko* = to set up) (no upstream wallet citation). |
| Confirm | emoneĩ / ñemoneĩ | verb / noun · "approve/confirm"; confirmations = *ñemoneĩ* (no upstream wallet citation). |
| QR Code | código QR | noun · QR kept Latin · Jopará. |
| Clipboard | portapapeles | noun · Sp. loanword · Jopará. |
| Memo | jehaimi | noun · "little note" (*jehai* = writing) (no upstream wallet citation). |
| Description | ñemyesakã | noun · "explanation/clarification" (*myesakã* = to clarify) (no upstream wallet citation). |
| Label | marca | noun · Sp. loanword "mark/tag" · Jopará. |

