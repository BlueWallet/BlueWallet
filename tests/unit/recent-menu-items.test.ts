const mockClose = jest.fn();
const mockDelete = jest.fn();
const mockWrite = jest.fn((operation: () => void) => operation());
const mockObjectForPrimaryKey = jest.fn();
const mockRealm = { close: mockClose, delete: mockDelete, objectForPrimaryKey: mockObjectForPrimaryKey, write: mockWrite };
const mockSaveToRealmKeyValue = jest.fn();
const mockOpenRealmKeyValue = jest.fn(async () => mockRealm);

jest.mock('../../class/blue-app', () => ({
  BlueApp: {
    getInstance: () => ({ openRealmKeyValue: mockOpenRealmKeyValue, saveToRealmKeyValue: mockSaveToRealmKeyValue }),
  },
}));

describe('recent native menu items', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockOpenRealmKeyValue.mockResolvedValue(mockRealm);
    mockObjectForPrimaryKey.mockReturnValue(undefined);
  });

  it('loads valid persisted Realm entries and discards invalid data', async () => {
    mockObjectForPrimaryKey.mockReturnValueOnce({
      value: JSON.stringify([
        { id: 'wallet:one', kind: 'wallet', title: 'One', walletID: 'one' },
        { id: 42, kind: 'wallet', title: 'Invalid', walletID: 'bad' },
      ]),
    });
    const recent = require('../../components/Context/recentMenuItems') as typeof import('../../components/Context/recentMenuItems');
    await recent.setRecentMenuItemsEnabled(true);
    expect(recent.getRecentMenuItems()).toEqual([{ id: 'wallet:one', kind: 'wallet', title: 'One', walletID: 'one' }]);
    expect(mockObjectForPrimaryKey).toHaveBeenCalledWith('KeyValue', 'NativeMenuRecentItems');
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('discards malformed transaction entries without a transaction ID', async () => {
    mockObjectForPrimaryKey.mockReturnValueOnce({
      value: JSON.stringify([
        { id: 'transaction:one:missing', kind: 'transaction', title: 'Missing', walletID: 'one' },
        { id: 'transaction:one:valid', kind: 'transaction', title: 'Valid', walletID: 'one', transactionID: 'valid' },
      ]),
    });
    const recent = require('../../components/Context/recentMenuItems') as typeof import('../../components/Context/recentMenuItems');
    await recent.setRecentMenuItemsEnabled(true);
    expect(recent.getRecentMenuItems()).toEqual([
      { id: 'transaction:one:valid', kind: 'transaction', title: 'Valid', walletID: 'one', transactionID: 'valid' },
    ]);
  });

  it('moves reopened entries to the front and persists at most ten', async () => {
    const recent = require('../../components/Context/recentMenuItems') as typeof import('../../components/Context/recentMenuItems');
    await recent.setRecentMenuItemsEnabled(true);
    for (let index = 0; index < 11; index++) {
      recent.recordRecentMenuItem({ id: `wallet:${index}`, kind: 'wallet', title: `Wallet ${index}`, walletID: String(index) });
    }
    recent.recordRecentMenuItem({ id: 'wallet:5', kind: 'wallet', title: 'Wallet Five', walletID: '5' });
    await new Promise(resolve => setImmediate(resolve));
    expect(recent.getRecentMenuItems()).toHaveLength(10);
    expect(recent.getRecentMenuItems()[0].title).toBe('Wallet Five');
    expect(JSON.parse(mockSaveToRealmKeyValue.mock.lastCall![2])).toHaveLength(10);
  });

  it('does not persist or notify when the current entry is unchanged', async () => {
    const recent = require('../../components/Context/recentMenuItems') as typeof import('../../components/Context/recentMenuItems');
    await recent.setRecentMenuItemsEnabled(true);
    const listener = jest.fn();
    recent.subscribeToRecentMenuItems(listener);
    const item = { id: 'wallet:one', kind: 'wallet' as const, title: 'One', walletID: 'one' };
    recent.recordRecentMenuItem(item);
    recent.recordRecentMenuItem(item);
    await new Promise(resolve => setImmediate(resolve));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(mockSaveToRealmKeyValue).toHaveBeenCalledTimes(1);
  });

  it('never loads or retains entries belonging to hidden wallets', async () => {
    mockObjectForPrimaryKey.mockReturnValueOnce({
      value: JSON.stringify([
        { id: 'wallet:hidden', kind: 'wallet', title: 'Hidden', walletID: 'hidden' },
        { id: 'wallet:visible', kind: 'wallet', title: 'Visible', walletID: 'visible' },
      ]),
    });
    const recent = require('../../components/Context/recentMenuItems') as typeof import('../../components/Context/recentMenuItems');
    recent.setHiddenRecentWalletIDs(new Set(['hidden']));
    await recent.setRecentMenuItemsEnabled(true);
    expect(recent.getRecentMenuItems()).toEqual([{ id: 'wallet:visible', kind: 'wallet', title: 'Visible', walletID: 'visible' }]);
  });

  it('deletes Realm history and blocks recording when disabled', async () => {
    const stored = { value: '[]' };
    mockObjectForPrimaryKey.mockReturnValueOnce(undefined).mockReturnValueOnce(stored);
    const recent = require('../../components/Context/recentMenuItems') as typeof import('../../components/Context/recentMenuItems');
    await recent.setRecentMenuItemsEnabled(true);
    recent.recordRecentMenuItem({ id: 'wallet:one', kind: 'wallet', title: 'One', walletID: 'one' });
    await recent.setRecentMenuItemsEnabled(false);
    recent.recordRecentMenuItem({ id: 'wallet:two', kind: 'wallet', title: 'Two', walletID: 'two' });
    expect(recent.getRecentMenuItems()).toEqual([]);
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith(stored);
  });

  it('does not restore history when disabling wins a load race', async () => {
    let finishOpen!: (value: typeof mockRealm) => void;
    mockOpenRealmKeyValue.mockReturnValueOnce(new Promise(resolve => (finishOpen = resolve)));
    const recent = require('../../components/Context/recentMenuItems') as typeof import('../../components/Context/recentMenuItems');
    const enabling = recent.setRecentMenuItemsEnabled(true);
    const disabling = recent.setRecentMenuItemsEnabled(false);
    finishOpen(mockRealm);
    await Promise.all([enabling, disabling]);
    expect(recent.getRecentMenuItems()).toEqual([]);
  });

  it('evicts entries when their wallet is deleted', async () => {
    const recent = require('../../components/Context/recentMenuItems') as typeof import('../../components/Context/recentMenuItems');
    await recent.setRecentMenuItemsEnabled(true);
    recent.recordRecentMenuItem({ id: 'wallet:deleted', kind: 'wallet', title: 'Deleted', walletID: 'deleted' });
    recent.recordRecentMenuItem({ id: 'wallet:kept', kind: 'wallet', title: 'Kept', walletID: 'kept' });
    recent.setAvailableRecentWalletIDs(new Set(['kept']));
    expect(recent.getRecentMenuItems()).toEqual([{ id: 'wallet:kept', kind: 'wallet', title: 'Kept', walletID: 'kept' }]);
    expect(recent.findRecentMenuItem('wallet:deleted')).toBeUndefined();
  });

  it('never resolves a stale entry before the current wallet list validates it', async () => {
    mockObjectForPrimaryKey.mockReturnValueOnce({
      value: JSON.stringify([{ id: 'wallet:deleted', kind: 'wallet', title: 'Deleted', walletID: 'deleted' }]),
    });
    const recent = require('../../components/Context/recentMenuItems') as typeof import('../../components/Context/recentMenuItems');
    await recent.setRecentMenuItemsEnabled(true);
    expect(recent.findRecentMenuItem('wallet:deleted')).toBeUndefined();
  });
});
