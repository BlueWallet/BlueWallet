/**
 * H02 · wallet identity per network and per device, and the one-time move of
 * per-wallet references from legacy IDs. Test-only words and devices.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256 } from '@noble/hashes/sha256';

import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';
import { chainFor } from '../../blue_modules/neurai/networkConfig';
import { migrateWalletReferences } from '../../blue_modules/neurai/walletIdMigration';
import { PRIVACY_TX_TAGS_PREFIX } from '../../blue_modules/neurai/privacy/txTags';
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';
import { NeuraiPQWallet } from '../../class/wallets/neurai-pq-wallet';
import { NeuraiECDSAWallet } from '../../class/wallets/neurai-ecdsa-wallet';
import { NeuraiHardwareWallet } from '../../class/wallets/neurai-hardware-wallet';
import { appOn, StorageDouble } from './helpers/storage-double';

const WORDS = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const legacyFormula = (type: string, secret: string, passphrase = '', path = '') =>
  uint8ArrayToHex(sha256(type + secret + passphrase + path));

function device(network: 'mainnet' | 'testnet', fingerprint: string, pubkey: string, path = "m/44'/1900'/0'/0/0"): NeuraiHardwareWallet {
  const wallet = new NeuraiHardwareWallet();
  wallet.keyType = 'pq';
  wallet.network = chainFor(network, 'pq');
  wallet.hwFingerprint = fingerprint;
  wallet.pubkey = pubkey;
  wallet.hwPath = path;
  wallet._derivationPath = path;
  return wallet;
}

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('wallet IDs', () => {
  it('keeps every mainnet software ID byte for byte', () => {
    const hd = NeuraiHDWallet.forNetwork('mainnet', WORDS);
    expect(hd.getID()).toBe(legacyFormula('NeuraiHD', WORDS));
    hd.setPassphrase('extra');
    expect(hd.getID()).toBe(legacyFormula('NeuraiHD', WORDS, 'extra'));
    expect(hd.getID()).toBe(hd.getLegacyID());
  });

  test.each([
    ['HD', (network: 'mainnet' | 'testnet') => NeuraiHDWallet.forNetwork(network, WORDS)],
    ['PQ', (network: 'mainnet' | 'testnet') => NeuraiPQWallet.forNetwork(network, WORDS)],
    ['ECDSA', (network: 'mainnet' | 'testnet') => NeuraiECDSAWallet.forNetwork(network, WORDS)],
  ] as const)('gives the same %s words another ID on testnet, stable across save and load', (_name, make) => {
    let mainnet;
    try {
      mainnet = make('mainnet');
    } catch {
      mainnet = undefined; // the kind may not exist on mainnet yet
    }
    const testnet = make('testnet');
    expect(testnet.getID()).not.toBe(testnet.getLegacyID());
    if (mainnet) expect(testnet.getID()).not.toBe(mainnet.getID());
    const reloaded = (testnet.constructor as typeof NeuraiHDWallet).fromJson(JSON.stringify(testnet));
    expect(reloaded.getID()).toBe(testnet.getID());
  });

  it('tells two devices on the same path apart by fingerprint, on each network', () => {
    const a = device('mainnet', '168dd603', '02aa');
    const b = device('mainnet', '9a1f00c2', '03bb');
    expect(a.getLegacyID()).toBe(b.getLegacyID()); // the collision this fixes
    expect(a.getID()).not.toBe(b.getID());
    expect(device('testnet', '168dd603', '02aa').getID()).not.toBe(a.getID());
    expect(device('mainnet', '168DD603', '02aa').getID()).toBe(a.getID());
    const reloaded = NeuraiHardwareWallet.fromJson(JSON.stringify(a));
    expect(reloaded.getID()).toBe(a.getID());
  });

  it('falls back to the device public key for records saved without a fingerprint', () => {
    expect(device('mainnet', '', '02aa').getID()).not.toBe(device('mainnet', '', '03bb').getID());
    expect(device('mainnet', '', '02aa').getID()).not.toBe(device('mainnet', '168dd603', '02aa').getID());
  });
});

describe('a store that holds the same words on both networks', () => {
  it('loads both wallets, deletes only the chosen one and keeps the other after a restart', async () => {
    const mainnet = NeuraiHDWallet.forNetwork('mainnet', WORDS);
    mainnet.setLabel('Main');
    const testnet = NeuraiHDWallet.forNetwork('testnet', WORDS);
    testnet.setLabel('Test');
    const disk = new StorageDouble().seed({
      data: JSON.stringify({ wallets: [JSON.stringify(mainnet), JSON.stringify(testnet)], tx_metadata: {}, counterparty_metadata: {} }),
      data_encrypted: '',
    });

    const app = appOn(disk);
    await app.loadFromDisk();
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Main', 'Test']);
    expect(app.getPreservedRecords()).toEqual([]);

    app.deleteWallet(app.wallets[1]);
    await app.saveToDisk();
    const restarted = appOn(disk);
    await restarted.loadFromDisk();
    expect(restarted.wallets.map(wallet => wallet.getLabel())).toEqual(['Main']);
    expect(restarted.wallets[0].getID()).toBe(mainnet.getID());
  });
});

describe('reference migration', () => {
  it('moves the references of a testnet-only wallet and of a device to their new IDs', async () => {
    const testnet = NeuraiHDWallet.forNetwork('testnet', WORDS);
    const hw = device('mainnet', '168dd603', '02aa');
    const [oldT, oldH] = [testnet.getLegacyID(), hw.getLegacyID()];
    await AsyncStorage.multiSet([
      ['depin_revealed_' + oldT, '1'],
      ['depin_pool_seen_' + oldT, 'sig'],
      ['depin_unread_' + oldH, '["a"]'],
      ['depin_read_' + oldH + '|TOKEN', '["m"]'],
      [PRIVACY_TX_TAGS_PREFIX + oldT, '{"tx":"tag"}'],
      ['HomeSelectedWalletID', oldH],
      ['depin_ready_tAddress', '1'], // keyed by address: untouched
    ]);

    expect(await migrateWalletReferences([testnet, hw])).toBe(6);
    const stored = Object.fromEntries(await AsyncStorage.multiGet(await AsyncStorage.getAllKeys()));
    expect(stored).toEqual({
      ['depin_revealed_' + testnet.getID()]: '1',
      ['depin_pool_seen_' + testnet.getID()]: 'sig',
      ['depin_unread_' + hw.getID()]: '["a"]',
      ['depin_read_' + hw.getID() + '|TOKEN']: '["m"]',
      [PRIVACY_TX_TAGS_PREFIX + testnet.getID()]: '{"tx":"tag"}',
      HomeSelectedWalletID: hw.getID(),
      depin_ready_tAddress: '1',
    });

    // Idempotent: a second run moves nothing.
    expect(await migrateWalletReferences([testnet, hw])).toBe(0);
  });

  it('leaves a shared legacy ID with the mainnet wallet, except the testnet-only C7 tags', async () => {
    const mainnet = NeuraiHDWallet.forNetwork('mainnet', WORDS);
    const testnet = NeuraiHDWallet.forNetwork('testnet', WORDS);
    const shared = mainnet.getID();
    expect(testnet.getLegacyID()).toBe(shared);
    await AsyncStorage.multiSet([
      ['depin_revealed_' + shared, '1'],
      [PRIVACY_TX_TAGS_PREFIX + shared, '{"c7":"tags"}'],
      ['HomeSelectedWalletID', shared],
    ]);

    await migrateWalletReferences([mainnet, testnet]);
    expect(await AsyncStorage.getItem('depin_revealed_' + shared)).toBe('1');
    expect(await AsyncStorage.getItem('HomeSelectedWalletID')).toBe(shared);
    expect(await AsyncStorage.getItem(PRIVACY_TX_TAGS_PREFIX + shared)).toBeNull();
    expect(await AsyncStorage.getItem(PRIVACY_TX_TAGS_PREFIX + testnet.getID())).toBe('{"c7":"tags"}');
  });

  it('gives the references of two colliding devices to the first one and never overwrites a newer key', async () => {
    const first = device('mainnet', '168dd603', '02aa');
    const second = device('mainnet', '9a1f00c2', '03bb');
    const old = first.getLegacyID();
    await AsyncStorage.multiSet([
      ['depin_revealed_' + old, 'old'],
      ['depin_pool_seen_' + old, 'old'],
      ['depin_pool_seen_' + first.getID(), 'newer'],
    ]);

    await migrateWalletReferences([first, second]);
    expect(await AsyncStorage.getItem('depin_revealed_' + first.getID())).toBe('old');
    expect(await AsyncStorage.getItem('depin_revealed_' + second.getID())).toBeNull();
    expect(await AsyncStorage.getItem('depin_pool_seen_' + first.getID())).toBe('newer');
    expect(await AsyncStorage.getItem('depin_pool_seen_' + old)).toBe('old');
  });

  it('runs after a complete load and before the session is used', async () => {
    const testnet = NeuraiHDWallet.forNetwork('testnet', WORDS);
    await AsyncStorage.setItem('depin_revealed_' + testnet.getLegacyID(), '1');
    const disk = new StorageDouble().seed({
      data: JSON.stringify({ wallets: [JSON.stringify(testnet)], tx_metadata: {}, counterparty_metadata: {} }),
    });
    await appOn(disk).loadFromDisk();
    expect(await AsyncStorage.getItem('depin_revealed_' + testnet.getID())).toBe('1');
  });
});
