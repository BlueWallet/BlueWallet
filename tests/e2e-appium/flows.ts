import { Transaction } from 'bitcoinjs-lib';
import {
  Driver,
  clipboard,
  setClipboard,
  expectText,
  getText,
  pressKey,
  prompt,
  readSeed,
  replaceFocusedText,
  replaceId,
  scrollDownToId,
  selectMenuItem,
  tapButtonWithLabel,
  tapOptionalConfirmation,
  relaunch,
  tapId,
  tapRepeatedly,
  waitForId,
  waitForIdGone,
} from './driver';
import { secret } from './config';

export const FUNDED_LABEL = 'Imported HD SegWit (BIP84 Bech32 Native)';

export const FUNDED_BALANCE = '0.00105526';

// Detox taps CreateAWallet; the macOS menu bar is the desktop way to the same screen.
export const createWallet = async (driver: Driver, label = 'cr34t3d') => {
  await selectMenuItem(driver, 'File', 'Add Wallet');
  await waitForId(driver, 'WalletNameInput');
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

// The sidebar card carries the wallet label as testID; the detail pane then shows WalletDetails.
export const openWallet = async (driver: Driver, label = 'cr34t3d') => {
  await tapId(driver, label);
  return waitForId(driver, 'WalletDetails');
};

// CreateAWallet lives in the permanent drawer, so the detail pane leaving its wallet screen
// (WalletDetails header button gone) is the real post-condition.
export const backToWallets = async (driver: Driver) => {
  await selectMenuItem(driver, 'View', 'Back to Wallets');
  await waitForIdGone(driver, 'WalletDetails');
  await waitForId(driver, 'CreateAWallet');
};

export const send = async (driver: Driver) => {
  await selectMenuItem(driver, 'File', 'Send');
  await waitForId(driver, 'AddressInput');
};

export const receive = async (driver: Driver, created = false) => {
  await selectMenuItem(driver, 'File', 'Receive');
  if (created) await tapButtonWithLabel(driver, 'Yes, I have.');
  await waitForId(driver, 'ReceiveCard');
};

export const walletDetails = async (driver: Driver, label = 'cr34t3d') => {
  await openWallet(driver, label);
  await selectMenuItem(driver, 'File', 'Wallet Details');
  await expectText(driver, 'WalletNameDisplay', label);
};

export const deleteWallet = async (driver: Driver, label: string, remainingBalanceSat?: string) => {
  await walletDetails(driver, label);
  await scrollDownToId(driver, 'WalletDetailsScroll', 'DeleteWallet');
  await tapId(driver, 'DeleteWallet');
  await tapButtonWithLabel(driver, 'Yes, delete');
  if (remainingBalanceSat) await prompt(driver, remainingBalanceSat, 'Delete');
  await waitForIdGone(driver, label);
};

// Same explicit-type import backdoor as Detox's helperImportWallet; avoids slow account discovery.
export const importWallet = async (
  driver: Driver,
  mnemonic: string,
  type: string,
  label: string,
  expectedBalance?: string,
  passphrase?: string,
) => {
  await selectMenuItem(driver, 'File', 'Import Wallet');
  await waitForId(driver, 'SpeedBackdoor');
  await tapRepeatedly(driver, 'SpeedBackdoor', 5);
  await replaceId(driver, 'SpeedMnemonicInput', mnemonic);
  await replaceId(driver, 'SpeedWalletTypeInput', type);
  if (passphrase) await replaceId(driver, 'SpeedPassphraseInput', passphrase);
  await tapId(driver, 'SpeedDoImport');
  await tapOptionalConfirmation(driver, 'OK', label);
  // Verify persistence independently of whether Catalyst presented the alert.
  await relaunch(driver);
  await waitForId(driver, label, 90_000);
  await openWallet(driver, label);
  // Public Electrum servers answer slowly on Intel CI.
  if (expectedBalance) await expectText(driver, 'WalletBalance', expectedBalance, 180_000);
};

export const importFundedWallet = (driver: Driver) =>
  importWallet(driver, secret('HD_MNEMONIC_BIP84'), 'HDsegwitBech32', FUNDED_LABEL, FUNDED_BALANCE);

export const setCustomFeeRate = async (driver: Driver, rate: number) => {
  await tapId(driver, 'chooseFee');
  await tapId(driver, 'feeCustomContainerButton');
  await replaceFocusedText(driver, String(rate));
  await pressKey(driver, 'XCUIKeyboardKeyReturn');
  await waitForId(driver, 'chooseFee');
};

export const createTransaction = async (driver: Driver) => {
  await tapId(driver, 'CreateTransactionButton');
  await tapId(driver, 'TransactionDetailsButton');
  return Transaction.fromHex(await getText(driver, 'TxhexInput'));
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

export const scanUrParts = async (driver: Driver, parts: string[]) => {
  for (const [index, part] of parts.entries()) {
    process.stdout.write(`[Catalyst] Scanning UR part ${index + 1}/${parts.length}\n`);
    await scanText(driver, part);
    if (index < parts.length - 1) await waitForId(driver, 'UrProgressBar');
  }
  await waitForIdGone(driver, 'ScanQrBackdoorButton');
};

// Catalyst exposes the whole receive card as one accessible Copy button.
export const receiveRequest = async (driver: Driver): Promise<string> => {
  await setClipboard(driver, '');
  await tapId(driver, 'ReceiveCard');
  await driver.waitUntil(async () => !!(await clipboard(driver)), { timeout: 10_000 });
  return clipboard(driver);
};
