import assert from 'assert';

import {
  Driver,
  getText,
  hasPassedBefore,
  launch,
  markAsPassed,
  relaunch,
  saveArtifacts,
  scrollDownToId,
  selectMenuItem,
  startVideo,
  stopVideo,
  tapButtonWithLabel,
  tapId,
  tapUntilIdAppears,
  typeId,
  waitForId,
  waitForIdGone,
} from './driver';

/**
 * Smoke tests for the Mac Catalyst build, driven by Appium mac2 driver.
 *
 * Header buttons are not rendered on desktop: wallets are added with "Add a wallet" card in the (permanent) drawer,
 * and Settings can only be opened from the macOS app menu.
 *
 * CI builds are ad-hoc signed and thus can not use Keychain, see the note in the wallet test.
 */
const TEST_TIMEOUT_MS = 480_000; // jest's testTimeout is 600 sec

describe('BlueWallet Mac Catalyst', () => {
  let driver: Driver;
  let somethingFailed = false;
  const runId = Date.now(); // CI re-runs the suite on failure, keep artifacts of every attempt
  const recordVideo = !!process.env.CI || process.env.E2E_RECORD_VIDEO === '1';

  /**
   * Skips the test if it passed during a previous attempt (CI only), starts it with a freshly launched app,
   * and dumps screenshot & accessibility tree to ./artifacts if it fails
   */
  const e2eTest = (lockKey: string, body: () => Promise<void>) => async () => {
    if (hasPassedBefore(lockKey)) return console.warn('skipping', JSON.stringify(lockKey), 'as it previously passed on CI');
    try {
      await relaunch(driver);
      // failing a bit earlier than jest would, to be able to save artifacts
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`test ${lockKey} took longer than ${TEST_TIMEOUT_MS} ms`)), TEST_TIMEOUT_MS);
      });
      await Promise.race([body(), timeout]).finally(() => clearTimeout(timer));
    } catch (error) {
      somethingFailed = true;
      if (driver) await saveArtifacts(driver, `${runId}-${lockKey}`);
      throw error;
    }
    markAsPassed(lockKey);
  };

  const openSettings = async () => {
    await selectMenuItem(driver, 'BlueWallet', 'Settings');
    await waitForId(driver, 'SettingsRoot');
  };

  beforeAll(async () => {
    driver = await launch();
    try {
      if (recordVideo) await startVideo(driver);
    } catch (error: any) {
      console.warn('could not start video recording:', error.message);
    }
  });

  afterAll(async () => {
    if (!driver) return;
    try {
      // video is only worth keeping when something went wrong
      if (recordVideo) await stopVideo(driver, somethingFailed ? `${runId}-catalyst` : undefined);
    } catch (error: any) {
      console.warn('could not save video:', error.message);
    }
    await driver.deleteSession();
  });

  it(
    'launches and shows wallets drawer',
    e2eTest('t_launch', async () => {
      await waitForId(driver, 'CreateAWallet');
    }),
  );

  it(
    'opens Settings from the app menu',
    e2eTest('t_settings', async () => {
      await openSettings();
      await waitForId(driver, 'AboutButton');
    }),
  );

  it(
    'selftest passes',
    e2eTest('t_selftest', async () => {
      await openSettings();
      await scrollDownToId(driver, 'SettingsRoot', 'AboutButton');
      await tapId(driver, 'AboutButton');
      await scrollDownToId(driver, 'AboutScrollView', 'RunSelfTestButton');
      await tapUntilIdAppears(driver, 'RunSelfTestButton', 'SelfTestLoading');
      await tapId(driver, 'SelfTestLoading'); // that's "Run self-test" button

      // CPU-heavy, takes couple of minutes. If it fails, the error is rendered as plain text - see the accessibility tree dump
      await waitForId(driver, 'SelfTestOk', 300_000);
    }),
  );

  // Skipped until CI builds are properly signed. Mac Catalyst apps can use Keychain only when signed with a provisioning profile.
  // Ad-hoc signed build (what CI makes, since it has no signing secrets) gets errSecMissingEntitlement (-34018) instead,
  // and the app keeps showing "save to disk exception: error saving key" alert on every save, which blocks the UI.
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip(
    'can create wallet, open it and see wallet details',
    e2eTest('t_create_wallet', async () => {
      const label = 'appium' + String(runId).slice(-5);

      await tapUntilIdAppears(driver, 'CreateAWallet', 'WalletNameInput');
      await typeId(driver, 'WalletNameInput', label);
      await tapId(driver, 'ActivateBitcoinButton');
      await tapId(driver, 'Create');

      await scrollDownToId(driver, 'PleaseBackupScrollView', 'PleasebackupOk');
      await tapId(driver, 'PleasebackupOk');
      await waitForIdGone(driver, 'PleasebackupOk');

      // wallet card in the drawer has wallet label as testID; opening it shows wallet's transactions
      await tapUntilIdAppears(driver, label, 'WalletDetails');
      await tapId(driver, 'WalletDetails');
      assert.strictEqual(await getText(driver, 'WalletNameDisplay'), label);

      // cleaning up
      await scrollDownToId(driver, 'WalletDetailsScroll', 'DeleteWallet');
      await tapId(driver, 'DeleteWallet');
      await tapButtonWithLabel(driver, 'Yes, delete');
      await waitForIdGone(driver, label);
    }),
  );
});
