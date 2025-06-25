# BlueWallet Deep Linking Configuration

This file documents the comprehensive deep linking configuration implemented in `navigation/LinkingConfig.ts`.

## Features Implemented

✅ **Custom URL Schemes**: Support for `bitcoin:`, `lightning:`, `bluewallet:`, `blue:`, `lapp:`  
✅ **Universal Links**: Ready for `https://bluewallet.io` domain  
✅ **URL Filtering**: Prevents handling unwanted URLs (auth sessions, empty URLs)  
✅ **Path Parameters**: Dynamic routing with required and optional parameters  
✅ **URL Aliases**: Backward compatibility with multiple URL patterns  
✅ **Custom Parsing**: Bitcoin amounts, Lightning invoices, encoded parameters  
✅ **Exact Matching**: Modal screens bypass nested path hierarchy  
✅ **Smart URL Handling**: Automatic Bitcoin/Lightning URL detection and routing  

## Supported URL Patterns

### Bitcoin URLs
```
bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh?amount=0.001&label=Coffee&message=Thanks
```

### Lightning URLs  
```
lightning:lnbc1500n1pwuz...
```

### App-specific URLs
```
bluewallet://wallet/[   ]
bluewallet://send/[address]
bluewallet://transaction/[hash]
bluewallet://settings/lightning
bluewallet://lnurl/pay
```

### Web URLs (Universal Links)
```
https://bluewallet.io/wallet/[walletID]
https://bluewallet.io/send/[address]
```

## Testing Deep Links

### iOS Simulator

```bash
xcrun simctl openurl booted "bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh?amount=0.001"
xcrun simctl openurl booted "bluewallet://wallet/12345"
```

### Push Notifications

The app processes push notification payloads with special handling for deep links. Notifications can include a direct `url` field that points to a specific route in the app:

```json
{
  "aps": {
    "alert": {
      "title": "Transaction Received",
      "body": "You received Bitcoin"
    },
    "category": "TRANSACTION"
  },
  "data": {
    "type": 2,
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "txid": "c4f32e7c3552a3b7f1b826e8e8c9b5c6bde9a8f4f6a2b1b8c6a7a6e4e3d2f1b0"
  },
  "url": "bluewallet://transaction/c4f32e7c3552a3b7f1b826e8e8c9b5c6bde9a8f4f6a2b1b8c6a7a6e4e3d2f1b0/status?walletID=wallet123"
}
```

For testing address-only notifications (routes to ReceiveDetails):

```json
{
  "aps": {
    "alert": {
      "title": "Address Notification",
      "body": "Notification for address"
    },
    "category": "ADDRESS"
  },
  "data": {
    "type": 2,
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
  }
}
```

Testing push notifications in iOS simulator:

```bash
# Using the test script (recommended)
./scripts/deeplink-to-emusim.sh notification

# Choose from available notification types:
# - Push Notification (Transaction) - tests transaction routing
# - Push Notification (Address Only) - tests notification tap routing (tap notification when it appears)
# - Direct Address Deep Link - directly tests ReceiveDetails routing with address
# - Deep Link URL - tests direct deep link navigation

# Manual testing with xcrun simctl push
xcrun simctl push booted "io.bluewallet.bluewallet" notification.apns
```

**Note**: When testing address-only push notifications, you need to **tap the notification** when it appears in the simulator to trigger the routing logic. The notification routing only occurs when the user interacts with the notification, not when it's just received.

The test script includes pre-configured notification payloads that work with the LinkingConfig system.

### Android Emulator

```bash
adb shell am start -W -a android.intent.action.VIEW -d "bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh?amount=0.001" io.bluewallet.bluewallet
adb shell am start -W -a android.intent.action.VIEW -d "bluewallet://settings/lightning" io.bluewallet.bluewallet
```

### React Native Development

```javascript
import { Linking } from 'react-native';

// Test Bitcoin URL
Linking.openURL('bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh?amount=0.001');

// Test Lightning invoice
Linking.openURL('lightning:lnbc1500n1pwuz...');

// Test app navigation
Linking.openURL('bluewallet://wallet/12345');
```

## Configuration Details

The linking configuration implements all major React Navigation features:

- **Prefixes**: Multiple URL schemes and domains
- **Filter Function**: Intelligent URL filtering  
- **Path Mapping**: Screen-to-URL mapping with parameters
- **Parse/Stringify**: Custom parameter handling
- **Aliases**: Multiple URL patterns for same screen
- **Custom State Generation**: Special handling for Bitcoin/Lightning URLs
- **Fallback Component**: Loading indicator during URL resolution
- **Wallet Context**: Updates wallet context when navigating from deep links

### Wallet Context Handling

Deep links that contain walletID parameters automatically update the application's wallet context through the `updateWalletContext` function in LinkingConfig.ts. This enables deep links from push notifications to properly set the current wallet context.

### Notification Processing

The LinkingConfig system includes comprehensive notification handling:

- **JavaScript-side handling**: Updated notification handler in `blue_modules/notifications.ts` checks for `userInteraction` and `url` fields in notification payloads and routes them through React Native's Linking system
- **iOS-side handling**: AppDelegate.swift updated to check for `url` field in notification payloads and route them through the app's linking system before handling specific notification actions
- **Startup processing**: The `processAllNotifications` function processes pending notifications received while the app was closed and routes them through the LinkingConfig system
- **Receive transaction routing**: Notifications for pending/unconfirmed receive transactions (type 2) are automatically routed to the ReceiveDetails screen with the relevant address and transaction ID
- **Auto-initialization**: Pending notifications are automatically processed when the app starts and wallets are loaded

#### Notification Flow

1. User taps notification → iOS/Android forwards to React Native
2. Notification handler checks for `url` field in payload
3. If URL exists, routes through `Linking.openURL()` → LinkingConfig processes URL
4. If no URL but notification type is 2 (receive transaction):
   - **With transaction ID + no wallet**: Shows error alert for unknown wallet
   - **With address + no wallet**: Routes to ReceiveDetails screen
   - **With wallet found**: Routes to TransactionDetails or ReceiveDetails with wallet context
5. Otherwise, falls back to legacy notification action handling

This configuration follows React Navigation v6 best practices and implements features from the official documentation.
