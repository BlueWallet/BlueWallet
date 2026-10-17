import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { remote } from 'webdriverio';

import { APP_PATH, APPIUM_HOST, APPIUM_PORT, ARTIFACTS_DIR, BUNDLE_ID, HOSTED_CI } from './config';
import { redactSecrets, secretValues } from './redact';

export type Driver = Awaited<ReturnType<typeof remote>>;

const APP_ARGUMENTS = ['-AppleLanguages', '(en)']; // tests rely on English labels, e.g. 'Close'
const appEnvironment = {
  E2E_HOSTED_CI: HOSTED_CI ? '1' : '0',
  // Hosted Intel's virtual GPU aborts while loading RenderBox binary archives.
  // Compile shaders without those archives in the CI test app only.
  ...(HOSTED_CI ? { RB_USE_BINARY_ARCHIVE: '0' } : {}),
};

// `appium:appPath` is not known to webdriverio typings yet, hence the loose type
const capabilities: Record<string, unknown> = {
  platformName: 'mac',
  'appium:automationName': 'mac2',
  'appium:bundleId': BUNDLE_ID,
  'appium:appPath': APP_PATH,
  'appium:arguments': APP_ARGUMENTS,
  'appium:environment': appEnvironment,
  'appium:serverStartupTimeout': 600_000,
  'appium:showServerLogs': true,
};

/**
 * Starts a mac2 session, which (re)launches the Mac Catalyst app.
 */
export const launch = async (): Promise<Driver> => {
  const driver = await remote({
    hostname: APPIUM_HOST,
    port: APPIUM_PORT,
    logLevel: 'warn',
    connectionRetryTimeout: 600_000, // creating the very first session compiles WebDriverAgentMac
    // Replaying a timed-out click/type command can duplicate a user action.
    // The suite retries whole cases from a clean app instead.
    connectionRetryCount: 0,
    capabilities,
  });
  driver.options.connectionRetryTimeout = 60_000;
  return driver;
};

/**
 * Kills the app and starts it again, so every test begins on the home screen
 * (same idea as `device.launchApp({ newInstance: true })` in Detox tests)
 */
export const relaunch = async (
  driver: Driver,
  options: { reset?: boolean; locked?: boolean; clipboard?: string; defaults?: Record<string, string> } = {},
) => {
  if (options.defaults) {
    // Complete the requested reset before seeding its native preferences.
    await relaunch(driver, { ...options, defaults: undefined });
  }
  // A copied address from a prior case otherwise opens ClipboardDetectedScreen on launch.
  await setClipboard(driver, options.clipboard ?? '');
  await driver.execute('macos: terminateApp', { bundleId: BUNDLE_ID });
  if (options.defaults) {
    const directory = path.join(os.homedir(), 'Library', 'Containers', BUNDLE_ID, 'Data', 'Library', 'Preferences');
    if (!fs.existsSync(directory)) throw new Error('The E2E sandbox preferences directory is missing');
    for (const [key, value] of Object.entries(options.defaults)) {
      execFileSync('/usr/bin/defaults', ['write', path.join(directory, BUNDLE_ID), key, '-string', value], { timeout: 10_000 });
    }
  }
  await driver.execute('macos: launchApp', {
    environment: appEnvironment,
    path: APP_PATH,
    arguments: [...APP_ARGUMENTS, ...(options.reset && !options.defaults ? ['-e2e-reset'] : [])],
  });
  // on desktop the drawer is permanent, and "Add a wallet" card is rendered there regardless of the wallets count
  await waitForId(driver, options.locked ? 'PasswordInput' : 'CreateAWallet', 90_000);
};

/**
 * React Native `testID` ends up as accessibilityIdentifier, which mac2 matches with the `accessibility id` strategy
 */
const byId = (driver: Driver, id: string) => driver.$(`~${id}`);

const XCUIElementTypeMenuItem = 54;
const XCUIElementTypeMenuBarItem = 56;
// navigation bar buttons expose their text as `label`, buttons of alerts as `title`
const buttonWithLabel = (driver: Driver, label: string) =>
  driver.$(
    // The Touch Bar can expose a second OK button before the real alert appears.
    `-ios class chain:**/XCUIElementTypeWindow/**/XCUIElementTypeButton[\`label == ${JSON.stringify(label)} OR title == ${JSON.stringify(label)}\`]`,
  );

// Capture before the first await, while the scenario's synchronous caller is
// still available. Nested helpers replace the callsite but retain the original
// WebDriver stack, without changing the error identity or message.
const originalHelperStacks = new WeakMap<object, string>();
const withHelperCallsite = <Args extends unknown[], Result>(action: (...args: Args) => Promise<Result>) => {
  const helper = async (...args: Args): Promise<Result> => {
    const callsite = {} as { stack?: string };
    Error.captureStackTrace(callsite, helper);
    try {
      return await action(...args);
    } catch (error) {
      if (error instanceof Error && callsite.stack) {
        const originalStack = originalHelperStacks.get(error) ?? error.stack ?? `${error.name}: ${error.message}`;
        originalHelperStacks.set(error, originalStack);
        error.stack = `${error.name}: ${error.message}\n${callsite.stack.split('\n').slice(1).join('\n')}\nOriginal helper failure:\n${originalStack}`;
      }
      throw error;
    }
  };
  return helper;
};

export const waitForId = withHelperCallsite(async (driver: Driver, id: string, timeout: number = 30_000) => {
  const element = byId(driver, id);
  await element.waitForExist({
    timeout,
    timeoutMsg: `element with testID "${id}" did not appear in ${timeout} ms`,
  });
  return element;
});

export const waitForIdGone = withHelperCallsite(async (driver: Driver, id: string, timeout: number = 30_000) => {
  await byId(driver, id).waitForExist({
    timeout,
    reverse: true,
    timeoutMsg: `element with testID "${id}" is still there after ${timeout} ms`,
  });
});

const APP_STATE_RUNNING_IN_FOREGROUND = 4;

/**
 * XCTest sends real mouse & keyboard events to whatever is frontmost, so make sure it is the app under test.
 * Does nothing if the app is frontmost already: needless activation makes the app think it just came from background
 */
export const activate = async (driver: Driver) => {
  const state = await driver.execute('macos: queryAppState', {
    bundleId: BUNDLE_ID,
  });
  if (Number(state) !== APP_STATE_RUNNING_IN_FOREGROUND) await driver.execute('macos: activateApp', { bundleId: BUNDLE_ID });
};

export const tapId = withHelperCallsite(async (driver: Driver, id: string, timeout: number = 30_000) => {
  const element = await waitForId(driver, id, timeout);
  await activate(driver);
  await element.click();
});

export const tapRepeatedly = withHelperCallsite(async (driver: Driver, id: string, count: number) => {
  const element = await waitForId(driver, id);
  await activate(driver);
  for (let index = 0; index < count; index++) await element.click();
});

/**
 * Native navigation bar & alert buttons do not get their `identifier` on Mac Catalyst, only accessibility label survives,
 * so they have to be located by label (same as `by.label()` / `by.text()` fallbacks in Detox helpers)
 */
export const tapButtonWithLabel = withHelperCallsite(async (driver: Driver, label: string, timeout: number = 30_000) => {
  const element = buttonWithLabel(driver, label);
  await element.waitForExist({
    timeout,
    timeoutMsg: `button with label "${label}" did not appear in ${timeout} ms`,
  });
  await activate(driver);
  await element.click();
});

// TODO(Catalyst alerts): restore strict success-alert coverage with native modal
// presentation. Only informational confirmations may be absent; callers must
// still verify the operation's result. Never swallow a failed click.
export const tapOptionalConfirmation = async (driver: Driver, label: string, resultId: string, timeout = 180_000) => {
  const element = buttonWithLabel(driver, label);
  await driver.waitUntil(async () => (await element.isExisting()) || (await byId(driver, resultId).isExisting()), {
    timeout,
    timeoutMsg: `Neither ${label} confirmation nor operation result ${resultId} appeared`,
  });
  const unavailable = 'Informational confirmation did not appear';
  try {
    await element.waitForExist({ timeout: 10_000, timeoutMsg: unavailable });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes(unavailable)) throw error;
    if (await element.isExisting()) throw error;
    process.stdout.write(`[Catalyst] TODO: ${label} informational alert unavailable; verifying operation result instead\n`);
    return;
  }
  await activate(driver);
  await element.click();
};

/**
 * Dispatch a transition once, then observe its result. Replaying the action
 * while React/native navigation is still working can corrupt the next screen.
 */
export const tapAndWaitForId = withHelperCallsite(async (driver: Driver, id: string, expectedId: string, timeout: number = 30_000) => {
  await tapId(driver, id);
  return waitForId(driver, expectedId, timeout);
});

const isHittable = async (driver: Driver, id: string): Promise<boolean> => {
  const element = byId(driver, id);
  if (!(await element.isExisting())) return false;
  return String(await element.getAttribute('hittable')) === 'true';
};

/**
 * Scrolls `scrollViewId` down until element `id` can be clicked, analog of
 * `waitFor(element(by.id(id))).toBeVisible().whileElement(by.id(scrollViewId)).scroll(...)` in Detox
 */
export const scrollDownToId = async (driver: Driver, scrollViewId: string, id: string, attempts = 15) => {
  // Catalyst sometimes exports FlatList as an unnamed native ScrollView. An
  // explicit XPath can scope that container by one of its descendant controls.
  const scrollView = scrollViewId.startsWith('//') ? await driver.$(scrollViewId) : await waitForId(driver, scrollViewId);
  await scrollView.waitForExist({ timeout: 30_000 });
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await isHittable(driver, id)) return;
    await activate(driver);
    await driver.execute('macos: scroll', {
      elementId: scrollView.elementId,
      deltaX: 0,
      deltaY: -200,
    });
    await driver.pause(300);
  }
  if (!(await isHittable(driver, id))) throw new Error(`could not scroll "${scrollViewId}" to element with testID "${id}"`);
};

export const scrollDownToText = async (driver: Driver, scrollViewId: string, text: string, match: 'exact' | 'prefix' = 'exact') => {
  const scrollView = await waitForId(driver, scrollViewId);
  const value = JSON.stringify(text);
  const comparison = match === 'prefix' ? 'BEGINSWITH' : '==';
  const element = driver.$(
    `-ios predicate string:label ${comparison} ${value} OR value ${comparison} ${value} OR title ${comparison} ${value}`,
  );
  for (let attempt = 0; attempt < 15; attempt++) {
    if ((await element.isExisting()) && String(await element.getAttribute('hittable')) === 'true') return;
    await activate(driver);
    await driver.execute('macos: scroll', { elementId: scrollView.elementId, deltaX: 0, deltaY: -200 });
  }
  throw new Error(`Could not scroll ${scrollViewId} to ${text}`);
};

/** text of a `<Text testID=...>`: exposed as `value` or `label` of a static text, depending on the element */
export const getText = async (driver: Driver, id: string): Promise<string> => {
  const element = await waitForId(driver, id);
  return (await element.getAttribute('value')) || (await element.getAttribute('label')) || (await element.getText());
};

/**
 * Picks an item from the macOS menu bar, e.g. `selectMenuItem(driver, 'BlueWallet', 'Settings')`.
 * Item is matched by the beginning of its title, so there is no need to care about trailing ellipsis.
 */
export const selectMenuItem = async (driver: Driver, menuTitle: string, itemTitle: string) => {
  await activate(driver);
  const menu = driver.$(`-ios predicate string:elementType == ${XCUIElementTypeMenuBarItem} AND title == ${JSON.stringify(menuTitle)}`);
  await menu.waitForExist({
    timeout: 10_000,
    timeoutMsg: `menu "${menuTitle}" not found in the menu bar`,
  });
  await menu.click();
  const item = driver.$(
    `-ios predicate string:elementType == ${XCUIElementTypeMenuItem} AND title BEGINSWITH ${JSON.stringify(itemTitle)}`,
  );
  await item.waitForExist({
    timeout: 10_000,
    timeoutMsg: `menu item "${itemTitle}" not found in menu "${menuTitle}"`,
  });
  await item.click();
};

/**
 * Records the screen with XCTest (needs Xcode 15+)
 */
export const startVideo = (driver: Driver) => driver.execute('macos: startNativeScreenRecording', { fps: 24 });

/**
 * Stops the recording; the video is saved to ./artifacts only when `name` is given, otherwise it is thrown away
 */
export const stopVideo = async (driver: Driver, name?: string) => {
  if (!name) {
    await driver.execute('macos: stopNativeScreenRecording', {
      ignorePayload: true,
    });
    return;
  }
  const base64 = (await driver.execute('macos: stopNativeScreenRecording', {})) as unknown as string;
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, `${name}.mp4`), Buffer.from(base64, 'base64'));
};

export const saveArtifacts = async (driver: Driver, name: string) => {
  const safeName = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  // A terminated app cannot provide accessibility XML. Preserve its native crash
  // report and expose the cause in the live CI log without waiting for Jest to end.
  if (HOSTED_CI) {
    try {
      const log = execFileSync(
        '/usr/bin/log',
        ['show', '--style', 'compact', '--last', '5m', '--predicate', 'process == "BlueWallet" AND subsystem != "com.apple.dt.xctest"'],
        { encoding: 'utf8', timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
      );
      const redacted = redactSecrets(log, secretValues());
      fs.writeFileSync(path.join(ARTIFACTS_DIR, `${safeName}-native.log`), redacted);
      console.warn('[Catalyst] Recent native log:\n' + redacted.split('\n').slice(-40).join('\n'));
    } catch (error: any) {
      console.warn('could not read native log:', error.message);
    }
    for (const directory of [path.join(os.homedir(), 'Library/Logs/DiagnosticReports'), '/Library/Logs/DiagnosticReports']) {
      if (!fs.existsSync(directory)) continue;
      for (const file of fs.readdirSync(directory).filter(entry => /^BlueWallet.*\.(ips|crash)$/.test(entry))) {
        const destination = path.join(ARTIFACTS_DIR, file);
        if (fs.existsSync(destination)) continue;
        try {
          fs.copyFileSync(path.join(directory, file), destination);
          if (file.endsWith('.ips')) {
            const report = fs.readFileSync(destination, 'utf8');
            // Apple's IPS format has a one-line metadata object before the report.
            const crash = JSON.parse(report.slice(report.indexOf('\n') + 1));
            console.warn(
              '[Catalyst] Native crash:',
              JSON.stringify({
                exception: crash.exception,
                termination: crash.termination,
                applicationSpecificInformation: crash.asi,
                frames: crash.threads?.[crash.faultingThread]?.frames?.slice(0, 12),
              }),
            );
          }
        } catch (error: any) {
          console.warn('could not read crash report:', error.message);
        }
      }
    }
  }
  try {
    // XCTest crops the display, so even an app-window screenshot can contain an
    // unrelated window covering the app. Capture images only on disposable CI.
    if (process.env.CI) {
      const windows = await driver.$$('XCUIElementTypeWindow');
      let index = 0;
      // Bound diagnostics so a broken session cannot exhaust teardown's deadline.
      for await (const window of windows) {
        if (index >= 2) break;
        await window.saveScreenshot(path.join(ARTIFACTS_DIR, `${safeName}-window-${index++}.png`));
      }
    }
  } catch (error: any) {
    console.warn('could not save screenshot:', error.message);
  }
  try {
    fs.writeFileSync(path.join(ARTIFACTS_DIR, `${safeName}.xml`), redactSecrets(await driver.getPageSource(), secretValues()));
  } catch (error: any) {
    console.warn('could not save page source:', error.message);
  }
};

// XCTest modifiers (not WebDriver's browser key codes).
export const COMMAND = 1 << 4;
export const SHIFT = 1 << 1;
export const pressKey = async (driver: Driver, key: string, modifierFlags = 0) => {
  await activate(driver);
  await driver.execute('macos: keys', { keys: [{ key, modifierFlags }] });
};
// Catalyst opens UIContextMenuInteraction menus (text views, ToolTipMenu buttons) on a
// secondary click; holding the mouse button is delivered as a plain press.
export const openContextMenu = async (driver: Driver, element: { elementId: string }) => {
  await activate(driver);
  await driver.execute('macos: rightClick', { elementId: element.elementId });
};
export const clickContextMenuItem = async (driver: Driver, title: string) => {
  const value = JSON.stringify(title);
  let rect: { x: number; y: number; width: number; height: number } | undefined;
  await driver.waitUntil(
    async () => {
      // Mac2 exposes hittable as an attribute, not a searchable predicate key.
      const items = await driver.$$(`-ios predicate string:(title == ${value} OR label == ${value}) AND enabled == true`);
      for await (const item of items) {
        if (String(await item.getAttribute('hittable')) !== 'true') continue;
        const bounds = await driver.getElementRect(item.elementId);
        if (bounds.width > 0 && bounds.height > 0) {
          rect = bounds;
          return true;
        }
      }
      return false;
    },
    { timeout: 10_000, timeoutMsg: `No hittable contextual ${title} item appeared` },
  );
  // XCUIElement.click can traverse the app's menu bar even for a contextual
  // item. Click the visible item's measured center without menu traversal.
  if (!rect) throw new Error(`Contextual ${title} has no visible bounds`);
  await driver.execute('macos: click', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
};
export const replaceId = async (driver: Driver, id: string, text: string, input: 'type' | 'paste' = 'paste') => {
  const element = await waitForId(driver, id);
  await activate(driver);
  await element.click();
  const elementType = String(await element.getAttribute('elementType'));
  if (input === 'type') {
    // Target the field itself. Select All can be disabled on an empty Catalyst
    // field, leaving Edit open and redirecting subsequent keys into the menu.
    await element.setValue(text);
  } else if (elementType === '52') {
    // Catalyst UITextView disables the app's Edit-menu Paste action. Its own
    // contextual editing menu remains the native path for multiline fields.
    const previous = await clipboard(driver);
    try {
      await setClipboard(driver, text);
      await openContextMenu(driver, await element.getElement());
      await clickContextMenuItem(driver, 'Paste');
    } finally {
      await setClipboard(driver, previous);
    }
  } else {
    await replaceFocusedText(driver, text, input);
  }
  if (elementType === '50') {
    // Secure fields expose a masked value. The encryption/unlock flow verifies
    // the actual password; ordinary fields must still match their exact text.
    await driver.waitUntil(async () => Boolean(await element.getAttribute('value')) === Boolean(text));
  } else {
    await driver.waitUntil(async () => (await element.getAttribute('value')) === text, {
      timeout: 30_000,
      timeoutMsg: `Expected ${id} to contain the supplied text`,
    });
  }
};
// AmountInput exposes its enclosing Enter amount button on Catalyst. Pressing it
// focuses the real (accessibility-hidden) TextInput; the flow checks the resulting BIP21/transaction amount.
export const replaceAmount = async (driver: Driver, text: string, rowId?: string) => {
  if (rowId) {
    const row = await waitForId(driver, rowId);
    await activate(driver);
    await row.$('-ios predicate string:elementType == 9 AND label == "Enter amount"').click();
  } else {
    await tapButtonWithLabel(driver, 'Enter amount');
  }
  await replaceFocusedText(driver, text);
};
export const replaceFocusedText = async (driver: Driver, text: string, input: 'type' | 'paste' = 'paste') => {
  await selectMenuItem(driver, 'Edit', 'Select All');
  await pressKey(driver, 'XCUIKeyboardKeyDelete');
  if (text) {
    if (input === 'paste') await pasteText(driver, text);
    else {
      const focused = await driver.$(await driver.getActiveElement());
      await focused.setValue(text);
    }
  }
};
export const waitForText = async (driver: Driver, text: string, timeout = 30_000) => {
  const value = JSON.stringify(text);
  const element = driver.$(`-ios predicate string:label == ${value} OR value == ${value} OR title == ${value}`);
  await element.waitForExist({ timeout });
  return element;
};
export const tapText = async (driver: Driver, text: string) => {
  const element = await waitForText(driver, text);
  await activate(driver);
  await element.click();
};
export const expectText = async (driver: Driver, id: string, expected: string, timeout = 30_000) => {
  await driver.waitUntil(async () => (await getText(driver, id)) === expected, {
    timeout,
    timeoutMsg: `Expected ${id} to contain ${JSON.stringify(expected)}`,
  });
};
export const openSettings = async (driver: Driver) => {
  await selectMenuItem(driver, 'BlueWallet', 'Settings');
  await waitForId(driver, 'SettingsRoot');
};
export const back = async (driver: Driver) => {
  // UIKit labels the back button with the previous screen's title on Catalyst.
  // XPath last() is global; class-chain [-1] can select an underlying window's bar.
  const button = driver.$('(//XCUIElementTypeNavigationBar)[last()]/XCUIElementTypeButton[1]');
  await button.waitForExist({ timeout: 30_000 });
  await activate(driver);
  await button.click();
};
export const tapHeaderMenuItem = async (driver: Driver, title: string) => {
  await activate(driver);
  // A sheet can leave the underlying screen's header in the accessibility tree.
  // Scope to the sheet when present, then identify the menu control, not the
  // last child (XCTest can return the centered screen title last).
  const sheet = driver.$('(//XCUIElementTypeSheet)[last()]');
  const bar = await ((await sheet.isExisting())
    ? sheet.$('.//XCUIElementTypeNavigationBar')
    : driver.$('(//XCUIElementTypeNavigationBar)[last()]'));
  await bar.waitForExist({ timeout: 30_000 });
  const identified = bar.$('~HeaderMenuButton');
  if (await identified.isExisting()) {
    await identified.waitForEnabled({ timeout: 30_000 });
    await driver.waitUntil(async () => String(await identified.getAttribute('hittable')) === 'true', { timeout: 30_000 });
    await identified.click();
  } else {
    // Native headerRightItems loses its identifier/label on Catalyst. The
    // custom Add Wallet variant exposes the Material more-horiz icon instead.
    let menus: WebdriverIO.Element[] = [];
    await driver.waitUntil(
      async () => {
        const bounds = await driver.getElementRect(await bar.elementId);
        // Match the actual control types, independently of snapshot ordering.
        const candidates = await bar.$$('.//XCUIElementTypeButton[@label=""] | .//XCUIElementTypeStaticText[@label="\ue5d3"]');
        menus = [];
        const seenBounds = new Set<string>();
        for await (const candidate of candidates) {
          const rect = await driver.getElementRect(candidate.elementId);
          if (rect.width <= 0 || rect.height <= 0 || rect.x < bounds.x + bounds.width / 2) continue;
          // Mac2 can return two proxies for the same icon, even though page
          // source contains one node. Identical bounds identify one click target.
          const location = [rect.x, rect.y, rect.width, rect.height].join(':');
          if (seenBounds.has(location)) continue;
          if (!(await candidate.isEnabled()) || String(await candidate.getAttribute('hittable')) !== 'true') continue;
          seenBounds.add(location);
          menus.push(candidate);
        }
        return menus.length > 0;
      },
      {
        timeout: 30_000,
        timeoutMsg: 'No accessible foreground header menu appeared',
      },
    );
    if (menus.length !== 1) throw new Error(`Expected one foreground header menu, found ${menus.length}`);
    await menus[0].click();
  }
  await tapText(driver, title);
};
export const assertMenuItemAbsent = async (driver: Driver, menuTitle: string, title: string) => {
  await activate(driver);
  await driver.$(`-ios predicate string:elementType == 56 AND title == ${JSON.stringify(menuTitle)}`).click();
  try {
    await driver
      .$(`-ios predicate string:elementType == 54 AND title BEGINSWITH ${JSON.stringify(title)}`)
      .waitForExist({ reverse: true, timeout: 5_000 });
  } finally {
    await pressKey(driver, 'XCUIKeyboardKeyEscape'); // escape closes the menu
  }
};
export const clipboard = async (driver: Driver) =>
  Buffer.from((await driver.execute('macos: getClipboard', {})) as unknown as string, 'base64').toString('utf8');
export const setClipboard = async (driver: Driver, value: string) => {
  await driver.execute('macos: setClipboard', {
    content: Buffer.from(value).toString('base64'),
  });
};
export const prompt = async (driver: Driver, text: string, confirm = 'OK') => {
  const field = driver.$('(//XCUIElementTypeWindow//*[self::XCUIElementTypeTextField or self::XCUIElementTypeSecureTextField])[last()]');
  await field.waitForExist({ timeout: 10_000 });
  await activate(driver);
  await field.click();
  await replaceFocusedText(driver, text);
  if (String(await field.getAttribute('elementType')) === '49') {
    await driver.waitUntil(async () => (await field.getAttribute('value')) === text, { timeout: 10_000 });
  }
  await tapButtonWithLabel(driver, confirm);
};

// Catalyst omits the zero-size Secret test node; read the same numbered words the user sees.
export const readSeed = async (driver: Driver): Promise<string> => {
  const words = new Map<number, string>();
  await driver.waitUntil(
    async () => {
      words.clear();
      // One accessibility snapshot avoids a round trip for each duplicated static-text node.
      const source = await driver.getPageSource();
      for (const match of source.matchAll(/<XCUIElementTypeStaticText\b[^>]*\blabel="(\d+)\. ([a-z]+) *"/g)) {
        words.set(Number(match[1]), match[2]);
      }
      return [12, 24].includes(words.size) && [...words.keys()].every(index => index >= 1 && index <= words.size);
    },
    { timeout: 30_000, timeoutMsg: 'Numbered recovery words did not appear' },
  );
  return [...words.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, word]) => word)
    .join(' ');
};

// XCTest typing can silently leave Catalyst fields empty even with ABC selected.
// Paste uses native editing actions; replaceId verifies the actual field value.
const pasteText = async (driver: Driver, text: string) => {
  const previous = await clipboard(driver);
  try {
    await setClipboard(driver, text);
    await selectMenuItem(driver, 'Edit', 'Paste');
  } finally {
    await setClipboard(driver, previous);
  }
};
