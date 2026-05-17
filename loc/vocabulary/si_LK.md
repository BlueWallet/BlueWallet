# Sinhala translation vocabulary (`si_LK.json`)

See [`../vocabulary.md`](../vocabulary.md) for the glossary of terms, vocabulary entry conventions (POS, multi-form syntax, anti-meaning callouts), and the meaning of each row.

| Term | Translation | Notes |
|------|-------------|-------|
| **_Brand & protocol_** | | |
| Bitcoin | Bitcoin / බිට්කොයින් | brand kept Latin; බිට්කොයින් in explanatory text · si.wikipedia.org/wiki/බිට්කොයින් |
| Lightning | Lightning / ලයිට්නින් | brand kept Latin; transliteration used in body. Avoid native "අකුණු" (= literal lightning bolt) for the protocol. |
| Electrum | Electrum | brand · ⚠️ shipped uses inconsistent ඉලෙක්ට්‍රම් / ඉලෙක්ට්‍රෝම් — standardise on Latin `Electrum`; if transliterated, use ඉලෙක්ට්‍රම් · Electrum si |
| LNDhub | LNDhub | brand. |
| LND | LND | brand. |
| LNURL | LNURL | brand. |
| Tor | Tor | brand. |
| Orbot | Orbot | brand. |
| GroundControl | GroundControl | brand. Avoid transliteration ග්‍රවුන්ඩ්කන්ට්‍රෝල්. |
| **_Units & amounts_** | | |
| bitcoin / BTC | බිට්කොයින් / BTC | noun unit + ticker. Ticker kept Latin. |
| sats | සැට්ස් | noun. |
| sat/vByte | sat/vByte | technical unit; UI controls keep Latin. |
| vByte | vByte | technical unit. |
| **_Wallet, keys & seeds_** | | |
| Wallet | පසුම්බිය | noun · shipped mixes පසුම්බිය / මුදල් පසුම්බිය — standardise on පසුම්බිය (shorter, used by Bitcoin Core si + Electrum si). |
| Vault | සුරක්ෂිතාගාරය | noun · safe/strongbox sense. |
| Watch-only | නැරඹීමට පමණි | adj · Electrum si |
| Hardware wallet | දෘඩාංග පසුම්බිය | noun. |
| Seed | බීජ වැකිය / ප්‍රතිසාධන වැකිය | noun · technical / mainstream. Bare `බීජ` (= literal seed) is too terse; pair with වැකිය. |
| Mnemonic | සිහිවටන වැකිය / ප්‍රතිසාධන වැකිය | noun · technical / mainstream. |
| Passphrase | මුරවැකිය | noun · ⚠️ NOT මුරපදය (= password). Distinct word for BIP39 25th word · Electrum si "මුර-වැකිකඩ" |
| Public key | පොදු යතුර | noun. |
| Private key | පුද්ගලික යතුර | noun · Bitcoin Core si |
| WIF | WIF | acronym. |
| xpub | xpub | acronym, lowercase preferred · ⚠️ shipped uses XPUB — vocabulary prefers lowercase. |
| Descriptor | විස්තරකය | noun · Electrum si "විස්තරය" — prefer විස්තරකය to disambiguate from generic "description". |
| Derivation path | ව්‍යුත්පන්න මාර්ගය | noun. |
| Master fingerprint | ප්‍රධාන ඇඟිලි සලකුණ | noun. |
| BIP38 | BIP38 | acronym kept. |
| **_On-chain transactions_** | | |
| Transaction | ගනුදෙනුව | noun · Bitcoin Core si + Electrum si |
| Address | ලිපිනය | noun. |
| Input | ආදානය / ගනුදෙනු ආදානය | noun · short / full · ⚠️ shipped uses inconsistent යෙදවුම් / ආදානය — standardise on ආදානය. |
| Output | ප්‍රතිදානය / ගනුදෙනු ප්‍රතිදානය | noun · short / full · ⚠️ NOT UI recipient label "වෙත". |
| UTXO | UTXO | acronym · gloss: වියදම් නොකළ ගනුදෙනු ප්‍රතිදානය. |
| Change | ඉතිරිය / ඉතිරි මුදල | noun · ⚠️ NOT verb "වෙනස් කරන්න" (= to change). Must be a noun for change-output. Shipped `වෙනස් කරන්න` is wrong POS. |
| Hex | හෙක්ස් / හෙක්ස් දත්ත | noun · short / explanatory · ⚠️ NOT "hash" / NOT "ගනුදෙනු දත්ත". |
| Pending | අපේක්ෂිත | adj/state. |
| Unconfirmed | තහවුරු නොකළ | adj · Electrum si |
| Confirmed | තහවුරු කළ | adj · ⚠️ shipped `තහවුරු` drops the adjective suffix — should be තහවුරු කළ. |
| Mempool | මෙම්පූල් | noun · transliteration · Electrum si |
| Broadcast | විකාශනය කරන්න / විකාශනය | verb / noun · Bitcoin Core si + Electrum si |
| Block explorer | බ්ලොක් එක්ස්ප්ලෝරර් | noun. |
| Onchain | ඔන්-චේන් / දාම මත | adj · compact (chip) / explanatory (body) |
| Offchain | ඔෆ්-චේන් / දාමයෙන් පිට | adj · compact (chip) / explanatory (body) |
| **_Fees & fee bumping_** | | |
| Fee | ගාස්තුව | noun · Bitcoin Core si |
| Fee Bump | ගාස්තුව වැඩි කිරීම | noun · ⚠️ shipped `ගාස්තු වැඩි කිරීමට ඉඩ දෙන්න` is a verb phrase ("allow to raise fee"); canonical form is the noun. |
| RBF | RBF | acronym · gloss: ගාස්තුවෙන් ප්‍රතිස්ථාපනය. |
| CPFP | CPFP | acronym · gloss: දරුවා දෙමාපියන්ට ගෙවයි. ⚠️ NOT a verb. |
| Speed Up | වේගවත් කරන්න | verb · ⚠️ shipped `බම්ප් ගාස්තුව` (= "bump fee") doesn't match the Speed Up label. |
| **_Lightning_** | | |
| Invoice | ඉන්වොයිසිය / ගෙවීම් ඉල්ලීම | noun · technical / mainstream · Electrum si |
| Lightning Invoice | Lightning ඉන්වොයිසිය / Lightning ගෙවීම් ඉල්ලීම | noun · brand kept Latin. |
| Preimage | පූර්ව-රූපය | noun · math term for "preimage". |
| Payment | ගෙවීම | noun · ⚠️ NOT verb "ගෙවන්න" (= to pay). Shipped `ගෙවීම්` is plural — singular ගෙවීම preferred. |
| Expired | කල් ඉකුත් වූ / කල් ඉකුත් වී ඇත | adj · short / full state form. |
| **_Multisig & advanced addressing_** | | |
| Co-signer | සම-අත්සන්කරු | noun · ⚠️ NOT "co-owner". |
| Quorum | ගණපූරණය | noun. |
| PSBT | PSBT | acronym · gloss: අර්ධ වශයෙන් අත්සන් කළ බිට්කොයින් ගනුදෙනුව. |
| Provide signature | අත්සන ලබා දෙන්න | verb. |
| BIP47 / Payment Code | BIP47 / ගෙවීම් කේතය | acronym kept; "Payment Code" → "ගෙවීම් කේතය". |
| Notification transaction | දැනුම්දීම් ගනුදෙනුව | noun · BIP47-specific. |
| SilentPayment | Silent Payments / නිහඬ ගෙවීම් | protocol name kept English (plural); explanatory `නිහඬ ගෙවීම්` if needed. |
| **_Coin control_** | | |
| Coin Control | කාසි පාලනය | noun. |
| Frozen | කැටි කළ / නිශ්චල | adj · state form · ⚠️ NOT verb "කැටි කරන්න" (= to freeze). Shipped mixes verb + adj — keep adjective form. |
| **_Security & storage_** | | |
| Encrypted storage | සංකේතනය කළ ගබඩාව | noun. |
| Plausible Deniability | පිළිගතහැකි ප්‍රතික්ෂේප කිරීම | noun. |
| Biometrics | ජෛවමිතික | noun. |
| Passcode | කේතාංකය | noun · ⚠️ NOT මුරපදය (= password). Shipped `මුරපදය` collides with password — recommend කේතාංකය. |
| **_Backup, import & UX_** | | |
| Backup | උපස්ථය / උපස්ථ කරන්න | noun / verb · Electrum si |
| Restore | ප්‍රතිසාධනය කරන්න / ප්‍රතිසාධනය | verb / noun · Electrum si |
| Import | ආනයනය කරන්න / ආනයනය | verb / noun · ⚠️ shipped mixes ආනයන / ආයාත — standardise on ආනයනය. |
| Voucher | වවුචරය | noun. |
| Redeem | මුදවා ගන්න | verb. |
| Send | යවන්න | verb. |
| Receive | ලබා ගන්න | verb. |
| Settings | සැකසුම් | noun. |
| Confirm | තහවුරු කරන්න / තහවුරු කිරීම | verb / noun. |
| QR Code | QR කේතය | noun · Electrum si |
| Clipboard | පසුරු පුවරුව | noun · Electrum si |
| Memo | සංදේශය / සටහන | noun. |
| Description | විස්තරය | noun. |
| Label | ලේබලය | noun · Electrum si |
