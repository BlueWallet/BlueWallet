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
  // tapping 5 times invisible button is a backdoor:
  for (let c = 0; c < 5; c++) {
    await element(by.id('SpeedBackdoor')).tap();
  }
  await waitForId('SpeedMnemonicInput');
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

/**
 * Re-enables Detox synchronization after a disableSynchronization() section.
 *
 * Call only after leaving animated QR / UR UI: on iOS, enableSynchronization
 * waits for idle and can hang on pending layer animations if invoked too early.
 * Do not race this against a timeout — abandoning a pending enableSynchronization
 * leaves Detox with an in-flight interaction and breaks the next action
 * ("multiple interactions taking place simultaneously").
 */
export async function safelyEnableSynchronization() {
  try {
    await device.enableSynchronization();
  } catch (e) {
    console.warn('[detox] enableSynchronization failed:', e?.message ?? e);
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
  await element(by.id('ActivateBitcoinButton')).tap();
  await element(by.id('ActivateBitcoinButton')).tap();
  // why tf we need 2 taps for it to work..? mystery

  // iOS 26 liquid glass: the navigation transition after tapping "Create" triggers
  // glass animations that never fully settle, keeping the app in a "busy" state.
  // Detox synchronization waits for idle before proceeding, causing an infinite hang.
  // Disable sync for the remainder of wallet creation and re-enable once we're back
  // on the home screen where the glass animations have settled.
  const isIOS = device.getPlatform() === 'ios';
  if (isIOS) {
    await device.disableSynchronization();
  }
  try {
    await element(by.id('Create')).tap();
    await sleep(500);
    try {
      await waitFor(element(by.id('PleaseBackupScrollView')))
        .toBeVisible()
        .withTimeout(15000);
    } catch (_) {
      await element(by.id('Create')).tap();
      await sleep(500);
      await waitFor(element(by.id('PleaseBackupScrollView')))
        .toBeVisible()
        .withTimeout(15000);
    }

    await waitFor(element(by.id('PleasebackupOk')))
      .toBeVisible()
      .whileElement(by.id('PleaseBackupScrollView'))
      .scroll(500, 'down'); // in case emu screen is small and it doesnt fit

    await element(by.id('PleasebackupOk')).tap();
    await sleep(1000);
    await scrollUpOnHomeScreen();
  } finally {
    if (isIOS) {
      await safelyEnableSynchronization();
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
      await safelyEnableSynchronization();
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

/**
 * Feeds text into the QR scanner backdoor (used for UR fragments in e2e).
 * On iOS, animated QR / transition layer animations can leave Detox permanently
 * "busy" (`Layer animations pending`), so synchronization is disabled for the
 * backdoor interaction. Do not call `enableSynchronization()` here: that waits
 * for idle and hangs on the same animations. Callers should use
 * `safelyEnableSynchronization()` after leaving the animated QR / UR screen.
 */
export async function scanText(text) {
  if (device.getPlatform() === 'ios') {
    await device.disableSynchronization();
  }
  await waitForId('ScanQrBackdoorButton');
  for (let c = 0; c <= 5; c++) {
    await element(by.id('ScanQrBackdoorButton')).tap();
  }
  await element(by.id('scanQrBackdoorInput')).replaceText(text);
  await element(by.id('scanQrBackdoorOkButton')).tap();
  await sleep(300);
}

/**
 * After feeding UR fragments via scanText, wait until ScanQRCode has been
 * dismissed. With sync disabled, ItemSigned on the underlying PsbtMultisig
 * screen can become visible before popTo finishes — tapping ProvideSignature
 * then fails with "No elements found".
 */
export async function waitForQrScannerClosed(timeoutMs = 60_000) {
  await waitFor(element(by.id('ScanQrBackdoorButton')))
    .not.toExist()
    .withTimeout(timeoutMs);
  await sleep(500);
}

/**
 * Feed multi-part UR fragments via the QR backdoor.
 * Intermediate parts should show UrProgressBar; the final part often completes
 * and dismisses the scanner without a visible progress frame — do not require
 * the bar after the last fragment.
 */
export async function scanUrFragments(urs, { progressTimeoutMs = 60_000 } = {}) {
  for (let i = 0; i < urs.length; i++) {
    await scanText(urs[i]);
    const isLast = i === urs.length - 1;
    if (!isLast) {
      await waitFor(element(by.id('UrProgressBar')))
        .toBeVisible()
        .withTimeout(progressTimeoutMs);
    }
  }
  await waitForQrScannerClosed();
}

export async function setCustomFeeRate(feeRate) {
  await waitForId('chooseFee');
  await element(by.id('chooseFee')).tap();
  await waitForId('feeCustomContainerButton');
  await element(by.id('feeCustomContainerButton')).tap();
  await waitForId('feeCustom');
  await element(by.id('feeCustom')).typeText(String(feeRate) + '\n');
  await waitForKeyboardToClose();
  await waitForId('chooseFee');
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
 * Scrolls up on the home screen. This is needed on the iOS.
 */
export async function scrollUpOnHomeScreen() {
  if (device.getPlatform() !== 'ios') {
    return;
  }
  try {
    await element(by.type('RCTEnhancedScrollView').withDescendant(by.type('RCTEnhancedScrollView')))
      .atIndex(0)
      .swipe('down', 'slow', 0.5);
  } catch (_) {
    // if no wallets there will be just one scroll (or nested matcher missed); atIndex
    // avoids "Multiple elements found" when several scroll views are present.
    await element(by.type('RCTEnhancedScrollView')).atIndex(0).swipe('down', 'slow', 0.5);
  }
  await sleep(1000); // bounce animation
}

/**
 * Opens the send-screen header menu and taps a menu item.
 * On iOS, action-sheet labels often fail Detox's visibility check (liquid glass
 * / partial opacity), same class of issue as native alerts — disable sync for
 * the interaction.
 *
 * Pass `restoreSync: false` when the item opens the camera / animated QR UI;
 * re-enabling there can hang on pending layer animations. Callers should then
 * use `safelyEnableSynchronization()` after leaving that screen.
 */
export async function tapHeaderMenuItem(menuItemText, { restoreSync = true } = {}) {
  const isIOS = device.getPlatform() === 'ios';
  if (isIOS) {
    await device.disableSynchronization();
  }
  try {
    await element(by.id('HeaderMenuButton')).tap();
    // iOS 26 action sheets use magic-morph transforms that fail Detox's
    // visibility check until the presentation animation settles.
    await sleep(isIOS ? 1500 : 500);
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
    await sleep(300);
  } finally {
    if (isIOS && restoreSync) {
      await safelyEnableSynchronization();
    }
  }
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
