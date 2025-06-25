#!/usr/bin/env node

/**
 * QR Code Image Sharing Test Instructions
 * 
 * This te    console.log('✅ Sample QR code generated successfully!');
    console.log('📝 You can use this base64 data to create a test image:');
    console.log('💾 Save this as a PNG file and test sharing it to BlueWallet:');
    console.log(`data:image/png;base64,${qrResult.base64.substring(0, 100)}...`);
    console.log('');
    console.log('🎯 QUICK TEST STEPS:');
    console.log('1. Copy the base64 data below and save as a PNG file');
    console.log('2. Save that PNG to your photo library');
    console.log('3. Share it to BlueWallet from Photos app');
    console.log('4. Observe the behavior and check console logs');
    console.log('');
    console.log('🔗 Full base64 data (copy this to create a test image):');
    console.log(qrResult.base64);xplains how to manually test QR code image sharing functionality
 * in BlueWallet using the iOS/Android share sheet mechanism.
 */

console.log(`
🧪 QR CODE IMAGE SHARING TEST INSTRUCTIONS
==========================================

BlueWallet supports receiving QR code images through the native share sheet.
This is different from URL deep linking - it uses the OS sharing mechanism.

📱 HOW TO TEST:
==============

1. PREPARE A QR CODE IMAGE:
   - Create or find a QR code image containing a Bitcoin address or Lightning invoice
   - Save it to your device's photo library
   - Or screenshot a QR code from any website/app

2. OPEN THE PHOTOS APP (or any app with images):
   - Navigate to the QR code image you want to test
   - Tap the Share button (square with arrow pointing up)

3. SELECT BLUEWALLET:
   - In the share sheet that appears, look for BlueWallet
   - Tap on BlueWallet to share the image

4. OBSERVE THE BEHAVIOR:
   - BlueWallet should open and process the QR code
   - The decoded Bitcoin/Lightning data should be handled appropriately
   - Check the console logs for debug information

📋 WHAT TO TEST:
===============

• Bitcoin address QR codes
• Lightning invoice QR codes  
• Lightning address QR codes
• LNURL QR codes
• Invalid/unreadable QR codes (to test error handling)

🔍 DEBUGGING:
============

• Check React Native Metro logs for debug output
• Look for console.log messages starting with:
  - 📸 (from showImagePickerAndReadImage function)
  - 🔍 (from QR code detection)
  - 🚀 (from navigation handling)

⚠️  COMMON ISSUES:
=================

• Make sure BlueWallet is properly installed and appears in share sheet
• Ensure the QR code image is clear and readable
• Test with different image formats (PNG, JPEG)
• Try both light and dark QR codes

`);

const RNQRGenerator = require('rn-qr-generator');

// Generate a sample QR code for testing
async function generateSampleQRCode() {
  const testBitcoinAddress = 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.001&label=Test';

  try {
    console.log('🔍 Generating sample QR code for testing...');
    console.log('📋 Content:', testBitcoinAddress);

    const qrResult = await RNQRGenerator.generate({
      value: testBitcoinAddress,
      height: 300,
      width: 300,
      format: 'base64',
    });

    console.log('✅ Sample QR code generated successfully!');
    console.log('� You can use this base64 data to create a test image:');
    console.log('💾 Save this as a PNG file and test sharing it to BlueWallet:');
    console.log(`data:image/png;base64,${qrResult.base64.substring(0, 100)}...`);

    return qrResult.base64;
  } catch (error) {
    console.error('❌ Error generating sample QR code:', error);
    return null;
  }
}

// Main execution
generateSampleQRCode().catch(console.error);
