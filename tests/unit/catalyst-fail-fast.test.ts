import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import ts from 'typescript';
import vm from 'vm';

it('rejects retry configuration that could turn the failed case into a skipped retry', () => {
  const module = { exports: {} as any };
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../e2e-appium/suite.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, {
    require: () => ({}),
    module,
    exports: module.exports,
    process: { env: { E2E_RETRIES: '2', E2E_FAIL_FAST: '1' } },
    describe: (_: string, body: () => void) => body(),
  });
  expect(() => module.exports.catalystSuite('invalid configuration', () => {})).toThrow('Automatic retries require E2E_FAIL_FAST=0');
});

it.each(['body', 'timeout', 'setup', 'cleanup'])(
  'stops after a %s failure, preserves cleanup, and never reports unrun cases as passed',
  failure => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-fail-fast-'));
    try {
      fs.writeFileSync(
        path.join(directory, 'suite.js'),
        ts.transpileModule(fs.readFileSync(path.join(__dirname, '../e2e-appium/suite.ts'), 'utf8'), {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
      );
      fs.writeFileSync(
        path.join(directory, 'driver.js'),
        `const fs = require('fs');
const path = require('path');
const event = name => fs.appendFileSync(path.join(__dirname, 'events.jsonl'), JSON.stringify(name) + '\\n');
exports.event = event;
exports.attemptContext = new (require('async_hooks').AsyncLocalStorage)();
exports.launch = async () => ({ deleteSession: async () => event('delete') });
exports.relaunch = async () => {
  event('reset');
  if (${JSON.stringify(failure)} === 'setup') throw new Error('expected setup failure');
};
exports.startVideo = async () => event('startVideo');
exports.stopVideo = async () => event('stopVideo');
exports.saveArtifacts = async () => event('artifacts');
`,
      );
      fs.writeFileSync(
        path.join(directory, 'failure.spec.js'),
        `process.env.CI = 'true';
delete process.env.E2E_RETRIES;
const { catalystSuite } = require('./suite');
const { event } = require('./driver');
afterEach(() => {
  if (${JSON.stringify(failure)} === 'cleanup') throw new Error('expected cleanup failure');
});
afterAll(() => event('afterAll'));
catalystSuite('Fail fast', test => {
  test('first failure', async () => {
    event('first');
    if (${JSON.stringify(failure)} === 'body') throw new Error('expected body failure');
    if (${JSON.stringify(failure)} === 'timeout') await new Promise(resolve => setTimeout(resolve, 100));
  }, 25);
  test('must not execute', async () => event('unexpected'));
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
            testEnvironmentOptions: { failFast: true },
            testMatch: ['**/*.spec.js'],
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
      expect(result.status).toBe(1);
      expect(JSON.parse(fs.readFileSync(report, 'utf8'))).toMatchObject({
        numFailedTests: 1,
        numPassedTests: 0,
        numPendingTests: 1,
      });
      const events: string[] = fs
        .readFileSync(path.join(directory, 'events.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
      expect(events.filter(event => event === 'reset')).toHaveLength(1);
      expect(events).not.toContain('unexpected');
      expect(events).toEqual(expect.arrayContaining(['stopVideo', 'delete', 'afterAll']));
      if (failure !== 'cleanup') expect(events).toContain('artifacts');
      expect(result.stderr).toContain('Not run after first failure: must not execute');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  },
  40_000,
);
