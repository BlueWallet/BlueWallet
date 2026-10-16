import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import vm from 'vm';
import { AsyncLocalStorage } from 'async_hooks';

const loadHelpers = () => {
  const module = { exports: {} as any };
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../e2e-appium/driver.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, {
    require: (name: string) => (name === 'async_hooks' ? { AsyncLocalStorage } : {}),
    module,
    exports: module.exports,
    process: { env: {} },
    Error,
  });
  return module.exports;
};

it('reports the scenario caller through nested async helpers and retains the original error', async () => {
  const { tapAndWaitForId } = loadHelpers();
  const failure = new Error('wallet did not appear');
  const originalStack = failure.stack;
  const driver = {
    $: () => ({
      waitForExist: async () => {
        await Promise.resolve();
        throw failure;
      },
    }),
  };
  async function walletScenario() {
    await tapAndWaitForId(driver, 'Wallet', 'WalletDetails');
  }
  await expect(walletScenario()).rejects.toBe(failure);
  expect(failure.message).toBe('wallet did not appear');
  expect(failure.stack?.split('\n')[1]).toContain('walletScenario');
  expect(failure.stack).toContain(`Original helper failure:\n${originalStack}`);
  expect(failure.stack?.match(/Original helper failure:/g)).toHaveLength(1);
});

it('preserves successful return values and executes a click only once', async () => {
  const { waitForId, tapId } = loadHelpers();
  const element = { waitForExist: jest.fn(async () => {}), click: jest.fn(async () => {}) };
  const driver = { $: () => element, execute: async () => 4 };
  await expect(waitForId(driver, 'Wallet')).resolves.toBe(element);
  await tapId(driver, 'Wallet');
  expect(element.click).toHaveBeenCalledTimes(1);
});

it('passes non-Error rejections through unchanged', async () => {
  const { waitForId } = loadHelpers();
  // Exercise an untyped third-party rejection without replacing its value.
  // eslint-disable-next-line prefer-promise-reject-errors
  const driver = { $: () => ({ waitForExist: async () => Promise.reject('transport stopped') }) };
  await expect(waitForId(driver, 'Wallet')).rejects.toBe('transport stopped');
});
