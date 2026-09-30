import * as Keychain from 'react-native-keychain';
import { NativeModules, Platform } from 'react-native';
import type { TWallet } from '../class/wallets/types';
import { Chain } from '../models/bitcoinUnits';
import { randomBytes } from '../class/rng';
import { uint8ArrayToHex } from '../blue_modules/uint8array-extras';

export const ReceiveAddressShortcutKeychainService = 'io.bluewallet.receive-address-shortcut';
export const ReceiveAddressShortcutKeychainAccount = 'wallets';

export type ReceiveAddressShortcutWallet = {
  id: string;
  walletId?: string;
  label: string;
  address: string;
};

type ReceiveAddressShortcutData = {
  enabled: boolean;
  wallets: ReceiveAddressShortcutWallet[];
};

// All mutations, including revocation, use the same queue. A sync must read the
// persisted opt-in inside the queue, so it cannot restore a deleted catalog.
let pendingMutation: Promise<void> = Promise.resolve();
const mutate = (operation: () => Promise<void>): Promise<void> => {
  const result = pendingMutation.then(operation);
  pendingMutation = result.catch(() => {});
  return result;
};

const getOptions = async () => {
  const getAccessGroup = NativeModules.EventEmitter?.getReceiveAddressShortcutKeychainAccessGroup;
  if (!getAccessGroup) return undefined;

  const accessGroup = await getAccessGroup();
  if (!accessGroup) throw new Error('Receive Address Shortcut Keychain access group is unavailable');

  return {
    service: ReceiveAddressShortcutKeychainService,
    accessGroup,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
};

export const getReceiveAddressShortcutData = async (): Promise<ReceiveAddressShortcutData> => {
  if (Platform.OS !== 'ios') return { enabled: false, wallets: [] };
  try {
    const options = await getOptions();
    if (!options) return { enabled: false, wallets: [] };
    const credentials = await Keychain.getGenericPassword(options);
    if (!credentials) return { enabled: false, wallets: [] };

    const data = JSON.parse(credentials.password) as ReceiveAddressShortcutData;
    return {
      enabled: data.enabled === true,
      wallets: Array.isArray(data.wallets) ? data.wallets : [],
    };
  } catch (error) {
    console.error('Failed to read receive address shortcut data:', error);
    return { enabled: false, wallets: [] };
  }
};

const writeData = async (data: ReceiveAddressShortcutData): Promise<void> => {
  if (Platform.OS !== 'ios') return;
  const options = await getOptions();
  if (!options) return;
  await Keychain.setGenericPassword(ReceiveAddressShortcutKeychainAccount, JSON.stringify(data), options);
};

export const setReceiveAddressShortcutData = (data: ReceiveAddressShortcutData): Promise<void> => mutate(() => writeData(data));

export const clearReceiveAddressShortcutData = (): Promise<void> =>
  mutate(async () => {
    if (Platform.OS !== 'ios') return;
    const options = await getOptions();
    if (!options) return;
    await Keychain.resetGenericPassword(options);
    await refreshReceiveAddressShortcutParameters();
  });

export const syncReceiveAddressShortcutWallets = (wallets: TWallet[], isCurrent: () => boolean = () => true): Promise<void> =>
  mutate(async () => {
    if (Platform.OS !== 'ios' || !isCurrent()) return;
    const existing = await getReceiveAddressShortcutData();
    if (!existing.enabled || !isCurrent()) return;
    const catalog: ReceiveAddressShortcutWallet[] = [];
    for (const wallet of wallets) {
      if (wallet.chain !== Chain.ONCHAIN || wallet.hideBalance) continue;
      try {
        // Single-address watch-only wallets also expose HD methods; try their
        // literal address first. HD getAddress() may throw or contain change.
        let address;
        if (wallet.type === 'watchOnly' && wallet.isAddressValid(wallet.getSecret())) {
          address = wallet.getAddress();
        } else if ('_getExternalAddressByIndex' in wallet) {
          address = wallet._getExternalAddressByIndex(wallet.getNextFreeAddressIndex());
        } else {
          address = wallet.getAddress();
        }
        if (!address || typeof address !== 'string') continue;
        const walletId = wallet.getID();
        const previous = existing.wallets.find(entry => entry.walletId === walletId);
        // Removing a wallet discards its selection token. Unhiding/re-enabling
        // creates a new token, so a saved selection cannot silently revive.
        const id = previous?.id ?? uint8ArrayToHex(await randomBytes(16));
        catalog.push({ id, walletId, label: wallet.getLabel(), address });
      } catch {
        console.warn('Skipping unavailable receive address shortcut wallet');
      }
    }
    if (!isCurrent()) return;
    await writeData({ enabled: true, wallets: catalog });
    await refreshReceiveAddressShortcutParameters();
  });

/** Prompts Shortcuts to re-resolve configured wallet parameters after the catalog changes. */
export const refreshReceiveAddressShortcutParameters = async (): Promise<void> => {
  if (Platform.OS !== 'ios') return;

  await NativeModules.EventEmitter?.updateReceiveAddressShortcutParameters?.();
};
