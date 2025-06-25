# React Navigation 7 Linking in BlueWallet

This document explains how deep linking is configured in BlueWallet using React Navigation 7's linking feature.

## Current Implementation

The current implementation supports both Bitcoin and Lightning schema URIs:
- Bitcoin URIs (`bitcoin:`, `bitcoin://`) for the Send functionality
- Lightning URIs (`lightning:`, `lightning://`) for the Lightning payment functionality

All other schemas are handled by the fallback (legacy) implementation.

## Key Features

- Properly handles all Bitcoin URI formats:
  - `bitcoin:address?params`
  - `bitcoin://address?params`
  - `bluewallet://bitcoin:address?params`
  - `bluewallet://bitcoin://address?params`
  - Case-insensitive variants like `BITCOIN:address?params`

- Properly handles all Lightning URI formats:
  - `lightning:lnbc...`
  - `lightning://lnbc...`
  - `bluewallet://lightning:lnbc...`
  - `bluewallet://lightning://lnbc...`
  - Case-insensitive variants like `LIGHTNING:lnbc...`

- Normalizes Bitcoin and Lightning URIs to ensure consistent handling across the app

- Routes Bitcoin URIs to the SendDetails screen with the appropriate parameters
- Routes Lightning URIs to the ScanLNDInvoice screen with the appropriate parameters

- Non-Bitcoin and non-Lightning URIs are handled by the existing deep link implementation

## Using the Linking Feature

### Automatic Handling

Deep links are automatically handled when users click on Bitcoin or Lightning URIs from other apps or websites. React Navigation will parse these links and navigate to the appropriate screen.

### Programmatic Navigation with Paths

You can also navigate programmatically using paths defined in the linking configuration:

```typescript
import { useLinkTo } from '@react-navigation/native';

// In your component
const linkTo = useLinkTo();

// Navigate using a path
linkTo('/send/bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=0.001');
```

See `components/LinkingDemo.tsx` for an example implementation.

## Testing

Tests for the linking configuration are available in `tests/unit/linking-config.test.ts`.

## Future Enhancements

To add support for additional URI schemas:

1. Update `LinkingConfig.ts` to include the new schema prefixes
2. Extend the `config` and `getStateFromPath` function to handle the new schemas
3. Update the tests to cover the new functionality

## References

- [React Navigation 7 Linking Documentation](https://reactnavigation.org/docs/7.x/configuring-links)
