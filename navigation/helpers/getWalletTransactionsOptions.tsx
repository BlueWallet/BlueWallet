import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import WalletGradient from '../../class/wallet-gradient';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../DetailViewStackParamList';
import { navigationRef } from '../../NavigationService';
import { RouteProp } from '@react-navigation/native';

export type WalletTransactionsRouteProps = RouteProp<DetailViewStackParamList, 'WalletTransactions'>;

const getWalletTransactionsOptions = ({ route }: { route: WalletTransactionsRouteProps }): NativeStackNavigationOptions => {
  const { isLoading = false, walletID, walletType } = route.params;

  const onPress = () => {
    navigationRef.navigate('WalletDetails', {
      walletID,
    });
  };

  const RightButton = (
    <TouchableOpacity accessibilityRole="button" testID="WalletDetails" disabled={isLoading} style={styles.walletDetails} onPress={onPress}>
      <FontAwesome6 name="ellipsis" size={16} color="#FFFFFF" />
    </TouchableOpacity>
  );

  const backgroundColor = WalletGradient.headerColorFor(walletType);

  return {
    title: '',
    headerBackTitleStyle: { fontSize: 0 },
    headerStyle: {
      backgroundColor,
    },
    headerShadowVisible: false,
    headerTintColor: '#FFFFFF',
    headerBackTitle: undefined,
    headerRight: () => RightButton,
  };
};

const styles = StyleSheet.create({
  walletDetails: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});

export default getWalletTransactionsOptions;
