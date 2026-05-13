# Fourth-pass grammar/style port report

Fourth round of porting from `locsync31` to current working tree, targeting the 27 languages where locsync31 was winning per v3 grading. Threshold ≥90% confidence; terminology excluded; loanword guard for de_de/nl_nl/da_dk/sv_se/sr_RS/tr_tr.

## Headline

| Metric | Value |
|---|---:|
| Langs processed | 27 |
| Total ports applied | **473** |
| TSV-based ports | 402 |
| Substring substitutions | 71 (be@tarask 35, he 23, zh_tw 13) |
| Placeholder mismatches | 0 |
| JSON valid | ✓ all 27 |
| Lint | ✓ pass |

## Per-language breakdown

| Lang | Type | Count | Dominant fix |
|------|------|------:|--------------|
| ar | TSV | 3 | awkward transliteration (أون-تشين→على السلسلة), gender agreement |
| **be@tarask** | subs | **35** | Taraškievica orthography restoration (-э- in foreign loans: сэрвэр, буфэр, біямэтрыя, токэн, згенэрав, разблякаваць) |
| bqi | TSV | 1 | Electrum spelling consistency |
| cy | TSV | 4 | Tâl→Tala imperative, nôd→nod (no circumflex) |
| da_dk | TSV | 5 | broken compound widgets, abbreviation period, en seed gender |
| **de_de** | TSV | **11** | du/Sie register normalization, German typography („ ", –) |
| es | TSV | 0 | no clear bugs |
| et_EE | TSV | 6 | partitive after numeral (satid→sats), spelling (autenditud) |
| fa | TSV | 5 | brand transliteration (Electrum, GitHub stay Latin), awkward calques |
| fi_fi | TSV | 0 | no clear bugs |
| fr_fr | TSV | 0 | no clear bugs |
| **he** | subs | **23** | plural-imperative → masculine-singular UI register (ודאו→ודא, סרקו→סרוק, שלכם→שלך) |
| hu_hu | TSV | 5 | English-plural-glued (sats→sat) after Hungarian numerals |
| jp_jp | TSV | 1 | kanji semantic (書き取り transcribe → 書きとめ jot down) |
| kk@Cyrl | TSV | 6 | semantic reversals (Lightning шоты=account → инвойсы; Хабарландыру=announcement → Хабарлама) |
| **lrc** | TSV | **14** | spelling typos (stray ۏ, اوول→اول), broken fragments (ای میشه, ر ونن) |
| ms | TSV | 9 | Hubungi(call-person) → Hubung(connect-service), affix fixes (Sorok→Sembunyikan) |
| nb_no | TSV | 0 | no clear bugs |
| nl_nl | TSV | 0 | no clear bugs (third-pass already covered) |
| **pcm** | TSV | **318** | massive — current was 57% untranslated English; ported all Pidgin from locsync31 |
| pl | TSV | 0 | no clear bugs (already fixed third-pass) |
| sk_sk | TSV | 2 | Stop→Zastaviť, trailing space restored |
| sr_RS | TSV | 3 | Start/Stop untranslated, broken "od ukupno"→"od ukupnog broja" |
| th_th | TSV | 2 | ask_no semantic (ยัง=not-yet→ไม่=No), MIT License→ใบอนุญาต MIT |
| vi_vn | TSV | 1 | Chèn phí (embed-fee) → Nhập phí (enter-fee) |
| zar_xho | TSV | 6 | Esezantsi(below)→Okuphambili(advanced), concord fixes |
| **zh_tw** | subs | **13** | 賬→帳 (zh_cn→zh_tw character), 更變→變更 (reversed compound), half-width punctuation cleanup |

## Massive change: pcm (318 ports)

Nigerian Pidgin file was ~57% untranslated English. Ported the Pidgin translation for every key where current matched the English source verbatim and locsync31 provided actual Pidgin. Preserved 13 keys where the difference was pure stylistic ("Yes oh", "Add wallet" case-only) per agent's filter.

This is a near-rewrite of the file. Recommend native-speaker spot-check before release.

## Sentinel verification (all intact)

- `loc/ua.json`: `xpub_copiedToClipboard` = "Скопійовано в буфер обміну." ✓
- `loc/sv_se.json`: `preimage` = "Pre-image", `pending` = "Väntande" ✓
- `loc/th_th.json`: `license` = "ใบอนุญาต" ✓
- `loc/vi_vn.json`: broadcast keys = "Truyền" ✓
- `loc/zh_tw.json`: no half-width `,` between CJK; `sort_asc/desc` = 升序/降序 ✓
- `loc/fa.json`: `block_explorer_invalid_custom_url` = `http://...https://...` ✓
- `loc/fa.json`: `copy_payment_code` = "کپی کد پرداخت" ✓
- `loc/da_dk.json`: `list_empty_txs2_lightning` = "...fylde op..." ✓

## Loanword guards (all preserved)

- `da_dk`: wallet/Vault/coins/Pre-image preserved; Danish `transmitter` kept for Broadcast
- `de_de`: Wallet/Vault/Multisig/Payment Code/Block Explorer preserved; only register (du/Sie) and typography touched
- `nl_nl`: 0 ports
- `sr_RS`: Trezor/co-signer/provizija/Iskoristi preserved; only Start/Stop and "od ukupnog broja" fixed
- `sv_se` and `tr_tr` not in fourth-pass scope (won v3 grading)

## Total port history across all four passes

| Pass | Scope | Ports |
|------|-------|------:|
| Loanword overhaul | 6 langs | 350+ |
| Bug fixes | 5 langs | 5 |
| Third-pass | 26 langs | 153 |
| Targeted (vi_vn, nl_nl, fi_fi) | 3 langs | 12 |
| Fourth-pass | 27 langs | **473** |

## Files modified

26 of 27 langs received changes. `loc/pcm.json` got the largest change (318 ports — near-rewrite from English remnants to Pidgin).

## Suggested follow-up

1. **Commit current state** before further changes — many uncommitted files.
2. **Native-speaker spot-check** on pcm (318 ports — large), be@tarask (Taraškievica orthography), he (Hebrew register), zar_xho (concord), th_th (formality).
3. **Re-grade after commit** to measure final delta (optional; expect grader noise ±5-10 langs).
