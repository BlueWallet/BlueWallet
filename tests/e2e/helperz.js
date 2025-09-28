import { sha256 } from '@noble/hashes/sha256';
import { element } from 'detox';

export async function waitForId(id, timeout = 33000) {
  try {
    await waitFor(element(by.id(id)))
      .toBeVisible()
      .withTimeout(timeout / 2);
  } catch (_) {
    // nop
  }

  try {
    await waitFor(element(by.id(id)))
      .toBeVisible()
      .withTimeout(timeout / 2);
    return true;
  } catch (_) {
    const msg = `Assertion failed: testID ${id} is not visible`;
    throw new Error(msg);
  }
}

export async function waitForText(text, timeout = 33000) {
  try {
    await waitFor(element(by.text(text)))
      .toBeVisible()
      .withTimeout(timeout / 2);
    return true;
  } catch (_) {
    // nop
  }

  try {
    await waitFor(element(by.text(text)))
      .toBeVisible()
      .withTimeout(timeout / 2);
    return true;
  } catch (_) {
    const msg = `Assertion failed: text "${text}" is not visible`;
    throw new Error(msg);
  }
}

export async function getSwitchValue(switchId) {
  try {
    await expect(element(by.id(switchId))).toHaveToggleValue(true);
    return true;
  } catch (_) {
    return false;
  }
}

export async function helperImportWallet(importText, walletType, expectedWalletLabel, expectedBalance, passphrase) {
  await waitForId('WalletsList');

  await element(by.id('WalletsList')).swipe('left', 'fast', 1); // in case emu screen is small and it doesnt fit
  await sleep(500); // Wait until bounce animation finishes.
  // going to Import Wallet screen and importing mnemonic
  await tapAndTapAgainIfElementIsNotVisible('CreateAWallet', 'ImportWallet');
  await element(by.id('ImportWallet')).tap();
  // tapping 5 times invisible button is a backdoor:
  for (let c = 0; c < 5; c++) {
    await element(by.id('SpeedBackdoor')).tap();
    await sleep(1000);
  }
  await element(by.id('SpeedMnemonicInput')).replaceText(importText);
  await element(by.id('SpeedWalletTypeInput')).replaceText(walletType);
  if (passphrase) await element(by.id('SpeedPassphraseInput')).replaceText(passphrase);
  await element(by.id('SpeedDoImport')).tap();

  // waiting for import result
  await waitForText('OK', 3 * 61000);
  await element(by.text('OK')).tap();

  // lets go inside wallet
  await element(by.text(expectedWalletLabel)).tap();
  // label might change in the future
  await expect(element(by.id('WalletBalance'))).toHaveText(expectedBalance);
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function hashIt(s) {
  return Buffer.from(sha256(s)).toString('hex');
}

export async function helperDeleteWallet(label, remainingBalanceSat = false) {
  await element(by.text(label)).tap();
  await element(by.id('WalletDetails')).tap();
  await element(by.id('WalletDetailsScroll')).swipe('up', 'fast', 1);
  await element(by.id('HeaderMenuButton')).tap();
  await element(by.text('Delete')).tap();
  await waitForText('Yes, delete');
  await element(by.text('Yes, delete')).tap();
  if (remainingBalanceSat) {
    await element(by.type('android.widget.EditText')).typeText(remainingBalanceSat);
    await element(by.text('Delete')).tap();
  }
  await waitForId('NoTransactionsMessage');
}

/*

module.exports.helperImportWallet = helperImportWallet;
module.exports.waitForId = waitForId;
module.exports.waitForText = waitForText;
module.exports.sleep = sleep;
module.exports.hashIt = hashIt;
module.exports.helperDeleteWallet = helperDeleteWallet;

*/

/**
 * a hack to extract element text. warning, this might break in future
 * @see https://github.com/wix/detox/issues/445
 *
 * @returns {Promise<string>}
 */
export async function extractTextFromElementById(id) {
  try {
    await expect(element(by.id(id))).toHaveText('_unfoundable_text');
  } catch (error) {
    if (device.getPlatform() === 'ios') {
      const start = `accessibilityLabel was "`;
      const end = '" on ';
      const errorMessage = error.message.toString();
      const [, restMessage] = errorMessage.split(start);
      const [label] = restMessage.split(end);
      return label;
    } else {
      const start = 'Got:';
      const end = '}"';
      const errorMessage = error.message.toString();
      const [, restMessage] = errorMessage.split(start);
      const [label] = restMessage.split(end);
      const value = label.split(',');
      const combineText = value.find(i => i.includes('text=')).trim();
      const [, elementText] = combineText.split('=');
      return elementText;
    }
  }
}

export const expectToBeVisible = async id => {
  try {
    await expect(element(by.id(id))).toBeVisible();
    return true;
  } catch (e) {
    return false;
  }
};

export async function helperCreateWallet(walletName) {
  await element(by.id('WalletsList')).swipe('left', 'fast', 1); // in case emu screen is small and it doesnt fit
  await sleep(200); // Wait until bounce animation finishes.
  await tapAndTapAgainIfElementIsNotVisible('CreateAWallet', 'WalletNameInput');
  await element(by.id('WalletNameInput')).replaceText(walletName || 'cr34t3d');
  await waitForId('ActivateBitcoinButton');
  await element(by.id('ActivateBitcoinButton')).tap();
  await element(by.id('ActivateBitcoinButton')).tap();
  // why tf we need 2 taps for it to work..? mystery
  await tapAndTapAgainIfElementIsNotVisible('Create', 'PleaseBackupScrollView');

  await element(by.id('PleaseBackupScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit

  await waitForId('PleasebackupOk');
  await element(by.id('PleasebackupOk')).tap();
  await expect(element(by.id('WalletsList'))).toBeVisible();
  await element(by.id('WalletsList')).swipe('right', 'fast', 1); // in case emu screen is small and it doesnt fit
  await expect(element(by.id(walletName || 'cr34t3d'))).toBeVisible();
}

export async function tapAndTapAgainIfElementIsNotVisible(idToTap, idToCheckVisible) {
  // tap
  await element(by.id(idToTap)).tap();

  // check if visible
  try {
    await waitFor(element(by.id(idToCheckVisible)))
      .toBeVisible()
      .withTimeout(3_000);
    return; // did not throw? its visible, return
  } catch (_) {}

  // did not return so its not visible, lets tap again
  await element(by.id(idToTap)).tap();

  // check visibility again, this time no try-catch, if it fails it fails
  await waitFor(element(by.id(idToCheckVisible)))
    .toBeVisible()
    .withTimeout(3_000);
}

export async function tapAndTapAgainIfTextIsNotVisible(textToTap, textToCheckVisible) {
  // tap
  await element(by.text(textToTap)).tap();

  // check if visible
  try {
    await waitFor(element(by.text(textToCheckVisible)))
      .toBeVisible()
      .withTimeout(3_000);
    return; // did not throw? its visible, return
  } catch (_) {}

  // did not return so its not visible, lets tap again
  await element(by.text(textToTap)).tap();

  // check visibility again, this time no try-catch, if it fails it fails
  await waitFor(element(by.text(textToCheckVisible)))
    .toBeVisible()
    .withTimeout(3_000);
}

export async function tapIfPresent(id) {
  try {
    await element(by.id(id)).tap();
  } catch (_) {}
  // no need to check for visibility, just silently ignore exception if such testID is not present
}

export async function tapIfTextPresent(text) {
  try {
    await element(by.text(text)).tap();
  } catch (_) {}
  // no need to check for visibility, just silently ignore exception if such testID is not present
}

export async function countElements(testId) {
  let count = 0;
  while (true) {
    try {
      await expect(element(by.id(testId)).atIndex(count)).toExist();
      count++;
    } catch (_) {
      break;
    }
  }
  return count;
}

// Helper function to determine QR code image file based on text content patterns
// Maps text patterns to corresponding QR image files generated by CI workflow
function getQRImageForText(text) {
  // Pattern-based mapping to QR image files
  if (text.split(' ').length >= 12) {
    // Multi-word seed phrases
    return 'seed-phrase-multisig.png';
  } else if (text.startsWith('lnbc')) {
    // Lightning invoices
    return 'lightning-invoice.png';
  } else if (text.startsWith('lndhub://')) {
    // LNDHub connections
    return 'lndhub-connection.png';
  } else if (text.toLowerCase().startsWith('ur:crypto-psbt/hdrn')) {
    // Unsigned PSBT UR
    return 'unsigned-psbt-ur.png';
  } else if (text.toLowerCase().startsWith('ur:crypto-psbt/hdwt')) {
    // Signed PSBT UR
    return 'signed-psbt-ur.png';
  } else if (text.toLowerCase().startsWith('ur:crypto-psbt')) {
    // Other UR PSBTs
    return 'marketplace-ur-psbt.png';
  } else if (text.toLowerCase().startsWith('ur:crypto-account')) {
    // UR crypto-account
    return 'ur-crypto-account.png';
  } else if (text.startsWith('cHNidP8B')) {
    // Base64 PSBT
    return 'psbt-base64.png';
  } else if (text.includes('azte.co')) {
    // Azteco vouchers
    return 'azteco-voucher.png';
  } else if (text.includes('bitcoin:') && text.includes('lightning=')) {
    // BIP21 with Lightning fallback
    return 'bip21-with-lightning.png';
  } else if (text.includes('bitcoin:') && text.includes('pj=')) {
    // PayJoin BIP21
    return 'payjoin-bip21.png';
  } else if (text.startsWith('bitcoin:')) {
    // Simple BIP21
    return 'bip21-simple.png';
  } else if (text.startsWith('bc1q') && text === 'bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7') {
    // Specific plain address used in tests
    return 'plain-bitcoin-address.png';
  } else if (text.startsWith('bc1q') || text.startsWith('1') || text.startsWith('3')) {
    // Bitcoin addresses
    return 'marketplace-bitcoin-address.png';
  }
  
  // Default fallback
  return 'marketplace-bitcoin-address.png';
}

// Function to set QR code image in virtual scene camera by text content
async function setVirtualSceneQRFromText(text) {
  const qrImageFile = getQRImageForText(text);
  
  // Use the proper image-based method
  await setVirtualSceneQRFromImage(qrImageFile);
  
  console.log(`✅ Set virtual scene QR for text: ${text.substring(0, 50)}... using image: ${qrImageFile}`);
}

// Function to set QR code image in virtual scene camera by image filename
async function setVirtualSceneQRFromImage(imageName) {
  const { exec } = require('child_process');
  const path = require('path');
  
  return new Promise(resolve => {
    const sourcePath = path.join(__dirname, 'qr-images', imageName);
    
    // Get Android SDK path
    const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    if (!androidHome) {
      console.warn('ANDROID_HOME or ANDROID_SDK_ROOT not set, falling back to user directory');
      const fallbackDir = path.join(process.env.HOME, '.android', 'camera');
      const fallbackPath = path.join(fallbackDir, 'default-qr.png');
      
      exec(`mkdir -p "${fallbackDir}" && cp "${sourcePath}" "${fallbackPath}"`, error => {
        if (error) {
          console.warn('Failed to set virtual scene QR (fallback):', error.message);
        } else {
          console.log(`✅ Set virtual scene QR to: ${imageName} (fallback method)`);
        }
        resolve();
      });
      return;
    }
    
    // Use proper Android emulator virtual scene method
    const emulatorResourcesDir = path.join(androidHome, 'emulator', 'resources');
    const targetPath = path.join(emulatorResourcesDir, imageName);
    const posterFile = path.join(emulatorResourcesDir, 'Toren1BD.posters');
    
    // Copy image to emulator resources directory
    exec(`cp "${sourcePath}" "${targetPath}"`, copyError => {
      if (copyError) {
        console.warn('Failed to copy QR image to emulator resources:', copyError.message);
        resolve();
        return;
      }
      
      // Update poster configuration to use the new image with smaller size for better scanning
      const posterContent = `poster customsize 0.5 0.5
position 0 0 -1.2
rotation 0 0 0
default ${imageName}`;
      
      require('fs').writeFileSync(posterFile, posterContent);
      console.log(`✅ Set virtual scene QR to: ${imageName} (smaller size for better scanning)`);
      resolve();
    });
  });
}

// Function to initialize virtual scene camera setup
export async function initVirtualSceneCamera() {
  const { exec } = require('child_process');
  const path = require('path');
  
  return new Promise(resolve => {
    const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    
    if (!androidHome) {
      console.warn('⚠️  ANDROID_HOME or ANDROID_SDK_ROOT not set');
      console.warn('Virtual scene camera may not work properly');
      console.warn('Please set ANDROID_HOME environment variable');
      resolve();
      return;
    }
    
    const emulatorResourcesDir = path.join(androidHome, 'emulator', 'resources');
    const defaultQRSource = path.join(__dirname, 'qr-images', 'marketplace-bitcoin-address.png');
    const defaultQRTarget = path.join(emulatorResourcesDir, 'marketplace-bitcoin-address.png');
    const posterFile = path.join(emulatorResourcesDir, 'Toren1BD.posters');
    
    // Create resources directory if it doesn't exist
    exec(`mkdir -p "${emulatorResourcesDir}"`, mkdirError => {
      if (mkdirError) {
        console.warn('Failed to create emulator resources directory:', mkdirError.message);
        resolve();
        return;
      }
      
      // Copy default QR image to resources
      exec(`cp "${defaultQRSource}" "${defaultQRTarget}"`, copyError => {
        if (copyError) {
          console.warn('Failed to copy default QR image:', copyError.message);
        } else {
          console.log('📱 Copied default QR image to emulator resources');
        }
        
        // Create/update poster configuration with smaller size for better QR scanning
        const posterContent = `poster customsize 0.5 0.5
position 0 0 -1.2
rotation 0 0 0
default marketplace-bitcoin-address.png`;
        
        try {
          require('fs').writeFileSync(posterFile, posterContent);
          console.log('🎥 Virtual scene camera initialized with smaller QR poster (0.5x0.5)');
          console.log('📋 Poster file:', posterFile);
          console.log('🖼️  Default image: marketplace-bitcoin-address.png');
        } catch (writeError) {
          console.warn('Failed to write poster configuration:', writeError.message);
        }
        
        resolve();
      });
    });
  });
}

export async function scanText(text) {
  // Set the QR code image in the virtual scene based on text content
  await setVirtualSceneQRFromText(text);
  
  // Wait for camera to show the new QR code and auto-scan it
  await sleep(3000); // give time for virtual scene to update and camera to scan
  
  // Only call getQRImageForText once and use the result for logging
  const qrImageFile = getQRImageForText(text);
  console.log(`Real camera scanning QR for: ${text.substring(0, 50)}... using image: ${qrImageFile}`);
}

// Function to scan QR code directly by image name (bypasses text-to-image mapping)
export async function scanQRImage(imageName) {
  // Set the QR code image directly in the virtual scene
  await setVirtualSceneQRFromImage(imageName);
  
  // Wait for camera to show the new QR code and auto-scan it
  await sleep(3000); // give time for virtual scene to update and camera to scan
  
  console.log(`Real camera scanning QR image: ${imageName}`);
}

// Function to handle animated QR sequences (for UR PSBTs)
export async function scanAnimatedQR(qrFrames) {
  console.log(`Scanning animated QR sequence with ${qrFrames.length} frames`);
  
  // For animated sequences, we'll cycle through the frames
  for (let i = 0; i < qrFrames.length; i++) {
    const frame = qrFrames[i];
    await setVirtualSceneQRFromImage(frame);
    await sleep(1000); // Wait between frames
    
    console.log(`Animated QR frame ${i + 1}/${qrFrames.length}: ${frame}`);
  }
  
  // Give extra time for the wallet to process the complete sequence
  await sleep(2000);
}

// Function to scan QR with specific image file (when we know exactly which image to use)
export async function scanQRWithImage(imageName, waitTime = 3000) {
  const { exec } = require('child_process');
  const path = require('path');
  
  return new Promise(resolve => {
    const sourcePath = path.join(__dirname, 'qr-images', imageName);
    const targetPath = process.env.HOME + '/.android/camera/default-qr.png';
    
    exec(`cp "${sourcePath}" "${targetPath}"`, error => {
      if (error) {
        console.warn('Failed to set virtual scene QR image:', error.message);
      } else {
        console.log(`Set virtual scene to image: ${imageName}`);
      }
      resolve();
    });
  }).then(() => sleep(waitTime));
}
