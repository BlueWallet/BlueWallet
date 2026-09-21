import path from 'path';

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
export const ARTIFACTS_DIR = path.join(PROJECT_ROOT, 'artifacts');

export const APPIUM_HOST = '127.0.0.1';
export const APPIUM_PORT = Number(process.env.APPIUM_PORT ?? 4723);

export const BUNDLE_ID = process.env.CATALYST_BUNDLE_ID ?? 'io.bluewallet.bluewallet';
/** produced by tests/e2e-appium/build-catalyst.sh */
export const APP_PATH =
  process.env.CATALYST_APP_PATH ?? path.join(PROJECT_ROOT, 'ios/build/catalyst-e2e/Build/Products/Release-maccatalyst/BlueWallet.app');
