import { execFile } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { arch, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { promisify } from 'node:util';

// Runs the production preview controller on an isolated simulator, without
// CocoaPods, signing credentials, or the main React Native application.
const workDir = mkdtempSync(join(tmpdir(), 'bluewallet-preview-test-'));
const resultsDir = resolve(process.env.PREVIEW_RESULTS_DIR || join(workDir, 'results'));
const run = promisify(execFile);
const xcrun = async (args: string[], timeout = 120_000) => (await run('xcrun', args, { encoding: 'utf8', timeout })).stdout.trim();
let simulator: string | undefined;
mkdirSync(resultsDir, { recursive: true });

try {
  const { runtimes } = JSON.parse(await xcrun(['simctl', 'list', 'runtimes', '--json'])) as {
    runtimes: { identifier: string; version: string; isAvailable: boolean; name: string }[];
  };
  const runtime = runtimes
    .filter(candidate => candidate.isAvailable && candidate.name.startsWith('iOS'))
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0];
  if (!runtime) throw new Error('An available iOS simulator runtime is required');

  const { devicetypes } = JSON.parse(await xcrun(['simctl', 'list', 'devicetypes', '--json'])) as {
    devicetypes: { identifier: string; name: string; minRuntimeVersion: number; maxRuntimeVersion: number }[];
  };
  const [major, minor = 0, patch = 0] = runtime.version.split('.').map(Number);
  const runtimeVersion = major * 65536 + minor * 256 + patch;
  const deviceType = devicetypes.find(
    candidate =>
      candidate.name.startsWith('iPhone') && candidate.minRuntimeVersion <= runtimeVersion && candidate.maxRuntimeVersion >= runtimeVersion,
  );
  if (!deviceType) throw new Error(`No iPhone simulator supports ${runtime.name}`);

  simulator = await xcrun(['simctl', 'create', 'BlueWallet Preview Tests', deviceType.identifier, runtime.identifier]);
  await xcrun(['simctl', 'boot', simulator]);
  // A fresh CI simulator performs first-boot data migration. Keep a bounded
  // six-minute boot allowance separate from the shorter tool/test deadlines.
  console.log(`Waiting for simulator ${simulator} to finish first-boot migration`);
  await xcrun(['simctl', 'bootstatus', simulator, '-b'], 360_000);

  const app = join(workDir, 'PreviewSmoke.app');
  mkdirSync(app);
  copyFileSync('ios/QuickLookPreviewTests/Info.plist', join(app, 'Info.plist'));
  // A cold hosted runner also builds Swift's SDK module cache. Give compilation
  // its own deadline; simulator startup and assertion timeouts stay separate.
  console.log('Compiling the native preview controller and assertions');
  await xcrun(
    [
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
    ],
    300_000,
  );
  await run('codesign', ['--force', '--sign', '-', app], { timeout: 30_000 });
  await xcrun(['simctl', 'install', simulator, app]);
  await xcrun(['simctl', 'launch', simulator, 'io.bluewallet.preview-smoke']);
  const container = await xcrun(['simctl', 'get_app_container', simulator, 'io.bluewallet.preview-smoke', 'data']);
  const receipt = join(container, 'tmp', 'preview-smoke-results.txt');
  const deadline = Date.now() + 45_000;
  while (!existsSync(receipt) && Date.now() < deadline) await setTimeout(500);
  if (!existsSync(receipt)) throw new Error('Preview tests crashed or did not finish within 45 seconds');
  const result = readFileSync(receipt, 'utf8');
  copyFileSync(receipt, join(resultsDir, 'preview-smoke-results.txt'));
  if (!result.startsWith('PASS:')) throw new Error(result);
  await xcrun(['simctl', 'io', simulator, 'screenshot', join(resultsDir, 'preview-records.png')]);
  console.log(result.trim());
} catch (error) {
  const diagnostics =
    error instanceof Error
      ? [error.stack || error.message, 'stdout' in error ? error.stdout : '', 'stderr' in error ? error.stderr : '']
      : [String(error)];
  writeFileSync(join(resultsDir, 'failure.txt'), diagnostics.filter(Boolean).join('\n\n'));
  throw error;
} finally {
  if (simulator) {
    for (const command of ['shutdown', 'delete']) {
      try {
        await xcrun(['simctl', command, simulator], 30_000);
      } catch (error) {
        console.warn(`Could not ${command} preview simulator:`, error);
      }
    }
  }
  rmSync(workDir, { recursive: true, force: true });
}
