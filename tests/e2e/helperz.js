import { execFileSync } from 'child_process';

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
    return true;
  } catch (err) {
    // iOS 26 liquid glass: text rendered inside/over the glass header (e.g. the wallet name on
    // the transactions hero) can fail Detox's 75%-pixel toBeVisible check while still being
    // present and on-screen — same root cause as the goBack() back-button workaround. Fall back
    // to existence in the hierarchy so a glass false-negative does not fail an otherwise valid run.
    try {
      await waitFor(element(by.text(text)))
        .toExist()
        .withTimeout(3000);
      return true;
    } catch (_) {
      rethrowWithCallsite(err, callsite);
    }
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
  // On a device, startup native work can stay busy long enough that Espresso
  // times out on the backdoor taps even though the button is already on screen.
  // CI keeps synchronization on; the tap retry still covers an index miss.
  const pauseSync = isPhysicalAndroid();
  if (pauseSync) {
    await device.disableSynchronization();
  }
  try {
    for (let c = 0; c < 5; c++) {
      await retryAndroidIndexMiss(() => element(by.id('SpeedBackdoor')).tap());
    }
    await waitFor(element(by.id('SpeedMnemonicInput')))
      .toExist()
      .withTimeout(15_000);
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
  } finally {
    if (pauseSync) {
      await device.enableSynchronization();
    }
  }

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

/** Real Android device. CI uses an emulator with a hardware keyboard and should keep Detox sync on. */
function isPhysicalAndroid() {
  return device.getPlatform() === 'android' && !process.env.CI;
}

function isAndroidIndexMiss(err) {
  const message = err?.message || String(err ?? '');
  return message.includes('Index -1 out of bounds');
}

/**
 * Android Espresso throws "Index -1 out of bounds: 0" when a view is matched and then
 * replaced before the action runs (FlatList row re-render, secure-field IME, camera overlay).
 * The same action usually succeeds on the next try.
 */
export async function retryAndroidIndexMiss(action, attempts = 3) {
  const callsite = captureCallsite(retryAndroidIndexMiss);
  let lastErr;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await action();
      return;
    } catch (err) {
      lastErr = err;
      if (!isAndroidIndexMiss(err) || attempt === attempts - 1) {
        rethrowWithCallsite(err, callsite);
      }
      await sleep(400);
    }
  }
  rethrowWithCallsite(lastErr, callsite);
}

/** A control that is swapped out while its press is in flight (confirm sheets, list rows). */
export async function tapId(id) {
  await retryAndroidIndexMiss(() => element(by.id(id)).tap());
}

/** Invisible backdoor buttons disappear under Espresso between match and tap. */
export async function tapIdRepeatedly(id, times) {
  const pauseSync = isPhysicalAndroid();
  if (pauseSync) {
    await device.disableSynchronization();
  }
  try {
    for (let c = 0; c < times; c++) {
      await retryAndroidIndexMiss(() => element(by.id(id)).tap());
    }
  } finally {
    if (pauseSync) {
      await device.enableSynchronization();
    }
  }
}

/** Tap a text row that may re-render during the press (currency list). */
export async function tapTextWithoutSync(text) {
  const pauseSync = isPhysicalAndroid();
  if (pauseSync) {
    await device.disableSynchronization();
  }
  try {
    await retryAndroidIndexMiss(() => element(by.text(text)).tap());
  } finally {
    if (pauseSync) {
      await device.enableSynchronization();
    }
  }
}

function isDetoxIdleTimeout(err) {
  const message = err?.message || String(err ?? '');
  return message.includes('to become idle timed out');
}

// Held across the password sheet. Re-enabling between keystrokes lets Espresso
// interrogate mqt_v_native and crash it on Android 16 (MessageHeap NPE in TestLooperManager).
let androidSyncHeld = false;

async function holdAndroidSyncOff() {
  if (!isPhysicalAndroid() || androidSyncHeld) return;
  await device.disableSynchronization();
  androidSyncHeld = true;
}

async function releaseAndroidSync() {
  if (!androidSyncHeld) return;
  androidSyncHeld = false;
  await device.enableSynchronization();
}

/** Unlock screen. A trailing newline in typeText races the field unmounting. */
export async function submitUnlockPassword(password) {
  await waitForId('PasswordInput');
  await element(by.id('PasswordInput')).typeText(password);
  await waitForKeyboardToClose();
  const pauseSync = isPhysicalAndroid();
  if (pauseSync) {
    await device.disableSynchronization();
  }
  try {
    await retryAndroidIndexMiss(() => element(by.text('Unlock')).tap());
  } finally {
    if (pauseSync) {
      await device.enableSynchronization();
    }
  }
}

/** replaceText already set the value. A missed return key must not fail the test. */
export async function tapReturnKeyById(id) {
  await holdAndroidSyncOff();
  try {
    try {
      await element(by.id(id)).tapReturnKey();
    } catch (err) {
      const ignorable = isAndroidIndexMiss(err) || (isPhysicalAndroid() && isDetoxIdleTimeout(err));
      if (!ignorable) throw err;
    }
    await waitForKeyboardToClose();
  } catch (err) {
    await releaseAndroidSync();
    throw err;
  }
}

export function hashIt(s) {
  return Buffer.from(sha256(s)).toString('hex');
}

export async function helperDeleteWallet(label, remainingBalanceSat = false) {
  // Tapping the wallet card by visible text (`by.text(label)`) is what
  // bluewallet3's import-then-delete flow uses successfully. On a wallet
  // that has been opened before, this navigates to WalletTransactions
  // immediately. On a freshly-created wallet (t10) the carousel
  // Pressable's first onPress is swallowed before navigation fires —
  // that case is a known limitation of the e2e harness.
  await element(by.text(label)).tap();
  await waitForId('WalletDetails');
  await element(by.id('WalletDetails')).tap();
  await element(by.id('WalletDetailsScroll')).swipe('up', 'fast', 1);
  await sleep(1000);
  await element(by.id('DeleteWallet')).tap();
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

  // Wallet generation blocks the JS/native queue, and iOS 26 glass animations never
  // settle. Disable sync before the taps that start that work. disableSynchronization
  // itself waits for idle, so it has to run while the form is still idle.
  const pauseSync = device.getPlatform() === 'ios' || isPhysicalAndroid();
  if (pauseSync) {
    await device.disableSynchronization();
  }
  try {
    await element(by.id('ActivateBitcoinButton')).tap();
    await element(by.id('ActivateBitcoinButton')).tap();
    // why tf we need 2 taps for it to work..? mystery
    await element(by.id('Create')).tap();
    await sleep(500);
    try {
      await waitFor(element(by.id('PleaseBackupScrollView')))
        .toBeVisible()
        .withTimeout(90_000);
    } catch (_) {
      await element(by.id('Create')).tap();
      await sleep(500);
      await waitFor(element(by.id('PleaseBackupScrollView')))
        .toBeVisible()
        .withTimeout(90_000);
    }

    await waitFor(element(by.id('PleasebackupOk')))
      .toBeVisible()
      .whileElement(by.id('PleaseBackupScrollView'))
      .scroll(500, 'down'); // in case emu screen is small and it doesnt fit

    await element(by.id('PleasebackupOk')).tap();
    await sleep(1000);
  } finally {
    if (pauseSync) {
      await device.enableSynchronization();
    }
  }
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

export async function tapHeaderMenuAction(actionId, text) {
  if (device.getPlatform() === 'ios') {
    try {
      await element(by.id(actionId)).tap();
      return;
    } catch (_) {}
  }

  await element(by.text(text)).tap();
}

/**
 * Dismisses a native UIAlertController by tapping a button with the given text.
 * On iOS 26 liquid glass, `waitFor().toBeVisible()` never resolves for alert
 * buttons because the glass material fails Detox's pixel visibility check.
 * This helper disables Detox synchronization (which can also hang on glass
 * animations) and polls with direct tap attempts and label fallbacks.
 *
 * @returns true if the alert was dismissed, false if no alert was found
 */
export async function dismissAlertByText(text, timeoutMs = 10000) {
  const isIOS = device.getPlatform() === 'ios';
  if (isIOS) {
    await device.disableSynchronization();
  }
  const deadline = Date.now() + timeoutMs;
  let dismissed = false;
  try {
    while (Date.now() < deadline) {
      // by.text — works on pre–iOS 26 and some iOS 26 alerts
      try {
        await element(by.text(text)).atIndex(0).tap();
        dismissed = true;
        break;
      } catch (_) {}
      // by.label — accessibility label, works when text matching differs
      try {
        await element(by.label(text)).atIndex(0).tap();
        dismissed = true;
        break;
      } catch (_) {}
      await sleep(500);
    }
  } finally {
    if (isIOS) {
      await device.enableSynchronization();
    }
  }
  return dismissed;
}

/**
 * Confirms password dialogs in a platform-safe way.
 * Android must tap a visible confirmation to keep test flow deterministic.
 * iOS can fall back between id-based and text-based buttons.
 */
export async function confirmPasswordDialog() {
  if (device.getPlatform() === 'android' && process.env.CI) {
    await retryAndroidIndexMiss(async () => {
      await waitFor(element(by.text('OK')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.text('OK')).tap();
    });
    return;
  }

  if (device.getPlatform() === 'android') {
    await holdAndroidSyncOff();
    try {
      await waitForKeyboardToClose();
      // OK sets isLoading and re-renders the button; Espresso then throws
      // "Index -1 out of bounds" even though the press already landed.
      await waitFor(element(by.id('OKButton')))
        .toBeVisible()
        .withTimeout(8000);
      try {
        await element(by.id('OKButton')).tap();
      } catch (err) {
        if (!isAndroidIndexMiss(err) && !isDetoxIdleTimeout(err)) throw err;
      }
      // Stay unsynchronized while encrypt/decrypt or the "password in use" check
      // blocks mqt_v_native. A synchronized waitFor would hit the idle timeout
      // before the alert or the next screen exists.
      const deadline = Date.now() + 12_000;
      while (Date.now() < deadline) {
        for (const text of ['Password is currently in use. Please try a different password.', 'Incorrect password. Please, try again.']) {
          try {
            await expect(element(by.text(text))).toExist();
            return;
          } catch (_) {}
        }
        try {
          await expect(element(by.id('PasswordInput'))).toExist();
        } catch (_) {
          return;
        }
        await sleep(300);
      }
    } finally {
      await releaseAndroidSync();
    }
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

/**
 * Feeds text into the QR scanner backdoor.
 * On iOS, disables synchronization for the interaction. Pass
 * `restoreSynchronization: false` for multipart UR scans that must keep sync
 * disabled until the animated scanner/QR UI is gone.
 * On a physical Android device the live camera surface makes Espresso drop the
 * backdoor view (`Index -1 out of bounds`). Sync stays off for that tap
 * sequence. Turning it back on while the scanner is still mounted deadlocks
 * the main thread in AsyncStorage's idling resource, so a device waits until
 * the scanner is gone and the import write has finished. CI keeps
 * synchronization on and relies on the tap retry.
 * Callers that pass `restoreSynchronization: false` (multipart UR) re-enable
 * after `scanUrParts` once the scanner has closed.
 */
export async function scanText(text, { restoreSynchronization = true } = {}) {
  const isIOS = device.getPlatform() === 'ios';
  const pauseAndroid = isPhysicalAndroid();
  if (isIOS || pauseAndroid) {
    await device.disableSynchronization();
  }
  try {
    await waitForId('ScanQrBackdoorButton');
    for (let c = 0; c <= 5; c++) {
      await retryAndroidIndexMiss(() => element(by.id('ScanQrBackdoorButton')).tap());
    }
    await element(by.id('scanQrBackdoorInput')).replaceText(text);
    await retryAndroidIndexMiss(() => element(by.id('scanQrBackdoorOkButton')).tap());
    await sleep(300);
  } finally {
    if (restoreSynchronization && pauseAndroid) {
      await waitForQrScannerClosed();
      // The import can still hold the AsyncStorage executor after the scanner
      // pops. Re-registering Detox's storage idling resource on the main thread
      // then deadlocks.
      await sleep(2000);
      await device.enableSynchronization();
    } else if (restoreSynchronization && isIOS) {
      await device.enableSynchronization();
    }
  }
}

/** Wait until ScanQRCode is gone (`not.toBeVisible`: screen stays mounted after popTo). */
export async function waitForQrScannerClosed(timeoutMs = 60_000) {
  await waitFor(element(by.id('ScanQrBackdoorButton')))
    .not.toBeVisible()
    .withTimeout(timeoutMs);
}

/** Multipart UR via backdoor. Device runs re-enable sync once the scanner is gone. */
export async function scanUrParts(urs) {
  for (const ur of urs.slice(0, -1)) {
    await scanText(ur, { restoreSynchronization: false });
    await waitFor(element(by.id('UrProgressBar')))
      .toBeVisible()
      .withTimeout(60_000);
  }
  await scanText(urs[urs.length - 1], { restoreSynchronization: false });
  await waitForQrScannerClosed();
  if (isPhysicalAndroid()) {
    // The wallet save can still hold the AsyncStorage executor. Re-registering
    // Detox's storage idling resource on the main thread then deadlocks.
    await sleep(2000);
    await device.enableSynchronization();
  }
}

/** iOS: enable sync only after animated PSBT QR and scanner are hidden. */
export async function restoreSynchronizationIfAnimatedQrClosed(timeoutMs = 2_000) {
  if (device.getPlatform() !== 'ios') {
    return true;
  }

  try {
    await waitFor(element(by.id('PsbtMultisigQRCodeScrollView')))
      .not.toBeVisible()
      .withTimeout(timeoutMs);
    await waitForQrScannerClosed(timeoutMs);
  } catch {
    return false;
  }

  await device.enableSynchronization();
  return true;
}

export async function setCustomFeeRate(feeRate) {
  // On a device, fee estimation keeps mqt_v_native busy after the send screen is up.
  const pauseSync = isPhysicalAndroid();
  if (pauseSync) {
    await device.disableSynchronization();
  }
  try {
    await waitForId('chooseFee');
    await element(by.id('chooseFee')).tap();
    await waitForId('feeCustomContainerButton');
    await element(by.id('feeCustomContainerButton')).tap();
    await waitForId('feeCustom');
    await element(by.id('feeCustom')).typeText(String(feeRate) + '\n');
    await waitForKeyboardToClose();
    await waitForId('chooseFee');
  } finally {
    if (pauseSync) {
      await device.enableSynchronization();
    }
  }
}

export async function goBack() {
  if (device.getPlatform() !== 'ios') {
    await device.pressBack();
    return;
  }

  const callsite = captureCallsite(goBack);

  // Try each back/close affordance in order; retry the full set up to 10 times.
  const candidates = [by.id('BackButton'), by.id('NavigationCloseButton'), by.label('Back'), by.text('Close')];

  // A matcher can hit several elements across stacked screens: each nav back
  // button exists twice (_UIButtonBarButton wrapper + UIAccessibilityBackButtonElement),
  // and when a modal covers a stack that also has a back button, the covered
  // one can precede the visible one in match order (seen with Reduce Motion on).
  // Probe attributes and only tap an element detox reports as visible & hittable.
  //
  // iOS 26 liquid glass: the native back button reports visible=false because
  // the glass material fails Detox's 75%-pixel visibility check, yet the button
  // IS functionally hittable. We first try (visible && hittable), then fall back
  // to (hittable only) for the glass case.
  let lastErr;
  for (let attempt = 0; attempt < 10; attempt++) {
    // Pass 1: prefer visible + hittable elements
    for (const matcher of candidates) {
      for (let idx = 0; idx < 6; idx++) {
        let attrs;
        try {
          attrs = await element(matcher).atIndex(idx).getAttributes();
        } catch (err) {
          lastErr = err;
          break; // no element at this index — try next candidate
        }
        if (!attrs.visible || attrs.hittable === false) continue;
        try {
          await element(matcher).atIndex(idx).tap();
          return;
        } catch (err) {
          lastErr = err;
        }
      }
    }
    // Pass 2: accept hittable-only elements (iOS 26 liquid glass back button)
    for (const matcher of candidates) {
      for (let idx = 0; idx < 6; idx++) {
        let attrs;
        try {
          attrs = await element(matcher).atIndex(idx).getAttributes();
        } catch (err) {
          lastErr = err;
          break;
        }
        if (attrs.hittable === false) continue;
        try {
          await element(matcher).atIndex(idx).tap();
          return;
        } catch (err) {
          lastErr = err;
        }
      }
    }
    await sleep(500);
  }

  const wrapped = new Error('goBack: no back/close affordance tappable after 10 attempts.');
  if (lastErr) wrapped.cause = lastErr;
  rethrowWithCallsite(wrapped, callsite);
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
 * Opens the send-screen header menu and taps a menu item.
 * On iOS, action-sheet labels often fail Detox's visibility check (liquid glass
 * / partial opacity), same class of issue as native alerts — disable sync for
 * the interaction.
 *
 * Pass `restoreSynchronization: false` when the item opens the camera / animated QR UI;
 * re-enabling there can hang on pending layer animations. A following `scanText()`
 * (default) restores synchronization after the backdoor scan.
 */
export async function tapHeaderMenuItem(menuItemText, { actionId, restoreSynchronization = true } = {}) {
  const isIOS = device.getPlatform() === 'ios';
  if (!isIOS) {
    await element(by.id('HeaderMenuButton')).tap();
    await element(by.text(menuItemText)).tap();
    return;
  }

  let succeeded = false;
  await device.disableSynchronization();
  try {
    await waitFor(element(by.id('HeaderMenuButton')))
      .toExist()
      .withTimeout(15_000);

    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await element(by.id('HeaderMenuButton')).tap();
        // iOS 26 action sheets use magic-morph transforms that fail Detox's
        // visibility check until the presentation animation settles.
        await sleep(1500);
        // Prefer the native identifier. Liquid-glass menu rows often fail
        // Detox's text visibility checks even though the action is tappable.
        try {
          if (!actionId) {
            throw new Error('No native action identifier');
          }
          await element(by.id(actionId)).tap();
        } catch {
          try {
            await element(by.text(menuItemText)).atIndex(0).tap();
          } catch {
            try {
              await element(by.label(menuItemText)).atIndex(0).tap();
            } catch {
              // Last resort: tap a corner point to bypass 100% visibility threshold.
              await element(by.text(menuItemText)).atIndex(0).tap({ x: 8, y: 8 });
            }
          }
        }
        succeeded = true;
        return;
      } catch (e) {
        lastError = e;
        await sleep(500);
      }
    }
    throw lastError;
  } finally {
    // Always restore sync on failure so retries aren't poisoned when the caller
    // passed restoreSynchronization: false (camera / animated-QR path).
    if (restoreSynchronization || !succeeded) {
      await device.enableSynchronization();
    }
  }
}

function isAndroidSoftKeyboardShown() {
  try {
    const stdout = execFileSync('adb', ['shell', 'dumpsys', 'input_method'], {
      encoding: 'utf8',
      timeout: 8000,
      maxBuffer: 16 * 1024 * 1024,
    });
    return /mInputShown=true/.test(stdout);
  } catch {
    return false;
  }
}

// CI Android runs with a hardware keyboard, so the onscreen IME never opens.
// On a real device the IME covers the password sheet's OK button. One Back
// dismisses the IME. A second Back pops the sheet, so never press more than once.
export async function waitForKeyboardToClose() {
  if (device.getPlatform() === 'ios' || process.env.CI) {
    return;
  }
  if (!isAndroidSoftKeyboardShown()) return;
  await sleep(200);
  if (!isAndroidSoftKeyboardShown()) return;
  await device.pressBack();
  await sleep(400);
}
