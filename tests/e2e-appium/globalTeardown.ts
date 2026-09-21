import type { ChildProcess } from 'child_process';

export default async function globalTeardown() {
  const appium: ChildProcess | undefined = (globalThis as any).__APPIUM_PROCESS__;
  appium?.kill();
}
