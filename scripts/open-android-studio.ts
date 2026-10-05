import type { ChildProcess } from 'node:child_process';

const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { delimiter, dirname, resolve } = require('node:path');

const root = resolve(__dirname, '..');
if (!existsSync(resolve(root, 'node_modules/@react-native/gradle-plugin'))) {
  throw new Error('Run npm ci before opening the Android project.');
}
const studio =
  process.env.ANDROID_STUDIO_BIN ??
  (process.platform === 'darwin'
    ? '/Applications/Android Studio.app/Contents/MacOS/studio'
    : process.platform === 'win32'
      ? 'studio64.exe'
      : 'studio.sh');
const child: ChildProcess = spawn(studio, [resolve(root, 'android')], {
  detached: true,
  stdio: 'ignore',
  env: {
    ...process.env,
    NODE_BINARY: process.execPath,
    PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}`,
  },
});
child.on('error', (error: Error) => {
  console.error(`Could not open Android Studio: ${error.message}. Set ANDROID_STUDIO_BIN to its executable path.`);
  process.exitCode = 1;
});
child.unref();
