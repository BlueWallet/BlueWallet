import { renderHook } from '@testing-library/react-native';
import useWalletHistorySummary from '../../hooks/useWalletHistorySummary';
import { TWallet } from '../../class/wallets/types';
import { Chain } from '../../models/bitcoinUnits';

describe('wallet history summary', () => {
  it('reuses expensive wallet results during unrelated renders and refreshes after storage updates or purging', () => {
    const getTransactions = jest.fn(() => [{ txid: 'sample' }]);
    const weOwnAddress = jest.fn((address: string) => address === 'owned');
    const wallet = { chain: Chain.ONCHAIN, getTransactions, weOwnAddress } as unknown as TWallet;
    const addressMetadata = { owned: { label: 'Unused address' } };
    const props = { wallets: [wallet], localRevision: 0 };
    const { result, rerender } = renderHook(
      ({ wallets, localRevision }) => useWalletHistorySummary(wallet, wallets, addressMetadata, localRevision),
      { initialProps: props },
    );
    expect(result.current).toEqual({ transactionCount: 1, hasAddressLabels: true });
    rerender(props);
    rerender(props);
    expect(getTransactions).toHaveBeenCalledTimes(1);
    expect(weOwnAddress).toHaveBeenCalledTimes(1);

    getTransactions.mockReturnValue([]);
    const refreshedWallets = [wallet];
    rerender({ wallets: refreshedWallets, localRevision: 0 });
    expect(result.current).toEqual({ transactionCount: 0, hasAddressLabels: true });
    expect(getTransactions).toHaveBeenCalledTimes(2);

    getTransactions.mockReturnValue([{ txid: 'updated' }]);
    rerender({ wallets: refreshedWallets, localRevision: 1 });
    expect(result.current.transactionCount).toBe(1);
    expect(getTransactions).toHaveBeenCalledTimes(3);
  });
});
