import { ChildProcess, execFileSync } from 'child_process';
import path from 'path';
import { ARTIFACTS_DIR } from './config';
import { redactAppiumLogs, secretValues } from './redact';

export default async function globalTeardown() {
  const appium: ChildProcess | undefined = (globalThis as any).__APPIUM_PROCESS__;
  if (appium && appium.exitCode === null) {
    const exited = new Promise<void>(resolve => appium.once('exit', () => resolve()));
    appium.kill();
    await Promise.race([exited, new Promise<void>(resolve => setTimeout(resolve, 10_000))]);
  }
  // The server log recorded every request body, including pasted mnemonics as base64.
  redactAppiumLogs(ARTIFACTS_DIR, secretValues());
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
