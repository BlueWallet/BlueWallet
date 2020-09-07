import { flatten, negate } from 'lodash';
import { createSelector } from 'reselect';

import { TxType, Wallet } from 'app/consts';
import { isAllWallets } from 'app/helpers/helpers';
import { HDSegwitP2SHArWallet, HDSegwitP2SHAirWallet } from 'app/legacy';
import { ApplicationState } from 'app/state';

import { WalletsState } from './reducer';

const local = (state: ApplicationState): WalletsState => state.wallets;

export const wallets = createSelector(local, state => state.wallets);

export const getById = createSelector(
  wallets,
  (_: WalletsState, id: string) => id,
  (data, id) => data.find(w => w.id === id),
);

export const getWalletsLabels = createSelector(wallets, walletsList => walletsList.map(w => w.label));

export const walletsWithRecoveryTransaction = createSelector(wallets, walletsList =>
  walletsList.filter(wallet => [HDSegwitP2SHArWallet.type, HDSegwitP2SHAirWallet.type].includes(wallet.type)),
);

export const allWallet = createSelector(wallets, walletsList => {
  const { incoming_balance, balance } = walletsList.reduce(
    (acc, wallet) => ({
      incoming_balance: acc.incoming_balance + wallet.incoming_balance,
      balance: acc.balance + wallet.balance,
    }),
    { incoming_balance: 0, balance: 0 },
  );

  return {
    label: 'All wallets',
    balance,
    incoming_balance,
    preferredBalanceUnit: 'BTCV',
    type: '',
  };
});

export const allWallets = createSelector(wallets, allWallet, (walletsList, aw) => {
  if (walletsList.length > 1) {
    return [aw as Wallet, ...walletsList];
  }
  return walletsList;
});

export const transactions = createSelector(wallets, walletsList =>
  flatten(
    walletsList.filter(negate(isAllWallets)).map(wallet => {
      const walletBalanceUnit = wallet.getPreferredBalanceUnit();
      const walletLabel = wallet.getLabel();
      const id = wallet.id;
      return wallet.transactions.map(transaction => ({
        ...transaction,
        walletPreferredBalanceUnit: walletBalanceUnit,
        walletId: id,
        walletLabel,
        walletTypeReadable: wallet.typeReadable,
      }));
    }),
  ),
);

export const getTranasctionsByWalletId = createSelector(
  transactions,
  (_: WalletsState, id: string) => id,
  (txs, id) => txs.filter(t => t.walletId === id),
);

export const getRecoveryTransactions = createSelector(getTranasctionsByWalletId, txs =>
  txs.filter(t => t.tx_type === TxType.RECOVERY),
);

export const getAlertPendingTransactions = createSelector(getTranasctionsByWalletId, txs =>
  txs.filter(t => t.tx_type === TxType.ALERT_PENDING),
);

export const getTransactionsToRecoverByWalletId = createSelector(getAlertPendingTransactions, txs =>
  txs.filter(tx => tx.value < 0 && tx.confirmations > 0),
);

export const isLoading = createSelector(local, state => state.isLoading);
