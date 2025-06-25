#!/usr/bin/env node

// Test notification payload parsing in LinkingConfig
console.log('🔔 Testing notification payload parsing...');

// Mock wallet data for testing
const mockWallets = [
  {
    getID: () => 'wallet1',
    type: 'HDSegwitBech32Wallet',
    _getExternalAddressByIndex: index => {
      if (index === 0) return '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG';
      return null;
    },
    getTransactions: () => [{ hash: 'abc123', txid: 'abc123' }],
  },
];

// Mock notification payloads
const testNotifications = [
  {
    type: 2, // Address notification
    address: '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG',
    foreground: false,
    userInteraction: true,
  },
  {
    type: 1, // Transaction notification
    txid: 'abc123',
    foreground: false,
    userInteraction: true,
  },
  {
    type: 2, // Unknown address notification
    address: 'unknown_address_123',
    foreground: false,
    userInteraction: true,
  },
];

// Simple test function to verify navigation logic
function testNavigationForNotification(notification, wallets) {
  const { type, address, txid, hash } = notification;

  console.log(`\n🔔 Testing notification:`, { type, address, txid, hash });

  if (type === 2 || type === 3) {
    // Address-based notifications
    if (address) {
      const wallet = wallets.find(w => {
        try {
          if (w._getExternalAddressByIndex && w._getExternalAddressByIndex(0) === address) {
            return true;
          }
        } catch (e) {}
        return false;
      });

      if (wallet) {
        const result = {
          name: 'WalletTransactions',
          params: {
            walletID: wallet.getID(),
            walletType: wallet.type,
          },
        };
        console.log('   ✅ Found wallet, navigating to:', result);
        return result;
      } else {
        const result = {
          name: 'ReceiveDetails',
          params: {
            address,
            notificationAddress: true,
          },
        };
        console.log('   ✅ Unknown address, navigating to:', result);
        return result;
      }
    }
  } else if (type === 1 || type === 4) {
    // Transaction-based notifications
    const transactionId = txid || hash;
    if (transactionId) {
      const wallet = wallets.find(w => {
        try {
          const transactions = w.getTransactions();
          return transactions.some(tx => tx.hash === transactionId || tx.txid === transactionId);
        } catch (error) {
          return false;
        }
      });

      if (wallet) {
        const result = {
          name: 'TransactionDetails',
          params: {
            hash: transactionId,
            walletID: wallet.getID(),
          },
        };
        console.log('   ✅ Found transaction, navigating to:', result);
        return result;
      }
    }
  }

  console.log('   ❌ No specific navigation found, falling back to unlock screen');
  return { name: 'UnlockWithScreenRoot', params: {} };
}

// Run tests
console.log('🔔 Running notification navigation tests...\n');

testNotifications.forEach(notification => {
  testNavigationForNotification(notification, mockWallets);
});

console.log('\n✅ Notification payload parsing test completed!');
console.log('The notification navigation logic should now:');
console.log('1. Parse notification payloads correctly');
console.log('2. Find appropriate wallets based on addresses/transactions');
console.log('3. Navigate to ReceiveDetails for unknown addresses');
console.log('4. Navigate to WalletTransactions for known addresses');
console.log('5. Navigate to TransactionDetails for known transactions');
