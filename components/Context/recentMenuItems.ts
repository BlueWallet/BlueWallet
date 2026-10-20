import { BlueApp } from '../../class/blue-app';

export type RecentMenuItem = {
  id: string;
  kind: 'wallet' | 'transaction';
  title: string;
  walletID: string;
  transactionID?: string;
};

const STORAGE_KEY = 'NativeMenuRecentItems';
const MAX_RECENT_ITEMS = 10;
let items: RecentMenuItem[] = [];
let loaded = false;
let enabled = false;
let hiddenWalletIDs = new Set<string>();
let availableWalletIDs: Set<string> | undefined;
const listeners = new Set<() => void>();
let persistenceQueue = Promise.resolve();

const notify = () => listeners.forEach(listener => listener());

const isRecentMenuItem = (value: unknown): value is RecentMenuItem => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<RecentMenuItem>;
  return (
    typeof item.id === 'string' &&
    (item.kind === 'wallet' || item.kind === 'transaction') &&
    typeof item.title === 'string' &&
    typeof item.walletID === 'string' &&
    (item.kind === 'wallet' ? item.transactionID === undefined : typeof item.transactionID === 'string' && item.transactionID.length > 0)
  );
};

export async function loadRecentMenuItems(): Promise<RecentMenuItem[]> {
  if (!enabled) return items;
  if (loaded) return items;
  loaded = true;
  try {
    const realm = await BlueApp.getInstance().openRealmKeyValue();
    let storedValue: string | undefined;
    try {
      storedValue = realm.objectForPrimaryKey<{ value: string }>('KeyValue', STORAGE_KEY)?.value;
    } finally {
      realm.close();
    }
    if (!enabled) return items;
    const stored = JSON.parse(storedValue ?? '[]');
    items = Array.isArray(stored)
      ? stored
          .filter(isRecentMenuItem)
          .filter(item => !hiddenWalletIDs.has(item.walletID) && (!availableWalletIDs || availableWalletIDs.has(item.walletID)))
          .slice(0, MAX_RECENT_ITEMS)
      : [];
  } catch {
    items = [];
  }
  notify();
  return items;
}

export function getRecentMenuItems(): readonly RecentMenuItem[] {
  return items;
}

export function recordRecentMenuItem(item: RecentMenuItem): void {
  if (!enabled || hiddenWalletIDs.has(item.walletID) || (availableWalletIDs && !availableWalletIDs.has(item.walletID))) return;
  const current = items[0];
  if (
    current?.id === item.id &&
    current.kind === item.kind &&
    current.title === item.title &&
    current.walletID === item.walletID &&
    current.transactionID === item.transactionID
  ) {
    return;
  }
  items = [item, ...items.filter(existing => existing.id !== item.id)].slice(0, MAX_RECENT_ITEMS);
  notify();
  persistItems();
}

const persistItems = () => {
  const value = JSON.stringify(items);
  persistenceQueue = persistenceQueue
    .then(async () => {
      const blueApp = BlueApp.getInstance();
      const realm = await blueApp.openRealmKeyValue();
      try {
        blueApp.saveToRealmKeyValue(realm, STORAGE_KEY, value);
      } finally {
        realm.close();
      }
    })
    .catch(error => console.warn('Failed to save native menu history:', error));
};

export function removeRecentMenuItemsForWallets(walletIDs: ReadonlySet<string>): void {
  const updated = items.filter(item => !walletIDs.has(item.walletID));
  if (updated.length === items.length) return;
  items = updated;
  notify();
  if (enabled) {
    persistItems();
  }
}

export function setHiddenRecentWalletIDs(walletIDs: ReadonlySet<string>): void {
  hiddenWalletIDs = new Set(walletIDs);
  removeRecentMenuItemsForWallets(hiddenWalletIDs);
}

export function setAvailableRecentWalletIDs(walletIDs: ReadonlySet<string>): void {
  availableWalletIDs = new Set(walletIDs);
  const deletedWalletIDs = new Set(items.filter(item => !availableWalletIDs?.has(item.walletID)).map(item => item.walletID));
  removeRecentMenuItemsForWallets(deletedWalletIDs);
}

export async function setRecentMenuItemsEnabled(value: boolean): Promise<void> {
  if (!value) {
    enabled = false;
    loaded = false;
    items = [];
    notify();
    persistenceQueue = persistenceQueue.then(async () => {
      const realm = await BlueApp.getInstance().openRealmKeyValue();
      try {
        const stored = realm.objectForPrimaryKey('KeyValue', STORAGE_KEY);
        if (stored) realm.write(() => realm.delete(stored));
      } finally {
        realm.close();
      }
    });
    await persistenceQueue;
    return;
  }
  if (enabled) return;
  enabled = true;
  await loadRecentMenuItems();
}

export function subscribeToRecentMenuItems(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function findRecentMenuItem(id: string): RecentMenuItem | undefined {
  const item = items.find(candidate => candidate.id === id);
  if (!item || !availableWalletIDs?.has(item.walletID) || hiddenWalletIDs.has(item.walletID)) return undefined;
  return item;
}
