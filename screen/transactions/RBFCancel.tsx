import React from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { TWallet } from '../../class/wallets/types';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { FeeBumpScreen, getRBFTransaction } from './CPFP';

const getBumpableTx = async (wallet: TWallet, txid: string) => {
  const tx = getRBFTransaction(wallet, txid);
  if (!tx) return;
  if (
    (await tx.isOurTransaction()) &&
    (await tx.getRemoteConfirmationsNum()) === 0 &&
    (await tx.isSequenceReplaceable()) &&
    (await tx.canCancelTx())
  ) {
    return tx;
  }
};

const RBFCancel = () => {
  const { txid, wallet } = useRoute<RouteProp<DetailViewStackParamList, 'RBFCancel'>>().params;
  const { txMetadata } = useStorage();

  return (
    <FeeBumpScreen
      wallet={wallet}
      txid={txid}
      explainText={loc.transactions.cancel_explain}
      notPossibleText={loc.transactions.cancel_no}
      getBumpableTx={getBumpableTx}
      createTx={(tx, feeRate) => tx.createRBFcancelTx(feeRate)}
      onBroadcasted={newTxid => {
        // porting metadata, if any
        const metadata = { ...txMetadata[txid] };
        txMetadata[newTxid] = metadata;
        metadata.memo = metadata.memo ? 'Cancelled: ' + metadata.memo : 'Cancelled transaction';
      }}
    />
  );
};

export default RBFCancel;
