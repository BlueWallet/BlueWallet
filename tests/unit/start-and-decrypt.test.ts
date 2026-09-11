import { startAndDecrypt } from '../../blue_modules/start-and-decrypt';
import { BlueApp } from '../../class/blue-app';

describe('startAndDecrypt authentication boundary', () => {
  it('reloads persisted storage even when wallets remain in memory', async () => {
    const app = BlueApp.getInstance();
    const previousWallets = app.wallets;
    app.wallets = [{} as any];
    const migrateKeys = jest.spyOn(app, 'migrateKeys').mockResolvedValue();
    const loadFromDisk = jest.spyOn(app, 'loadFromDisk').mockResolvedValue(true);

    await expect(startAndDecrypt(false, undefined, undefined, false)).resolves.toBe(true);

    expect(migrateKeys).toHaveBeenCalledTimes(1);
    expect(loadFromDisk).toHaveBeenCalledWith(undefined);

    app.wallets = previousWallets;
    migrateKeys.mockRestore();
    loadFromDisk.mockRestore();
  });

  it('fails closed when protected app unlock cannot load persisted wallet data', async () => {
    const app = BlueApp.getInstance();
    const migrateKeys = jest.spyOn(app, 'migrateKeys').mockResolvedValue();
    const loadFromDisk = jest.spyOn(app, 'loadFromDisk').mockResolvedValue(false);

    await expect(startAndDecrypt(false, undefined, undefined, false, true)).resolves.toBe(false);

    migrateKeys.mockRestore();
    loadFromDisk.mockRestore();
  });

  it('never treats a cancelled encrypted-storage prompt as an empty wallet', async () => {
    const app = BlueApp.getInstance();
    const migrateKeys = jest.spyOn(app, 'migrateKeys').mockResolvedValue();
    const loadFromDisk = jest.spyOn(app, 'loadFromDisk').mockResolvedValue(false);

    await expect(startAndDecrypt(false, async () => undefined, undefined, true)).resolves.toBe(false);

    expect(loadFromDisk).not.toHaveBeenCalled();
    migrateKeys.mockRestore();
    loadFromDisk.mockRestore();
  });
});
