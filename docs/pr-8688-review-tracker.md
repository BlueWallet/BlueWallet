# PR #8688 Review Tracker

**PR:** [feat: readable data on tx status](https://github.com/BlueWallet/BlueWallet/pull/8688)  
**Branch:** `feat-confblocks`  
**Last verified:** uncommitted working tree (post batches 1–4)  
**Reviewers:** limpbrains, GladosBlueWallet — both `CHANGES_REQUESTED` (Jul 6)

## Summary

| Status | Count |
|--------|------:|
| Fixed | 22 |
| By design / defer | 4 |
| Intentionally not fixed | 1 |

---

## Issue registry

### Fixed

| ID | Issue | Reviewer | Resolution |
|----|-------|----------|------------|
| R01 | Empty UI on fetch failure | limpbrains | Error message + tap-to-retry (`blocks_load_error`) |
| R02 | `fetchStartedRef` not reset in `finally` | limpbrains | Reset in `finally` block |
| R03 | Missing BlueElectrum integration tests | limpbrains | `tests/integration/BlueElectrum.test.js` |
| R04 | Hardcoded `DD/MM/YYYY` date | limpbrains | Block cards use `dayjs(...).format('LT')` |
| R05 | "0 blocks ago" + stale `confirmations` | limpbrains | `{ height, tip }` from same fetch; latest-block copy for `=== 0` |
| R06 | Plural `block_ago` / `blocks_ago` keys | limpbrains | Flat keys; summary is `"Included in block {blockHeight}."` (no plural noun) |
| R07 | Nested i18n `{blocksAgo}` splice | limpbrains | Flat keys + `renderBoldFormattedParts` on primitives only |
| R08 | No `txHash` guard after async | Glados | `activeTxHashRef` checks after each `await` |
| R09 | Invisible measure layer (double render) | Glados | Measure layer removed |
| R10 | Electrum fetch while collapsed | Glados | Lazy fetch when `isExpanded` |
| R11 | Incomplete mocks / no accordion tests | Glados | `blocks-accordion.test.tsx` (14 tests) + `transaction-state-header.test.tsx` + extended status mocks |
| R12 | Silent fetch miss | Glados | `setError(true)` on null height |
| R13 | Redundant tip subscribe / estimate short-circuit | Glados, limpbrains | `getCurrentBlockTip()` TTL refresh (60s); returns real height, not estimate |
| R14 | Dead `getTxBlockHeight` | Glados | Removed |
| R16 | Fake `TouchableOpacity` when accordion hidden | Glados | `TransactionStateHeader` wraps press only when expandable |
| R17 | `transaction-status` mock theater | Glados | Expand/collapse cache, Ark off-chain, Electrum call assertions |
| R18 | `getCurrentBlockTip()` returns estimate | Glados, limpbrains | TTL-guarded `blockchainHeaders_subscribe` refresh |
| R19 | Cache-miss height uses inflated tip | Glados | `getConfirmedBlockHeight` returns `{ height, tip }` |
| R20 | Negative `blocksBehind` / tip lag copy | limpbrains | `rawBehind === 0` for latest-block copy; inclusion summary when tip lags; carousel re-centered on confirmed height |
| R21 | Header markup duplicated 4× | Glados | `components/TransactionStateHeader.tsx` |
| R22 | Tests only assert summary substrings | Glados | Fee text, block heights, timestamp fetch windows, status integration |
| R23 | Error blocks re-expand fetch | Glados | Clear `error` on collapse |
| R24 | `FlatList` `contentOffset` unreliable | Glados | `ref` + `scrollToOffset` after data loads |
| R26 | Global theme palette churn | Glados | **Kept** — aligns receive/success greens with tx-status accent (`#1e8a6a`) |
| R28 | `showBlocksAccordion` ignores `isOnChainTx` | Glados | `isOnChainTx && !isPending && confirmations > 0` |

### By design / defer

| ID | Issue | Status | Rationale |
|----|-------|--------|-----------|
| R15 | Loc keys only in `en.json` | By design | Transifex workflow; English is source |
| R25 | Accordion exact count vs header `6+` | Intentional | Header caps at `6+`; accordion shows exact depth by design |
| R27 | 426-line `BlocksAccordion` | Defer | Acknowledged; optional post-merge split |
| R29 | Commit prefixes `feat:` vs `ADD:` | Process | Use `ADD:`/`FIX:`/`TST:` on remaining commits |

---

## Batches completed

1. **Electrum tip** — `getCurrentBlockTip` TTL + `{ height, tip }` return type  
2. **Display guards** — clamp, scroll-to-confirmed, error reset on collapse  
3. **TransactionStatus** — `TransactionStateHeader`, `isOnChainTx` guard  
4. **Tests** — fee summary, carousel heights, timestamp windows, expand/collapse cache, Ark off-chain  
5. **Polish** — themes.ts accent colors kept; tracker doc; PR reply below

---

## Post-review bug fixes (Jul 7)

| ID | Fix |
|----|-----|
| A1 | Defer all `BlocksAccordion` state commits until after final `txHash` guard |
| A2 | Reset `isBlocksExpanded` when route `hash` changes |
| A3 | Use `rawBehind === 0` (not clamped) for latest-block vs inclusion summary |
| B1 | `computeBlockHeights()` re-centers carousel when confirmed block falls outside tip window |
| B2 | Reject `height <= 0` or `height > tip` before writing `txhashHeightCache` |
| C1 | Timestamp fetch failure still renders summary + carousel (shows `-` for times) |
| C2 | Block card backgrounds derived from theme accent via `hexToRgba()` |
| C3 | `TransactionStateHeader` hides confirmations line for non-finite / zero values |

---

## Suggested PR reply (copy to GitHub)

> **Batch fixes (Jul 7)**
>
> - **R18/R19:** `getCurrentBlockTip()` now TTL-refreshes from the server; `getConfirmedBlockHeight()` returns `{ height, tip }` from one tip source.
> - **R20–R24:** Clamped depth, scroll-to-confirmed block, error clears on collapse, flat summary copy.
> - **R21/R28:** Extracted `TransactionStateHeader`; accordion gated on `isOnChainTx`.
> - **R06:** Summary reworded to `"Included in block {blockHeight}."` (no plural noun).
> - **R22:** Expanded unit tests for fee text, carousel, and status-screen expand/collapse.
> - **R26:** Kept global receive/success green alignment (`#1e8a6a`) for consistent tx-status accent.
> - **R15:** New strings in `en.json` only — Transifex as usual.
> - **Post-review:** Stale async guard, expand reset on tx navigation, tip-lag copy/carousel fixes, cache write guard, partial timestamp resilience.
>
> Ready for re-review.

---

## Re-request review

- [ ] limpbrains  
- [ ] GladosBlueWallet
