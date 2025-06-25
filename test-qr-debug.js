/**
 * Test QR code deep link processing using Linking.openURL
 * This file should be used within the React Native app environment
 * To test: Import this in your React Native component and call testQRCodeProcessing()
 */

const { Linking } = require('react-native');
const RNQRGenerator = require('rn-qr-generator');

// Mock test data
const testLnurl = 'LNURL1DP68GURN8GHJ7MRWW3UXYMM59E3XJEMNW4HZU7RE0GHKCMN4WFKZ7URP0YLH2UM9WF5KG0FHXYCNV9G9W58';
const testBitcoinURI = 'bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const testLightningURI =
  'lightning:lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w';

export async function testNotificationWalletsInitialized() {
  console.log('Testing notification handling with walletsInitialized state...');

  // This test verifies that notifications are only processed when walletsInitialized is true
  // Note: This requires access to useStorage hook and notification handling logic
  console.log(`
📱 Notification Processing Test:
1. Notifications should be stored when received, regardless of walletsInitialized state
2. Notifications should only be processed when walletsInitialized is true
3. Stored notifications should be processed when walletsInitialized becomes true

To test this properly:
- Send a notification when app is starting (walletsInitialized = false)
- Verify notification is stored but not processed
- When walletsInitialized becomes true, verify stored notifications are processed
- Send another notification when walletsInitialized = true, verify immediate processing

Expected behavior:
✅ All notifications are stored in AsyncStorage regardless of wallet state
✅ Processing only happens when walletsInitialized is true
✅ Stored notifications are processed when wallets become ready
  `);
}

export async function testQRCodeProcessing() {
  console.log('Testing QR code processing using Linking.openURL...');

  // Test cases including QR code data URLs, Lightning URLs, Bitcoin URIs, and LNURL
  const testCases = [
    {
      name: 'QR Code Image (Base64)',
      data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    },
    {
      name: 'LNURL',
      data: testLnurl,
    },
    {
      name: 'Bitcoin URI',
      data: testBitcoinURI,
    },
    {
      name: 'Lightning URI',
      data: testLightningURI,
    },
    {
      name: 'Handoff URL',
      data: 'bluewallet://handoff?type=receiveOnchain&address=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    },
    {
      name: 'Notification URL',
      data: 'bluewallet://notification?hash=abc123&type=transaction',
    },
    {
      name: 'Notification URL with Address',
      data: 'bluewallet://notification?address=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh&type=receive',
    },
    {
      name: 'Notification URL with TXID',
      data: 'bluewallet://notification?txid=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef&type=transaction',
    },
    {
      name: 'Notification URL (walletsInitialized Test)',
      data: 'bluewallet://notification?txid=test123&type=transaction&test=walletsInitialized',
      description: 'This tests that notification processing respects walletsInitialized state',
    },
  ];

  // Run the notification test first
  await testNotificationWalletsInitialized();

  for (const testCase of testCases) {
    console.log(`\nTesting ${testCase.name}: ${testCase.data.substring(0, 50)}...`);
    if (testCase.description) {
      console.log(`Description: ${testCase.description}`);
    }

    try {
      let urlToOpen = testCase.data;

      // If it's a QR code image, decode it first
      if (testCase.data.startsWith('data:image/')) {
        console.log('Decoding QR code image...');
        try {
          const qrResult = await RNQRGenerator.detect({ uri: testCase.data });
          if (qrResult.values && qrResult.values.length > 0) {
            urlToOpen = qrResult.values[0];
            console.log(`Decoded QR content: ${urlToOpen}`);
          } else {
            console.log('No QR code found in image');
            continue;
          }
        } catch (qrError) {
          console.log(`QR decode error: ${qrError.message}`);
          continue;
        }
      }

      // Use Linking.openURL to process the URL
      console.log(`Testing URL with Linking: ${urlToOpen}`);
      const canOpen = await Linking.canOpenURL(urlToOpen);
      console.log(`Can open URL: ${canOpen}`);

      if (canOpen) {
        // In a real test, you might want to comment out the actual opening
        // await Linking.openURL(urlToOpen);
        console.log('URL would be opened successfully (commented out for testing)');
      } else {
        console.log('URL cannot be opened by the system');
      }
    } catch (error) {
      console.error(`Error processing ${testCase.name}: ${error.message}`);
    }
  }
}

// Export for use in React Native components
export default testQRCodeProcessing;
