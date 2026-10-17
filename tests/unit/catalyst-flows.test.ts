import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import vm from 'vm';

it('waits for delayed wallet creation without replaying Create or reading the seed early', async () => {
  let releaseBackup!: () => void;
  const backup = new Promise<void>(resolve => (releaseBackup = resolve));
  let startedWaiting!: () => void;
  const waiting = new Promise<void>(resolve => (startedWaiting = resolve));
  let backupReady = false;
  const clicks: string[] = [];
  const readSeed = jest.fn(async () => {
    if (!backupReady) throw new Error('Read the backup before wallet creation completed');
    return 'test seed';
  });
  const driver = {
    selectMenuItem: async (_: unknown, menu: string, item: string) => clicks.push(`${menu} > ${item}`),
    tapAndWaitForId: async (_: unknown, id: string) => clicks.push(id),
    tapId: async (_: unknown, id: string) => clicks.push(id),
    replaceId: async () => {},
    waitForId: async (_: unknown, id: string) => {
      if (id === 'PleaseBackupScrollView') {
        startedWaiting();
        await backup;
      }
    },
    readSeed,
    scrollDownToId: async () => {},
    waitForIdGone: async () => {},
  };
  const module = { exports: {} as any };
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../e2e-appium/flows.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, { require: () => driver, module, exports: module.exports });
  const creation = module.exports.createWallet({});
  await waiting;
  // Creation remains pending across asynchronous turns. Waiting must not replay
  // the mutation or begin backup assertions before the result becomes available.
  await new Promise(resolve => setImmediate(resolve));
  expect(clicks.filter(id => id === 'Create')).toHaveLength(1);
  expect(readSeed).not.toHaveBeenCalled();
  backupReady = true;
  releaseBackup();
  expect(await creation).toBe('test seed');
  // The desktop menu bar replaces the CreateAWallet panel tap.
  expect(clicks[0]).toBe('File > Add Wallet');
  expect(clicks).not.toContain('CreateAWallet');
  expect(clicks.filter(id => id === 'Create')).toHaveLength(1);
  expect(readSeed).toHaveBeenCalledTimes(1);
});
