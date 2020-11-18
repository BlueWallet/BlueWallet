import { flatten, flattenDeep, max, cloneDeep } from 'lodash';
import { flattenDeep as flattenDeepFp, flatten as flattenFp, some, map, compose, filter } from 'lodash/fp';
import { createSelector } from 'reselect';

import {
  TxType,
  Wallet,
  TransactionInput,
  Transaction,
  TransactionOutput,
  TransactionStatus,
  CONST,
  TagsType,
  Tags,
} from 'app/consts';
import { HDSegwitP2SHArWallet, HDSegwitP2SHAirWallet } from 'app/legacy';
import { ApplicationState } from 'app/state';

import logger from '../../../logger';
import { roundBtcToSatoshis, btcToSatoshi, satoshiToBtc } from '../../../utils/bitcoin';
import { selectors as electrumXSelectors } from '../electrumX';
import { WalletsState } from './reducer';

const local = (state: ApplicationState): WalletsState => state.wallets;

export const wallets = createSelector(local, state => {
  return state.wallets.map(wallet => {
    const w = cloneDeep(wallet);
    const recoveryInputsTxIds = compose(
      flattenDeepFp,
      map(({ inputs }) => inputs.map((input: TransactionInput) => input.txid)),
      filter(({ tx_type }) => tx_type === TxType.RECOVERY),
    )(w.transactions);

    const { balance, incomingBalance } = w.transactions.reduce(
      ({ balance, incomingBalance }: { balance: number; incomingBalance: number }, t: Transaction) => {
        if (t.tx_type === TxType.ALERT_RECOVERED) {
          return { balance, incomingBalance };
        }

        const inputsMyAmount = getMyAmount(w, t.inputs);
        const outputsMyAmount = getMyAmount(w, t.outputs);

        if (t.tx_type === TxType.ALERT_PENDING) {
          const inputsTxIds = flatten(t.inputs.map(({ txid }) => txid));

          if (inputsTxIds.some(id => recoveryInputsTxIds.includes(id))) {
            return { balance, incomingBalance };
          }
          return { balance: balance - inputsMyAmount, incomingBalance: incomingBalance + outputsMyAmount };
        }

        return { balance: balance + outputsMyAmount - inputsMyAmount, incomingBalance };
      },
      { balance: 0, incomingBalance: 0 },
    );

    w.balance = btcToSatoshi(balance, 0);
    w.incoming_balance = btcToSatoshi(incomingBalance, 0);

    return w;
  });
});

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

type TxEntity = TransactionInput | TransactionOutput;
const getMyAmount = (wallet: Wallet, entities: TxEntity[]) =>
  entities.reduce((amount: number, entity: TxEntity) => {
    if (wallet.weOwnAddress(entity.addresses[0])) {
      return entity.value + amount;
    }
    return amount;
  }, 0);

const getTranasctionStatus = (tx: Transaction, confirmations: number): TransactionStatus => {
  switch (tx.tx_type) {
    case TxType.NONVAULT:
    case TxType.INSTANT:
      return confirmations < CONST.confirmationsBlocks ? TransactionStatus.PENDING : TransactionStatus.DONE;
    case TxType.ALERT_PENDING:
      return TransactionStatus.PENDING;
    case TxType.ALERT_RECOVERED:
      return TransactionStatus.CANCELED;
    case TxType.ALERT_CONFIRMED:
      return TransactionStatus.DONE;
    case TxType.RECOVERY:
      return TransactionStatus['CANCELED-DONE'];
    default:
      logger.error('wallets selectors', `couldn't find status for tx ${JSON.stringify(tx)}`);
      throw new Error(`Unkown tx_type: ${tx.tx_type}`);
  }
};

const getTranasctionTags = (tx: Transaction): TagsType[] => {
  const tags: TagsType[] = [tx.status];
  if (tx.unblockedAmount !== undefined) {
    tags.push(Tags.UNBLOCKED);
  }
  if (tx.blockedAmount !== undefined) {
    tags.push(Tags.BLOCKED);
  }
  return tags;
};

export const transactions = createSelector(wallets, electrumXSelectors.blockHeight, (walletsList, blockHeight) => {
  const txs = flattenDeep(
    walletsList.map(wallet => {
      const walletBalanceUnit = wallet.getPreferredBalanceUnit();
      const walletLabel = wallet.getLabel();
      const id = wallet.id;
      return wallet.transactions.map(transaction => {
        const { height } = transaction;
        // blockHeight + 1 -> we add 1, because when the transaction height is equal blockheight the transaction has 1 confirmation
        const confirmations = max([height > 0 ? blockHeight + 1 - height : 0, 0]) || 0;
        const inputsAmount = transaction.inputs.reduce((amount, i) => amount + i.value, 0);
        const outputsAmount = transaction.outputs.reduce((amount, o) => amount + o.value, 0);

        const fee = outputsAmount - inputsAmount;

        const inputsMyAmount = getMyAmount(wallet, transaction.inputs);

        const outputsMyAmount = getMyAmount(wallet, transaction.outputs);

        const feeSatoshi = btcToSatoshi(fee, 0);

        const myBalanceChangeSatoshi = btcToSatoshi(outputsMyAmount - inputsMyAmount, 0);

        let blockedAmount;
        if ([TxType.ALERT_PENDING, TxType.ALERT_CONFIRMED, TxType.ALERT_RECOVERED].includes(transaction.tx_type)) {
          blockedAmount = outputsMyAmount < 0 ? 0 : -roundBtcToSatoshis(outputsMyAmount);
        }

        let unblockedAmount;
        if ([TxType.ALERT_CONFIRMED].includes(transaction.tx_type) && blockedAmount !== undefined) {
          unblockedAmount = blockedAmount === 0 ? 0 : -blockedAmount;
        }

        const isFromMyWalletTx = wallet.weOwnAddress(transaction.inputs[0].addresses[0]);

        let toExternalAddress;
        let toInternalAddress;

        const toAddress = transaction.outputs[0].addresses[0];
        const isToMyWalletTx = wallet.weOwnAddress(toAddress);

        const isToInternalAddress = walletsList.some(w => w.weOwnAddress(toAddress));

        if ([TxType.RECOVERY].includes(transaction.tx_type) && isFromMyWalletTx) {
          if (isToInternalAddress) {
            toInternalAddress = toAddress;
          } else {
            toExternalAddress = toAddress;
          }
        }

        const baseTransaction = {
          ...transaction,
          confirmations,
          walletPreferredBalanceUnit: walletBalanceUnit,
          walletId: id,
          status: getTranasctionStatus(transaction, confirmations),
          walletLabel,
          walletTypeReadable: wallet.typeReadable,
        };

        if (TxType.RECOVERY !== transaction.tx_type && isFromMyWalletTx && isToMyWalletTx) {
          // create two transactions for transaction to internal address
          const outPutSendByUser = transaction.outputs[0];
          const amountSendBtc = satoshiToBtc(transaction.outputs[0].value).toNumber();
          const valueWithoutFee = btcToSatoshi(outPutSendByUser.value);

          return [
            {
              ...baseTransaction,
              valueWithoutFee,
              value: 0, // not real tx so value is 0
              ...(transaction.tx_type === TxType.ALERT_RECOVERED && { isRecoveredAlertToMe: true }),
            },
            {
              ...baseTransaction,
              fee: roundBtcToSatoshis(fee),
              ...(blockedAmount !== undefined && {
                blockedAmount: roundBtcToSatoshis(blockedAmount - amountSendBtc),
              }),
              ...(unblockedAmount !== undefined && {
                unblockedAmount: roundBtcToSatoshis(unblockedAmount + amountSendBtc),
              }),
              valueWithoutFee: -valueWithoutFee,
            },
          ];
        }

        return {
          ...baseTransaction,
          toExternalAddress,
          toInternalAddress,
          ...(isFromMyWalletTx && {
            fee: roundBtcToSatoshis(fee),
            blockedAmount: blockedAmount && roundBtcToSatoshis(blockedAmount),
            unblockedAmount: unblockedAmount && roundBtcToSatoshis(unblockedAmount),
          }),
          ...(transaction.tx_type === TxType.ALERT_RECOVERED && { isRecoveredAlertToMe: transaction.value > 0 }),
          valueWithoutFee: isFromMyWalletTx ? myBalanceChangeSatoshi - feeSatoshi : myBalanceChangeSatoshi,
        };
      });
    }),
  );

  // enhance cancel-done transaction made by our wallet and add tags
  return txs
    .map(tx => {
      if (tx.tx_type !== TxType.RECOVERY || tx.value > 0) {
        return tx;
      }

      const recoveryInputsTxIds = flatten(tx.inputs.map(({ txid }) => txid));

      const recoveredTxs = txs.filter(t => {
        if (t.value >= 0 || t.walletId !== tx.walletId || t.txid === tx.txid) {
          return false;
        }

        return compose(
          some((inTxid: string) => recoveryInputsTxIds.includes(inTxid)),
          flattenFp,
          map(({ txid }) => txid),
        )(t.inputs);
      });

      if (recoveredTxs.length === 0) {
        return tx;
      }

      const { valueWithoutFee: v, returnedFee: rF, unblockedAmount: uA } = recoveredTxs.reduce(
        (
          {
            valueWithoutFee,
            returnedFee,
            unblockedAmount,
          }: { valueWithoutFee: number; returnedFee: number; unblockedAmount: number },
          rTx,
        ) => {
          return {
            valueWithoutFee: valueWithoutFee + Math.abs(rTx.valueWithoutFee),
            returnedFee: returnedFee + Math.abs(rTx.fee || 0),
            unblockedAmount: unblockedAmount + Math.abs(rTx.blockedAmount || 0),
          };
        },
        { valueWithoutFee: 0, returnedFee: 0, unblockedAmount: 0 },
      );

      return {
        ...tx,
        valueWithoutFee: v,
        returnedFee: roundBtcToSatoshis(rF),
        unblockedAmount: roundBtcToSatoshis(uA),
        recoveredTxsCounter: recoveredTxs.length,
      };
    })
    .map(tx => ({ ...tx, tags: getTranasctionTags(tx) }));
});

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
  txs.filter(tx => tx.value < 0 && tx.time),
);

export const hasWallets = createSelector(wallets, walletsList => walletsList.length > 0);

export const isLoading = createSelector(local, state => state.isLoading);
