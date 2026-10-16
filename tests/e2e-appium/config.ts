import path from 'path';

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
export const ARTIFACTS_DIR = path.join(PROJECT_ROOT, 'artifacts');

export const APPIUM_HOST = '127.0.0.1';
export const APPIUM_PORT = Number(process.env.APPIUM_PORT ?? 4723);

export const BUNDLE_ID = process.env.CATALYST_BUNDLE_ID ?? 'io.bluewallet.bluewallet.e2e';
export const HOSTED_CI = process.env.GITHUB_ACTIONS === 'true' && process.env.RUNNER_ENVIRONMENT === 'github-hosted';
if (!BUNDLE_ID.endsWith('.e2e') && !(HOSTED_CI && BUNDLE_ID === 'io.bluewallet.bluewallet')) {
  throw new Error('Refusing to reset a non-E2E app outside GitHub-hosted CI');
}
/** produced by tests/e2e-appium/build-catalyst.sh */
export const APP_PATH =
  process.env.CATALYST_APP_PATH ?? path.join(PROJECT_ROOT, 'ios/build/catalyst-e2e/Build/Products/Release-maccatalyst/BlueWallet.app');
