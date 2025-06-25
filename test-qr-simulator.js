#!/usr/bin/env node

/**
 * Test QR code image deep links using iOS simulator
 */

const { execSync } = require('child_process');

// Test QR code image with a Bitcoin address (base64 encoded)
const testQRCodeImage =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAABNYSURBVHja7Z1NbBvHFcd/u5ItWZJlx3bsOHYSJ02cpU2BAmkBF+ihQIGih6JAgQJFe2gPPfTQQw89tIcCBXpo0UMPBQoUKFCgh6JA0UOBHgq0QIECBVqgQAu0QJO0SdokTpzYsWNLlizJH9wZcjkayeInd5ez7w8YWBJlzs7M/N/783ZmdklERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERE'; // This is a 1x1 transparent PNG for testing

function testQRCodeDeepLink() {
  console.log('🧪 Testing QR code image deep link functionality\n');

  try {
    console.log('📱 Opening QR code image in iOS simulator...');
    console.log('🔗 QR code image URL length:', testQRCodeImage.length);
    console.log('🔗 URL prefix:', testQRCodeImage.substring(0, 50) + '...');

    // Use xcrun simctl to open the URL in the iOS simulator
    const command = `xcrun simctl openurl booted "${testQRCodeImage}"`;
    console.log('🔧 Executing command:', command);

    execSync(command, { stdio: 'inherit' });

    console.log('✅ QR code image deep link sent to simulator!');
    console.log('📱 Check the app logs and simulator to see if it was processed correctly.');
    console.log('\n💡 Expected behavior:');
    console.log('   1. App should receive the data:image URL');
    console.log('   2. LinkingConfig should process the QR code');
    console.log('   3. The decoded content should be routed appropriately');
    console.log('\n🔍 Look for these log messages:');
    console.log("   - '🔗 Processing QR code image URL'");
    console.log("   - '🔗 QR detection result'");
    console.log("   - '🔗 QR code decoded successfully'");
  } catch (error) {
    console.error('❌ Error testing QR code deep link:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   - iOS simulator is running');
    console.log('   - BlueWallet app is installed in the simulator');
    console.log('   - You have Xcode command line tools installed');
  }
}

testQRCodeDeepLink();
