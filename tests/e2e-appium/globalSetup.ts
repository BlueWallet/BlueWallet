import globalTeardown from './globalTeardown';
import { startElectrum } from './electrum';
import { execFileSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import { APP_PATH, APPIUM_HOST, APPIUM_PORT, ARTIFACTS_DIR, BUNDLE_ID, PROJECT_ROOT } from './config';

const isAppiumUp = async (): Promise<boolean> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  try {
    const res = await fetch(`http://${APPIUM_HOST}:${APPIUM_PORT}/status`, {
      signal: controller.signal,
    });
    return res.ok;
  } catch (_) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

export default async function globalSetup() {
  if (!fs.existsSync(APP_PATH)) {
    throw new Error(`Mac Catalyst app not found at ${APP_PATH}. Run "npm run e2e:catalyst:build" first (or set CATALYST_APP_PATH).`);
  }
  const actualBundleId = execFileSync(
    '/usr/libexec/PlistBuddy',
    ['-c', 'Print :CFBundleIdentifier', path.join(APP_PATH, 'Contents/Info.plist')],
    {
      encoding: 'utf8',
    },
  ).trim();
  if (actualBundleId !== BUNDLE_ID) throw new Error(`Built app is ${actualBundleId}, but CATALYST_BUNDLE_ID is ${BUNDLE_ID}`);
  try {
    // Own clipboard restoration outside WebDriver: a crashed session must not
    // prevent teardown from restoring the user's original clipboard text.
    (globalThis as any).__CATALYST_CLIPBOARD__ = execFileSync('/usr/bin/pbpaste', { encoding: 'utf8', timeout: 10_000 });
    (globalThis as any).__KEYBOARD_SOURCE__ = execFileSync('xcrun', ['swift', path.join(__dirname, 'keyboard.swift'), 'ascii'], {
      encoding: 'utf8',
    }).trim();
    const electrum = await startElectrum();
    (globalThis as any).__ELECTRUM__ = electrum;
    process.env.E2E_ELECTRUM_PORT = String(electrum.port);
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

    if (await isAppiumUp()) {
      console.log(`Reusing Appium server already listening on ${APPIUM_PORT}`);
      return;
    }

    const appium = spawn(
      path.join(PROJECT_ROOT, 'node_modules', '.bin', 'appium'),
      [
        '--address',
        APPIUM_HOST,
        '--port',
        String(APPIUM_PORT),
        '--log',
        path.join(ARTIFACTS_DIR, `appium-${Date.now()}.log`),
        '--log-level',
        'info:debug',
      ],
      { cwd: PROJECT_ROOT, stdio: 'ignore' },
    );
    (globalThis as any).__APPIUM_PROCESS__ = appium;
    let spawnError: Error | undefined;
    appium.once('error', error => (spawnError = error));

    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if (spawnError) throw new Error(`Could not start Appium server (did you run "npm install"?): ${spawnError.message}`);
      if (appium.exitCode !== null) throw new Error(`Appium server exited with code ${appium.exitCode}, see appium log in ./artifacts`);
      if (await isAppiumUp()) return;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    appium.kill();
    throw new Error('Appium server did not start in 60 seconds, see appium log in ./artifacts');
  } catch (error) {
    await globalTeardown();
    throw error;
  }
}
