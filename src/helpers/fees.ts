import AsyncStorage from '@react-native-community/async-storage';

import NetworkTransactionFees, { NetworkTransactionFee } from '../../models/networkTransactionFees';

export const loadTransactionsFees = async () => {
  try {
    const recommendedFees = await NetworkTransactionFees.recommendedFees();
    if (recommendedFees && recommendedFees.hasOwnProperty('fastestFee')) {
      await AsyncStorage.setItem(NetworkTransactionFee.StorageKey, JSON.stringify(recommendedFees));
      return Number(recommendedFees.fastestFee);
    }
  } catch (_) {}
  try {
    const cachedNetworkTransactionFees = JSON.parse(
      (await AsyncStorage.getItem(NetworkTransactionFee.StorageKey)) as string,
    );

    if (cachedNetworkTransactionFees && cachedNetworkTransactionFees.hasOwnProperty('halfHourFee')) {
      return Number(cachedNetworkTransactionFees.fastestFee);
    }
  } catch (_) {}
};
