/**
 * The wallet the home screen shows.
 *
 * The home is one wallet at a time, picked from the side panel. The pick is
 * kept across launches and follows the network on screen: picking a wallet
 * also switches to its network, and a pick that is gone (deleted wallet) or on
 * the other network falls back to the first wallet of the network shown.
 *
 * The pick lives at module scope so the home, the side panel and the redirect
 * that old `WalletTransactions` links land on all read the same value.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import type { NeuraiNetwork } from '../blue_modules/neurai/networkConfig';
import { walletNetwork } from '../blue_modules/neurai/networkSelection';
import type { TWallet } from '../class/wallets/types';
import { useStorage } from './context/useStorage';
import { useNetworkSelection } from './useNetworkSelection';

const STORAGE_KEY = 'HomeSelectedWalletID';

let selectedID: string | null = null;
let loadStarted = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function loadOnce(): void {
  if (loadStarted) return;
  loadStarted = true;
  AsyncStorage.getItem(STORAGE_KEY)
    .then(stored => {
      // A pick made before the read finished is newer than the stored one.
      if (stored && selectedID === null) {
        selectedID = stored;
        emit();
      }
    })
    .catch(error => console.debug('[useHomeWallet] could not read the last wallet', error));
}

function subscribe(listener: () => void): () => void {
  loadOnce();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): string | null => selectedID;

/** Remembers `walletID` as the wallet on the home screen. */
export function setHomeWalletID(walletID: string): void {
  if (selectedID === walletID) return;
  selectedID = walletID;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, walletID).catch(error => console.debug('[useHomeWallet] could not save the wallet', error));
}

export interface HomeWallet {
  /** The wallet on screen; undefined only when there are no wallets at all. */
  wallet: TWallet | undefined;
  /** The network on screen. */
  network: NeuraiNetwork;
  /** Shows `walletID` on the home screen, switching network if it lives on the other one. */
  select: (walletID: string) => void;
}

export function useHomeWallet(): HomeWallet {
  const storedID = useSyncExternalStore(subscribe, getSnapshot);
  const { wallets } = useStorage();
  const { network, visibleWallets, setNetwork } = useNetworkSelection();

  const wallet = useMemo(() => visibleWallets.find(w => w.getID() === storedID) ?? visibleWallets[0], [visibleWallets, storedID]);

  const select = useCallback(
    (walletID: string) => {
      const target = wallets.find(w => w.getID() === walletID);
      if (!target) return;
      setHomeWalletID(walletID);
      const targetNetwork = walletNetwork(target);
      if (targetNetwork !== network) {
        setNetwork(targetNetwork).catch(error => console.debug('[useHomeWallet] network switch failed', error));
      }
    },
    [wallets, network, setNetwork],
  );

  return { wallet, network, select };
}
