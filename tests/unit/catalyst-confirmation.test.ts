import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import vm from 'vm';
import { AsyncLocalStorage } from 'async_hooks';

const loadConfirmation = () => {
  const module = { exports: {} as any };
  const write = jest.fn();
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../e2e-appium/driver.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, {
    require: (name: string) => (name === 'async_hooks' ? { AsyncLocalStorage } : {}),
    module,
    exports: module.exports,
    process: { env: {}, stdout: { write } },
    Error,
  });
  return { confirm: module.exports.tapOptionalConfirmation, write };
};

const fixture = (alertPresent: boolean, resultPresent = true) => {
  const button = {
    isExisting: jest.fn(async () => alertPresent),
    waitForExist: jest.fn(async ({ timeoutMsg }) => {
      if (!alertPresent) throw new Error(timeoutMsg);
    }),
    click: jest.fn(async () => {}),
  };
  const driver = {
    $: (selector: string) => (selector === '~imported wallet' ? { isExisting: async () => resultPresent } : button),
    waitUntil: async (condition: () => Promise<boolean>, { timeoutMsg }: { timeoutMsg: string }) => {
      if (!(await condition())) throw new Error(timeoutMsg);
    },
    execute: async () => 4,
  };
  return { button, driver };
};

it('dismisses a visible success alert once', async () => {
  const { confirm, write } = loadConfirmation();
  const { button, driver } = fixture(true);
  await confirm(driver, 'OK', 'imported wallet');
  expect(button.click).toHaveBeenCalledTimes(1);
  expect(write).not.toHaveBeenCalled();
});

it('records TODO when only the operation result appears', async () => {
  const { confirm, write } = loadConfirmation();
  const { button, driver } = fixture(false);
  await confirm(driver, 'OK', 'imported wallet');
  expect(button.click).not.toHaveBeenCalled();
  expect(write).toHaveBeenCalledWith(expect.stringContaining('TODO: OK informational alert unavailable'));
});

it('fails when neither the alert nor operation result appears', async () => {
  const { confirm } = loadConfirmation();
  await expect(confirm(fixture(false, false).driver, 'OK', 'imported wallet')).rejects.toThrow('Neither OK confirmation');
});

it('does not hide a failed click or transport failure', async () => {
  const { confirm } = loadConfirmation();
  const visible = fixture(true);
  visible.button.click.mockRejectedValueOnce(new Error('click failed'));
  await expect(confirm(visible.driver, 'OK', 'imported wallet')).rejects.toThrow('click failed');
  const absent = fixture(false);
  absent.button.waitForExist.mockRejectedValueOnce(new Error('transport failed'));
  await expect(confirm(absent.driver, 'OK', 'imported wallet')).rejects.toThrow('transport failed');
});
