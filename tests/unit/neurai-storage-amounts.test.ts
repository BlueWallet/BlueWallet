import { BlueApp } from '../../class/blue-app';
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';
import { NeuraiPQWallet } from '../../class/wallets/neurai-pq-wallet';
import { NeuraiHardwareWallet } from '../../class/wallets/neurai-hardware-wallet';
import { decodeWalletAmounts, encodeWalletAmounts } from '../../blue_modules/neurai/walletAmountsCodec';
import { MAX_MONEY } from '../../blue_modules/neurai/amounts';
import * as encryption from '../../blue_modules/encryption';
import { appOn, StorageDouble } from './helpers/storage-double';

const mnemonic = 'result pact model attract result puzzle final boss private educate luggage era';

it('round trips every monetary cache without converting identifiers or metadata', () => {
  const dto = {
    balance: MAX_MONEY,
    unconfirmed_balance: -1n,
    secret: mnemonic,
    label: '00123',
    _utxo: [{ value: 10000000000000001n, txid: '00123' }],
    _txCache: [
      { value: -9007199254740993n, assetAmount: '-123.00000001', inputs: [{ value: 9007199254740993n }], outputs: [{ value: 1n }] },
    ],
    _pendingTxs: [{ txid: 'pending', value: -1n }],
    _historyItems: [{ fee: '0.1', assets: [{ satoshis: -1n, value: '-0.00000001' }] }],
    _heldAssets: [{ name: 'TOKEN', amount: '123456789.00000001' }],
    _utxoMetadata: { '00123:0': { memo: '9007199254740993', frozen: true } },
  };
  const restored = decodeWalletAmounts(JSON.parse(JSON.stringify(encodeWalletAmounts(dto))));
  expect(restored).toEqual({ ...dto, amountsVersion: 1 });
  expect(dto.balance).toBe(MAX_MONEY);
});

test.each([
  ['HD', NeuraiHDWallet],
  ['PQ', NeuraiPQWallet],
  ['hardware', NeuraiHardwareWallet],
] as const)('upgrades a legacy %s without changing wallet identity', (_name, Constructor) => {
  const original = new Constructor();
  original.setSecret(mnemonic);
  const json = JSON.parse(JSON.stringify(original));
  delete json.amountsVersion;
  json.balance = 6317517662230948;
  json.unconfirmed_balance = -300000;
  json._heldAssets = [{ name: 'TOKEN', type: 'root', amount: 1.25 }];
  const migrated = Constructor.fromJson(JSON.stringify(json)) as unknown as NeuraiHDWallet;
  expect(migrated.getID()).toBe(original.getID());
  expect(migrated.secret).toBe(mnemonic);
  expect(migrated.getBalance()).toBe(6317517661930948n);
  expect(migrated.getHeldAssetsCached()[0].amount).toBe('1.25');
  expect(migrated.amountsStale).toBe(false);
});

it('retains a legacy wallet with unsafe cached numbers and prevents spending until refresh', async () => {
  const original = NeuraiHDWallet.forNetwork('testnet', mnemonic);
  original.setLabel('Savings');
  const dto = JSON.parse(JSON.stringify(original));
  delete dto.amountsVersion;
  dto.balance = Number('10000000000000001');
  dto._pendingTxs = [{ txid: 'pending', value: -100, timestamp: Math.floor(Date.now() / 1000) }];
  const migrated = NeuraiHDWallet.fromJson(JSON.stringify(dto)) as unknown as NeuraiHDWallet;
  expect(migrated.getID()).toBe(original.getID());
  expect(migrated.getLabel()).toBe('Savings');
  expect(migrated.amountsStale).toBe(true);
  expect(migrated.getTransactions().map(t => t.txid)).toContain('pending');
  await expect(migrated.buildSendTransaction([{ address: 'unused', amount: '1' }])).rejects.toThrow('Refresh');
  expect((NeuraiHDWallet.fromJson(JSON.stringify(migrated)) as unknown as NeuraiHDWallet).amountsStale).toBe(true);
});

/** Opens `disk` the way the app does at start: a save is only allowed after a complete load. */
async function openStore(disk: StorageDouble, encrypted: boolean): Promise<BlueApp> {
  if (encrypted && !disk.primary.has('data')) {
    disk.seed({ data: JSON.stringify([encryption.encrypt(JSON.stringify({ wallets: [] }), 'test-password')]), data_encrypted: '1' });
  }
  const app = appOn(disk);
  expect(await app.loadFromDisk(encrypted ? 'test-password' : undefined)).toBe(true);
  return app;
}

test.each([false, true])('saves and loads through the actual BlueApp clone path (encrypted=%s)', async encrypted => {
  const disk = new StorageDouble();
  const app = await openStore(disk, encrypted);
  const wallet = NeuraiHDWallet.forNetwork('testnet', mnemonic);
  wallet.balance = MAX_MONEY;
  wallet.addPendingTx('pending', -1n);
  app.wallets = [wallet];
  await app.saveToDisk();
  expect(disk.primary.has('data')).toBe(true);
  if (encrypted) expect(disk.primary.get('data')).not.toContain(mnemonic);
  const restored = appOn(disk);
  expect(await restored.loadFromDisk(encrypted ? 'test-password' : undefined)).toBe(true);
  expect(restored.wallets).toHaveLength(1);
  expect(restored.wallets[0].getID()).toBe(wallet.getID());
  expect(restored.wallets[0].getBalance()).toBe(MAX_MONEY - 1n);
});

test.each([false, true])('loads a pre-migration storage bucket without dropping funded wallets (encrypted=%s)', async encrypted => {
  const originals = [new NeuraiHDWallet(), new NeuraiPQWallet(), new NeuraiHardwareWallet()];
  const wallets = originals.map((wallet, index) => {
    wallet.setSecret(mnemonic);
    wallet.setLabel('Existing wallet ' + index);
    const dto = JSON.parse(JSON.stringify(wallet));
    delete dto.amountsVersion;
    dto.balance = index === 0 ? Number('10000000000000001') : 100000001;
    dto.unconfirmed_balance = 0;
    return JSON.stringify(dto);
  });
  const plain = JSON.stringify({ wallets, tx_metadata: { known: { memo: 'Keep this label' } }, counterparty_metadata: {} });
  const stored = encrypted ? JSON.stringify([encryption.encrypt(plain, 'existing-password')]) : plain;
  const app = appOn(new StorageDouble().seed({ data: stored }));
  expect(await app.loadFromDisk(encrypted ? 'existing-password' : undefined)).toBe(true);
  expect(app.wallets).toHaveLength(3);
  for (let i = 0; i < originals.length; i++) {
    expect(app.wallets[i].getID()).toBe(originals[i].getID());
    expect(app.wallets[i].getSecret()).toBe(originals[i].getSecret());
    expect(app.wallets[i].getLabel()).toBe(originals[i].getLabel());
    expect(app.wallets[i].amountsStale).toBe(i === 0);
    if (i > 0) expect(app.wallets[i].getBalance()).toBe(100000001n);
  }
  expect(app.tx_metadata.known.memo).toBe('Keep this label');
});

test.each([false, true])('coalesces push bursts and waits for the latest persisted wallet (encrypted=%s)', async encrypted => {
  const storage = new StorageDouble();
  const app = await openStore(storage, encrypted);
  const disk = storage.primary;
  const wallet = NeuraiHDWallet.forNetwork('testnet', mnemonic);
  wallet.balance = 10000000000000001n;
  app.wallets = [wallet];
  let release!: () => void;
  let started!: () => void;
  const firstStarted = new Promise<void>(resolve => {
    started = resolve;
  });
  const blocked = new Promise<void>(resolve => {
    release = resolve;
  });
  let writes = 0;
  let active = 0;
  let maximumActive = 0;
  jest.spyOn(app, 'setItem').mockImplementation(async (key, value) => {
    if (key === 'data') {
      active++;
      maximumActive = Math.max(maximumActive, active);
      if (++writes === 1) {
        started();
        await blocked;
      }
      disk.set(key, value);
      active--;
    } else disk.set(key, value);
  });
  const first = app.saveToDisk();
  await firstStarted;
  const burst = Array.from({ length: 40 }, (_, i) => {
    wallet.setLabel('Updated ' + i);
    wallet.balance = 10000000000000001n + BigInt(i);
    return app.saveToDisk();
  });
  let completed = false;
  Promise.all(burst).then(() => {
    completed = true;
  });
  await Promise.resolve();
  expect(completed).toBe(false);
  release();
  await Promise.all([first, ...burst]);
  expect(writes).toBe(2);
  expect(maximumActive).toBe(1);
  const saved = encrypted ? encryption.decrypt(JSON.parse(disk.get('data')!)[0], 'test-password') : disk.get('data');
  const dto = JSON.parse(JSON.parse(saved as string).wallets[0]);
  expect(dto.label).toBe('Updated 39');
  expect(dto.balance).toBe('10000000000000040');
  expect(dto.secret).toBe(wallet.secret);
  wallet.setLabel('Next save');
  await app.saveToDisk();
  expect(writes).toBe(3);
});
