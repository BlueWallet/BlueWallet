import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { remote } from 'webdriverio';

import { APP_PATH, APPIUM_HOST, APPIUM_PORT, ARTIFACTS_DIR, BUNDLE_ID } from './config';

export type Driver = Awaited<ReturnType<typeof remote>>;

const APP_ARGUMENTS = ['-AppleLanguages', '(en)']; // tests rely on English labels, e.g. 'Close'

// `appium:appPath` is not known to webdriverio typings yet, hence the loose type
const capabilities: Record<string, unknown> = {
  platformName: 'mac',
  'appium:automationName': 'mac2',
  'appium:bundleId': BUNDLE_ID,
  'appium:appPath': APP_PATH,
  'appium:arguments': APP_ARGUMENTS,
  'appium:serverStartupTimeout': 600_000,
  'appium:showServerLogs': true,
};

/**
 * Starts a mac2 session, which (re)launches the Mac Catalyst app.
 */
export const launch = (): Promise<Driver> =>
  remote({
    hostname: APPIUM_HOST,
    port: APPIUM_PORT,
    logLevel: 'warn',
    connectionRetryTimeout: 600_000, // creating the very first session compiles WebDriverAgentMac
    connectionRetryCount: 1,
    capabilities,
  });

/**
 * Kills the app and starts it again, so every test begins on the home screen
 * (same idea as `device.launchApp({ newInstance: true })` in Detox tests)
 */
export const relaunch = async (driver: Driver) => {
  await driver.execute('macos: terminateApp', { bundleId: BUNDLE_ID });
  await driver.execute('macos: launchApp', { path: APP_PATH, arguments: APP_ARGUMENTS });
  // on desktop the drawer is permanent, and "Add a wallet" card is rendered there regardless of the wallets count
  await waitForId(driver, 'CreateAWallet', 90_000);
};

/**
 * React Native `testID` ends up as accessibilityIdentifier, which mac2 matches with the `accessibility id` strategy
 */
const byId = (driver: Driver, id: string) => driver.$(`~${id}`);

const XCUIElementTypeButton = 9;
const XCUIElementTypeMenuItem = 54;
const XCUIElementTypeMenuBarItem = 56;
// navigation bar buttons expose their text as `label`, buttons of alerts as `title`
const buttonWithLabel = (driver: Driver, label: string) =>
  driver.$(`-ios predicate string:elementType == ${XCUIElementTypeButton} AND (label == "${label}" OR title == "${label}")`);

export const waitForId = async (driver: Driver, id: string, timeout = 30_000) => {
  const element = byId(driver, id);
  await element.waitForExist({ timeout, timeoutMsg: `element with testID "${id}" did not appear in ${timeout} ms` });
  return element;
};

export const waitForIdGone = async (driver: Driver, id: string, timeout = 30_000) => {
  await byId(driver, id).waitForExist({
    timeout,
    reverse: true,
    timeoutMsg: `element with testID "${id}" is still there after ${timeout} ms`,
  });
};

const APP_STATE_RUNNING_IN_FOREGROUND = 4;

/**
 * XCTest sends real mouse & keyboard events to whatever is frontmost, so make sure it is the app under test.
 * Does nothing if the app is frontmost already: needless activation makes the app think it just came from background
 */
export const activate = async (driver: Driver) => {
  const state = await driver.execute('macos: queryAppState', { bundleId: BUNDLE_ID });
  if (Number(state) !== APP_STATE_RUNNING_IN_FOREGROUND) await driver.execute('macos: activateApp', { bundleId: BUNDLE_ID });
};

export const tapId = async (driver: Driver, id: string, timeout = 30_000) => {
  const element = await waitForId(driver, id, timeout);
  await activate(driver);
  await element.click();
};

/**
 * Native navigation bar & alert buttons do not get their `identifier` on Mac Catalyst, only accessibility label survives,
 * so they have to be located by label (same as `by.label()` / `by.text()` fallbacks in Detox helpers)
 */
export const tapButtonWithLabel = async (driver: Driver, label: string, timeout = 30_000) => {
  const element = buttonWithLabel(driver, label);
  await element.waitForExist({ timeout, timeoutMsg: `button with label "${label}" did not appear in ${timeout} ms` });
  await activate(driver);
  await element.click();
};

/**
 * There is no synchronization with the app (unlike Detox), so a tap may land before the app is ready to handle it.
 * Taps `id` again until element `expectedId` shows up.
 */
export const tapUntilIdAppears = async (driver: Driver, id: string, expectedId: string, attempts = 5) => {
  const expected = byId(driver, expectedId);
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await expected.isExisting()) return expected;
    await tapId(driver, id);
    try {
      await expected.waitForExist({ timeout: 5_000 });
    } catch (_) {}
  }
  return waitForId(driver, expectedId, 5_000);
};

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
  const scrollView = await waitForId(driver, scrollViewId);
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await isHittable(driver, id)) return;
    await activate(driver);
    await driver.execute('macos: scroll', { elementId: scrollView.elementId, deltaX: 0, deltaY: -200 });
    await driver.pause(300);
  }
  if (!(await isHittable(driver, id))) throw new Error(`could not scroll "${scrollViewId}" to element with testID "${id}"`);
};

/** text of a `<Text testID=...>`: exposed as `value` or `label` of a static text, depending on the element */
export const getText = async (driver: Driver, id: string): Promise<string> => {
  const element = await waitForId(driver, id);
  return (await element.getAttribute('value')) || (await element.getAttribute('label')) || (await element.getText());
};

export const typeId = async (driver: Driver, id: string, text: string, timeout = 30_000) => {
  const element = await waitForId(driver, id, timeout);
  await activate(driver);
  await element.click(); // focus
  await element.addValue(text);
};

/**
 * Picks an item from the macOS menu bar, e.g. `selectMenuItem(driver, 'BlueWallet', 'Settings')`.
 * Item is matched by the beginning of its title, so there is no need to care about trailing ellipsis.
 */
export const selectMenuItem = async (driver: Driver, menuTitle: string, itemTitle: string) => {
  await activate(driver);
  const menu = driver.$(`-ios predicate string:elementType == ${XCUIElementTypeMenuBarItem} AND title == "${menuTitle}"`);
  await menu.waitForExist({ timeout: 10_000, timeoutMsg: `menu "${menuTitle}" not found in the menu bar` });
  await menu.click();
  const item = driver.$(`-ios predicate string:elementType == ${XCUIElementTypeMenuItem} AND title BEGINSWITH "${itemTitle}"`);
  await item.waitForExist({ timeout: 10_000, timeoutMsg: `menu item "${itemTitle}" not found in menu "${menuTitle}"` });
  await item.click();
};

/**
 * Same trick Detox tests use (see `/tmp/travislock.*` there): CI re-runs the whole suite when something fails,
 * and tests that already passed are skipped on the re-run.
 */
const lockFile = (key: string) => '/tmp/catalystlock.' + crypto.createHash('sha256').update(key).digest('hex');

export const hasPassedBefore = (key: string): boolean => !!process.env.CI && fs.existsSync(lockFile(key));

export const markAsPassed = (key: string) => {
  if (process.env.CI) fs.writeFileSync(lockFile(key), '1');
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
    await driver.execute('macos: stopNativeScreenRecording', { ignorePayload: true });
    return;
  }
  const base64 = (await driver.execute('macos: stopNativeScreenRecording', {})) as unknown as string;
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, `${name}.mp4`), Buffer.from(base64, 'base64'));
};

export const saveArtifacts = async (driver: Driver, name: string) => {
  const safeName = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  try {
    await driver.saveScreenshot(path.join(ARTIFACTS_DIR, `${safeName}.png`));
  } catch (error: any) {
    console.warn('could not save screenshot:', error.message);
  }
  try {
    fs.writeFileSync(path.join(ARTIFACTS_DIR, `${safeName}.xml`), await driver.getPageSource());
  } catch (error: any) {
    console.warn('could not save page source:', error.message);
  }
};
