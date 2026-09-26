import { act, renderHook } from '@testing-library/react-native';
import usePlatformSearch from '../../hooks/usePlatformSearch';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import NativePlatformSearch, { usePlatformSearchAvailability } from '../../blue_modules/NativePlatformSearch';
import { navigationRef } from '../../NavigationService';

jest.mock('../../NavigationService', () => ({ navigationRef: { isReady: jest.fn(), getCurrentRoute: jest.fn() } }));
jest.mock('../../hooks/context/useSettings', () => ({ useSettings: jest.fn() }));
jest.mock('../../hooks/context/useStorage', () => ({ useStorage: jest.fn() }));
jest.mock('../../blue_modules/NativePlatformSearch', () => ({
  __esModule: true,
  default: {
    deleteIndex: jest.fn().mockResolvedValue(undefined),
    replaceIndex: jest.fn().mockResolvedValue(0),
    clearActivity: jest.fn(),
    donateActivity: jest.fn(),
  },
  usePlatformSearchAvailability: jest.fn(() => true),
  beginPlatformSearchWalletIndexing: jest.fn(() => jest.fn()),
}));

const isStorageEncrypted = jest.fn().mockResolvedValue(false);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(usePlatformSearchAvailability).mockReturnValue(true);
  jest.mocked(navigationRef.isReady).mockReturnValue(false);
  jest.mocked(useSettings).mockReturnValue({ isPlatformSearchEnabled: false } as ReturnType<typeof useSettings>);
  jest.mocked(useStorage).mockReturnValue({
    wallets: [],
    walletsInitialized: false,
    isStorageEncrypted,
  } as unknown as ReturnType<typeof useStorage>);
});

it('clears disabled search without reading or initializing wallet storage', async () => {
  const hook = renderHook(usePlatformSearch);
  await act(async () => {});

  expect(isStorageEncrypted).not.toHaveBeenCalled();
  expect(NativePlatformSearch!.deleteIndex).toHaveBeenCalledTimes(1);
  hook.unmount();
});

it('waits for wallet initialization before checking encryption for enabled search', async () => {
  jest.mocked(useSettings).mockReturnValue({ isPlatformSearchEnabled: true } as ReturnType<typeof useSettings>);
  const hook = renderHook(usePlatformSearch);
  await act(async () => {});
  expect(isStorageEncrypted).not.toHaveBeenCalled();
  expect(NativePlatformSearch!.replaceIndex).not.toHaveBeenCalled();

  isStorageEncrypted.mockResolvedValueOnce(true);
  jest.mocked(useStorage).mockReturnValue({
    ...useStorage(),
    walletsInitialized: true,
  });
  hook.rerender(undefined);
  await act(async () => {});

  expect(isStorageEncrypted).toHaveBeenCalledTimes(1);
  expect(NativePlatformSearch!.deleteIndex).toHaveBeenCalledTimes(1);
  expect(NativePlatformSearch!.replaceIndex).not.toHaveBeenCalled();
  hook.unmount();
});

it('refreshes indexed metadata and navigation activity using the wallet array emitted by saves', async () => {
  jest.useFakeTimers();
  jest.mocked(navigationRef.isReady).mockReturnValue(true);
  jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({
    key: 'tx',
    name: 'TransactionStatus',
    params: { walletID: 'wallet', hash: 'tx' },
  });
  const txMetadata = { tx: { memo: 'Old memo' } };
  const wallet = {
    getID: () => 'wallet',
    getLabel: () => 'Savings',
    getHideTransactionsInWalletsList: () => false,
    getTransactions: () => [{ txid: 'tx' }],
  };
  jest.mocked(useSettings).mockReturnValue({ isPlatformSearchEnabled: true } as ReturnType<typeof useSettings>);
  jest.mocked(useStorage).mockReturnValue({
    wallets: [wallet],
    walletsInitialized: true,
    txMetadata,
    isStorageEncrypted,
  } as unknown as ReturnType<typeof useStorage>);
  const hook = renderHook(usePlatformSearch);
  try {
    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(750);
    });
    expect(NativePlatformSearch!.donateActivity).toHaveBeenLastCalledWith('transaction:wallet:tx', 'Old memo');
    txMetadata.tx.memo = 'Updated memo';
    jest.mocked(useStorage).mockReturnValue({ ...useStorage(), wallets: [...useStorage().wallets] });
    hook.rerender(undefined);
    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(750);
    });
    expect(NativePlatformSearch!.replaceIndex).toHaveBeenCalledTimes(2);
    expect(NativePlatformSearch!.donateActivity).toHaveBeenLastCalledWith('transaction:wallet:tx', 'Updated memo');
    const calls = jest.mocked(NativePlatformSearch!.replaceIndex).mock.calls;
    expect(JSON.parse(calls[1][0])).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Updated memo' })]));
  } finally {
    hook.unmount();
    jest.useRealTimers();
  }
});

it('stops indexing and activity donation while device indexing is unavailable', async () => {
  jest.mocked(usePlatformSearchAvailability).mockReturnValue(false);
  jest.mocked(useSettings).mockReturnValue({ isPlatformSearchEnabled: true } as ReturnType<typeof useSettings>);
  const hook = renderHook(usePlatformSearch);
  await act(async () => {
    hook.result.current();
  });
  expect(isStorageEncrypted).not.toHaveBeenCalled();
  expect(NativePlatformSearch!.replaceIndex).not.toHaveBeenCalled();
  expect(NativePlatformSearch!.donateActivity).not.toHaveBeenCalled();
  expect(NativePlatformSearch!.deleteIndex).toHaveBeenCalledTimes(1);
  expect(NativePlatformSearch!.clearActivity).toHaveBeenCalled();
  hook.unmount();
});
