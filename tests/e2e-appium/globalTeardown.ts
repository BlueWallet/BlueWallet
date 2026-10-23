import { ChildProcess, execFileSync } from 'child_process';
import path from 'path';
import { ARTIFACTS_DIR } from './config';
import { redactAppiumLogs, secretValues } from './redact';

// Appium runs in its own process group (globalSetup): signal the group, so the WebDriverAgent
// descendants of a stalled server go with it instead of keeping the WDA port.
export const killAppium = (appium: ChildProcess, signal: NodeJS.Signals = 'SIGTERM') => {
  if (appium.pid === undefined) return;
  try {
    process.kill(-appium.pid, signal);
  } catch (_) {
    appium.kill(signal);
  }
};

export default async function globalTeardown() {
  const appium: ChildProcess | undefined = (globalThis as any).__APPIUM_PROCESS__;
  if (appium && appium.exitCode === null && appium.signalCode === null) {
    const exited = new Promise<void>(resolve => appium.once('exit', () => resolve()));
    killAppium(appium);
    await Promise.race([exited, new Promise<void>(resolve => setTimeout(resolve, 10_000))]);
    if (appium.exitCode === null && appium.signalCode === null) {
      // A server stuck on a stalled WebDriverAgent session would keep Jest alive until the job timeout.
      killAppium(appium, 'SIGKILL');
      await Promise.race([exited, new Promise<void>(resolve => setTimeout(resolve, 5_000))]);
    }
  }
  try {
    // The server log recorded every request body, including pasted mnemonics as base64.
    redactAppiumLogs(ARTIFACTS_DIR, secretValues());
  } catch (error: any) {
    console.warn('[Catalyst] Could not redact the Appium log:', error.message);
  }
  try {
    const source = (globalThis as any).__KEYBOARD_SOURCE__;
    if (source) execFileSync('xcrun', ['swift', path.join(__dirname, 'keyboard.swift'), source]);
  } finally {
    const clipboard = (globalThis as any).__CATALYST_CLIPBOARD__;
    if (clipboard !== undefined) {
      execFileSync('/usr/bin/pbcopy', {
        input: clipboard,
        timeout: 10_000,
        stdio: ['pipe', 'ignore', 'ignore'],
      });
    }
  }
}
