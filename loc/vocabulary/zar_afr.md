# Afrikaans translation vocabulary (`zar_afr.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | — |
| Lightning | Lightning | — |
| Electrum | Electrum | brand · keep Latin. |
| LNDhub | LNDhub | brand · keep Latin. Shipped `Knoop-punt` ("node-point") is a wrong-translation bug — see vocabulary.md Open TODOs. |
| LND | LND | brand · keep Latin. |
| LNURL | LNURL | brand · keep Latin. |
| Tor | Tor | brand · keep Latin. |
| Orbot | Orbot | brand · keep Latin. |
| GroundControl | GroundControl | brand · keep Latin. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | unit name lowercase, ticker uppercase. |
| sats | sats | — |
| sat/vByte | sat/vByte | — |
| vByte | vByte | — |
| **_Wallet, keys & seeds_** | | |
| Wallet | beursie | "purse/wallet". |
| Vault | kluis | "safe / strongbox" — translatable noun, NOT a brand. |
| Watch-only | slegs-kyk | "view-only"; ⚠️ NOT "view mode" generic — it is a wallet type. |
| Hardware wallet | hardeware-beursie | compound noun, lowercase. |
| Seed | saad | Literal "seed". |
| Mnemonic | terugval woorde | "fallback words". |
| Passphrase | wagfrase | ⚠️ NOT `wagwoord` (= password) and NOT `wagkode` (= passcode). |
| Public key | openbare sleutel | lowercase common noun. |
| Private key | private sleutel | lowercase common noun. |
| WIF | WIF | acronym kept; gloss: Wallet Import Format. |
| xpub | xpub | acronym kept lowercase per glossary. |
| Descriptor | deskriptor | noun, lowercase · output descriptor; cognate spelling (no upstream wallet citation). |
| Derivation path | afleidingspad | noun · `afleiding` (derivation) + `pad` (path); cognate compound (no upstream wallet citation). |
| Master fingerprint | meester-vingerafdruk | noun · cognate compound (no upstream wallet citation). |
| BIP38 | BIP38 | acronym kept. ⚠️ NOT a verb / NOT "password" alone. |
| **_On-chain transactions_** | | |
| Transaction | transaksie | · af.wikipedia.org/wiki/Bitcoin. |
| Address | adres | — |
| Input | inset | — |
| Output | uitset | noun, lowercase. ⚠️ Shipped `Resultaat` (= "result") is wrong sense for tx output. |
| UTXO | UTXO | acronym kept. |
| Change | kleingeld / wisselgeld | noun · ⚠️ NOT verb "verander" — `kleingeld`/`wisselgeld` = "change/leftover" (no upstream wallet citation). |
| Hex | hex | — |
| Pending | hangende | adjective/state form. ⚠️ NOT the noun "wagting". |
| Unconfirmed | onbevestig | adjective state form. |
| Confirmed | bevestig | adjective state form. |
| Mempool | mempool | technical term kept; Afrikaans Bitcoin coverage is thin. |
| Broadcast | saai uit / sending | verb / noun. |
| Block explorer | blokverkenner | noun · "block explorer" — `blok` + `verkenner` (no upstream wallet citation). |
| Onchain | onchain / op die ketting | adj · compact (chip) / explanatory (body) (no upstream wallet citation). |
| Offchain | offchain / af die ketting | adj · compact (chip) / explanatory (body) (no upstream wallet citation). |
| **_Fees & fee bumping_** | | |
| Fee | fooi | — |
| Fee Bump | fooi-verhoging | noun · "fee raise" — umbrella term for RBF + CPFP (no upstream wallet citation). |
| RBF | RBF | acronym kept (Replace-by-fee). |
| CPFP | CPFP | acronym kept (Child-pays-for-parent). ⚠️ NOT a verb. |
| Speed Up | versnel | verb · "speed up / accelerate" — standard Afrikaans (no upstream wallet citation). |
| **_Lightning_** | | |
| Invoice | faktuur / rekening | technical / mainstream. |
| Lightning Invoice | Lightning faktuur | brand kept Latin, noun lowercase. |
| Preimage | TODO | math term; uncertain Afrikaans rendering (candidates: `voorafbeeld`). |
| Payment | betaling | ⚠️ NOT the verb "betaal". |
| Expired | vervalle | adjective/state form, lowercase. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | mede-tekenaar | ⚠️ NOT "mede-eienaar" (co-owner) — must be a signer noun. |
| Quorum | kworum / handtekeningdrempel | noun · canonical / UI-clear ("signature threshold") (no upstream wallet citation). |
| PSBT | PSBT | acronym kept (Partially Signed Bitcoin Transaction). |
| Provide signature | teken 'n transaksie | "sign a transaction". |
| BIP47 / Payment Code | BIP47 / betalingskode | acronym + translatable noun "payment code". |
| Notification transaction | kennisgewing-transaksie | noun · BIP47-specific (no upstream wallet citation). |
| SilentPayment | Silent Payments | brand-ish protocol name; keep English. |
| **_Coin control_** | | |
| Coin Control | muntbeheer / UTXO-beheer | noun, lowercase · mainstream / technical · ⚠️ NOT Title Case (no upstream wallet citation). |
| Frozen | gevries | adjective/state form. ⚠️ NOT the verb "vries / bevries". |
| **_Security & storage_** | | |
| Encrypted storage | ge-enkripteer (geheue spasie) | ⚠️ NOT Title Case. |
| Plausible Deniability | geloofwaardige ontkenbaarheid | ⚠️ NOT Title Case. |
| Biometrics | biometrie | common noun, lowercase. |
| Passcode | toegangskode | ⚠️ NOT app password (`wagwoord`) — device-level unlock code. |
| **_Backup, import & UX_** | | |
| Backup | rugsteun / rugsteun maak | noun / verb. |
| Restore | herstel | verb / noun. |
| Import | invoer | — |
| Voucher | koepon | "coupon". |
| Redeem | eis / aktiveer | "claim / activate". |
| Send | stuur | — |
| Receive | ontvang | — |
| Settings | instellings | — |
| Confirm | bevestig | — |
| QR Code | QR-kode | · af.wikipedia.org/wiki/QR-kode. Shipped UI uses Latin `QR Code`. |
| Clipboard | knipbord | — |
| Memo | nota | "note"; preferred sense for outgoing-tx note. |
| Description | beskrywing | — |
| Label | etiket | — |
