// Minimal bio test for fast iteration: launch the app fresh with Face ID enrolled, navigate
// to Settings → Security, flip the BiometricSwitch, resolve the Face ID prompt with a match,
// confirm the switch ends up ON. No wallet creation, no other flows.
//
// Run just this file:
//   source ../env.sh && npx detox test -c ios.debug tests/e2e/bio-smoke.spec.js --loglevel info

import { by, device, element } from 'detox';

import {
  enableBiometric,
  matchBiometric,
  setupBiometricEnrollment,
  tapGatedByBiometric,
  terminateBootedApp,
  waitForId,
  waitForSwitchValue,
} from './helperz';

console.warn = console.log = (...args) => {
  process.stdout.write('\n\t\t' + args.map(String).join('') + '\n');
};

describe('BlueWallet UI Tests - bio smoke', () => {
  it('triggers Face ID from Settings and toggles biometric on', async () => {
    if (device.getPlatform() !== 'ios') return;

    await device.clearKeychain();
    await setupBiometricEnrollment();
    await device.launchApp({ delete: true, permissions: { faceid: 'YES' } });

    await waitForId('WalletsList');
    // enableBiometric internally asserts the switch flipped to ON via waitForSwitchValue;
    // if it returns without throwing, the full flow worked.
    await enableBiometric({ returnHome: true });
  });

  it('auto-triggers Face ID on relaunch and unlocks to WalletsList', async () => {
    if (device.getPlatform() !== 'ios') return;

    // Reuse state from the previous test (biometric is already enabled). On a fresh process,
    // walletsInitialized starts false → UnlockWith renders → it sees biometric is enabled
    // → Face ID prompt auto-triggers from useEffect.
    const launchPromise = device.launchApp({ newInstance: true });
    await matchBiometric();
    await launchPromise;
    await waitForId('WalletsList');
  });

  it('reject-then-match Face ID toggles biometric off', async () => {
    if (device.getPlatform() !== 'ios') return;

    // Continuing from previous test: app is open on WalletsList, biometric is ON.
    await element(by.id('SettingsButton')).tap();
    await element(by.id('SecurityButton')).tap();
    await waitForId('BiometricSwitch');

    // Switch is ON → tapping it triggers Face ID for the disable. tapGatedByBiometric default
    // 'rejectThenMatch' does: tap → fail (RN promise rejects, switch stays ON) → re-tap →
    // match (RN promise resolves, switch flips OFF).
    await tapGatedByBiometric(by.id('BiometricSwitch'));

    // tapGatedByBiometric re-enabled sync at the end; waitForSwitchValue uses expect() which
    // blocks on idle, so disable around the assert.
    await device.disableSynchronization();
    await waitForSwitchValue('BiometricSwitch', false);
    await device.enableSynchronization();

    terminateBootedApp();
  });
});
