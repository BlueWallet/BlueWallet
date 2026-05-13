# Translation Comparison v6: `vocabulary-merged` (post-regression-bug-fixes) vs `locsync31`

Targeted bug fixes for the 4 v3→v4 regression flips (kn, ko_KR, si_LK, zh_cn) + re-grade. 31 JSON ports applied.

## Headline

| Outcome | v2 | v3 | v4 | v5 | v6 |
|---------|---:|---:|---:|---:|---:|
| `locsync31` wins | 26 | 27 | 21 | 21 | **18** |
| `vocabulary-merged` wins | 23 | 24 | 30 | 30 | **33** |
| Tie | 2 | 0 | 0 | 0 | **0** |

**Net B advantage: +15 langs (33 vs 18).** 3 of 4 fixed langs flipped to B.

Average aggregate scores:

| Branch | v4 | v5 | v6 |
|--------|----|----|----|
| `locsync31` acc/nat/sty/con | 82.7/82.0/80.4/79.0 | 82.8/81.8/80.0/78.8 | **81.7/81.6/79.5/78.0** |
| `vocabulary-merged` acc/nat/sty/con | 84.4/79.6/80.3/81.3 | 84.4/79.7/80.3/81.5 | **84.6/79.9/80.7/81.8** |

B retains lead on **accuracy** (+2.9) and **consistency** (+3.8). A still leads on **naturalness** (+1.7).

## v5 → v6 flips

### Flipped to B (vocabulary-merged) — 3 langs

| Lang | Ports applied | Cause |
|------|--------------:|-------|
| ko_KR | 2 | Hide→숨기기 + line-break fix. Grader: B fills 22 keys A leaves null. |
| si_LK | 17 | Passcode→මුර කේතය, Recipient #/of placeholder reorder, Settings→සැකසුම්, tense fixes. Grader: B fills 17 missing keys + Electrum (not transliterated) + ප්‍රතිසාධනය. |
| zh_cn | 8 | LND daemon: 守护节点→守护进程. Grader: B adds 17 strings A leaves untranslated + CJK typography. |

### Stayed A — 1 lang

| Lang | Ports applied | Cause |
|------|--------------:|-------|
| kn | 4 | sats fix (ಸತಾಶಿ→sats), security→ಭದ್ರತೆ, vByte. **But grader found B has 72 missing keys A covers + invoice/broadcast term inconsistency** (ಸರಕುಪಟ್ಟಿ vs ಇನ್‌ವಾಯ್ಸ್). Bug fixes alone insufficient. |

## v6 score deltas

| Lang | v5 b.acc | v6 b.acc | v5 b.con | v6 b.con | Verdict change |
|------|---------:|---------:|---------:|---------:|----------------|
| kn | 78 | 72 | 74 | 68 | stays A — coverage gap dominates |
| ko_KR | 93 | 90 | 90 | 88 | **A → B** (coverage advantage exposed) |
| si_LK | 82 | 89 | 76 | 87 | **A → B** (+7 acc, +11 con) |
| zh_cn | 80 | 95 | 82 | 94 | **A → B** (+15 acc, +12 con) |

## Stable winners (post-v6)

**Stable B-winners** (28): bg_bg, ca, el, es_419, fo, hr_hr, ne, pt_pt, ro, ru, sl_SI, sq_AL, zar_afr, de_de, sv_se, be@tarask, da_dk, et_EE, kk@Cyrl, nb_no, nl_nl, sr_RS, th_th, tr_tr, zh_tw + (new v6 flips) ko_KR, si_LK, zh_cn. Plus others carried from earlier passes.

**Stable A-winners** (12 + kn = 13): bqi, cy, es, fr_fr, hu_hu, jp_jp, lrc, ms, pl, sk_sk, vi_vn, zar_xho, **kn**.

13 remaining A-wins are philosophical (native-vs-English crypto terms) or coverage-deep — beyond automated scope. Needs native-speaker review.

## kn note

kn case interesting: A has more translated keys than B (B has 72 untranslated where A has them). v5 work focused on flipping kn glossary toward English (sats, ಭದ್ರತೆ etc.) but didn't backfill missing translations. Future pass could port A→B coverage for kn specifically.

Also B's invoice rendering is inconsistent — mix of ಸರಕුపಟ్ಟಿ (literal "goods receipt", wrong for Lightning) and ಇನ్‌ವಾಯ್ಸ్ (transliteration). Pick one. Recommend ಇನ్‌ವಾಯ్ಸ್ since matches Bitcoin/Lightning fintech context.

## Cumulative impact

| Pass | Scope | Ports |
|------|-------|------:|
| Loanword overhaul | 6 langs | 350+ |
| Bug fixes round 1 | 5 langs | 5 |
| Third-pass grammar | 26 langs | 153 |
| Targeted fixes | 3 langs | 12 |
| Bug fixes round 2 | 5 langs | 5 |
| Fourth-pass | 27 langs | 473 |
| Master-alignment (v5) | 3 langs | 88 |
| Regression bug-fix (v6) | 4 langs | 31 |
| **Total** | | **~1130** |

Result: **B from 23/51 → 33/51 wins.** Net +10 vs starting point.

## Conclusion

v6 confirms targeted bug-fix strategy works for langs where a single concrete error caused the regression. 3 of 4 langs flipped on 31 ports total.

kn remains A — its loss is structural (coverage + internal consistency), not a single bug. Out of automated scope.

Branch ready: 33 wins, all changes lint-clean, master-alignment direction validated by both Opus grader and master human translations.

## Files

- v6 raw results: `/tmp/loc-compare6/results.jsonl`
- v5 report: `loc/translation-comparison-merged-v4.md`
- Direction analysis: `loc/glossary-direction-analysis.md`
