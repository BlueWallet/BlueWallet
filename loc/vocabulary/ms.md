# Malay translation vocabulary (`ms.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand · ms.wikipedia.org/wiki/Bitcoin keeps Latin "Bitcoin". |
| Lightning | Lightning | brand · no ms.wikipedia article; keep Latin. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand · keep Latin. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker; ms keeps "bitcoin" lowercase, `BTC` uppercase. |
| sats | sat | noun, lowercase; shipped `units.sats` = `sat`. |
| sat/vByte | sat/vByte | technical unit · keep Latin per convention. |
| vByte | vByte | technical unit · keep Latin per convention. |
| **_Wallet, keys & seeds_** | | |
| Wallet | dompet | noun, lowercase · ms.wikipedia.org/wiki/Bitcoin uses `dompet`. |
| Vault | bilik kebal / peti kebal | noun, lowercase · `bilik kebal` shipped; `peti kebal` also appears in `multisig.ms_help_1`. Both = safe/strongbox. |
| Watch-only | lihat-saja / lihat sahaja | adj · `lihat-saja` shipped; `lihat sahaja` more standard ms. |
| Hardware wallet | dompet perkakas | noun, lowercase · shipped form. |
| Seed | frasa mnemonik / benih | noun · `frasa mnemonik` mainstream recovery-phrase form (preferred per glossary); `benih` literal/technical (shipped). |
| Mnemonic | mnemonik / frasa mnemonik | noun · `mnemonik` per Kamus Dewan (technical); `frasa mnemonik` for body-text. |
| Passphrase | frasa laluan | noun · ⚠️ NOT `kata laluan` (password) — distinct head noun (frasa vs kata) · Bitcoin Core ms uses `frasa laluan` throughout. |
| Public key | kunci awam / kunci umum | noun, lowercase · `kunci awam` per ms.wikipedia.org/wiki/Bitcoin; `kunci umum` also shipped. |
| Private key | kunci persendirian / kunci peribadi | noun, lowercase · `kunci persendirian` shipped; `kunci peribadi` also natural. |
| WIF | WIF | acronym · gloss: format pindah masuk dompet. |
| xpub | xpub | acronym, lowercase preferred per convention. |
| Descriptor | deskriptor | noun, lowercase · transliteration; no ms reference; matches ms phonetics. |
| Derivation path | laluan terbitan | noun, lowercase · shipped form. |
| Master fingerprint | cap jari induk | noun, lowercase · shipped form. |
| BIP38 | BIP38 | acronym kept · gloss: kunci persendirian dilindungi kata laluan. |
| **_On-chain transactions_** | | |
| Transaction | urus niaga / transaksi | noun, lowercase · `urus niaga` shipped; `transaksi` per ms.wikipedia.org/wiki/Bitcoin (mainstream loanword). |
| Address | alamat | noun, lowercase · shipped. |
| Input | masukan / input urus niaga | noun · short / full. |
| Output | keluaran / output urus niaga | noun · short / full · ⚠️ NOT `kepada` (= "to") which is a preposition, not the transaction-output noun. |
| UTXO | UTXO | acronym · gloss: keluaran urus niaga belum dibelanjakan. |
| Change | baki / duit baki | noun · ⚠️ NOT `ubah` (= verb "to change/modify"). `baki` = remainder; `duit baki` for clarity. |
| Hex | heks / data heksadesimal | noun · short / explanatory · ⚠️ NOT `hash` (a different concept). |
| Pending | tergantung / belum selesai | adj/state · `tergantung` shipped; `belum selesai` more natural body-text. |
| Unconfirmed | belum disahkan / tidak disahkan | adj · standard ms uses root `sah` (= valid/confirmed). |
| Confirmed | disahkan / telah disahkan | adj · `disahkan` (= confirmed/validated) is the standard adj form; `telah disahkan` is the explicit past-participle variant for body-text. |
| Mempool | mempool | noun · keep Latin — no established ms rendering. |
| Broadcast | siarkan / penyiaran | verb / noun · `Siar` / `Siarkan` shipped as button; `Penyiaran` as noun. |
| Block explorer | penjelajah blok | noun, lowercase · shipped `penjelajah` in `settings.open_link_in_explorer`. |
| Onchain | on-chain / atas rantai | adj · compact (chip) / explanatory (body). |
| Offchain | off-chain / luar rantai | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | yuran | noun, lowercase · shipped. |
| Fee Bump | penambahan yuran | noun · shipped. |
| RBF | RBF | acronym · gloss: gantikan dengan yuran lebih tinggi. |
| CPFP | CPFP | acronym · gloss: anak bayar untuk induk (child-pays-for-parent). |
| Speed Up | tambah yuran / percepatkan | verb · `Tambah Yuran` shipped (RBF button); `percepatkan` is the direct verb. |
| **_Lightning_** | | |
| Invoice | invois | noun, lowercase · shipped. |
| Lightning Invoice | invois Lightning | noun · shipped. |
| Preimage | preimage / pra-imej | noun · technical (keep Latin) / explanatory transliteration. |
| Payment | bayaran / pembayaran | noun · ⚠️ NOT `bayar` (= verb "to pay"); use the noun form. `bayaran` appears in `notifications.would_you_like_to_receive_notifications`. |
| Expired | tamat tempoh / luput | adj · `tamat tempoh` shipped; `luput` also shipped in `lndViewInvoice.wasnt_paid_and_expired`. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | penandatangan bersama | noun · ⚠️ NOT `pemilik bersama` (co-owner) — must be a signer noun. |
| Quorum | kuorum | noun, lowercase · shipped. |
| PSBT | PSBT | acronym · gloss: urus niaga Bitcoin bertandatangan separa. |
| Provide signature | berikan tandatangan / tandatangani | verb · `berikan tandatangan` shipped; `tandatangani` more direct. |
| BIP47 / Payment Code | BIP47 / kod pembayaran | acronym kept; "Payment Code" → `kod pembayaran`. |
| Notification transaction | urus niaga pemberitahuan | noun · BIP47-specific. |
| SilentPayment | Silent Payments / pembayaran senyap | protocol name kept English (plural); explanatory `pembayaran senyap` if needed. |
| **_Coin control_** | | |
| Coin Control | kawalan UTXO / kawalan duit | noun, lowercase · `kawalan UTXO` technical (preferred per glossary); `kawalan duit` mainstream/shipped. |
| Frozen | dibekukan / beku | adj · ⚠️ NOT `bekukan` (= verb "freeze!"); must be adj/state form. |
| **_Security & storage_** | | |
| Encrypted storage | simpanan disulitkan | noun, lowercase · shipped. |
| Plausible Deniability | penafian munasabah | noun, lowercase · shipped form. |
| Biometrics | biometrik | noun, lowercase · shipped. |
| Passcode | kod laluan | noun · ⚠️ NOT `kata laluan` (= password); `kod laluan` disambiguates. |
| **_Backup, import & UX_** | | |
| Backup | sandaran / sandarkan | noun / verb · `sandarkan` shipped as button; `sandaran` is the noun form. |
| Restore | kembalikan / pemulihan | verb / noun · `kembalikan` base verb; `pemulihan` noun form. |
| Import | pindah masuk / pemindahan masuk | verb / noun · shipped. |
| Voucher | baucar | noun, lowercase · shipped. |
| Redeem | tebus / aktifkan | verb · `tebus` shipped; `aktifkan` (activate) is the cleaner sense. |
| Send | hantar | verb · shipped. |
| Receive | terima | verb · shipped. |
| Settings | tetapan | noun, lowercase · shipped. |
| Confirm | sahkan / pengesahan | verb / noun · ⚠️ NOT `pasti` (= adj "sure/certain"); use verb `sahkan`. |
| QR Code | kod QR | noun · shipped. |
| Clipboard | papan klip / papan sepit | noun, lowercase · `papan klip` more widespread; `papan sepit` (= "pinching board") less standard. |
| Memo | memo / catatan | noun, lowercase · shipped `Memo`; `catatan` also natural. |
| Description | penerangan / huraian | noun, lowercase · shipped `penerangan`. |
| Label | label / tanda | noun · both noun forms; `label` is the standard loanword, `tanda` (= mark/tag) is the native equivalent. |
