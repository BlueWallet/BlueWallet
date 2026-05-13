# Translation Comparison: `vocabulary-merged` vs `locsync31`

Re-run of the original quality grading, this time pitting the **merged** branch (`vocabulary` cleanup + `locsync31` ports + glossary terms) against `locsync31` alone. 51 languages graded by one Opus subagent each. Glossary files (`loc/vocabulary/<lang>.md`) intentionally excluded from grading to avoid bias.

Grading axes (0-100): **acc** = accuracy vs en.json source, **nat** = naturalness, **sty** = stylistic consistency, **con** = terminology consistency. Only keys present in BOTH variants compared.

## Headline

| Outcome | Count |
|---------|-------|
| `locsync31` wins | **26** |
| `vocabulary-merged` wins | **23** |
| Tie | **2** |

Average aggregate scores:

| Branch | acc | nat | sty | con |
|--------|-----|-----|-----|-----|
| `locsync31` | 84.0 | 83.1 | 81.3 | 80.3 |
| `vocabulary-merged` | 82.9 | 78.4 | 78.7 | 79.3 |

Compared to the **previous** grading (vocabulary vs locsync31): vocabulary won only ~5/49. After the merge: **vocabulary-merged wins 23/51** — closing the gap from ~10% to ~45% of languages. The merge captured most of locsync31's cleanup value while preserving the glossary-driven additions. The remaining gap is concentrated in languages where locsync31 (a) preserves English crypto terms the community uses (de_de, sv_se, sr_RS, vi_vn, tr_tr) or (b) had vastly more native-idiom coverage that vocabulary-merged couldn't fully match (lrc, zar_xho, hu_hu).

## Biggest margins

`vocabulary-merged` wins by widest margin:

| Lang | Margin (sum of axes) | Why |
|------|---------------------:|-----|
| `sq_AL` | +58 | B localizes loanwords; A keeps English + Title Case |
| `kk@Cyrl` | +57 | B fuller Kazakh coverage; A leaves Russian loans |
| `bg_bg` | +55 | B consistent Bulgarian; A has English fragments |
| `el` | +41 | B uses fuller Greek terminology (vault, seed, server) |
| `ca` | +31 | B uniform vós register, watch-only = només lectura |

`locsync31` wins by widest margin:

| Lang | Margin | Why |
|------|-------:|-----|
| `lrc` | +98 | A native idiomatic; B sparse, English remnants |
| `zar_xho` | +73 | A native isiXhosa throughout; B leaves English |
| `hu_hu` | +61 | A concise idiomatic; B mistranslates recipient as beneficiary |
| `it` | +57 | A natural Italian register; B literal calques |
| `vi_vn` | +55 | A idiomatic crypto Vietnamese; B literally translates broadcast/seed (radio/grain) |

## Full table

| Lang | Winner | A acc/nat/sty/con | B acc/nat/sty/con | Diffs | Note |
|------|--------|------------------:|------------------:|------:|------|
| ar | vocabulary-merged | 82/84/83/78 | 86/85/85/84 | 60 | B more complete (preimage = صورة أولية) |
| be@tarask | locsync31 | 88/86/87/88 | 82/78/76/72 | 120 | A idiomatic Taraškievica (трансакцыя, рахунак) |
| bg_bg | vocabulary-merged | 78/74/70/68 | 86/86/85/88 | 180 | B fewer English fragments, natural flow |
| bqi | locsync31 | 86/84/85/86 | 78/80/78/72 | 95 | A broader idiomatic; B sparse |
| ca | vocabulary-merged | 84/82/78/74 | 90/86/85/88 | 180 | B uniform vós register |
| cs_cz | tie | 90/88/87/88 | 90/88/87/88 | 4 | Virtually identical |
| cy | vocabulary-merged | 80/82/80/75 | 86/84/84/85 | 180 | B = Claddgell, Cod Taliad, Aml-lofnod |
| da_dk | locsync31 | 87/86/85/84 | 82/72/70/68 | 180 | Danes expect English crypto terms |
| de_de | locsync31 | 88/87/88/89 | 82/78/76/70 | 60 | A informal du, feminine Wallet, standard terms |
| el | vocabulary-merged | 78/75/70/68 | 86/82/80/84 | 120 | B fuller Greek (vault, seed, server) |
| es | locsync31 | 86/88/87/83 | 84/76/74/72 | 100 | A concise; B over-uses 'por favor' |
| es_419 | vocabulary-merged | 92/90/90/92 | 93/92/92/93 | 3 | Nearly identical; B +26 keys |
| et_EE | locsync31 | 88/87/86/82 | 82/70/74/80 | 258 | A correct partitive (sats/satsi) |
| fa | vocabulary-merged | 84/80/74/68 | 88/76/82/88 | 111 | B systematic glossary (co-signer = هم‌امضاکننده) |
| fi_fi | tie | 86/85/84/82 | 85/80/81/78 | 36 | Trade-offs balance |
| fo | vocabulary-merged | 80/78/76/70 | 84/76/78/86 | 15 | B fixes virkt/virkja inconsistency |
| fr_fr | locsync31 | 88/87/85/86 | 82/74/76/80 | 11 | A = boostée, Hors chaîne |
| he | vocabulary-merged | 84/78/76/86 | 82/86/85/80 | 18 | B plural imperatives, fluent |
| hr_hr | vocabulary-merged | 82/80/78/72 | 86/81/83/88 | 257 | B = sigurnosna fraza vs A keeps seed |
| hu_hu | locsync31 | 84/86/88/85 | 70/74/70/68 | 131 | B mistranslates recipient as kedvezményezett |
| id_id | locsync31 | 84/82/76/70 | 89/78/82/88 | 80 | A more idiomatic dompet vs B wallet |
| it | locsync31 | 90/92/91/88 | 82/70/72/80 | 110 | A natural Italian; B literal calques |
| jp_jp | locsync31 | 90/86/86/88 | 78/84/80/80 | 95 | A standard ウォレット; B mixed kanji |
| kk@Cyrl | vocabulary-merged | 72/68/65/75 | 86/85/84/82 | 140 | B fuller Kazakh; A Russian loans |
| kn | locsync31 | 86/78/80/82 | 72/80/76/74 | 60 | A more accurate Kannada |
| ko_KR | locsync31 | 92/90/88/90 | 90/84/85/86 | 40 | A slightly more polished register |
| lrc | locsync31 | 84/88/90/87 | 78/58/55/60 | 216 | A native; B sparse English remnants |
| ms | locsync31 | 86/84/82/83 | 78/70/72/68 | 90 | A idiomatic Malay; B literal |
| nb_no | locsync31 | 82/88/85/78 | 84/68/70/82 | 70 | A natural Bokmål; B awkward calques |
| ne | vocabulary-merged | 80/78/72/74 | 84/76/80/80 | 85 | B more consistent Nepali terminology |
| nl_nl | locsync31 | 88/87/86/84 | 85/72/70/68 | 80 | A polished Dutch; B over-translates wallet |
| pcm | vocabulary-merged | 68/78/62/65 | 82/62/78/72 | 501 | A Pidgin filler-heavy; B closer to source |
| pl | locsync31 | 92/88/88/88 | 82/78/80/82 | 2 | Only 2 diffs; A keeps Preimage |
| pt_br | locsync31 | 90/88/89/89 | 84/83/80/82 | 13 | A concise; B awkward inválida gender |
| pt_pt | vocabulary-merged | 86/83/82/80 | 90/87/86/84 | 14 | B = Cofre, multiassinatura, aplicações |
| ro | vocabulary-merged | 86/80/80/78 | 88/87/87/86 | 89 | B = doar citire, Preimagine, Partajează |
| ru | vocabulary-merged | 85/88/87/86 | 90/89/88/84 | 5 | B closer to EN; A keeps Identity Pubkey raw |
| si_LK | locsync31 | 86/85/86/88 | 83/82/80/78 | 104 | A more consistent; B keeps Electrum/Blue |
| sk_sk | vocabulary-merged | 72/82/74/68 | 80/74/80/85 | 206 | B = Drobné (correct); A = Zmeniť (wrong) |
| sl_SI | vocabulary-merged | 80/81/76/74 | 85/82/83/83 | 102 | B fixes orthography (sopodpisnik) |
| sq_AL | vocabulary-merged | 74/68/66/64 | 80/83/85/82 | 246 | B localizes; A keeps English + Title Case |
| sr_RS | locsync31 | 85/82/83/84 | 74/75/72/70 | 279 | A keeps Trezor/provizija/backup |
| sv_se | locsync31 | 86/85/84/83 | 78/72/71/74 | 96 | A idiomatic; B = Förbild/Pågående awkward |
| th_th | vocabulary-merged | 82/83/72/62 | 79/74/80/88 | 220 | B consistent formal ท่าน; A mixed casual |
| tr_tr | locsync31 | 86/83/82/85 | 80/76/78/72 | 169 | A keeps English crypto terms |
| ua | locsync31 | 86/82/85/88 | 78/85/80/74 | 259 | A terser, consistent; B has misspell Зкопіювано |
| vi_vn | locsync31 | 90/91/90/88 | 78/72/74/80 | 115 | A = Truyền; B = Phát sóng (radio-broadcast wrong) |
| zar_afr | vocabulary-merged | 72/74/71/70 | 76/77/78/80 | 208 | B = Pasgemaak (correct); A = Persoonlik (wrong) |
| zar_xho | locsync31 | 86/88/85/86 | 78/62/64/68 | 387 | A native isiXhosa; B = anglicisms |
| zh_cn | vocabulary-merged | 86/87/86/85 | 90/86/85/88 | 8 | B preserves node=节点 semantics |
| zh_tw | vocabulary-merged | 78/72/78/80 | 84/82/80/72 | 160 | B native zh_tw terms; A keeps English |

## Patterns

### Where the merge helped most
- **Sparse master / new translation work**: ca, cy, el, fa, hr_hr, sq_AL, kk@Cyrl, bg_bg. Glossary-driven additions had no pre-existing crypto idiom to displace, so the merged file is uniformly localized.
- **Orthographic fixes**: sl_SI (sopodpisnik), zar_afr (Pasgemaak), sk_sk (Drobné). The merge corrected actual word-meaning bugs.
- **Plural imperatives / register**: he (modern plural), th_th (formal ท่าน consistency).

### Where locsync31 still wins
- **Established English crypto vocabulary**: de_de, sv_se, nl_nl, da_dk, fr_fr, sr_RS, tr_tr, vi_vn. Local crypto communities use the English terms; B's over-translation reads forced.
- **Native-idiom dense languages**: lrc, zar_xho, hu_hu, it, jp_jp. Locsync31 had richer native phrasing the merge didn't fully port (confidence threshold rejected many borderline cases).
- **Tiny diffs, A subtly better**: pl (2 diffs, A keeps Preimage), pt_br (13 diffs, A concise), ru-leaning cases.

### Persistent issues flagged in B (vocabulary-merged)
- `ua`: misspelled `Зкопіювано` (should be `Скопійовано`) — fix recommended.
- `sv_se`: `Förbild` for pre-image, `Pågående` for Pending — questionable lexical choices.
- `th_th`: `License` → `ลิขสิทธิ์` (copyright) — wrong noun.
- `zar_afr`: `Vernietig` for delete (too strong = destroy), `Knoop` for node (literal = knot).
- `sq_AL`: `Rate` → `Norma`, `Electrum` → `Elektrum` (product name should not be translated).
- `vi_vn`: B regression — `Phát sóng` for broadcast (radio sense, wrong domain).
- `zh_tw`: half-width comma/parens leaked from English source — typography inconsistency.

## Suggested follow-up

1. Fix concrete bugs in `vocabulary-merged` listed above (15-20 keys total — quick win).
2. For top-5 A-margin languages (lrc, zar_xho, hu_hu, it, vi_vn), consider re-merging with relaxed confidence threshold (~70%) to pull more locsync31 cleanup; native-speaker review before commit.
3. For "English-loanword-friendly" langs (de_de, nl_nl, da_dk, sv_se, sr_RS, tr_tr), the glossary itself probably needs to **prefer English borrowings** for crypto-specific terms (wallet, seed, watch-only, block explorer). Current glossary forces over-translation.
4. Native-speaker spot-check of the 23 B-wins to validate they aren't overly optimistic.
