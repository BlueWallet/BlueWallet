import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { arch, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

// Runs the production preview controller on an isolated simulator, without
// CocoaPods, signing credentials, or the main React Native application.
const workDir = mkdtempSync(join(tmpdir(), 'bluewallet-preview-test-'));
const resultsDir = resolve(process.env.PREVIEW_RESULTS_DIR || join(workDir, 'results'));
const xcrun = (...args: string[]) => execFileSync('xcrun', args, { encoding: 'utf8', timeout: 120_000 }).trim();
let simulator: string | undefined;

try {
  const { runtimes } = JSON.parse(xcrun('simctl', 'list', 'runtimes', '--json')) as {
    runtimes: { identifier: string; version: string; isAvailable: boolean; name: string }[];
  };
  const runtime = runtimes
    .filter(candidate => candidate.isAvailable && candidate.name.startsWith('iOS'))
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0];
  if (!runtime) throw new Error('An available iOS simulator runtime is required');

  const { devicetypes } = JSON.parse(xcrun('simctl', 'list', 'devicetypes', '--json')) as {
    devicetypes: { identifier: string; name: string; minRuntimeVersion: number; maxRuntimeVersion: number }[];
  };
  const [major, minor = 0, patch = 0] = runtime.version.split('.').map(Number);
  const runtimeVersion = major * 65536 + minor * 256 + patch;
  const deviceType = devicetypes.find(
    candidate =>
      candidate.name.startsWith('iPhone') && candidate.minRuntimeVersion <= runtimeVersion && candidate.maxRuntimeVersion >= runtimeVersion,
  );
  if (!deviceType) throw new Error(`No iPhone simulator supports ${runtime.name}`);

  simulator = xcrun('simctl', 'create', 'BlueWallet Preview Tests', deviceType.identifier, runtime.identifier);
  xcrun('simctl', 'boot', simulator);
  xcrun('simctl', 'bootstatus', simulator, '-b');

  const app = join(workDir, 'PreviewSmoke.app');
  mkdirSync(app);
  execFileSync('cp', ['ios/QuickLookPreviewTests/Info.plist', join(app, 'Info.plist')]);
  xcrun(
    '--sdk',
    'iphonesimulator',
    'swiftc',
    '-target',
    `${arch() === 'arm64' ? 'arm64' : 'x86_64'}-apple-ios18.0-simulator`,
    '-parse-as-library',
    'ios/QuickLookPreview/PreviewViewController.swift',
    'ios/QuickLookPreview/ScriptDescription.swift',
    'ios/QuickLookPreviewTests/PreviewSmokeTests.swift',
    '-o',
    join(app, 'PreviewSmoke'),
  );
  execFileSync('codesign', ['--force', '--sign', '-', app], { stdio: 'inherit' });
  xcrun('simctl', 'install', simulator, app);
  xcrun('simctl', 'launch', simulator, 'io.bluewallet.preview-smoke');
  const container = xcrun('simctl', 'get_app_container', simulator, 'io.bluewallet.preview-smoke', 'data');
  const receipt = join(container, 'tmp', 'preview-smoke-results.txt');
  const deadline = Date.now() + 45_000;
  while (!existsSync(receipt) && Date.now() < deadline) await setTimeout(500);
  if (!existsSync(receipt)) throw new Error('Preview tests crashed or did not finish within 45 seconds');
  const result = readFileSync(receipt, 'utf8');
  if (!result.startsWith('PASS:')) throw new Error(result);
  mkdirSync(resultsDir, { recursive: true });
  execFileSync('cp', [receipt, join(resultsDir, 'preview-smoke-results.txt')]);
  xcrun('simctl', 'io', simulator, 'screenshot', join(resultsDir, 'preview-records.png'));
  console.log(result.trim());
} finally {
  if (simulator) {
    try {
      xcrun('simctl', 'shutdown', simulator);
    } finally {
      xcrun('simctl', 'delete', simulator);
    }
  }
  rmSync(workDir, { recursive: true, force: true });
}
