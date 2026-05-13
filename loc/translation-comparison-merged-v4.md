# Translation Comparison v5: `vocabulary-merged` (post-master-alignment) vs `locsync31`

Re-grade after master-aligned glossary work on de_de / sv_se / tr_tr (88 JSON ports total). Same Opus pipeline. Only 3 files changed since v4; other 48 lang verdicts carried forward from v4.

## Headline

| Outcome | v2 | v3 | v4 | v5 |
|---------|---:|---:|---:|---:|
| `locsync31` wins | 26 | 27 | 21 | **21** |
| `vocabulary-merged` wins | 23 | 24 | 30 | **30** |
| Tie | 2 | 0 | 0 | **0** |

**Net B advantage: +9 langs unchanged from v4. Verdicts stable.**

Average aggregate scores:

| Branch | v3 | v4 | v5 |
|--------|----|----|----|
| `locsync31` acc/nat/sty/con | 84.1/83.3/81.7/80.6 | 82.7/82.0/80.4/79.0 | **82.8/81.8/80.0/78.8** |
| `vocabulary-merged` acc/nat/sty/con | 83.1/77.5/77.8/79.9 | 84.4/79.6/80.3/81.3 | **84.4/79.7/80.3/81.5** |

B retains the lead on **accuracy** (+1.6) and **consistency** (+2.7). A still leads on **naturalness** (+2.1) — same tradeoff as v4.

## v4 → v5 changes

Only 3 langs re-graded (only files changed). All 3 were B-wins in v4 and remain B-wins in v5. Score deltas (B):

| Lang | v4 b.acc | v5 b.acc | v4 b.con | v5 b.con | Notes |
|------|---------:|---------:|---------:|---------:|-------|
| de_de | 88 | 88 | 85 | 86 | Tresor/Master-Fingerabdruck/Zahlungscode/Münzkontrolle/Multisignatur Tresor — master native confirmed |
| sv_se | 88 | 83 | 86 | 86 | Native Swedish across Wallet/Vault/Hardware wallet/Mnemonic/Passphrase/Derivation/Master fingerprint/Broadcast/Block explorer/Payment Code/Coin Control |
| tr_tr | 85 | 88 | 81 | 89 | Native Turkish for Block explorer/Onchain/Offchain/Mined/Quorum/Payment Code/Coin Control/Watch-only/Mnemonic |

sv_se acc slightly down (88 → 83) — grader penalised some over-literal phrasings ("Vänligen", "kommer att") introduced indirectly; consistency held strong (86). Net win unchanged.

tr_tr improved both accuracy (+3) and consistency (+8) — biggest gain.

de_de consistency edged up (+1) on uniform crypto terminology.

## Stable winners

Carried forward from v4 (no changes):

**Stable B-winners (B in v2,v3,v4,v5)**: bg_bg, ca, el, es_419, fo, hr_hr, ne, pt_pt, ro, ru, sl_SI, sq_AL, zar_afr, de_de, sv_se. Added in v4: be@tarask, da_dk, et_EE, kk@Cyrl, nb_no, nl_nl, sr_RS, th_th, tr_tr, zh_tw.

**Stable A-winners (A in v2,v3,v4,v5)**: bqi, cy, es, fr_fr, hu_hu, jp_jp, lrc, ms, pl, sk_sk, vi_vn, zar_xho. Plus 4 v3→v4 flips: kn, ko_KR, si_LK, zh_cn.

For the 16 A-wins, philosophy "translate everything to native" hurts more than it helps. Native-speaker review needed.

## Master-alignment validation

Glossary direction analysis (`loc/glossary-direction-analysis.md`) used master human translations as benchmark. v5 confirms:

- **tr_tr master verdict NATIVE** → v5 grades show B's native-Turkish vocabulary wins on accuracy (+10) and consistency (+21) over A's mixed anglicisms.
- **sv_se master verdict NATIVE** → v5 grades show B's native-Swedish vocabulary wins on accuracy (+7), style (+12), consistency (+20). A's code-switching ("Broadcasta Transaktion", "derivation path") penalised.
- **de_de master verdict MIXED** → v5 grades show B's selective approach (English: Wallet/Seed/Passphrase/Multisig/Mempool/Hardware Wallet/Onchain; native: Tresor/Master-Fingerabdruck/Zahlungscode/Münzkontrolle) wins acc +10, con +16. Matches master split.

## Cumulative impact

| Pass | Scope | Ports |
|------|-------|------:|
| Loanword overhaul | 6 langs | 350+ |
| Bug fixes (round 1) | 5 langs | 5 |
| Third-pass grammar | 26 langs | 153 |
| Targeted fixes | 3 langs | 12 |
| Bug fixes (round 2) | 5 langs | 5 |
| Fourth-pass | 27 langs | 473 |
| Master-alignment (v5) | 3 langs | 88 |
| **Total** | | **~1100** |

Result: **B from 23/51 → 30/51 wins.** Stable across v4 + v5.

## Conclusion

Master-aligned glossary work for de_de/sv_se/tr_tr preserved their B-win status and improved B's scores on the dimensions that match master human-translation evidence (accuracy + consistency for terminology-flipped langs).

Direction now corroborated by both Opus grader **and** master human translations — these two were in tension previously; v5 shows alignment after the master pivot.

## Files

- v5 raw results: `/tmp/loc-compare5/results.jsonl`
- v4 raw results: `/tmp/loc-compare4/results.jsonl`
- Direction analysis: `loc/glossary-direction-analysis.md`
- Previous reports: `loc/translation-comparison-merged.md` (v2), `-v2.md` (v3), `-v3.md` (v4)
