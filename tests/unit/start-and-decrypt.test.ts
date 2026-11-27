/**
 * Unlock flow over the real store singleton: an unreadable store with a
 * readable backup reports `backup_available` and opens nothing; the restore
 * the user asks for opens the backup and writes it to the secure store.
 */
import { StorageDouble } from './helpers/storage-double';

// The biometric prompt: `answer` decides it, `prompts` counts it, `during` runs while it is open.
const biometrics: { available: boolean; answer: boolean; prompts: number; during?: () => void } = {
  available: true,
  answer: true,
  prompts: 0,
};
jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  BiometryTypes: { TouchID: 'TouchID', FaceID: 'FaceID', Biometrics: 'Biometrics' },
  default: jest.fn().mockImplementation(() => ({
    isSensorAvailable: async () => ({ available: biometrics.available, biometryType: 'Biometrics' }),
    simplePrompt: async () => {
      biometrics.prompts++;
      biometrics.during?.();
      return { success: biometrics.answer };
    },
  })),
}));

const WORDS = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function freshUnlock(disk: StorageDouble) {
  let startAndDecrypt!: typeof import('../../blue_modules/start-and-decrypt').startAndDecrypt;
  let getRestoreChoices!: typeof import('../../blue_modules/start-and-decrypt').getRestoreChoices;
  let app!: import('../../class/blue-app').BlueApp;
  let wallet!: string;
  jest.isolateModules(() => {
    const { BlueApp } = require('../../class/blue-app');
    const { NeuraiHDWallet } = require('../../class/wallets/neurai-hd-wallet');
    const w = NeuraiHDWallet.forNetwork('mainnet', WORDS);
    w.setLabel('Backed up');
    wallet = JSON.stringify(w);
    app = BlueApp.getInstance();
    disk.attach(app);
    ({ startAndDecrypt, getRestoreChoices } = require('../../blue_modules/start-and-decrypt'));
  });
  return { startAndDecrypt, getRestoreChoices, app, wallet };
}

/** The id of the only copy offered for an unreadable store, as the unlock screen gets it. */
async function onlyChoiceId(app: import('../../class/blue-app').BlueApp): Promise<string> {
  const error = await app.loadFromDisk().then(
    () => null,
    (e: { choices?: Array<{ id: string }> }) => e,
  );
  if (!error?.choices || error.choices.length !== 1) throw new Error('expected one restorable copy');
  return error.choices[0].id;
}

function freshWalletRecord(): string {
  const { NeuraiHDWallet } = require('../../class/wallets/neurai-hd-wallet');
  return JSON.stringify(NeuraiHDWallet.forNetwork('mainnet', WORDS));
}

describe('startAndDecrypt', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('stays locked and offers the backup when only the backup can be read', async () => {
    const disk = new StorageDouble();
    const { startAndDecrypt, getRestoreChoices, app, wallet } = freshUnlock(disk);
    disk.seed({ data: JSON.stringify({ wallets: [wallet], tx_metadata: {}, counterparty_metadata: {} }), data_encrypted: '' });
    disk.readFault = { data: 'locked', data_encrypted: 'locked' };

    const result = startAndDecrypt(false, async () => undefined);
    await jest.advanceTimersByTimeAsync(5000); // the one retry after a locked read
    expect(await result).toBe('backup_available');
    expect(app.isSessionLoaded()).toBe(false);
    const [choice] = getRestoreChoices();

    const restored = startAndDecrypt(false, async () => undefined, { fromBackup: choice.id });
    await jest.advanceTimersByTimeAsync(5000);
    expect(await restored).toBe('unlocked');
    expect(app.wallets.map(w => w.getLabel())).toEqual(['Backed up']);
    expect(disk.primary.get('data')).toContain('Backed up');
  });

  it('reports an unreadable store without a usable backup as unavailable', async () => {
    const disk = new StorageDouble();
    const { startAndDecrypt } = freshUnlock(disk);
    disk.readFault = { data: 'locked' };
    const result = startAndDecrypt(false, async () => undefined);
    await jest.advanceTimersByTimeAsync(5000);
    expect(await result).toBe('unavailable');
  });

  describe('restoring a backup without an app password asks what an ordinary unlock asks (second review)', () => {
    const plainBackup = (disk: StorageDouble, wallet: string) => {
      disk.backup.set('data', JSON.stringify({ wallets: [wallet], tx_metadata: {}, counterparty_metadata: {} }));
      disk.backupFile = true;
      disk.primary.set('data', '{damaged');
    };
    beforeEach(() => {
      biometrics.available = true;
      biometrics.answer = true;
      biometrics.prompts = 0;
    });

    it.each([
      ['on', (disk: StorageDouble) => disk.primary.set('Biometrics', '1')],
      ['unreadable', (disk: StorageDouble) => (disk.readFault = { Biometrics: 'locked' })],
    ] as const)('biometrics %s: a cancelled prompt opens nothing, an accepted one restores', async (_label, setup) => {
      const disk = new StorageDouble();
      const { startAndDecrypt, app, wallet } = freshUnlock(disk);
      plainBackup(disk, wallet);
      const id = await onlyChoiceId(app);
      setup(disk);

      biometrics.answer = false;
      expect(await startAndDecrypt(false, async () => undefined, { fromBackup: id })).toBe('not_authorized');
      expect(app.isSessionLoaded()).toBe(false);
      expect(disk.primary.get('data')).toBe('{damaged');

      biometrics.available = false; // no way to authenticate: stays locked
      biometrics.answer = true;
      expect(await startAndDecrypt(false, async () => undefined, { fromBackup: id })).toBe('not_authorized');

      biometrics.available = true;
      expect(await startAndDecrypt(false, async () => undefined, { fromBackup: id })).toBe('unlocked');
      expect(disk.primary.get('data')).toContain('Backed up');
    });

    it('biometrics never turned on: no prompt', async () => {
      const disk = new StorageDouble();
      const { startAndDecrypt, app } = freshUnlock(disk);
      plainBackup(disk, freshWalletRecord());
      expect(await startAndDecrypt(false, async () => undefined, { fromBackup: await onlyChoiceId(app) })).toBe('unlocked');
      expect(biometrics.prompts).toBe(0);
    });

    it('an encrypted backup is authorized by its password alone', async () => {
      const disk = new StorageDouble();
      const { startAndDecrypt, app, wallet } = freshUnlock(disk);
      const encryption = require('../../blue_modules/encryption');
      disk.backup.set(
        'data',
        JSON.stringify([
          encryption.encrypt(JSON.stringify({ wallets: [wallet], tx_metadata: {}, counterparty_metadata: {} }), 'backup-pw'),
        ]),
      );
      disk.backupFile = true;
      disk.primary.set('data', '{damaged');
      disk.primary.set('Biometrics', '1');
      expect(await startAndDecrypt(false, async () => 'backup-pw', { fromBackup: await onlyChoiceId(app) })).toBe('unlocked');
      expect(biometrics.prompts).toBe(0);
    });

    it('a copy that changes while the user authorizes it is not restored; the copies are offered again (third review)', async () => {
      const disk = new StorageDouble();
      const { startAndDecrypt, getRestoreChoices, app, wallet } = freshUnlock(disk);
      plainBackup(disk, wallet);
      disk.primary.set('Biometrics', '1');
      const id = await onlyChoiceId(app);

      // While the prompt is open, the copy the user is authorizing is replaced.
      biometrics.during = () => disk.backup.set('data', JSON.stringify({ wallets: [], tx_metadata: {}, counterparty_metadata: {} }));
      try {
        expect(await startAndDecrypt(false, async () => undefined, { fromBackup: id })).toBe('backup_available');
      } finally {
        biometrics.during = undefined;
      }
      expect(app.isSessionLoaded()).toBe(false);
      expect(disk.primary.get('data')).toBe('{damaged');
      expect(getRestoreChoices().map(choice => choice.id)).not.toContain(id);
    });
  });
});
