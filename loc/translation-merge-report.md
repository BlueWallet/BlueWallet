# Translation Merge Report: `vocabulary-merged` branch

Auto-generated. Merges `locsync31` cleanup fixes onto `vocabulary` baseline using per-language Opus subagents.

## Method

- Per-language Opus subagent receives en.json + master + locsync31 + vocabulary + glossary.
- Subagent emits deltas: changes vs vocabulary baseline.
- Decision matrix: glossary side wins unless locsync31 ≥90% confidence; new keys ported if ≥80%.
- Main thread validates: placeholder set per key must match en.json; keys not in en.json rejected.

## Per-language summary

| Lang | Deltas applied | Notes |
|------|---------------:|-------|
| `ar` | 39 | +0 earlier fix |
| `be@tarask` | 2 | +0 earlier fix |
| `bg_bg` | 25 | +1 earlier fix |
| `bqi` | 3 | +2 earlier fix |
| `ca` | 19 |  |
| `cs_cz` | 6 |  |
| `cy` | 11 | +3 earlier fix |
| `da_dk` | 16 |  |
| `de_de` | 69 | +1 earlier fix |
| `el` | 9 |  |
| `es` | 50 |  |
| `es_419` | 37 |  |
| `es_deltas` | 50 |  |
| `et_EE` | 1 |  |
| `fa` | 3 |  |
| `fi_fi` | 43 | +1 earlier fix |
| `fo` | 21 |  |
| `fr_fr` | 116 |  |
| `he` | 14 | +1 earlier fix |
| `hr_hr` | 32 |  |
| `hu_hu` | 98 | +3 earlier fix |
| `id_id` | 17 |  |
| `it` | 13 |  |
| `jp_jp` | 7 |  |
| `kk@Cyrl` | 4 |  |
| `kk@Cyrl_compact` | 533 |  |
| `kn` | 400 |  |
| `ko_KR` | 17 | +1 earlier fix |
| `lrc` | 0 |  |
| `ms` | 7 |  |
| `nb_no` | 19 |  |
| `ne` | 18 |  |
| `nl_nl` | 25 | +1 earlier fix |
| `pcm` | 1 |  |
| `pl` | 13 |  |
| `pt_br` | 19 | +1 earlier fix |
| `pt_pt` | 73 |  |
| `ro` | 28 |  |
| `ru` | 24 | +4 earlier fix |
| `si_LK` | 28 | +1 earlier fix |
| `sk_sk` | 6 |  |
| `sl_SI` | 12 |  |
| `sq_AL` | 111 |  |
| `sr_RS` | 0 |  |
| `sv_se` | 35 |  |
| `th_th` | 11 |  |
| `tr_tr` | 27 | +1 earlier fix |
| `ua` | 32 | +1 earlier fix |
| `vi_vn` | 28 | +3 earlier fix |
| `zar_afr` | 25 |  |
| `zar_xho` | 36 |  |
| `zh_cn` | 7 | +1 earlier fix |
| `zh_tw` | 37 |  |

**Total deltas applied: 2277** across 51 languages.
**Earlier cleanup baseline: 26 fixes** already in vocabulary baseline from prior turn.

## Validation

- All 51 `loc/*.json` files parse as valid JSON.
- Zero placeholder mismatches (every delta value preserves the en.json placeholder set).
- Zero new keys outside en.json introduced.
- 49 files modified vs vocabulary baseline (sr_RS and lrc retained vocabulary as-is).
- ~1700 strings improved per `git diff vocabulary..vocabulary-merged --stat`.

## Pre-existing orphan keys

182 keys exist in lang files but not in en.json. These are **inherited from master** (not introduced by this merge). Cleanup task for a separate PR — would require deletion across many files.

## Languages with most fixes

| Lang | Deltas |
|------|-------:|
| `kk@Cyrl_compact` | 533 |
| `kn` | 400 |
| `fr_fr` | 116 |
| `sq_AL` | 111 |
| `hu_hu` | 98 |
| `pt_pt` | 73 |
| `de_de` | 69 |
| `es` | 50 |
| `es_deltas` | 50 |
| `fi_fi` | 43 |
| `ar` | 39 |
| `es_419` | 37 |
| `zh_tw` | 37 |
| `zar_xho` | 36 |
| `sv_se` | 35 |

## Languages with no/few changes

| Lang | Deltas | Reason |
|------|-------:|--------|
| `cs_cz` | 6 |  |
| `sk_sk` | 6 |  |
| `kk@Cyrl` | 4 | vocabulary already strong |
| `bqi` | 3 | vocabulary already strong |
| `fa` | 3 | vocabulary already strong |
| `be@tarask` | 2 | vocabulary already strong |
| `et_EE` | 1 | vocabulary already strong |
| `pcm` | 1 | vocabulary already strong |
| `lrc` | 0 | deferred — vocabulary sparse, mass C-port risky |
| `sr_RS` | 0 | vocabulary already aligned with glossary; locsync31 diverged |

## Recommended next steps

1. Review this branch: `git diff vocabulary..vocabulary-merged loc/`
2. Native-speaker spot-check on languages with most ports (sq_AL 111, hu_hu 98, fr_fr 116, pt_pt 73, de_de 69).
3. Run `npm run lint` and `npm run unit` before merging.
4. Visual QA on device for long strings (Russian, German, Vietnamese tend to over-run UI budgets).
5. Consider followup PR to delete the 182 orphan keys not in en.json.
6. Merge into master.