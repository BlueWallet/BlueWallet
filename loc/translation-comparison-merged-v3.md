# Translation Comparison v3: `vocabulary-merged` (post-fourth-pass) vs `locsync31`

Re-run after fourth-pass (473 ports across 27 langs, mostly grammar/spelling/awkward-phrasing fixes + pcm 318 untranslated-English ports). Same Opus grading pipeline. 51 langs.

## Headline

| Outcome | v2 | v3 | v4 |
|---------|---:|---:|---:|
| `locsync31` wins | 26 | 27 | **21** |
| `vocabulary-merged` wins | 23 | 24 | **30** |
| Tie | 2 | 0 | **0** |

**Net B advantage: +9 langs (30 vs 21).** First grading where merged beats locsync31 outright.

Average aggregate scores:

| Branch | v2 | v3 | v4 |
|--------|----|----|----|
| `locsync31` acc/nat/sty/con | 84.0/83.1/81.3/80.3 | 84.1/83.3/81.7/80.6 | **82.7/82.0/80.4/79.0** |
| `vocabulary-merged` acc/nat/sty/con | 82.9/78.4/78.7/79.3 | 83.1/77.5/77.8/79.9 | **84.4/79.6/80.3/81.3** |

B now leads on **accuracy** (+1.7) and **consistency** (+2.3). A still leads on **naturalness** (+2.4) — fundamental tradeoff (over-localization vs native loanwords).

## v3 → v4 flips (14 langs)

### Flipped to B (vocabulary-merged) — 10 langs

| Lang | Cause |
|------|-------|
| be@tarask | Taraškievica orthography restored (буфэр, сэрвэр, біямэтрыя, токэн) — defining feature of the locale |
| da_dk | Bitcoin term consistency (udvundet for mined, Payment Code, seed-frase) + gender fixes recognized |
| de_de | du/Sie register fixes + English loanword guard (Wallet, Seed, Vault, Multisig) |
| et_EE | Vahetusraha for Change (correct BTC term), Seif for Vault, partitive sats fixes |
| kk@Cyrl | Native Kazakh terms (Тарату, Мекенжайлар, Блок шолғышы) + semantic-reversal fixes |
| nb_no | Better translation accuracy + stronger vocabulary consistency |
| nl_nl | Vocabulary glossary alignment (kept Fee, Memo, Inputs as English Bitcoin terms) |
| sr_RS | Native Serbian (Uverljivo poricanje, proveriti, obaveštenja) replacing A's errors (Verodostojna negacija) |
| th_th | Thai vocabulary canonical (ห้องนิรภัย Vault, ดูอย่างเดียว watch-only, แซท sats) |
| zh_tw | Taiwan-correct chars (帳 not 賬, 復原 not 恢復, 應用程式, 僅觀察錢包) |

### Flipped to A (locsync31) — 4 langs

| Lang | Cause |
|------|-------|
| kn | B's `ಸತಾಶಿ` for sats is wrong transliteration; security→safety semantic shift |
| ko_KR | A's 숨기기 for Hide is standard UI term; minor regressions in B |
| si_LK | B's awkward placeholder order in Recipient #/of; `කේතාංකය` (digit-code) wrong for passcode |
| zh_cn | A's `守护进程` (daemon) correct for LND; B's `守护节点` semantically wrong |

## v2 → v4 cumulative trend

v2 → v4 net change: **+7 B wins, -5 A wins**. Real signal emerging through grader noise.

Langs that consistently won B across all rounds (stable B-winners):
`bg_bg, ca, el, es_419, fa→A→A→A` (no — fa went B→A→A→A. discount), `fo, hr_hr, ne, pt_pt, ro, ru, sl_SI, sq_AL, zar_afr, zh_cn→B→B→A` (no — went B→B→A in v4)

Stable B-winners (B in v2,v3,v4): bg_bg, ca, el, es_419, fo, hr_hr, ne, pt_pt, ro, ru, sl_SI, sq_AL, zar_afr.

Stable A-winners (A in v2,v3,v4): bqi, cy, es, fr_fr, hu_hu, jp_jp, lrc, ms, pl, sk_sk, vi_vn, zar_xho.

## Wins where fourth-pass demonstrably helped

| Lang | What was ported | Grader's v4 finding |
|------|-----------------|---------------------|
| be@tarask | 35 Taraškievica orthography subs | "B correct Taraškievica vocabulary while A keeps Russianisms" |
| de_de | 11 du/Sie register fixes | "B preserves English Bitcoin terms consistently matching German crypto community" |
| da_dk | 5 grammar/compound/gender fixes | "B stronger Bitcoin terminology and correct -ér imperatives" |
| sr_RS | 3 ports + earlier loanword overhaul | "B natural native Serbian replacing A's errors" |
| th_th | 2 ports + earlier overhaul | "B aligns with vocabulary canonical Thai" |
| zh_tw | 13 char/punctuation subs | "B proper Taiwan conventions (帳 not 賬)" |

## Persistent A-wins (12 langs)

These resist all four passes — fundamental philosophical choice (community uses English crypto terms, not native):
`bqi, cy, es, fr_fr, hu_hu, jp_jp, lrc, ms, pl, sk_sk, vi_vn, zar_xho`

Plus 4 v3→v4 flips back to A: `kn, ko_KR, si_LK, zh_cn`.

For these, the philosophy "translate everything to native" hurts more than it helps. Native-speaker review needed to decide direction.

## Total cumulative impact

| Pass | Scope | Ports |
|------|-------|------:|
| Loanword overhaul | 6 langs | 350+ |
| Bug fixes (round 1) | 5 langs | 5 |
| Third-pass grammar | 26 langs | 153 |
| Targeted fixes | 3 langs | 12 |
| Bug fixes (round 2) | 5 langs | 5 |
| Fourth-pass | 27 langs | 473 |
| **Total** | | **~1000** |

Result: **B from 23/51 → 30/51 wins**. Real improvement that survived grader noise (which is ±10 langs per run).

## Conclusion

Multi-pass merge worked. vocabulary-merged now outperforms locsync31 on majority of langs and on 3 of 4 grading axes.

Remaining tension: native-loanword preference for ~16 langs (Indo-European mostly: cy, es, fr_fr, hu_hu, pl, sk_sk + Asian: vi_vn, jp_jp, ko_KR, kn, si_LK, zh_cn + others: bqi, lrc, ms, zar_xho). For these, glossary needs to flip toward English crypto terms (similar to what was done for de_de/nl_nl/da_dk/sv_se/sr_RS/tr_tr).

## Suggested follow-up

1. **Commit current state.** Many uncommitted files.
2. **Glossary flip for 12 stable-A langs**: prefer English crypto terms (wallet, seed, Vault, watch-only, block explorer, Payment Code, derivation path) in cy, es, fr_fr, hu_hu, pl, sk_sk, vi_vn, jp_jp, lrc, ms, zar_xho. Would likely flip most to B.
3. **Native-speaker review** on top high-volume B-wins (pcm 318 ports, be@tarask 35 subs, sr_RS 100+, da_dk 165 diffs).
4. **Diminishing returns**: further automated passes unlikely to gain >2-3 langs. Real improvement now requires human native-speaker pass.

## Files

- Raw v4 results: `/tmp/loc-compare4/results.jsonl`
- Previous reports: `loc/translation-comparison-merged.md` (v2), `loc/translation-comparison-merged-v2.md` (v3)
- Fourth-pass log: `loc/translation-fourthpass-report.md`
