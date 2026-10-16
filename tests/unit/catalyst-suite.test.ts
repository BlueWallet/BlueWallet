import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import ts from 'typescript';
import vm from 'vm';

it('blocks commands from expired async bodies while allowing teardown requests', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../e2e-appium/driver.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  let transformRequest!: (request: { method: string }) => { method: string };
  const module = { exports: {} as any };
  const fakeRequire = (name: string) => {
    if (name === './config') return {};
    if (name === 'webdriverio') {
      return {
        remote: async (options: { transformRequest: typeof transformRequest }) => {
          transformRequest = options.transformRequest;
          return { options: {} };
        },
      };
    }
    return require(name);
  };
  vm.runInNewContext(compiled, { require: fakeRequire, module, exports: module.exports, process, console, Buffer });
  await module.exports.launch();
  const state = { closed: false };
  await module.exports.attemptContext.run(state, async () => {
    expect(transformRequest({ method: 'POST' })).toEqual({ method: 'POST' });
    await Promise.resolve();
    state.closed = true;
    expect(() => transformRequest({ method: 'POST' })).toThrow('Catalyst test attempt has already ended');
  });
  expect(transformRequest({ method: 'DELETE' })).toEqual({ method: 'DELETE' });
});

it('retries whole cases, isolates timed-out attempts, skips deferred bodies and cleans up sessions', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-suite-'));
  try {
    const source = fs.readFileSync(path.join(__dirname, '../e2e-appium/suite.ts'), 'utf8');
    fs.writeFileSync(
      path.join(directory, 'suite.js'),
      ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    );
    fs.writeFileSync(
      path.join(directory, 'driver.js'),
      `const fs = require('fs');
const path = require('path');
exports.attemptContext = new (require('async_hooks').AsyncLocalStorage)();
let id = 0;
const event = (type, driver) => fs.appendFileSync(path.join(__dirname, 'events.jsonl'), JSON.stringify({ type, id: driver?.id }) + '\\n');
exports.event = event;
exports.launch = async () => {
  const driver = { id: ++id, deleteSession: async () => event('delete', driver) };
  event('launch', driver);
  return driver;
};
exports.relaunch = async driver => event('reset', driver);
exports.startVideo = async driver => event('startVideo', driver);
exports.stopVideo = async driver => event('stopVideo', driver);
exports.saveArtifacts = async driver => event('artifacts', driver);
`,
    );
    fs.writeFileSync(
      path.join(directory, 'lifecycle.spec.js'),
      `process.env.CI = 'true';
process.env.E2E_RETRIES = '2';
process.env.E2E_FAIL_FAST = '0';
const { catalystSuite } = require('./suite');
const { event } = require('./driver');
let flaky = 0, timed = 0;
catalystSuite('Harness lifecycle', test => {
  test('passes immediately', async driver => event('firstPassBody', driver));
  test('recovers on third attempt', async driver => {
    event('flakyBody', driver);
    if (++flaky < 3) throw new Error('expected transient failure');
  });
  test('recovers after Jest timeout', async driver => {
    event('timeoutBody', driver);
    if (++timed === 1) await new Promise(resolve => setTimeout(resolve, 100));
  }, 25);
  test('does not inherit a late completion from the timed-out body', async driver => {
    event('isolationBody', driver);
    await new Promise(resolve => setTimeout(resolve, 130));
    throw new Error('expected persistent failure');
  });
  test.skip('deferred case', async driver => event('skippedBody', driver));
});
`,
    );
    const report = path.join(directory, 'result.json');
    const result = spawnSync(
      process.execPath,
      [
        require.resolve('jest/bin/jest'),
        '--config',
        JSON.stringify({
          rootDir: directory,
          testEnvironment: path.join(__dirname, '../e2e-appium/environment.js'),
          testEnvironmentOptions: { failFast: false },
          testMatch: ['**/*.spec.js'],
          testTimeout: 2000,
          watchman: false,
        }),
        '--runInBand',
        '--json',
        '--outputFile',
        report,
      ],
      { encoding: 'utf8', timeout: 30_000 },
    );
    if (!fs.existsSync(report)) throw new Error(result.error?.message ?? result.stderr);
    // The child intentionally contains one persistent failure; it must remain red.
    expect(result.status).toBe(1);
    expect(JSON.parse(fs.readFileSync(report, 'utf8'))).toMatchObject({ numFailedTests: 1, numPassedTests: 3, numPendingTests: 1 });
    const events: { type: string; id: number }[] = fs
      .readFileSync(path.join(directory, 'events.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));
    const count = (type: string) => events.filter(event => event.type === type).length;
    expect(count('firstPassBody')).toBe(1);
    expect(count('flakyBody')).toBe(3);
    expect(new Set(events.filter(event => event.type === 'flakyBody').map(event => event.id)).size).toBe(3);
    expect(count('timeoutBody')).toBe(2);
    expect(count('isolationBody')).toBe(3);
    expect(count('skippedBody')).toBe(0);
    expect(count('artifacts')).toBe(6);
    expect(result.stdout + result.stderr).toContain('Passed: passes immediately (attempt 1/3)');
    expect(result.stdout + result.stderr).toContain('Passed: recovers on third attempt (attempt 3/3)');
    expect(count('startVideo')).toBe(9);
    expect(count('stopVideo')).toBe(9);
    const active = new Set<number>();
    for (const event of events) {
      if (event.type === 'launch') active.add(event.id);
      if (event.type === 'delete') active.delete(event.id);
      if (event.type === 'reset') expect(active.has(event.id)).toBe(true);
    }
    expect(active.size).toBe(0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}, 40_000);
