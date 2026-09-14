import AsyncStorage from '@react-native-async-storage/async-storage';

export const SpotlightEnabledKey = 'SpotlightSearchEnabled';
export const SpotlightAddressesEnabledKey = 'SpotlightAddressesEnabled';

export const getSpotlightEnabled = async (): Promise<boolean> => (await AsyncStorage.getItem(SpotlightEnabledKey)) === 'true';
export const getSpotlightAddressesEnabled = async (): Promise<boolean> =>
  (await AsyncStorage.getItem(SpotlightAddressesEnabledKey)) === 'true';
