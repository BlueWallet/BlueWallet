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
  if ((await tx.isOurTransaction()) && (await tx.getRemoteConfirmationsNum()) === 0 && (await tx.isSequenceReplaceable())) return tx;
};

const RBFBumpFee = () => {
  const { txid, wallet } = useRoute<RouteProp<DetailViewStackParamList, 'RBFBumpFee'>>().params;
  const { txMetadata } = useStorage();

  return (
    <FeeBumpScreen
      wallet={wallet}
      txid={txid}
      explainText={loc.transactions.rbf_explain}
      notPossibleText={loc.transactions.cpfp_no_bump}
      getBumpableTx={getBumpableTx}
      createTx={(tx, feeRate) => tx.createRBFbumpFee(feeRate)}
      onBroadcasted={newTxid => {
        // porting memo from old tx:
        if (txMetadata[txid]) {
          txMetadata[newTxid] = { ...txMetadata[txid] };
        }
      }}
    />
  );
};

export default RBFBumpFee;
