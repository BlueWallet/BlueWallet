import { NativeModules } from 'react-native';
import * as Keychain from 'react-native-keychain';
import {
  clearReceiveAddressShortcutData,
  getReceiveAddressShortcutData,
  setReceiveAddressShortcutData,
  syncReceiveAddressShortcutWallets,
} from '../../app_intents/receiveAddressShortcut';
import { Chain } from '../../models/bitcoinUnits';
import type { TWallet } from '../../class/wallets/types';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: { EventEmitter: {} },
}));
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'unlocked' },
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

let stored: string | undefined;
const wallet = (overrides = {}): TWallet =>
  ({
    chain: Chain.ONCHAIN,
    type: 'HDsegwitBech32',
    getID: () => 'wallet',
    getLabel: () => 'Wallet',
    getAddress: () => 'cached-change-address',
    getNextFreeAddressIndex: () => 3,
    _getExternalAddressByIndex: (index: number) => `receive-${index}`,
    ...overrides,
  }) as unknown as TWallet;

beforeEach(async () => {
  jest.clearAllMocks();
  stored = undefined;
  NativeModules.EventEmitter.getReceiveAddressShortcutKeychainAccessGroup = jest.fn().mockResolvedValue('test.shortcuts');
  (Keychain.getGenericPassword as jest.Mock).mockImplementation(async () => (stored ? { password: stored } : false));
  (Keychain.setGenericPassword as jest.Mock).mockImplementation(async (_account, password) => {
    stored = password;
  });
  (Keychain.resetGenericPassword as jest.Mock).mockImplementation(async () => {
    stored = undefined;
  });
  await setReceiveAddressShortcutData({ enabled: true, wallets: [] });
});

it('uses external HD addresses and isolates broken wallets', async () => {
  await syncReceiveAddressShortcutWallets([
    wallet({
      _getExternalAddressByIndex: () => {
        throw new Error('Unavailable');
      },
    }),
    wallet(),
    wallet({
      type: 'watchOnly',
      getID: () => 'xpub',
      isAddressValid: () => false,
      getSecret: () => 'xpub',
      getAddress: () => {
        throw new Error('HD wallet');
      },
    }),
    wallet({
      type: 'watchOnly',
      getID: () => 'single',
      isAddressValid: () => true,
      getSecret: () => 'literal',
      getAddress: () => 'literal',
    }),
    wallet({ hideBalance: true }),
    wallet({ chain: Chain.OFFCHAIN }),
  ]);
  expect((await getReceiveAddressShortcutData()).wallets.map(entry => entry.address)).toEqual(['receive-3', 'receive-3', 'literal']);
});

it('does not let a delayed write or later sync restore a revoked catalog', async () => {
  let release!: () => void;
  let started!: () => void;
  const writing = new Promise<void>(resolve => {
    started = resolve;
  });
  (Keychain.setGenericPassword as jest.Mock).mockImplementationOnce(async (_account, password) => {
    started();
    await new Promise<void>(resolve => {
      release = resolve;
    });
    stored = password;
  });
  const sync = syncReceiveAddressShortcutWallets([wallet()]);
  await writing;
  const revoke = clearReceiveAddressShortcutData();
  const staleSync = syncReceiveAddressShortcutWallets([wallet()]);
  release();
  await Promise.all([sync, revoke, staleSync]);
  expect(stored).toBeUndefined();
});

it('preserves current selections but invalidates them after hiding or disabling', async () => {
  await syncReceiveAddressShortcutWallets([wallet()]);
  const initial = (await getReceiveAddressShortcutData()).wallets[0].id;
  await syncReceiveAddressShortcutWallets([wallet()]);
  expect((await getReceiveAddressShortcutData()).wallets[0].id).toBe(initial);
  await syncReceiveAddressShortcutWallets([wallet({ hideBalance: true })]);
  await syncReceiveAddressShortcutWallets([wallet()]);
  const unhidden = (await getReceiveAddressShortcutData()).wallets[0].id;
  expect(unhidden).not.toBe(initial);
  await clearReceiveAddressShortcutData();
  await setReceiveAddressShortcutData({ enabled: true, wallets: [] });
  await syncReceiveAddressShortcutWallets([wallet()]);
  expect((await getReceiveAddressShortcutData()).wallets[0].id).not.toBe(unhidden);
});

it('ignores a superseded synchronization', async () => {
  await syncReceiveAddressShortcutWallets([wallet()], () => false);
  expect((await getReceiveAddressShortcutData()).wallets).toEqual([]);
});
