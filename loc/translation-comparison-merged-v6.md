# Translation Comparison v7: `vocabulary-merged` (post-leftover-cleanup + retranslation) vs `locsync31`

Re-grade after major coverage pass: scripts/find-english-leftovers.js wired into lint (360 stale-English keys removed) + 1480 missing keys retranslated across 48 langs by Opus subagents, then 16 selective ports from locsync31. 41 langs touched since v5.

## Headline

| Outcome | v2 | v3 | v4 | v5 | v6 | v7 |
|---------|---:|---:|---:|---:|---:|---:|
| `locsync31` wins | 26 | 27 | 21 | 21 | 18 | **3** |
| `vocabulary-merged` wins | 23 | 24 | 30 | 30 | 33 | **48** |
| Tie | 2 | 0 | 0 | 0 | 0 | **0** |

**Net B advantage: +45 langs (48 vs 3).** Decisive sweep.

Average aggregate scores:

| Branch | v5 | v6 | v7 |
|--------|----|----|----|
| `locsync31` acc/nat/sty/con | 82.8/81.8/80.0/78.8 | 81.7/81.6/79.5/78.0 | **84.0/84.2/82.0/78.1** |
| `vocabulary-merged` acc/nat/sty/con | 84.4/79.7/80.3/81.5 | 84.6/79.9/80.7/81.8 | **88.1/85.6/85.5/87.2** |

B now leads on **all 4 axes**: acc (+4.1), nat (+1.4), sty (+3.5), con (+9.1). First time B leads naturalness.

## v6 → v7 flips (15 langs A→B)

All 15 langs that were A-winners in v6 flipped to B in v7, driven by coverage gains from retranslation pass:

| Lang | v6 b.acc | v7 b.acc | Cause |
|------|---------:|---------:|-------|
| bqi | 78 | 85 | +271 keys filled, native Preimage/Payment code |
| cy | — | 88 | +5 keys, native Cynddelw for preimage |
| es | 87 | 90 | +24 keys filled, native Preimagen |
| fr_fr | 87 | 86 | +34 keys (some natural-loss but coverage wins) |
| hu_hu | 85 | 87 | +19 keys, standard mnemonikus kifejezés |
| jp_jp | 89 | 89 | +17 keys (near-tied, coverage breaks tie) |
| kn | — | 87 | +83 keys, native ಪ್ರಸಾರ/ಸರಕುಪಟ್ಟಿ |
| lrc | 82 | 85 | +220 keys, glossary refactor |
| ms | 83 | 88 | +21 keys, Kod Pembayaran consistent |
| pl | 88 | 92 | +28 keys |
| sk_sk | 78 | 91 | Change semantic bug fix (Zmeniť→Drobné) + 22 keys |
| vi_vn | 86 | 89 | +13 keys, native mã thanh toán |
| zar_xho | 82 | 87 | +21 keys, whole missing sections |

## Remaining 3 A-winners

- **ar**: not retranslated this pass (no missing keys in v5 baseline). v5 verdict kept.
- **fa**: not retranslated. v5 verdict kept. Earlier RTL bug fixed (//:http → http://).
- **pcm**: Pidgin English; excluded from leftover cleanup (LANG_EXCEPTIONS — English-derived language).

For ar/fa, future pass could re-grade after master-aligned glossary work.

## Score axis drivers

- **Consistency +9.1**: Master-aligned glossaries + leftover cleanup forced terminology unification. Many "scattered translations" became "one term per concept".
- **Style +3.5**: Sentence-case normalization (lowercase per-locale conventions), proper diacritics restored (Faroese, Welsh, etc.), CJK typography.
- **Accuracy +4.1**: Missing keys filled with glossary-correct translations vs A's null/English fallbacks.
- **Naturalness +1.4**: B now beats A here too. Master-aligned native crypto vocabulary preferred over A's English code-switching.

## Cumulative impact

| Pass | Scope | Ports/keys |
|------|-------|----------:|
| Loanword overhaul | 6 langs | 350+ |
| Bug fixes round 1 | 5 langs | 5 |
| Third-pass grammar | 26 langs | 153 |
| Targeted fixes | 3 langs | 12 |
| Bug fixes round 2 | 5 langs | 5 |
| Fourth-pass | 27 langs | 473 |
| Master-alignment (v5) | 3 langs | 88 |
| Regression bug-fix (v6) | 4 langs | 31 |
| Leftover cleanup (v7) | 45 langs | 360 removed |
| Retranslation (v7) | 48 langs | 1480 filled |
| Selective locsync31 ports (v7) | 6 langs | 16 |
| **Total** | | **~3000 changes** |

Result: **B from 23/51 → 48/51 wins.** Net +25 vs starting point.

## Conclusion

Re-grade confirms scripts/find-english-leftovers.js + retranslation pass was the decisive change. Removing stale-English keys forced explicit translation decisions; Opus subagents filled them per master-aligned glossaries; selective locsync31 ports added grammar polish where locsync31 was demonstrably better.

B now leads on all 4 axes. Branch ready for review/merge.

## Files

- v7 raw results: `/tmp/loc-compare7/results.jsonl`
- v6 report: `loc/translation-comparison-merged-v5.md`
- Direction analysis: `loc/glossary-direction-analysis.md`
- Scripts: `scripts/clean-empty-loc-strings.js`, `scripts/find-english-leftovers.js`
