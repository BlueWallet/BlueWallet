import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@rneui/themed';
import WalletGradient from '../../class/wallet-gradient';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../DetailViewStackParamList';
import { navigationRef } from '../../NavigationService';

interface GetWalletTransactionsOptionsParams {
  route: RouteProp<DetailViewStackParamList, 'WalletTransactions'>;
}

const getWalletTransactionsOptions = ({ route }: GetWalletTransactionsOptionsParams): NativeStackNavigationOptions => {
  const { isLoading, walletID, walletType } = route.params;

  const onPress = () => {
    navigationRef.navigate('WalletDetails', {
      walletID,
    });
  };
  const RightButton = (
    <TouchableOpacity accessibilityRole="button" testID="WalletDetails" disabled={isLoading} style={styles.walletDetails} onPress={onPress}>
      <Icon name="more-horiz" type="material" size={22} color="#FFFFFF" />
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
    headerBackTitleVisible: true,
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
