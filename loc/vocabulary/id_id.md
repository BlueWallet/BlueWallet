# Indonesian translation vocabulary (`id_id.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, casing, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin | brand kept Latin · id.wikipedia.org/wiki/Bitcoin |
| Lightning | Lightning | brand. |
| Electrum | Electrum | brand. |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. |
| **_Units & amounts_** | | |
| bitcoin / BTC | bitcoin / BTC | noun unit + ticker, lowercase unit per glossary. |
| sats | sats | noun, lowercase. |
| sat/vByte | sat/vByte | technical unit; keep Latin casing. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | dompet | noun, lowercase · Bitcoin Core id + id.wikipedia.org/wiki/Bitcoin |
| Vault | brankas | noun; safe/strongbox sense. Avoid Latin "Vault". |
| Watch-only | hanya-lihat / dompet hanya-lihat | adj · compact / explanatory · Electrum id (`hanya dapat dilihat`). ⚠️ NOT mode pembacaan. |
| Hardware wallet | dompet perangkat keras | noun, lowercase · Bitcoin Core id + Cake id |
| Seed | frasa pemulihan / seed | noun · mainstream / technical. ⚠️ shipped `Benih` (= plant seed) is misleading; prefer `frasa pemulihan`. |
| Mnemonic | frasa mnemonik / frasa pemulihan | noun · technical / mainstream. |
| Passphrase | frasa sandi | noun · ⚠️ distinct from `kata sandi` (password) and `kode sandi` (passcode). |
| Public key | kunci publik | noun, lowercase · Cake id + id.wikipedia.org/wiki/Bitcoin |
| Private key | kunci privat | noun, lowercase · Bitcoin Core id + Cake id |
| WIF | WIF | acronym · gloss: format impor dompet. |
| xpub | xpub | acronym, lowercase preferred. |
| Descriptor | deskriptor | noun, lowercase · Bitcoin Core id. |
| Derivation path | jalur derivasi | noun, lowercase. |
| Master fingerprint | sidik jari utama | noun, lowercase · Electrum id. |
| BIP38 | BIP38 | acronym kept; gloss: kunci privat terenkripsi BIP38. |
| **_On-chain transactions_** | | |
| Transaction | transaksi | noun, lowercase. |
| Address | alamat | noun, lowercase · id.wikipedia.org/wiki/Bitcoin |
| Input | masukan / input transaksi | noun · short / full · ⚠️ NOT "login". |
| Output | keluaran / keluaran transaksi | noun · short / full · Electrum id (`keluaran`). ⚠️ NOT the UI "Ke:" label. |
| UTXO | UTXO | acronym · gloss: keluaran transaksi yang belum dibelanjakan. |
| Change | kembalian / alamat kembalian | noun · ⚠️ NOT verb `ubah` (= to modify). `kembalian` = leftover; `alamat kembalian` for change-address · Bitcoin Core id (`Kembalian`) + id.wikipedia.org/wiki/Bitcoin (`uang kembalian`). |
| Hex | hex / data heksadesimal | noun · short / explanatory · ⚠️ NOT "hash" and NOT "data transaksi". |
| Pending | tertunda | adj/state · button vs body. Avoid noun form. |
| Unconfirmed | belum dikonfirmasi | adj · Bitcoin Core id + Electrum id + Cake id. |
| Confirmed | dikonfirmasi / terkonfirmasi | adj · ⚠️ shipped `konfirmasi` is the noun "confirmation"; use the adj/state form. · Bitcoin Core id + Cake id. |
| Mempool | mempool | noun, lowercase · Electrum id keeps Latin. |
| Broadcast | siarkan / penyiaran | verb / noun · UI-clear verb + noun form. |
| Block explorer | penjelajah blok | noun, lowercase · Zeus id. |
| Onchain | on-chain / di blockchain | adj · compact (chip) / explanatory (body). |
| Offchain | off-chain / di luar blockchain | adj · compact (chip) / explanatory (body). |
| **_Fees & fee bumping_** | | |
| Fee | biaya | noun, lowercase · ⚠️ NOT `Tarif` (= tariff/rate) · id.wikipedia.org/wiki/Bitcoin (`biaya transaksi`). |
| Fee Bump | kenaikan biaya / naikkan biaya | noun / verb · ⚠️ `Lonjakan Biaya` reads as "fee surge"; prefer `kenaikan biaya`. |
| RBF | RBF | acronym · gloss: ganti dengan biaya lebih tinggi (Replace-By-Fee). |
| CPFP | CPFP | acronym · gloss: anak membayar untuk induk. ⚠️ NOT a verb. |
| Speed Up | percepat | verb (button label). |
| **_Lightning_** | | |
| Invoice | faktur | noun, lowercase · Electrum id + Zeus id + Cake id. |
| Lightning Invoice | faktur Lightning | noun · ⚠️ shipped `Fraktur Lightning` is a typo (Fraktur ≠ Faktur) · Zeus id. |
| Preimage | preimage | noun · English kept (no established Indonesian rendering) · Zeus id also keeps `Preimage`. |
| Payment | pembayaran | noun · ⚠️ NOT verb `bayar`. |
| Expired | kedaluwarsa | adj/state · ⚠️ shipped `Kadaluarsa` is the older spelling; modern KBBI form is `kedaluwarsa` (already used in `lnd.errorInvoiceExpired`). |
| **_Multisig & advanced addressing_** | | |
| Co-signer | penanda tangan / penanda tangan bersama | noun · short / full · ⚠️ NOT "pemilik bersama" (co-owner). |
| Quorum | kuorum / ambang tanda tangan | noun · canonical / UI-clear. |
| PSBT | PSBT | acronym · gloss: transaksi Bitcoin yang ditandatangani sebagian. |
| Provide signature | berikan tanda tangan / tandatangani transaksi | verb · generic / specific. |
| BIP47 / Payment Code | BIP47 / kode pembayaran | acronym kept; "Payment Code" → `kode pembayaran`. |
| Notification transaction | transaksi pemberitahuan | noun · BIP47-specific. |
| SilentPayment | Silent Payments / pembayaran senyap | protocol name kept English (plural); explanatory `pembayaran senyap` if needed. |
| **_Coin control_** | | |
| Coin Control | kontrol koin / kelola UTXO | noun, lowercase · mainstream / technical · ⚠️ NOT Title Case · Bitcoin Core id (`pengaturan koin`). |
| Frozen | dibekukan | adj/state · ⚠️ shipped `Bekukan` is the verb "to freeze"; for state label use `dibekukan` · Electrum id + Zeus id + Cake id. |
| **_Security & storage_** | | |
| Encrypted storage | penyimpanan terenkripsi | noun, lowercase · ⚠️ NOT Title Case. |
| Plausible Deniability | penyangkalan yang masuk akal | noun, lowercase · ⚠️ NOT Title Case. |
| Biometrics | biometrik | noun, lowercase. |
| Passcode | kode sandi | noun · ⚠️ shipped `kata sandi` collides with "password"; recommend `kode sandi` to disambiguate. |
| **_Backup, import & UX_** | | |
| Backup | cadangan / cadangkan | noun / verb · Bitcoin Core id + Cake id. |
| Restore | pulihkan / pemulihan | verb / noun · Bitcoin Core id + Electrum id + Cake id. |
| Import | mengimpor / impor | verb / noun. |
| Voucher | voucher | noun, lowercase · English passthrough accepted (no idiomatic Indonesian; Bitcoin Core/Electrum id do not cover). |
| Redeem | tebus / tukar | verb · ⚠️ NOT "beli ke dompet" · Cake id (`Tukar`). |
| Send | kirim | verb. |
| Receive | terima | verb. |
| Settings | pengaturan | noun, lowercase · Bitcoin Core id + Cake id. |
| Confirm | konfirmasikan / konfirmasi | verb / noun · "konfirmasi" also doubles as plural confirmations count. |
| QR Code | kode QR | noun, lowercase · Bitcoin Core id + Cake id. |
| Clipboard | papan klip / clipboard | noun · Indonesian gloss / English passthrough · ⚠️ shipped `Clipboard` Latin; KBBI form is `papan klip`. |
| Memo | memo / catatan | noun · English borrow / Indonesian gloss · shipped `Memo` passthrough. |
| Description | deskripsi / keterangan | noun, lowercase · Electrum id + Cake id (`Keterangan`). |
| Label | label | noun, lowercase · Bitcoin Core id. |
