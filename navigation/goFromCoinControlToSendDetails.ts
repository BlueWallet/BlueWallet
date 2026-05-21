import { CommonActions, StackActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Utxo } from '../class/wallets/types';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { SendDetailsStackParamList } from './SendDetailsStackParamList';

/**
 * After choosing UTXO(s) in Coin Control, open Send with those coins.
 * Uses popTo when SendDetails is already in the stack (normal send → coin control).
 * Resets the send stack when Coin Control was opened as the first screen (e.g. from wallet details).
 */
export function goFromCoinControlToSendDetails(
  navigation: NativeStackNavigationProp<SendDetailsStackParamList>,
  walletID: string,
  utxos: Utxo[],
): void {
  const state = navigation.getState();
  const hasSendDetails = state.routes.some(r => r.name === 'SendDetails');

  const params = {
    walletID,
    utxos,
    isEditable: true as const,
    feeUnit: BitcoinUnit.BTC,
    amountUnit: BitcoinUnit.BTC,
  };

  if (hasSendDetails) {
    navigation.dispatch(StackActions.popTo('SendDetails', params, { merge: true }));
  } else {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'SendDetails', params }],
      }),
    );
  }
}
