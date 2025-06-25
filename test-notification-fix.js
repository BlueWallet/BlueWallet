#!/usr/bin/env node

// Test notification processing with refactored logic:
// - Address-based notifications (types 2,3) ignore walletID and always show ReceiveDetails
// - Transaction-based notifications (types 1,4) use walletID if valid, else search by transaction
const { getNavigationForNotification } = require('./navigation/LinkingConfig');

// Mock wallets for testing
const mockWallets = [
  {
    getID: () => 'wallet123',
    type: 'HDSegwitBech32Wallet',
    getTransactions: () => [{ hash: 'sample_txid_1750480451', txid: 'sample_txid_1750480451' }],
  },
  {
    getID: () => 'wallet456',
    type: 'HDSegwitP2SHWallet',
    getTransactions: () => [],
  },
];

// Test notification payloads
const testNotifications = [
  {
    type: 2,
    address: '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG',
    txid: 'sample_txid_1750480451',
    walletID: 'wallet123', // For address-based notifications, walletID should be IGNORED
    foreground: false,
    userInteraction: true,
  },
  {
    type: 3,
    address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
    txid: 'sample_txid_unconfirmed',
    walletID: 'nonexistent_wallet', // For address-based notifications, walletID should be IGNORED
    foreground: false,
    userInteraction: true,
  },
  {
    type: 1,
    txid: 'sample_txid_1750480451',
    walletID: 'wallet123', // For transaction-based notifications, walletID should be used
    foreground: false,
    userInteraction: true,
  },
  {
    type: 4,
    hash: 'sample_txid_1750480451',
    walletID: 'wallet123', // For transaction-based notifications, walletID should be used
    foreground: false,
    userInteraction: true,
  },
  {
    type: 2,
    address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    // No walletID - address-based notification should still work
    foreground: false,
    userInteraction: true,
  },
  {
    type: 1,
    txid: 'unknown_transaction',
    walletID: 'nonexistent_wallet', // Should fallback to searching by transaction
    foreground: false,
    userInteraction: true,
  },
];

console.log('🧪 Testing notification navigation with walletID fix...\n');

testNotifications.forEach((notification, index) => {
  console.log(`Test ${index + 1}:`, notification);
  try {
    const result = getNavigationForNotification(notification, mockWallets);
    console.log('✅ Navigation result:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  console.log('---');
});
