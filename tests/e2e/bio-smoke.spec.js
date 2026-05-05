// Minimal bio test for fast iteration: launch the app fresh with Face ID enrolled, navigate
// to Settings → Security, flip the BiometricSwitch, resolve the Face ID prompt with a match,
// confirm the switch ends up ON. No wallet creation, no other flows.
//
// Run just this file:
//   source ../env.sh && npx detox test -c ios.debug tests/e2e/bio-smoke.spec.js --loglevel info

import { device } from 'detox';

import { enableBiometric, matchBiometric, setupBiometricEnrollment, terminateBootedApp, waitForId } from './helperz';

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

    terminateBootedApp();
  });
});
