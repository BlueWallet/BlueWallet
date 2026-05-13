# Third-pass grammar/style port report

Targeted port from `locsync31` reference into current working tree, only for the 26 languages where locsync31 outscored `vocabulary-merged` in the second-round grading. Threshold ≥90% confidence; terminology excluded; loanword guard for de_de / nl_nl / da_dk / sv_se / sr_RS / tr_tr.

## Headline

- **153 ports applied** across 26 languages (154 proposed, 1 skipped by current-value mismatch — vi_vn `multisig.ms_help_3` had drifted from staged baseline).
- 0 placeholder mismatches.
- 0 loanword-guard blocks (guards informed subagent prompts upfront; subagents already filtered).
- All JSON files parse, lint passes (tslint + unused-loc + eslint).
- All sentinel bug fixes intact (ua Скопійовано, sv_se Pre-image/Väntande, th_th ใบอนุญาต, vi_vn Truyền, zh_tw full-width punctuation).

## Per-language port counts

| Lang | Ports | Dominant fix type |
|------|------:|-------------------|
| be@tarask | 0 | (all diffs were terminology/orthographic preference) |
| bqi | 0 | (all diffs were script-style preference + broken ref) |
| da_dk | 7 | capitalization (UI labels), gender (det/den), spelling (modtageradresse) |
| de_de | 18 | German Wallet gender (die Wallet), typography quotes „ ", missing comma |
| es | 2 | exchange rate ("tipo de cambio"), personal "a" before human DO |
| et_EE | 1 | stray trailing period |
| fr_fr | 0 | (all diffs were synonym/terminology) |
| hu_hu | 4 | semantic reversal: kedvezményezett (beneficiary) → címzett (recipient) |
| id_id | 2 | "di mana" Anglicism → "tempat"; passive form for transitive verb |
| it | 0 | (all diffs were verbosity/stylistic) |
| jp_jp | 4 | untranslated English fragments (Built with the awesome, From:, To:, Derivation path) |
| kn | 4 | transliteration fix (path: ಪಾತ್→ಪಾಥ್), broken compound (ಸೂಚನೆ→ಸೂಚನಾ) |
| ko_KR | 0 | (all diffs were synonym) |
| lrc | 6 | English remnants, spelling, broken compounds |
| ms | 0 | (real grammar fixes bundled with terminology changes — couldn't isolate) |
| nb_no | 0 | (all diffs were terminology/synonym) |
| nl_nl | 0 | (all diffs were terminology/typography, blocked by guard or low-confidence) |
| pl | 1 | "policy" (uninflected English) → "zasad (policy)" — case-agreement fix |
| pt_br | 2 | pt-BR gender on technical acronyms (PSBT/URI masculine, not feminine) |
| si_LK | 6 | tense (past→present), spelling (long ī), awkward hyphenated transliterations |
| sr_RS | 1 | missing locative case ending (Bitcoin → Bitcoin-u) |
| sv_se | 2 | untranslated "Input" → "Indata"; definite form "biblioteket" |
| tr_tr | 3 | duplicate word, incorrect possessive suffix, missing comma before "ancak" |
| ua | 4 | quote style "..." → «...»; untranslated "Continuity" → "Безперервність" |
| vi_vn | 9 (1 skipped) | wrong-domain semantics: hạt giống (grain) → seed; Ð encoding → Để |
| zar_xho | 78 | massive untranslated English (transaction, Redeem, Payment Code, Pending, Freeze, etc.) |

Total: **153 applied / 154 proposed**.

## Skipped during apply

| Lang | Key | Reason |
|------|-----|--------|
| vi_vn | multisig.ms_help_3 | current value mismatch — file had drifted from staged baseline; ported value would not match cleanly |

## High-confidence sample (98–99%)

Selected from across langs to demonstrate the kind of fixes ported:

| Lang | Key | Before | After |
|------|-----|--------|-------|
| jp_jp | settings.about_awesome | "Built with the awesome" | "素晴らしいもので構築" |
| jp_jp | transactions.from | "From: {counterparty}" | "送信元: {counterparty}" |
| zar_xho | azteco.redeemButton | "Redeem" | "Khulula" |
| zar_xho | send.broadcastPending | "Pending" | "Ilindile" |
| zar_xho | cc.freeze | "Freeze" | "Khenkceza" |
| zar_xho | settings.donate | "Donate" | "Nikela" |
| sv_se | transactions.details_from | "Input" | "Indata" |
| ua | settings.general_continuity | "Continuity" | "Безперервність" |
| de_de | wallets.add_entropy_generated | "Bytes … Entropie " (trailing space) | "Bytes … Entropie" |
| hu_hu | send.details_recipients_title | "Kedvezményezettek" (beneficiaries) | "Címzettek" (recipients) |
| si_LK | settings.i_understand | "මට වැටහුණා" (past) | "මට වැටහෙයි" (present) |

## Verification (all passing)

- `npm run lint` ✓ (tslint + unused-loc-keys + eslint)
- JSON parse for 26 files ✓
- Placeholder integrity vs `loc/en.json` ✓ (0 mismatches)
- Sentinel bug fixes from prior passes intact ✓ (ua, sv_se, th_th, vi_vn, zh_tw)
- Loanword choices from prior overhaul intact ✓ (de_de, nl_nl, da_dk, sv_se, sr_RS, tr_tr)

## Languages where no port was warranted

`be@tarask`, `bqi`, `fr_fr`, `it`, `ko_KR`, `ms`, `nb_no`, `nl_nl` — diff analysis found only synonyms, stylistic preferences, terminology, or politeness verbosity. No grammar/spelling/factual fixes met the ≥90% bar.

## Files modified

26 JSON files in `loc/`. Branch state: current working tree.

## Suggested follow-up

- Native-speaker spot-check on `zar_xho` (78 ports — large; high-confidence but volume warrants review).
- `vi_vn multisig.ms_help_3` skip: investigate why current value drifted; may want to manually port the seed/hạt giống fix.
- `nl_nl` had 122 diffs, 0 ports — re-examine if Dutch should accept more aggressive grammar fixes; current rule may have been too conservative.
