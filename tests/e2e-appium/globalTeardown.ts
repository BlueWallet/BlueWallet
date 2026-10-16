import { ChildProcess, execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ARTIFACTS_DIR } from './config';

export default async function globalTeardown() {
  const appium: ChildProcess | undefined = (globalThis as any).__APPIUM_PROCESS__;
  appium?.kill();
  try {
    const fixture = (globalThis as any).__ELECTRUM__;
    if (fixture) {
      await fixture.close();
      const methods = new Map<string, number>();
      for (const method of fixture.requests) methods.set(method, (methods.get(method) ?? 0) + 1);
      fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
      fs.writeFileSync(path.join(ARTIFACTS_DIR, `electrum-${Date.now()}.json`), JSON.stringify(Object.fromEntries(methods), null, 2));
    }
  } finally {
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
}
