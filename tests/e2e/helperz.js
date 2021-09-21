const createHash = require('create-hash');

export async function yo(id, timeout = 33000) {
  return waitFor(element(by.id(id)))
    .toBeVisible()
    .withTimeout(timeout);
}

export async function sup(text, timeout = 33000) {
  return waitFor(element(by.text(text)))
    .toBeVisible()
    .withTimeout(timeout);
}

export async function helperImportWallet(importText, walletType, expectedWalletLabel, expectedBalance, passphrase) {
  await yo('WalletsList');

  await element(by.id('WalletsList')).swipe('left', 'fast', 1); // in case emu screen is small and it doesnt fit
  // going to Import Wallet screen and importing mnemonic
  await element(by.id('CreateAWallet')).tap();
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
  await sup('OK', 3 * 61000);
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
  return createHash('sha256').update(s).digest().toString('hex');
}

export async function helperDeleteWallet(label, remainingBalanceSat = false) {
  await element(by.text(label)).tap();
  await element(by.id('WalletDetails')).tap();
  await element(by.id('WalletDetailsScroll')).swipe('up', 'fast', 1);
  await element(by.id('DeleteButton')).tap();
  await sup('Yes, delete');
  await element(by.text('Yes, delete')).tap();
  if (remainingBalanceSat) {
    await element(by.type('android.widget.EditText')).typeText(remainingBalanceSat);
    await element(by.text('OK')).tap();
  }
  await expect(element(by.id('NoTransactionsMessage'))).toBeVisible();
}

/*

module.exports.helperImportWallet = helperImportWallet;
module.exports.yo = yo;
module.exports.sup = sup;
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
  await element(by.id('CreateAWallet')).tap();
  await element(by.id('WalletNameInput')).replaceText(walletName || 'cr34t3d');
  await yo('ActivateBitcoinButton');
  await element(by.id('ActivateBitcoinButton')).tap();
  await element(by.id('ActivateBitcoinButton')).tap();
  // why tf we need 2 taps for it to work..? mystery
  await element(by.id('Create')).tap();

  await yo('PleaseBackupScrollView');
  await element(by.id('PleaseBackupScrollView')).swipe('up', 'fast', 1); // in case emu screen is small and it doesnt fit

  await yo('PleasebackupOk');
  await element(by.id('PleasebackupOk')).tap();
  await expect(element(by.id('WalletsList'))).toBeVisible();
  await element(by.id('WalletsList')).swipe('right', 'fast', 1); // in case emu screen is small and it doesnt fit
  await expect(element(by.id(walletName || 'cr34t3d'))).toBeVisible();
}

export async function helperSwitchAdvancedMode() {
  await element(by.id('SettingsButton')).tap();
  await element(by.id('GeneralSettings')).tap();
  await element(by.id('AdvancedMode')).tap();
  await device.pressBack();
  await device.pressBack();
}
