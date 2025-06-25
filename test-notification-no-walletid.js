#!/usr/bin/env node

// Test notification logic without walletID (more realistic scenario)
console.log('🧪 Testing notification logic WITHOUT walletID...\n');

// Simulate the logic we implemented
function getNavigationForNotification(notification, wallets) {
  const { type, address, txid, hash, walletID } = notification;

  console.log('🔔 Processing notification:', { type, address, txid, hash, walletID, walletsCount: wallets.length });

  // If we have a walletID, try to find the wallet directly first (but don't rely on it)
  if (walletID) {
    const wallet = wallets.find(w => w.getID() === walletID);
    if (wallet) {
      console.log('🔔 Found wallet by ID for notification:', walletID);
      return {
        name: 'WalletTransactions',
        params: { walletID: wallet.getID(), walletType: wallet.type },
      };
    } else {
      console.log('🔔 Wallet ID provided but wallet not found:', walletID);
    }
  }

  // Primary logic: Find wallet by address or transaction (most common cases)
  if (type === 2 || type === 3) {
    // Address-based notifications (types 2 and 3)
    if (address) {
      console.log('🔔 Looking for wallet that owns address:', address);
      // Find wallet by checking if address belongs to it
      const wallet = wallets.find(w => {
        try {
          // Check if wallet has address checking methods (HD wallets)
          if ('_getExternalAddressByIndex' in w && typeof w._getExternalAddressByIndex === 'function') {
            for (let i = 0; i < 10; i++) {
              // Limited for test
              try {
                if (w._getExternalAddressByIndex(i) === address) {
                  console.log('🔔 Found wallet by external address at index', i, ':', w.getID());
                  return true;
                }
              } catch (e) {
                // Continue checking
              }
            }
          }

          // For simpler wallets, check the main address
          if ('getAddress' in w && typeof w.getAddress === 'function') {
            try {
              if (w.getAddress() === address) {
                console.log('🔔 Found wallet by main address:', w.getID());
                return true;
              }
            } catch (e) {
              // Continue checking
            }
          }
        } catch (error) {
          console.log('Error checking wallet addresses:', error);
        }
        return false;
      });

      if (wallet) {
        console.log('🔔 Navigating to wallet transactions for:', wallet.getID());
        return {
          name: 'WalletTransactions',
          params: { walletID: wallet.getID(), walletType: wallet.type },
        };
      } else {
        // If no wallet owns the address, navigate to ReceiveDetails to display it
        console.log('🔔 No wallet found for address, showing ReceiveDetails for:', address);
        return {
          name: 'ReceiveDetails',
          params: { address, notificationAddress: true },
        };
      }
    }
  } else if (type === 1 || type === 4) {
    // Transaction-based notifications (types 1 and 4)
    const transactionId = txid || hash;
    if (transactionId) {
      console.log('🔔 Looking for wallet that has transaction:', transactionId);
      const wallet = wallets.find(w => {
        try {
          const transactions = w.getTransactions();
          const found = transactions.some(tx => tx.hash === transactionId || tx.txid === transactionId);
          if (found) {
            console.log('🔔 Found wallet by transaction:', w.getID());
          }
          return found;
        } catch (error) {
          console.log('Error checking wallet transactions:', error);
          return false;
        }
      });

      if (wallet) {
        console.log('🔔 Navigating to transaction details for:', transactionId);
        return {
          name: 'TransactionDetails',
          params: { hash: transactionId, walletID: wallet.getID() },
        };
      } else {
        console.log('🔔 No wallet found for transaction, navigating to wallet list with context:', transactionId);
        return {
          name: 'UnlockWithScreenRoot',
          params: { notificationTxid: transactionId },
        };
      }
    }
  }

  // Final fallback to wallet list if no specific wallet found
  console.log('🔔 No specific navigation found, falling back to wallet list');
  return {
    name: 'UnlockWithScreenRoot',
    params: {},
  };
}

// Mock wallets for testing
const mockWallets = [
  {
    getID: () => 'wallet123',
    type: 'HDSegwitBech32Wallet',
    getTransactions: () => [{ hash: 'sample_txid_1750480451', txid: 'sample_txid_1750480451' }],
    _getExternalAddressByIndex: index => {
      // Return the test address at index 0
      if (index === 0) return '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG';
      return `external_${index}_wallet123`;
    },
  },
  {
    getID: () => 'wallet456',
    type: 'HDSegwitP2SHWallet',
    getTransactions: () => [],
    _getExternalAddressByIndex: index => `external_${index}_wallet456`,
  },
];

// Test notifications WITHOUT walletID (realistic scenario)
const testNotifications = [
  {
    type: 2,
    address: '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG', // This address belongs to wallet123
    txid: 'sample_txid_1750480451',
    // NO walletID - realistic scenario
    foreground: false,
    userInteraction: true,
  },
  {
    type: 1,
    txid: 'sample_txid_1750480451', // This transaction is in wallet123
    // NO walletID
    foreground: false,
    userInteraction: true,
  },
  {
    type: 2,
    address: 'unknown_address_123456', // This address doesn't belong to any wallet
    // NO walletID
    foreground: false,
    userInteraction: true,
  },
];

console.log(
  'Available wallets:',
  mockWallets.map(w => ({ id: w.getID(), type: w.type })),
);
console.log('');

testNotifications.forEach((notification, index) => {
  console.log(`🧪 Test ${index + 1}:`, notification);
  try {
    const result = getNavigationForNotification(notification, mockWallets);
    console.log('✅ Navigation result:', result);

    if (index === 0 && result.name === 'WalletTransactions' && result.params.walletID === 'wallet123') {
      console.log('🎉 SUCCESS: Address-based notification correctly routed to wallet123!');
    } else if (index === 1 && result.name === 'TransactionDetails' && result.params.walletID === 'wallet123') {
      console.log('🎉 SUCCESS: Transaction-based notification correctly routed to wallet123!');
    } else if (index === 2 && result.name === 'ReceiveDetails' && result.params.address === 'unknown_address_123456') {
      console.log('🎉 SUCCESS: Unknown address correctly routed to ReceiveDetails!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  console.log('---\n');
});

console.log('🔍 The updated logic should now:');
console.log('1. ✅ Work without walletID (primary logic)');
console.log('2. ✅ Find wallet by address matching for type 2/3 notifications');
console.log('3. ✅ Find wallet by transaction matching for type 1/4 notifications');
console.log('4. ✅ Fallback to ReceiveDetails for unknown addresses');
console.log('5. ✅ Still use walletID if available (bonus optimization)');
