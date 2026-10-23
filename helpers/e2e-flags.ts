// End-to-end builds with E2E_HIDE_SECRETS=1 replace this module with tests/e2e/e2e-flags.ts (tests/e2e/metro.config.js).
// Production Metro never loads that file, so release builds always get these values.

/** Draw seeds, private keys and their QR codes in transparent ink: test videos and screenshots are uploaded as they are. */
export const HIDE_SECRETS_ON_SCREEN = false;
