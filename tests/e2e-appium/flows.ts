import {
  Driver,
  clipboard,
  setClipboard,
  expectText,
  readSeed,
  replaceId,
  scrollDownToId,
  selectMenuItem,
  tapButtonWithLabel,
  tapOptionalConfirmation,
  relaunch,
  tapId,
  tapRepeatedly,
  tapAndWaitForId,
  waitForId,
  waitForIdGone,
} from './driver';

export const createWallet = async (driver: Driver, label = 'Catalyst test wallet') => {
  await tapAndWaitForId(driver, 'CreateAWallet', 'WalletNameInput');
  await replaceId(driver, 'WalletNameInput', label);
  await tapId(driver, 'ActivateBitcoinButton');
  // Create disappears while generation/storage is in progress. Do not replay
  // this non-idempotent action just because the backup screen takes over 5s.
  await tapId(driver, 'Create');
  await waitForId(driver, 'PleaseBackupScrollView', 180_000);
  const seed = await readSeed(driver);
  await scrollDownToId(driver, 'PleaseBackupScrollView', 'PleasebackupOk');
  await tapId(driver, 'PleasebackupOk');
  await waitForIdGone(driver, 'PleasebackupOk');
  await waitForId(driver, label);
  return seed;
};
export const openWallet = (driver: Driver, label = 'Catalyst test wallet') => tapAndWaitForId(driver, label, 'WalletDetails');
export const walletDetails = async (driver: Driver, label = 'Catalyst test wallet') => {
  await openWallet(driver, label);
  await tapId(driver, 'WalletDetails');
  await expectText(driver, 'WalletNameDisplay', label);
};
export const receive = async (driver: Driver, created = false) => {
  await tapId(driver, 'ReceiveButton');
  if (created) await tapButtonWithLabel(driver, 'Yes, I have.');
  await waitForId(driver, 'ReceiveCard');
};
export const deleteWallet = async (driver: Driver, label: string) => {
  await walletDetails(driver, label);
  await scrollDownToId(driver, 'WalletDetailsScroll', 'DeleteWallet');
  await tapId(driver, 'DeleteWallet');
  await tapButtonWithLabel(driver, 'Yes, delete');
  await waitForIdGone(driver, label);
};
// Same explicit-type import backdoor as Detox; avoids slow account discovery in unrelated tests.
export const importWallet = async (driver: Driver, secret: string, type: string, label: string, passphrase?: string) => {
  await selectMenuItem(driver, 'File', 'Import Wallet');
  await waitForId(driver, 'SpeedBackdoor');
  await tapRepeatedly(driver, 'SpeedBackdoor', 5);
  await replaceId(driver, 'SpeedMnemonicInput', secret);
  await replaceId(driver, 'SpeedWalletTypeInput', type);
  if (passphrase) await replaceId(driver, 'SpeedPassphraseInput', passphrase);
  await tapId(driver, 'SpeedDoImport');
  await tapOptionalConfirmation(driver, 'OK', label);
  // Verify persistence independently of whether Catalyst presented the alert.
  await relaunch(driver);
  await waitForId(driver, label, 90_000);
  await openWallet(driver, label);
};

// Exercises the scanner's decode/navigation path with the same input backdoor used by Detox.
// Camera hardware and permission prompts are not prerequisites for these flows.
// The scanner is pushed inside the focused stack (helpers/scan-qr.ts) and nested stacks
// show it as a regular modal on desktop (nestedScannerPresentation), so its multiline field
// takes the same contextual Paste as every other Catalyst TextView.
export const scanText = async (driver: Driver, value: string) => {
  await tapRepeatedly(driver, 'ScanQrBackdoorButton', 6);
  await replaceId(driver, 'scanQrBackdoorInput', value);
  await tapId(driver, 'scanQrBackdoorOkButton');
};

// Catalyst exposes the whole receive card as one accessible Copy button.
export const receiveRequest = async (driver: Driver): Promise<string> => {
  await setClipboard(driver, '');
  await tapId(driver, 'ReceiveCard');
  await driver.waitUntil(async () => !!(await clipboard(driver)), { timeout: 10_000 });
  return clipboard(driver);
};
