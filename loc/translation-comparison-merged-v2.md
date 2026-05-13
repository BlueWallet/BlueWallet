# Translation Comparison v2: `vocabulary-merged` (post-third-pass) vs `locsync31`

Re-run of the grading pipeline after applying:
- Loanword overhaul on de_de / nl_nl / da_dk / sv_se / sr_RS / tr_tr (Phase 2)
- Bug fixes on ua / sv_se / th_th / vi_vn / zh_tw (Phase 3)
- Third-pass grammar/style ports on 26 locsync31-winning langs (165 ports applied)

Same Opus subagent pipeline as previous grading. 51 langs, glossary files excluded from grading.

## Headline

| Outcome | v2 (prior) | v3 (this round) | Δ |
|---------|-----------:|----------------:|--:|
| `locsync31` wins | 26 | **27** | +1 |
| `vocabulary-merged` wins | 23 | **24** | +1 |
| Tie | 2 | **0** | -2 |

Average aggregate scores (acc / nat / sty / con):

| Branch | v2 | v3 |
|--------|----|----|
| `locsync31` | 84.0 / 83.1 / 81.3 / 80.3 | 84.1 / 83.3 / 81.7 / 80.6 |
| `vocabulary-merged` | 82.9 / 78.4 / 78.7 / 79.3 | 83.1 / 77.5 / 77.8 / 79.9 |

**Net effect of third-pass + bug-fixes + loanword overhaul: marginal — gap closed slightly on acc/con, widened on nat/sty.** Both ties resolved (cs_cz → B, fi_fi → A).

## v2 → v3 flips (20 of 51 langs flipped winners)

This shows the grader is **noisier than the actual translation changes**. Of 20 flips, half went each way — most flips reflect grader variance rather than real quality movement.

### Flipped to B (vocabulary-merged) — 10 langs

| Lang | v2 → v3 | Likely cause |
|------|---------|--------------|
| cs_cz | tie → B | Resolved tie; B's minor stylistic edge counted (Přetažením changes order) |
| id_id | A → B | B's native Indonesian terminology recognized as more consistent |
| it | A → B | B's coverage (660 vs 621 keys) outweighed naturalness |
| kn | A → B | B's natural Kannada (ಸರಕುಪಟ್ಟಿ, ಪ್ರಸಾರ) over English transliterations |
| ko_KR | A → B | B's coverage (+22 keys) flipped the verdict |
| pt_br | A → B | B's UI imperatives (Arraste, Insira) recognized as more natural |
| si_LK | A → B | B's consistent terminology + typography (Electrum, em-dash spacing) |
| sv_se | A → B | **Loanword overhaul worked** — Vault/Coin Control/Master Fingerprint kept English |
| tr_tr | A → B | **Loanword overhaul worked** — mnemonic/multisig/Quorum kept English |
| ua | A → B | **Third-pass fixes worked** — Зкопіювано typo, Continuity translated, quote style |

### Flipped to A (locsync31) — 10 langs

| Lang | v2 → v3 | Likely cause |
|------|---------|--------------|
| ar | B → A | Grader now penalizes B's transliterations (أون-تشين) and calques |
| cy | B → A | Grader now penalizes B's bare verbnouns and mixed register |
| fa | B → A | Grader now penalizes B's `رونویسی` (transcribe-wrong for Copy) + RTL bug `//:http` |
| fi_fi | tie → A | B's co-signer term inconsistency (allekirjoittaja vs osa-allekirjoittaja) |
| he | B → A | Grader prefers concise masculine singular standard for Hebrew mobile UI |
| kk@Cyrl | B → A | B only covers 110 of 646 keys; semantic errors (Lightning шоты = account) |
| pcm | B → A | B is mostly English passthrough; A actually translates to Pidgin |
| sk_sk | B → A | B over-translates established Bitcoin English terms |
| th_th | B → A | B's formal ท่าน (95x) over-formalized — government-style not consumer-app |
| zh_tw | B → A | B over-translates crypto terms (支付代碼, 推導路徑) + xpub regression |

### Held by B — 14 langs

bg_bg, ca, el, es_419, fo, hr_hr, ne, pt_pt, ro, ru, sl_SI, sq_AL, zar_afr, zh_cn

### Held by A — 17 langs

be@tarask, bqi, da_dk, de_de, es, et_EE, fr_fr, hu_hu, jp_jp, lrc, ms, nb_no, nl_nl, pl, sr_RS, vi_vn, zar_xho

## Wins where third-pass demonstrably helped

| Lang | What was ported | Grader's v3 finding |
|------|-----------------|---------------------|
| sv_se | Block Explorer, Coin Control, Multisig Vault loanwords kept | "B preserves canonical Bitcoin/LN terminology" |
| tr_tr | mnemonic, Quorum, Block Explorer kept English | "B preserves crypto terminology consistently matching how Turkish Bitcoin community uses these terms" |
| ua | Continuity → Безперервність; Зкопіювано typo; «» quotes | "B translates fully and uses proper Ukrainian terminology" |
| cs_cz | (no ports — already tied; grader settled on B) | "B more idiomatic Czech, instrumental construction" |

## Losses where third-pass did not help / regressed

| Lang | Third-pass change | Grader's v3 finding |
|------|------|------|
| da_dk | 7 capitalization + spelling fixes ported | Still loses on "venligst" overuse + "opfylde" meaning error (these are vocabulary-side, not in third-pass scope) |
| de_de | 18 Wallet-gender + typography fixes ported | Still loses on du/Sie register inconsistency — third-pass didn't touch register |
| fa | 0 third-pass ports (fa wasn't in 26-list) | Grader newly flagged RTL bug `//:http` + calques |
| zh_tw | half-width punctuation fixed | Grader newly flagged 升冪/降冪 mismapping + xpub regression in unrelated key |

## Patterns observed

### Where vocabulary-merged genuinely won
- **Sparse-master langs** (ca, cy, el, fa, hr_hr, sq_AL, kk@Cyrl, bg_bg, ne, pt_pt, ro, sl_SI, zar_afr): glossary-driven additions had no pre-existing crypto idiom to displace, so merged file is uniformly localized.
- **Communities prefer native crypto terms**: sv_se (after overhaul), tr_tr (after overhaul), id_id, kn, ko_KR, ne — full localization rewarded.

### Where locsync31 wins persist
- **English-loanword crypto communities**: da_dk, de_de, nl_nl, sk_sk, sr_RS, zh_tw, vi_vn — over-translation reads forced.
- **Native-idiom dense langs**: lrc, zar_xho, hu_hu, it (partial), jp_jp, fr_fr — locsync31 has richer native phrasing.
- **Register/formality issues**: th_th (ท่าน vs คุณ), he (singular vs plural) — vocabulary-merged picked wrong register.

## Grader noise is real

20 of 51 langs flipped winners between v2 and v3 — despite v3 being v2 + ~165 small ports + 0 ports on most flipped langs. The grader's verdict on the same files is noisy ±5-10 langs.

Conclusion: **a single grading run is not authoritative**. The 23-27 split is essentially within grader noise. The real translation quality moved less than the verdicts suggest.

## Suggested follow-up

1. **Don't chase further grader runs.** Output is in steady state; remaining wins are about real translation philosophy (English loanwords vs native), not bugs.
2. **Real action items** (concrete bugs from v3 that aren't grader-noise):
   - `fa`: `//:http` RTL bug — investigate
   - `fa`: `رونویسی` for Copy → revert to `کپی` (transcribe vs copy)
   - `zh_tw`: 升冪/降冪 for ascending/descending sort — should be 升序/降序
   - `zh_tw`: `xpub_copiedToClipboard` regression "貼上板" → "剪貼簿"
   - `da_dk`: `opfylde din saldo` (= fulfill balance) → `fyld op` (top up)
   - `de_de`: du/Sie register sweep — pick one and apply throughout
3. **Native-speaker review** on top-3 weakest B-langs: zar_xho (309 diffs), zh_tw (150), th_th (219).
4. **Commit current state** before further changes. ~50 files in working tree.

## Files

- Raw results: `/tmp/loc-compare3/results.jsonl`
- Previous round: `loc/translation-comparison-merged.md`
- Third-pass ports report: `loc/translation-thirdpass-report.md`
