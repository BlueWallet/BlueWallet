import * as bip39 from 'bip39';
import path from 'path';

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
export const ARTIFACTS_DIR = path.join(PROJECT_ROOT, 'artifacts');

export const APPIUM_HOST = '127.0.0.1';
export const APPIUM_PORT = Number(process.env.APPIUM_PORT ?? 4723);

export const BUNDLE_ID = process.env.CATALYST_BUNDLE_ID ?? 'io.bluewallet.bluewallet.e2e';
export const HOSTED_CI = process.env.GITHUB_ACTIONS === 'true' && process.env.RUNNER_ENVIRONMENT === 'github-hosted';
if (!BUNDLE_ID.endsWith('.e2e')) throw new Error('Refusing to reset a non-E2E app');
/** produced by tests/e2e-appium/build-catalyst.sh */
export const APP_PATH =
  process.env.CATALYST_APP_PATH ?? path.join(PROJECT_ROOT, 'ios/build/catalyst-e2e/Build/Products/Release-maccatalyst/BlueWallet.app');

export type SecretName = 'HD_MNEMONIC_BIP84';
const BIP39_WORDS = new Set(bip39.wordlists.english);
// Redaction matches the seed as given. The wallet lowercases a pasted seed, replaces separators
// and expands abbreviated words, so only a seed the wallet keeps verbatim can be redacted from
// every artifact; anything else is refused before a run starts.
export const canonicalSeed = (name: string, value: string): string => {
  const words = value.split(' ');
  if (!words.every(word => BIP39_WORDS.has(word))) {
    throw new Error(`${name} must be lowercase BIP39 words separated by single spaces`);
  }
  return value;
};
// Detox reads the same variables. A missing value fails the case instead of skipping it.
export const secret = (name: SecretName): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} (locally: source ../env.sh)`);
  return canonicalSeed(name, value);
};
