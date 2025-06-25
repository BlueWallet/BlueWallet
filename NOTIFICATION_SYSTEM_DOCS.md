# BlueWallet Notification System Documentation

## Overview

BlueWallet's notification system has been completely refactored to ensure security, reliability, and proper navigation in both cold boot and warm app states. The system follows React Native Push Notification best practices and ensures that wallet IDs are **never** taken from push notification payloads.

## Security Architecture

### Core Security Principle
**🔒 CRITICAL: walletID is ALWAYS resolved from local storage, NEVER from push notification payload**

This prevents potential security vulnerabilities where malicious actors could send crafted notifications to access other users' wallets.

## Notification Types

The system supports four notification types:

### Type 1: Lightning Invoice Paid
- **Trigger**: Lightning invoice payment received
- **Payload**: `{ type: 1, hash: string, title, message }`
- **Navigation**: Routes to lightning invoice details with wallet context

### Type 2: Address Got Paid  
- **Trigger**: Bitcoin payment received to address
- **Payload**: `{ type: 2, address: string, txid?: string, title, message }`
- **Navigation**: Routes to ReceiveDetails modal with wallet context

### Type 3: Address Got Unconfirmed Transaction
- **Trigger**: Unconfirmed Bitcoin transaction received
- **Payload**: `{ type: 3, address: string, txid?: string, title, message }`
- **Navigation**: Routes to ReceiveDetails modal with wallet context

### Type 4: Transaction Confirmed
- **Trigger**: Bitcoin transaction confirmed
- **Payload**: `{ type: 4, txid: string, title, message }`
- **Navigation**: Routes to transaction details with wallet context

## Navigation Flow

### Warm App State (App Running)
1. Notification received and processed
2. `waitForWalletsInitialized()` ensures wallets are ready
3. Wallet lookup by address/hash/txid from storage
4. **Direct navigation** via `NavigationService.navigate()` for modal screens
5. Fast, seamless user experience

### Cold Boot State (App Closed)
1. Notification received, app launches
2. `waitForWalletsInitialized()` polls until wallets are ready
3. Wallet lookup by address/hash/txid from storage
4. **Fallback navigation** via `Linking.openURL()` through LinkingConfig
5. Deep link routing to appropriate screen

## Implementation Details

### Notification Handler (`blue_modules/notifications.ts`)

```typescript
// Core security: Always wait for wallets before processing
const wallets = await waitForWalletsInitialized();

// Security: Find wallet by address/hash, never from payload
const walletForAddress = wallets.find(wallet => {
  const addresses = wallet.getAllExternalAddresses();
  return addresses.includes(payload.address);
});

// Navigation: Direct for warm app, Linking for cold boot
if (NavigationService.navigationRef?.isReady()) {
  NavigationService.navigate('ReceiveDetails', { 
    address: payload.address,
    walletID: walletForAddress.getID()
  });
} else {
  const url = `bluewallet://receive?address=${address}&walletID=${walletID}`;
  await Linking.openURL(url);
}
```

### LinkingConfig (`navigation/LinkingConfig.ts`)

```typescript
ReceiveDetails: {
  path: 'receive',
  parse: {
    walletID: (walletID: string) => walletID,
    address: (address: string) => address,
    txid: (txid: string) => txid,
  },
}
```

### Wallet Initialization Helper

```typescript
const waitForWalletsInitialized = async (): Promise<any[]> => {
  return new Promise((resolve) => {
    const checkWallets = () => {
      const BlueApp = require('../class/blue-app').BlueApp.getInstance();
      const wallets = BlueApp.getWallets();
      
      if (wallets && wallets.length > 0) {
        console.log('✅ Wallets initialized, proceeding with notification');
        resolve(wallets);
      } else {
        console.log('⏳ Waiting for wallets to initialize...');
        setTimeout(checkWallets, 500);
      }
    };
    checkWallets();
  });
};
```

## Testing

### Test Notification Payloads

```javascript
// Type 2: Address Got Paid
{
  "title": "Address Got Paid",
  "message": "Bitcoin payment received to your address",
  "type": 2,
  "address": "bc1qtest123456789abcdef",
  "txid": "test-txid-abcdef123456789",
  "userInteraction": true
}

// Type 3: Unconfirmed Transaction
{
  "title": "Address Got Unconfirmed Transaction", 
  "message": "Unconfirmed Bitcoin transaction received",
  "type": 3,
  "address": "bc1qtest123456789abcdef",
  "txid": "test-txid-unconfirmed-123456789",
  "userInteraction": true
}
```

### Testing Checklist

- [ ] Test Type 1 notifications (Lightning)
- [ ] Test Type 2 notifications (Address paid)
- [ ] Test Type 3 notifications (Unconfirmed)
- [ ] Test Type 4 notifications (Confirmed)
- [ ] Test cold boot navigation
- [ ] Test warm app navigation
- [ ] Test modal screen routing
- [ ] Test unknown wallet/address handling
- [ ] Test iOS push notifications
- [ ] Test Android push notifications

## Best Practices

### Security
- ✅ Never include walletID in push notification payloads
- ✅ Always verify address/hash ownership before routing
- ✅ Gracefully handle unknown wallets/addresses
- ✅ Use URL encoding for all parameters

### Performance
- ✅ Wait for wallets to initialize before processing
- ✅ Use direct navigation for warm app (fast)
- ✅ Use deep linking for cold boot (reliable)
- ✅ No artificial delays in navigation

### User Experience
- ✅ Modal screens work in both app states
- ✅ Proper error handling and logging
- ✅ Consistent navigation behavior
- ✅ Clear notification messages

## Troubleshooting

### Common Issues

**Navigation not working on cold boot:**
- Ensure LinkingConfig paths are correct
- Check that wallets are initialized before routing
- Verify URL parameter encoding

**Modal not opening:**
- Check NavigationService.navigationRef.isReady()
- Fallback to Linking.openURL if direct navigation fails
- Ensure modal routes are properly configured

**Security warnings:**
- Never include walletID in push payloads
- Always verify ownership before navigation
- Log all wallet lookup attempts

### Debug Logging

The system includes comprehensive logging:
```
🚀 Starting navigation to ReceiveDetails...
🎯 Navigation ready, attempting direct navigation...
✅ Direct navigation to ReceiveDetails modal successful
```

## Migration Notes

### From Previous Version
- Remove any walletID from push notification payloads
- Update server to send only address/hash/txid
- Test all notification types in both app states
- Verify modal navigation works correctly

### Breaking Changes
- walletID no longer accepted from push payloads
- Navigation delays removed for better performance
- Modal routing now uses direct navigation when possible

This refactored system provides a secure, reliable, and performant notification experience that works consistently across all app states and device types.
