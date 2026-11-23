import { useMemo } from 'react';
import { TAddressMetadata } from '../class/blue-app';
import { TWallet } from '../class/wallets/types';
import { Chain } from '../models/bitcoinUnits';

export default function useWalletHistorySummary(
  wallet: TWallet,
  wallets: readonly TWallet[],
  addressMetadata: TAddressMetadata,
  localRevision: number,
) {
  return useMemo(
    () => ({
      transactionCount: wallet.getTransactions().length,
      hasAddressLabels: wallet.chain === Chain.ONCHAIN && Object.keys(addressMetadata).some(address => wallet.weOwnAddress(address)),
    }),
    // Storage replaces wallets after in-place transaction/metadata edits; localRevision covers a local purge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallet, wallets, addressMetadata, localRevision],
  );
}
