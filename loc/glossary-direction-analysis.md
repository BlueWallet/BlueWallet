# Glossary direction analysis — master human translations as benchmark

User question: should we flip glossary for the 12 stable-A langs toward English crypto loanwords?

Method: pull `loc/<lang>.json` from `master` branch (human translations, pre-LLM). Probe how master renders 16 crypto-domain keys. If master uses English term verbatim → community prefers English loanword. If master uses native translation → community prefers native.

## Aggregate per-lang preference

| Lang | Master keys | Crypto probes | EN-loanword % | Verdict |
|------|------------:|--------------:|--------------:|---------|
| **nl_nl** | 539 | 11 | **55%** | ★ master prefers English |
| da_dk | 96 | 3 | 33% | sparse — leans native |
| sv_se | 421 | 12 | 33% | native-leaning |
| de_de | 543 | 16 | 31% | mixed (English for some) |
| fr_fr | 628 | 16 | 31% | mixed |
| es | 449 | 11 | 27% | native-leaning |
| zar_xho | 115 | 4 | 25% | native (sparse) |
| sk_sk | 199 | 5 | 20% | native (sparse) |
| tr_tr | 200 | 5 | **20%** | NATIVE — community prefers translation |
| pl | 642 | 16 | 19% | NATIVE |
| ms | 392 | 11 | 18% | NATIVE |
| bqi | 335 | 11 | 18% | NATIVE |
| hu_hu | 454 | 12 | 17% | NATIVE |
| vi_vn | 452 | 12 | 17% | NATIVE |
| lrc | 204 | 9 | 22% | NATIVE |
| jp_jp | 642 | 16 | **12%** | strongly NATIVE |
| cy | 177 | 1 | 0% | NATIVE (sparse) |

## Concrete evidence — what master actually uses

### Term: `Wallet` (key `wallets.details_title`)

| Lang | Master value | English? |
|------|--------------|---------|
| de_de | `Wallet` | ✓ |
| nl_nl | `Wallet` | ✓ |
| sv_se | `Plånbok` | ✗ NATIVE |
| tr_tr | `Cüzdan` | ✗ NATIVE |
| es | `Cartera` | ✗ NATIVE |
| fr_fr | `Portefeuille` | ✗ NATIVE |
| hu_hu | `Tárca` | ✗ NATIVE |
| jp_jp | `ウォレット` (katakana — borrowed but written in Japanese script) | ~ |
| pl | `Portfel` | ✗ NATIVE |
| sk_sk | `Peňaženka` | ✗ NATIVE |
| vi_vn | `Ví` | ✗ NATIVE |
| zar_xho | `Ingxowa` | ✗ NATIVE |
| bqi | `کیف پبل` | ✗ NATIVE |
| lrc | `کیف پیلٛ` | ✗ NATIVE |

### Term: `Coin Control` (key `cc.header`)

| Lang | Master value |
|------|--------------|
| de_de | `Münzkontrolle` (native compound) |
| nl_nl | `Coin Control` ✓ EN |
| sv_se | `Myntkontroll` native |
| es | `Coin control` ✓ EN (lowercase) |
| fr_fr | `Controle des UTXO` native |
| hu_hu | `Érme Kontroll` native |
| jp_jp | `コイン管理` native |
| ms | `Kawalan Duit` native |
| pl | `Kontrola monet` native |
| vi_vn | `Kiểm soát coin` native (with English "coin") |
| lrc | `دؽونداری کردن` native |

### Term: `Payment Code` (key `bip47.payment_code`)

All langs that have it translate it: `Zahlungscode` (de), `Betalningskod` (sv), `Code de paiement` (fr), `支払コード` (jp), `Kod płatności` (pl), `Mã thanh toán` (vi), `کود پرداخت` (lrc).

### Term: `Co-signer` (key `multisig.shared_key_detected`)

All langs translate: `Geteilte Mitsignierer` (de), `Cosignataire partagé` (fr), `共同署名の共有` (jp), `Wspólny współsygnatariusz` (pl), `امزا کوݩ هومبهر` (lrc).

### Term: `Multisig Vault`

| Lang | Master |
|------|--------|
| de_de | `Multisignatur Tresor` |
| nl_nl | `Multisig Kluis` (mixed) |
| sv_se | `Multisig Valv` (mixed) |
| es | `Vault multifirma` (mixed) |
| fr_fr | `Coffre-fort multi-signature` (fully native) |
| hu_hu | `Multisig Tárca` (mixed) |
| jp_jp | `マルチシグ金庫` (mixed) |
| ms | `Bilik Kebal Tandamai` (fully native) |
| pl | `Skarbiec wielopodpisowy` (fully native) |
| vi_vn | `Vault Multisig` (kept English) |

## Conclusion

**Master human translations contradict the LLM grader's "community prefers English" claim** for the 12 stable-A langs.

| Action | Verdict |
|--------|---------|
| Flip glossary toward English for `bqi, cy, es, fr_fr, hu_hu, jp_jp, lrc, ms, pl, sk_sk, vi_vn, zar_xho` | **NO** — would contradict master |
| Keep current direction (native-preferring) for these 12 | **YES** |
| For `nl_nl` (master 55% EN) | overhaul direction correct ✓ |
| For `de_de` (master mixed, 31% EN on probes but Wallet/Passphrase/Onchain English) | overhaul partially correct — some terms should be English (Wallet, Passphrase), others native (Münzkontrolle, Zahlungscode, Mitsignierer) |
| For `sv_se` (master native-leaning) | **overhaul direction WRONG** — master uses Plånbok/Myntkontroll/Betalningskod/Multisig Valv/Lösenordsfras. Consider reverting to native. |
| For `tr_tr` (master native-leaning) | **overhaul direction WRONG** — master uses Cüzdan/Yayınla/Not/Pano. Consider reverting to native. |
| For `da_dk` (sparse but Transmitter for Broadcast in master) | partial — Danish `transmitter` for Broadcast is kept correctly ✓; other terms unclear due to sparse master |
| For `sr_RS` (very sparse master, single key Ključ novčanika = native) | direction unclear — limited evidence |

## Recommended actions

1. **DO NOT flip glossary** for the 12 stable-A langs. Master proves community prefers native.

2. **Revisit overhaul** for `sv_se` and `tr_tr` — master prefers native, our work made them more English-preferring against master. Consider partial revert.

3. **`de_de` is genuinely mixed** — master uses Wallet+Passphrase+Onchain English but Münzkontrolle/Zahlungscode/Mitsignierer native. Our current overhaul (all English) over-corrects. Selective revert recommended for non-Wallet terms.

4. **nl_nl** direction is correct (master 55% English).

5. **da_dk, sr_RS** sparse data — keep current state but flag for native-speaker review.

## Why grader said "prefers English"

LLM grader trained on broader web data where Bitcoin/crypto content is predominantly English. Bias toward thinking native translation looks "forced" or "over-translated" when master human translators (working actually for the user community) chose native. Grader was wrong.

## Files

- Master files staged at `/tmp/loc-master-bench/<lang>.json`
- En source: `loc/en.json`
- 16 crypto-domain probe keys covering wallet, vault, multisig, coin control, payment code, etc.
