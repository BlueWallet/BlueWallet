# BlueWallet Portfolio — Chrome Extension (One-Pager)

**Status:** Proposal  
**Type:** Small companion product (watch-only)  
**Reuse:** Portfolio math from branch `portfolio` (`class/portfolio/*`)

---

## Problem

Users want a lightweight way to track BTC holdings (addresses / xpubs) with balance, price, and performance — without opening the mobile app or exposing private keys.

## Solution

A Chrome MV3 extension: add watch-only addresses or xpubs, show balance + spot price, a holdings graph, cost basis, average buy price, and unrealized return.

## Scope

| In (MVP) | Out |
|---|---|
| Add / remove address or xpub (ypub/zpub) | Seeds, private keys, send, LN |
| Current balance (confirmed) | Tax reports / CSV |
| Spot BTC price (fiat) | Multi-portfolio / accounts |
| Graph (BTC + fiat over time) | Full BlueWallet wallet sync |
| Cost basis, avg buy, unrealized P/L | Shipping RN UI as-is |

## Metrics (same as `portfolio` branch)

- **Cost basis** = Σ `(utxo_sats / 1e8) × BTC_price(first_seen_date)` — confirmed UTXOs only  
- **Avg buy** = `costBasis / BTC_balance`  
- **Current value** = `BTC_balance × spot_price`  
- **Unrealized** = `currentValue − costBasis` (and %)  
- **Graph** = cumulative currently unspent UTXOs by first-seen time (ranges: 1W → All)

## Architecture (high level)

```
UI (React + Vite, MV3 popup / full page)
        ↓
Domain: portfolio-calculator · price-service · utxo first-seen tracker
        ↓
ChainProvider (interface)     PriceProvider
  Esplora / mempool (MVP)       CoinGecko history + spot FX
  later: Electrum WS / proxy
        ↓
chrome.storage.local  (targets, utxo meta, price cache)
```

**Constraint:** BlueWallet `BlueElectrum` is TCP/TLS — not usable in Chrome. Abstract chain access; start with HTTPS (Esplora), keep Electrum-compatible provider as a later option.

**Port from `portfolio`:** calculator + price/rate-limit idea + UTXO first-seen accounting.  
**Rewrite:** UI, charts, storage.  
**Don’t port:** RN screens, Realm, Electrum socket client.

## Stack

- Chrome MV3 + Vite + React + TypeScript  
- Charts: lightweight-charts or recharts  
- Math: `bignumber.js`, `dayjs`  
- Derivation: browser-safe bitcoinjs / BIP32 path for xpub gap scan  

Repo: separate (`bluewallet-portfolio-extension`) or `extensions/portfolio/` — not inside RN app modules.

## Build order

1. Scaffold MV3 + empty add-address UI + storage  
2. Single-address balance + spot price  
3. Port calculator → cost basis / avg buy / unrealized  
4. Graph  
5. xpub + gap scan  
6. (Optional) Electrum WS/proxy behind same `ChainProvider`

## Privacy & trust

Addresses leave the browser to the chosen chain API. Disclose this; prefer self-hostable Esplora or a BlueWallet-operated proxy if we align with Electrum later.

## Success (MVP)

User can paste an address or xpub and, within one screen, see balance, fiat value, unrealized return %, and a simple history graph — with no keys stored.

## Open decisions

1. Esplora-only MVP vs invest in Electrum proxy early?  
2. Separate repo vs monorepo folder?  
3. Popup-only vs side panel + full page?  
4. Extract `@bluewallet/portfolio-core` now, or copy/slim formulas first?
