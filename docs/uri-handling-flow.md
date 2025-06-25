# BlueWallet URI Handling Flow

## Overview

This document describes the flow of how different URI schemes are handled in BlueWallet after the migration to React Navigation 7's linking configuration.

```
┌────────────────┐
│                │
│  External App  │
│                │
└───────┬────────┘
        │
        │ Deep Link (URI)
        ▼
┌────────────────────┐
│                    │
│  React Navigation  │ ◄─── LinkingConfig.ts
│  Linking System    │      (prefixes, paths, getStateFromPath)
│                    │
└─────────┬──────────┘
          │
          │ URI Analysis
          ▼
┌─────────────────────────┐  Yes   ┌───────────────────┐
│ Is Bitcoin URI?         ├───────►│ Navigate to       │
│ (bitcoin:, bitcoin://)  │        │ SendDetailsRoot   │
└─────────┬───────────────┘        └───────────────────┘
          │ No
          ▼
┌─────────────────────────┐  Yes   ┌───────────────────┐
│ Is Lightning URI?       ├───────►│ Navigate to       │
│ (lightning:, lnurl:)    │        │ ScanLNDInvoiceRoot│
└─────────┬───────────────┘        └───────────────────┘
          │ No
          ▼
┌─────────────────────────┐
│ Fall back to            │
│ DeeplinkSchemaMatch     │
│ (Legacy URI handling)   │
└─────────────────────────┘
```

## URI Handling Paths

### Bitcoin URIs

- `bitcoin:address?params`
- `bitcoin://address?params`
- `bluewallet://bitcoin:address?params`
- `bluewallet://bitcoin://address?params`
- Case-insensitive variants (e.g., `BITCOIN:address?params`)

**Destination**: SendDetailsRoot > SendDetails with `{ uri }` parameter

### Lightning URIs

- `lightning:lnbc...`
- `lightning://lnbc...`
- `bluewallet://lightning:lnbc...`
- `bluewallet://lightning://lnbc...`
- Case-insensitive variants (e.g., `LIGHTNING:lnbc...`)

**Destination**: ScanLNDInvoiceRoot > ScanLNDInvoice with `{ uri }` parameter

### Legacy URIs (handled by centralized LinkingConfig)

- `bluewallet:` (except when followed by bitcoin: or lightning:)
- `blue:`
- `lapp:`
- Other custom schemes

## Implementation Details

The URI handling is implemented across several files:

1. `navigation/LinkingConfig.ts` - Centralized URI handling for all deep link and QR code scenarios
2. `hooks/useCompanionListeners.ts` - Handles clipboard detection and QR codes

For programmatic navigation with URIs, use `useLinkTo` from React Navigation:

```typescript
const linkTo = useLinkTo();
linkTo('/send/ADDRESS?amount=0.001&label=Demo'); // Bitcoin
linkTo('/lightning/lnbc...'); // Lightning
```
