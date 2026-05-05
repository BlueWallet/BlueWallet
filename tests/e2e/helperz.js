import { sha256 } from '@noble/hashes/sha256';
import { element } from 'detox';

/**
 * Captures a stack trace at the call site, excluding the given function from the trace.
 * Used to make Detox errors point to the spec file line instead of helper internals.
 */
function captureCallsite(excludeFn) {
  const callsite = {};
  Error.captureStackTrace(callsite, excludeFn);
  return callsite;
}

/**
 * Rethrows err with the stack rewritten to point at the call site.
 */
function rethrowWithCallsite(err, callsite) {
  if (err && typeof err === 'object' && callsite && callsite.stack) {
    const name = err.name || 'Error';
    const message = err.message || '';
    const frames = callsite.stack.split('\n').slice(1).join('\n');
    err.stack = `${name}: ${message}\n${frames}`;
  }
  throw err;
}

export async function waitForId(id, timeout = 33000) {
  const callsite = captureCallsite(waitForId);
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
  } catch (err) {
    rethrowWithCallsite(err, callsite);
  }
}

export async function waitForText(text, timeout = 33000) {
  const callsite = captureCallsite(waitForText);
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
  } catch (err) {
    rethrowWithCallsite(err, callsite);
  }
}

/** Waits for `accessibilityLabel` (Detox `by.label`), e.g. full address while UI text is multiline. */
export async function waitForLabel(label, timeout = 33000) {
  const callsite = captureCallsite(waitForLabel);
  try {
    await waitFor(element(by.label(label)))
      .toBeVisible()
      .withTimeout(timeout / 2);
    return true;
  } catch (_) {
    // nop
  }

  try {
    await waitFor(element(by.label(label)))
      .toBeVisible()
      .withTimeout(timeout / 2);
  } catch (err) {
    rethrowWithCallsite(err, callsite);
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

// Detox's waitFor() doesn't expose toHaveToggleValue, so poll expect() until the switch reaches
// the expected state (or throw after timeoutMs).
export async function waitForSwitchValue(switchId, expectedValue, timeoutMs = 8000) {
  const callsite = captureCallsite(waitForSwitchValue);
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      await expect(element(by.id(switchId))).toHaveToggleValue(expectedValue);
      return;
    } catch (err) {
      lastErr = err;
      await sleep(250);
    }
  }
  rethrowWithCallsite(lastErr || new Error(`Timed out waiting for ${switchId} == ${expectedValue}`), callsite);
}

export async function helperImportWallet(importText, walletType, expectedWalletLabel, expectedBalance, passphrase) {
  await waitForId('WalletsList');
  await waitFor(element(by.id('CreateAWallet')))
    .toBeVisible()
    .whileElement(by.id('WalletsList'))
    .scroll(500, 'right'); // in case emu screen is small and it doesnt fit
  // going to Import Wallet screen and importing mnemonic
  await tapAndTapAgainIfElementIsNotVisible('CreateAWallet', 'ImportWallet');
  await element(by.id('ImportWallet')).tap();
  await waitForId('SpeedBackdoor');
  // tapping 5 times invisible button is a backdoor:
  for (let c = 0; c < 5; c++) {
    await element(by.id('SpeedBackdoor')).tap();
  }
  await element(by.id('SpeedMnemonicInput')).replaceText(importText);
  await element(by.id('SpeedWalletTypeInput')).replaceText(walletType);
  if (device.getPlatform() === 'ios') {
    await element(by.id('SpeedWalletTypeInput')).tapReturnKey();
  }
  if (passphrase) {
    await element(by.id('SpeedPassphraseInput')).replaceText(passphrase);
    await element(by.id('SpeedPassphraseInput')).tapReturnKey();
    await waitForKeyboardToClose();
  }
  await element(by.id('SpeedDoImport')).tap();

  try {
    await sleep(1_000);
    await element(by.id('SpeedDoImport')).tap(); // sometimes doesnt work the 1st time
  } catch (_) {}

  // waiting for import result
  await waitForText('OK', 3 * 61000);
  await element(by.text('OK')).tap();
  await scrollUpOnHomeScreen();

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
  await sleep(200);
  await element(by.id('HeaderMenuButton')).tap();
  await element(by.text('Delete')).tap();
  await waitForText('Yes, delete');
  await element(by.text('Yes, delete')).tap();
  if (remainingBalanceSat) {
    // await element(by.type('android.widget.EditText')).typeText(remainingBalanceSat);
    await typeTextIntoAlertInput(remainingBalanceSat);
    await element(by.text('Delete')).tap();
  }
  await waitForId('NoTransactionsMessage');
}

/**
 * Extracts element text or label using getAttributes()
 * @returns {Promise<string>}
 */
export async function extractTextFromElementById(id) {
  const attributes = await element(by.id(id)).getAttributes();
  return attributes.value || attributes.label;
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
  await waitFor(element(by.id('CreateAWallet')))
    .toBeVisible()
    .whileElement(by.id('WalletsList'))
    .scroll(500, 'right'); // in case emu screen is small and it doesnt fit

  await sleep(200); // Wait until bounce animation finishes.
  await tapAndTapAgainIfElementIsNotVisible('CreateAWallet', 'WalletNameInput');
  await element(by.id('WalletNameInput')).replaceText(walletName || 'cr34t3d');
  await waitForId('ActivateBitcoinButton');
  await element(by.id('ActivateBitcoinButton')).tap();
  await element(by.id('ActivateBitcoinButton')).tap();
  // why tf we need 2 taps for it to work..? mystery
  await tapAndTapAgainIfElementIsNotVisible('Create', 'PleaseBackupScrollView');

  await waitFor(element(by.id('PleasebackupOk')))
    .toBeVisible()
    .whileElement(by.id('PleaseBackupScrollView'))
    .scroll(500, 'down'); // in case emu screen is small and it doesnt fit

  await element(by.id('PleasebackupOk')).tap();
  await scrollUpOnHomeScreen();
  await expect(element(by.id('WalletsList'))).toBeVisible();
  await element(by.id('WalletsList')).swipe('right', 'fast', 1); // in case emu screen is small and it doesnt fit
  await sleep(200);
  await expect(element(by.id(walletName || 'cr34t3d'))).toBeVisible();
}

export async function tapAndTapAgainIfElementIsNotVisible(idToTap, idToCheckVisible) {
  const callsite = captureCallsite(tapAndTapAgainIfElementIsNotVisible);
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
  try {
    await waitFor(element(by.id(idToCheckVisible)))
      .toBeVisible()
      .withTimeout(3_000);
  } catch (err) {
    rethrowWithCallsite(err, callsite);
  }
}

export async function tapAndTapAgainIfTextIsNotVisible(textToTap, textToCheckVisible) {
  const callsite = captureCallsite(tapAndTapAgainIfTextIsNotVisible);
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
  try {
    await waitFor(element(by.text(textToCheckVisible)))
      .toBeVisible()
      .withTimeout(3_000);
  } catch (err) {
    rethrowWithCallsite(err, callsite);
  }
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

/**
 * Confirms password dialogs in a platform-safe way.
 * Android must tap a visible confirmation to keep test flow deterministic.
 * iOS can fall back between id-based and text-based buttons.
 */
export async function confirmPasswordDialog() {
  if (device.getPlatform() === 'android') {
    await waitFor(element(by.text('OK')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text('OK')).tap();
    return;
  }

  try {
    await waitFor(element(by.id('OKButton')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('OKButton')).tap();
  } catch (_) {
    await waitFor(element(by.text('OK')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text('OK')).tap();
  }
}

export async function countElements(testId) {
  let count = 0;
  while (true) {
    try {
      await expect(element(by.id(testId)).atIndex(count)).toBeVisible();
      count++;
    } catch (_) {
      break;
    }
  }
  return count;
}

export async function scanText(text) {
  await waitForId('ScanQrBackdoorButton');
  for (let c = 0; c <= 5; c++) {
    await element(by.id('ScanQrBackdoorButton')).tap();
  }
  await element(by.id('scanQrBackdoorInput')).replaceText(text);
  await element(by.id('scanQrBackdoorOkButton')).tap();
}

export async function setCustomFeeRate(feeRate) {
  await waitForId('chooseFee');
  await element(by.id('chooseFee')).tap();
  await waitForId('feeCustomContainerButton');
  await element(by.id('feeCustomContainerButton')).tap();
  await waitForId('feeCustom');
  await element(by.id('feeCustom')).replaceText(String(feeRate));
  await element(by.id('feeCustom')).tapReturnKey();
  await waitForKeyboardToClose();
}

export async function goBack() {
  if (device.getPlatform() === 'ios') {
    try {
      await element(by.id('BackButton')).atIndex(0).tap();
    } catch (_backError) {
      try {
        await element(by.id('NavigationCloseButton')).atIndex(0).tap();
      } catch (_closeButtonError) {
        try {
          await element(by.label('Back')).atIndex(0).tap();
        } catch (_backLabelError) {
          await element(by.text('Close')).atIndex(0).tap();
        }
      }
    }
  } else {
    await device.pressBack();
  }
}

export async function typeTextIntoAlertInput(text) {
  if (device.getPlatform() === 'android') {
    await element(by.type('android.widget.EditText')).replaceText(text);
  } else {
    await element(by.type('_UIAlertControllerTextField')).replaceText(text);
  }
  await sleep(1000);
}

/**
 * Scrolls up on the home screen. This is needed on the iOS.
 */
export async function scrollUpOnHomeScreen() {
  if (device.getPlatform() !== 'ios') {
    return;
  }
  try {
    await element(by.type('RCTEnhancedScrollView').withDescendant(by.type('RCTEnhancedScrollView'))).swipe('down', 'slow', 0.5);
  } catch (_) {
    // if no wallets there will be just one scroll
    await element(by.type('RCTEnhancedScrollView')).swipe('down', 'slow', 0.5);
  }
  await sleep(200); // bounce animation
}

// We really only need this function when running tests locally.
// In GitHub Actions, we run Android tests with a hardware keyboard, so the onscreen keyboard doesn’t appear.
// On iOS, it doesn’t cause any known issues.
export async function waitForKeyboardToClose() {
  if (device.getPlatform() === 'ios' || process.env.CI) {
    return;
  }
  await sleep(500);
}

// Bundle id used by simctl/applesimutils on iOS. Mirrors `javaPackageName` in package.json
// and the iOS Info.plist; if either is renamed, update here too.
const IOS_BUNDLE_ID = 'io.bluewallet.bluewallet';

// Force-kill the booted iOS simulator app. Used by tests that put the app into a state where
// graceful teardown would itself trigger a biometric prompt (and thus hang). No-op on non-iOS
// and silently swallows simctl errors so a missing/already-dead process doesn't fail teardown.
export function terminateBootedApp() {
  if (device.getPlatform() !== 'ios') return;
  try {
    require('child_process').execSync(`xcrun simctl terminate booted ${IOS_BUNDLE_ID}`, { stdio: 'ignore' });
  } catch (_) {
    // intentionally ignored — best-effort teardown
  }
}

// Biometric helpers. iOS-only today; android support pending ADB wiring.

export async function setupBiometricEnrollment() {
  if (device.getPlatform() !== 'ios') return;
  await device.setBiometricEnrollment(true);
}

// Bypass detox.device.matchFace() because it post-awaits waitForActive(), which hangs forever
// whenever the underlying applesimutils signal was fired before the iOS Face ID prompt appeared
// (wix/Detox#2981, unresolved). Skipping waitForActive means callers must rely on their own
// subsequent waitFor*/expect to re-sync state.
async function rawBiometric(flag) {
  const { exec } = require('child_process');
  await new Promise((resolve, reject) => {
    exec(`applesimutils --booted ${flag}`, err => (err ? reject(err) : resolve()));
  });
}

// The Face ID system prompt exposes its `promptMessage` as an accessibility label that Detox's
// iOS bridge can reach via plain by.label(). Mirror loc.settings.biom_conf_identity from
// hooks/useBiometrics.ts; tests assume the default (English) locale.
const BIOMETRIC_PROMPT_LABEL = 'Please confirm your identity.';
const BIOMETRIC_PROMPT_TIMEOUT_MS = 8000;

async function waitForBiometricPrompt() {
  await waitFor(element(by.label(BIOMETRIC_PROMPT_LABEL)).atIndex(0))
    .toBeVisible()
    .withTimeout(BIOMETRIC_PROMPT_TIMEOUT_MS);
}

export async function matchBiometric() {
  if (device.getPlatform() !== 'ios') throw new Error('matchBiometric: android not yet supported');
  await waitForBiometricPrompt();
  await rawBiometric('--biometricMatch');
}

export async function failBiometric() {
  if (device.getPlatform() !== 'ios') throw new Error('failBiometric: android not yet supported');
  await waitForBiometricPrompt();
  await rawBiometric('--biometricNonmatch');
}

// Navigate Settings → Security and flip the biometric switch ON. Idempotent: skips the toggle
// if biometric is already enabled. iOS-only (android: no-op). With returnHome=true (default),
// goes back twice to return to WalletsList; pass false when the caller wants to stay in Security.
export async function enableBiometric({ returnHome = true } = {}) {
  if (device.getPlatform() !== 'ios') return;
  await element(by.id('SettingsButton')).tap();
  await element(by.id('SecurityButton')).tap();
  await waitForId('BiometricSwitch');
  if (!(await getSwitchValue('BiometricSwitch'))) {
    await element(by.id('BiometricSwitch')).tap();
    await matchBiometric();
    await waitForSwitchValue('BiometricSwitch', true);
  }
  if (returnHome) {
    await goBack();
    await goBack();
  }
}

// Common at-the-gate pattern: user fails Face ID once (app flow must not break — iOS shows
// "Not recognized, try again"), then succeeds on retry. Exercises both the failure and
// recovery paths of whatever unlockWithBiometrics() gate we're passing through.
export async function rejectThenMatchBiometric() {
  if (device.getPlatform() !== 'ios') throw new Error('rejectThenMatchBiometric: android not yet supported');
  await waitForBiometricPrompt();
  await rawBiometric('--biometricNonmatch');
  // The prompt stays on screen and re-arms for a retry; no observable state change to wait
  // on, so a brief fixed gap before firing the match signal.
  await sleep(1000);
  await rawBiometric('--biometricMatch');
}

/**
 * Tap a button whose onPress triggers unlockWithBiometrics(), then resolve the Face ID prompt.
 *
 * Why disable synchronization: when an RN button's onPress chains into simplePrompt(), the
 * native Face ID prompt pins the main dispatch queue in "busy". Detox's default idle-sync
 * then waits forever for `tap()` to return. Disabling sync around the tap lets Detox send the
 * action without waiting; we re-enable once the biometric is resolved.
 *
 * Default auth strategy: 'rejectThenMatch' — user fails once, then succeeds on retry.
 * Covers the end-to-end "rejection doesn't break flow" behavior users actually hit. Use
 * 'match' for gates that appear multiple times in one test (faster; rejection path is
 * already covered by whatever earlier gate used the default).
 *
 * Non-iOS: falls through to a plain tap (android biometric support is pending).
 */
export async function tapGatedByBiometric(matcher, { auth = 'rejectThenMatch' } = {}) {
  const isIOS = device.getPlatform() === 'ios';
  if (isIOS) await device.disableSynchronization();
  await element(matcher).tap();
  if (isIOS) {
    if (auth === 'match') {
      await matchBiometric();
    } else {
      await rejectThenMatchBiometric();
    }
    await device.enableSynchronization();
  }
}
