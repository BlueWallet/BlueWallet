#!/usr/bin/env node

/**
 * Final BlueWallet Notification System Validation
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FINAL BLUEWALLET NOTIFICATION VALIDATION');
console.log('===========================================\n');

// Read the notifications file
const notificationsPath = path.join(__dirname, 'blue_modules', 'notifications.ts');
const linkingConfigPath = path.join(__dirname, 'navigation', 'LinkingConfig.ts');

let notificationsContent = '';
let linkingConfigContent = '';

try {
  notificationsContent = fs.readFileSync(notificationsPath, 'utf8');
  linkingConfigContent = fs.readFileSync(linkingConfigPath, 'utf8');
} catch (error) {
  console.error('❌ Error reading files:', error.message);
  process.exit(1);
}

// Validation checks
const validations = {
  notifications: {
    'waitForWalletsInitialized helper': /waitForWalletsInitialized/,
    'Direct NavigationService navigation': /NavigationService\.navigate/,
    'Fallback Linking.openURL': /Linking\.openURL/,
    'Wallet lookup from storage': /walletForAddress\.getID\(\)/,
    'Type 1 (Lightning) handling': /payload\.type === 1/,
    'Type 2 (Address paid) handling': /payload\.type === 2/,
    'Type 3 (Unconfirmed) handling': /payload\.type === 3/,
    'Type 4 (Confirmed) handling': /payload\.type === 4/,
    'User interaction check': /payload\.userInteraction/,
    'Address-based wallet lookup': /getAllExternalAddresses/,
    'Transaction-based wallet lookup': /getTransactions/,
    'Security: No walletID from payload': /payload\.walletID/,
    'Error handling for unknown wallets': /unknown.*ignoring/i,
    'Cold boot app state check': /AppState\.currentState/,
    'ReceiveDetails modal navigation': /ReceiveDetails/,
  },
  
  linkingConfig: {
    'ReceiveDetails route configured': /ReceiveDetails.*path.*receive/s,
    'TransactionDetails route configured': /TransactionDetails.*transaction/s,
    'Lightning invoice route configured': /LNDViewInvoice.*lightning/s,
    'WalletID parameter parsing': /walletID.*string/,
    'Address parameter parsing': /address.*string/,
    'Transaction ID parameter parsing': /txid.*string/,
    'URL parameter encoding': /encodeURIComponent/,
    'Custom getStateFromPath': /getStateFromPath/,
  },
};

let allPassed = true;

// Check notifications.ts
console.log('📁 Validating blue_modules/notifications.ts:\n');
Object.entries(validations.notifications).forEach(([check, pattern]) => {
  let passed;
  if (check === 'Security: No walletID from payload') {
    // This should NOT exist (security check)
    passed = !pattern.test(notificationsContent);
  } else {
    // This should exist
    passed = pattern.test(notificationsContent);
  }
  console.log(`${passed ? '✅' : '❌'} ${check}`);
  if (!passed) allPassed = false;
});

console.log('\n📁 Validating navigation/LinkingConfig.ts:\n');
Object.entries(validations.linkingConfig).forEach(([check, pattern]) => {
  const passed = pattern.test(linkingConfigContent);
  console.log(`${passed ? '✅' : '❌'} ${check}`);
  if (!passed) allPassed = false;
});

// Additional security checks
console.log('\n🔒 SECURITY VALIDATION:\n');
const securityChecks = [
  {
    name: 'No walletID from push payload',
    passed: !notificationsContent.includes('payload.walletID') && !notificationsContent.includes('payload["walletID"]'),
  },
  {
    name: 'Wallet lookup from storage only',
    passed: notificationsContent.includes('walletForAddress') && notificationsContent.includes('getID()'),
  },
  {
    name: 'Address ownership verification',
    passed: notificationsContent.includes('getAllExternalAddresses') || notificationsContent.includes('weOwnAddress'),
  },
  {
    name: 'Unknown wallet/address handling',
    passed: notificationsContent.includes('ignoring') && notificationsContent.includes('unknown'),
  },
];

securityChecks.forEach(check => {
  console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
  if (!check.passed) allPassed = false;
});

// Feature completeness check
console.log('\n🚀 NOTIFICATION FLOW VALIDATION:\n');
const flowChecks = [
  {
    name: 'Warm app: NavigationService.navigate for modals',
    passed: notificationsContent.includes('NavigationService.navigate') && notificationsContent.includes('ReceiveDetails'),
  },
  {
    name: 'Cold boot: Linking.openURL through LinkingConfig',
    passed: notificationsContent.includes('Linking.openURL') && notificationsContent.includes('bluewallet://'),
  },
  {
    name: 'Wait for wallets before processing',
    passed: notificationsContent.includes('waitForWalletsInitialized'),
  },
  {
    name: 'All notification types (1-4) supported',
    passed: notificationsContent.includes('type === 1') && 
           notificationsContent.includes('type === 2') && 
           notificationsContent.includes('type === 3') && 
           notificationsContent.includes('type === 4'),
  },
  {
    name: 'Modal screen navigation configured',
    passed: linkingConfigContent.includes('ReceiveDetails') && linkingConfigContent.includes("path: 'receive'"),
  },
  {
    name: 'Error handling for unknown wallets',
    passed: notificationsContent.includes('unknown wallet') || notificationsContent.includes('unknown transaction'),
  },
  {
    name: 'Robust logging throughout',
    passed: notificationsContent.includes('console.log') && notificationsContent.includes('console.error'),
  },
];

flowChecks.forEach(check => {
  console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
  if (!check.passed) allPassed = false;
});

// Testing recommendations
console.log('\n📱 TESTING RECOMMENDATIONS:\n');
const testingItems = [
  '📋 1. Send Type 2 notification with known address (warm app)',
  '📋 2. Send Type 2 notification with known address (cold boot)',
  '📋 3. Send Type 3 notification with txid (warm app)',
  '📋 4. Send Type 3 notification with txid (cold boot)',
  '📋 5. Send notification with unknown address (should be ignored)',
  '📋 6. Test modal navigation from ReceiveDetails',
  '📋 7. Test iOS push notifications end-to-end',
  '📋 8. Test Android push notifications end-to-end',
];

testingItems.forEach(item => console.log(item));

// Final status
console.log('\n==================================================');
if (allPassed) {
  console.log('✅ NOTIFICATION SYSTEM VALIDATION: PASSED');
  console.log('🎯 All checks completed successfully!');
} else {
  console.log('❌ NOTIFICATION SYSTEM VALIDATION: FAILED');
  console.log('🔧 Please review and fix the issues above');
}

console.log('\n🚨 CRITICAL REMINDERS:');
console.log('- NEVER include walletID in push notification payloads');
console.log('- ALWAYS verify address/hash ownership before routing');
console.log('- TEST on both iOS and Android in cold and warm states');
console.log('- MONITOR logs for any navigation or security issues');

process.exit(allPassed ? 0 : 1);
