import DefaultPreference from 'react-native-default-preference';
import { Chain } from '../../models/bitcoinUnits';
import type { Transaction, TWallet } from '../../class/wallets/types';
import { DYNAMIC_ISLAND_PREVIEWS } from '../../components/DevMenu';
import { showcasePendingTransactionsLiveActivity } from '../../blue_modules/dynamicIslandPreview.ios';
import { notifyPendingTransactionsLiveActivityCurrencyChanged } from '../../blue_modules/dynamicIslandCurrencySync.ios';

import {
  isPendingTransactionsLiveActivityEnabled,
  setBalanceDisplayAllowed,
  setPendingTransactionsLiveActivityEnabled,
  syncWidgetBalanceWithWallets,
} from '../../hooks/useWidgetCommunication.ios';

const mockRefreshPendingTransactionsLiveActivity = jest.fn();
const mockShowcasePendingTransactionsLiveActivity = jest.fn();
const mockDefaultPreference = DefaultPreference as jest.Mocked<typeof DefaultPreference>;

jest.mock('../../blue_modules/NativeWidgetHelper', () => ({
  __esModule: true,
  default: {
    reloadAllWidgets: jest.fn(),
    refreshPendingTransactionsLiveActivity: () => mockRefreshPendingTransactionsLiveActivity(),
  },
  requestPendingTransactionsLiveActivityRefresh: () => mockRefreshPendingTransactionsLiveActivity(),
  requestPendingTransactionsLiveActivityShowcase: () => mockShowcasePendingTransactionsLiveActivity(),
}));

const transaction = (txid: string, value: number, confirmations = 0): Transaction =>
  ({ txid, hash: txid, value, confirmations, timestamp: 1_700_000_000 }) as Transaction;

const wallet = (transactions: Transaction[]): TWallet =>
  ({
    chain: Chain.ONCHAIN,
    hideBalance: false,
    getBalance: async () => 200_000,
    getTransactions: () => transactions,
    getAllExternalAddresses: () => ['1BoatSLRHtKNngkdXEeobR76b53LETtpyT'],
  }) as unknown as TWallet;

const cache = () => ({
  balance: { current: -1 },
  latestTransactionTime: { current: -1 as number | string },
  pendingCount: { current: -1 },
  pendingSats: { current: -1 },
  watchConfiguration: { current: '' },
});

describe('pending transactions Live Activity bridge', () => {
  beforeEach(() => {
    mockRefreshPendingTransactionsLiveActivity.mockClear();
    mockShowcasePendingTransactionsLiveActivity.mockClear();
    mockDefaultPreference.set.mockClear();
    mockDefaultPreference.get.mockResolvedValue('1');
    mockDefaultPreference.set.mockResolvedValue();
  });

  it('writes a native Electrum watch list and fallback snapshot before requesting a refresh', async () => {
    const cached = cache();

    await syncWidgetBalanceWithWallets(
      [wallet([transaction('receive', 50_000), transaction('send', -125_000)])],
      true,
      cached.balance,
      cached.latestTransactionTime,
      cached.pendingCount,
      cached.pendingSats,
      cached.watchConfiguration,
    );

    expect(mockRefreshPendingTransactionsLiveActivity).toHaveBeenCalledWith();
    expect(cached.pendingCount.current).toBe(2);
    expect(cached.pendingSats.current).toBe(175_000);

    const configurationCall = mockDefaultPreference.set.mock.calls.find(
      ([key]) => key === 'PendingTransactionsLiveActivityWatchConfiguration',
    );
    const snapshotCall = mockDefaultPreference.set.mock.calls.find(
      ([key]) => key === 'PendingTransactionsLiveActivitySnapshot',
    );
    expect(configurationCall).toBeDefined();
    expect(snapshotCall).toBeDefined();
    expect(JSON.parse(String(configurationCall![1]))).toMatchObject({
      version: 1,
      isEnabled: true,
      scriptHashes: [expect.stringMatching(/^[0-9a-f]{64}$/)],
    });
    expect(JSON.parse(String(snapshotCall![1]))).toMatchObject({
      pendingTransactionCount: 2,
      totalPendingSats: 175_000,
      updatedAt: expect.any(String),
    });
  });

  it('avoids redundant native updates and ends the activity when all transactions confirm', async () => {
    const transactions = [transaction('receive', 50_000)];
    const cached = cache();
    const wallets = [wallet(transactions)];

    await syncWidgetBalanceWithWallets(
      wallets,
      true,
      cached.balance,
      cached.latestTransactionTime,
      cached.pendingCount,
      cached.pendingSats,
      cached.watchConfiguration,
    );
    await syncWidgetBalanceWithWallets(
      wallets,
      true,
      cached.balance,
      cached.latestTransactionTime,
      cached.pendingCount,
      cached.pendingSats,
      cached.watchConfiguration,
    );

    expect(mockRefreshPendingTransactionsLiveActivity).toHaveBeenCalledTimes(1);

    transactions[0].confirmations = 1;
    await syncWidgetBalanceWithWallets(
      wallets,
      true,
      cached.balance,
      cached.latestTransactionTime,
      cached.pendingCount,
      cached.pendingSats,
      cached.watchConfiguration,
    );

    expect(mockRefreshPendingTransactionsLiveActivity).toHaveBeenLastCalledWith();
    expect(mockRefreshPendingTransactionsLiveActivity).toHaveBeenCalledTimes(2);
  });

  it('keeps the Live Activity independent when widget balances are disabled', async () => {
    await setBalanceDisplayAllowed(false);

    expect(mockRefreshPendingTransactionsLiveActivity).not.toHaveBeenCalled();
    expect(mockDefaultPreference.set).toHaveBeenCalledWith('WidgetCommunicationAllWalletsSatoshiBalance', '0');
    expect(mockDefaultPreference.set).toHaveBeenCalledWith('WidgetCommunicationAllWalletsLatestTransactionTime', '0');
    expect(mockDefaultPreference.set).not.toHaveBeenCalledWith('PendingTransactionsLiveActivityWatchConfiguration', expect.anything());
  });

  it('enables the Dynamic Island preference by default', async () => {
    mockDefaultPreference.get.mockResolvedValueOnce(null);

    await expect(isPendingTransactionsLiveActivityEnabled()).resolves.toBe(true);
    expect(mockDefaultPreference.set).toHaveBeenCalledWith('PendingTransactionsLiveActivityEnabled', '1');
  });

  it('ends and clears the Live Activity when its privacy setting is disabled', async () => {
    await setPendingTransactionsLiveActivityEnabled(false);

    expect(mockDefaultPreference.set).toHaveBeenCalledWith('PendingTransactionsLiveActivityEnabled', '0');
    expect(mockDefaultPreference.set).toHaveBeenCalledWith(
      'PendingTransactionsLiveActivityWatchConfiguration',
      JSON.stringify({ version: 1, isEnabled: false, scriptHashes: [] }),
    );
    expect(mockRefreshPendingTransactionsLiveActivity).toHaveBeenCalledWith();
    expect(mockDefaultPreference.set).not.toHaveBeenCalledWith('WidgetCommunicationAllWalletsSatoshiBalance', expect.anything());
  });

  it('waits for a fresh RN handoff before refreshing after re-enabling', async () => {
    await setPendingTransactionsLiveActivityEnabled(true);

    expect(mockDefaultPreference.set).toHaveBeenCalledWith('PendingTransactionsLiveActivityEnabled', '1');
    expect(mockRefreshPendingTransactionsLiveActivity).not.toHaveBeenCalled();
  });

  it('continues pending-transaction updates when home-screen balances are hidden', async () => {
    mockDefaultPreference.get.mockImplementation(async key => (key === 'WidgetCommunicationDisplayBalanceAllowed' ? '0' : '1'));
    const cached = cache();

    await syncWidgetBalanceWithWallets(
      [wallet([transaction('receive', 50_000)])],
      true,
      cached.balance,
      cached.latestTransactionTime,
      cached.pendingCount,
      cached.pendingSats,
      cached.watchConfiguration,
    );

    expect(cached.balance.current).toBe(0);
    expect(cached.pendingCount.current).toBe(1);
    const configurationCall = mockDefaultPreference.set.mock.calls.find(
      ([key]) => key === 'PendingTransactionsLiveActivityWatchConfiguration',
    );
    expect(JSON.parse(String(configurationCall![1]))).toMatchObject({
      isEnabled: true,
    });
  });

  it('provides safe developer previews for singular, plural, edge, and large states', () => {
    expect(DYNAMIC_ISLAND_PREVIEWS.map(preview => preview.pendingTransactionCount)).toEqual([1, 1, 1, 2, 12, 999]);
    expect(DYNAMIC_ISLAND_PREVIEWS.some(preview => preview.totalPendingSats === 0)).toBe(true);
    expect(DYNAMIC_ISLAND_PREVIEWS.some(preview => preview.totalPendingSats === 1)).toBe(true);
    expect(DYNAMIC_ISLAND_PREVIEWS.every(preview => Number.isSafeInteger(preview.totalPendingSats))).toBe(true);
  });

  it('starts the native five-second Dynamic Island showcase from React Native', () => {
    showcasePendingTransactionsLiveActivity();

    expect(mockShowcasePendingTransactionsLiveActivity).toHaveBeenCalledTimes(1);
  });

  it('refreshes native Live Activity presentation when the preferred currency changes', () => {
    notifyPendingTransactionsLiveActivityCurrencyChanged();

    expect(mockRefreshPendingTransactionsLiveActivity).toHaveBeenCalledTimes(1);
  });
});
