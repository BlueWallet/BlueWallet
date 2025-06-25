#!/usr/bin/env node

/**
 * Debug test for notification navigation logic
 */

const { getNavigationForNotification } = require('./navigation/LinkingConfig.ts');

// Mock wallet for testing
const mockWallet = {
  getID: () => 'test-wallet-id',
  type: 'HDsegwitBech32',
  getTransactions: () => [
    { hash: 'abc123txhash', txid: 'abc123txhash' },
    { hash: 'def456txhash', txid: 'def456txhash' },
  ],
};

const wallets = [mockWallet];

// Test the notification payload from your logs
const testNotification = {
  foreground: false,
  userInteraction: true,
  address: '',
  txid: 'abc123txhash',
  type: 1,
  hash: '',
  walletID: undefined,
  subText: '',
  message: 'Test notification',
};

console.log('🧪 Testing notification navigation logic...');
console.log('📱 Test notification:', testNotification);
console.log('💼 Available wallets:', wallets.length);

try {
  const navigationAction = getNavigationForNotification(testNotification, wallets);
  console.log('✅ Navigation action:', JSON.stringify(navigationAction, null, 2));
} catch (error) {
  console.error('❌ Error processing notification:', error);
}

// Test with hash instead of txid
const testNotificationWithHash = {
  ...testNotification,
  txid: '',
  hash: 'abc123txhash',
};

console.log('\n🧪 Testing with hash instead of txid...');
console.log('📱 Test notification:', testNotificationWithHash);

try {
  const navigationAction = getNavigationForNotification(testNotificationWithHash, wallets);
  console.log('✅ Navigation action:', JSON.stringify(navigationAction, null, 2));
} catch (error) {
  console.error('❌ Error processing notification:', error);
}

// Test with no matching wallet
const testNotificationNoWallet = {
  ...testNotification,
  txid: 'nonexistent-tx',
};

console.log('\n🧪 Testing with transaction not in any wallet...');
console.log('📱 Test notification:', testNotificationNoWallet);

try {
  const navigationAction = getNavigationForNotification(testNotificationNoWallet, wallets);
  console.log('✅ Navigation action:', JSON.stringify(navigationAction, null, 2));
} catch (error) {
  console.error('❌ Error processing notification:', error);
}
