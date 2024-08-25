import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import HeaderRightButton from '../../components/HeaderRightButton';
import loc from '../../loc';
import { DetailViewStackParamList } from '../DetailViewStackParamList';
import navigationStyle from '../../components/navigationStyle';
import { Theme } from '../../components/themes';
import React from 'react';

type TransactionStatusRouteProp = RouteProp<DetailViewStackParamList, 'TransactionStatus'>;

interface GetTransactionStatusOptionsParams {
  route: TransactionStatusRouteProp;
  navigation: any;
  theme: Theme;
}

const getTransactionStatusOptions = ({ route, navigation, theme }: GetTransactionStatusOptionsParams): NativeStackNavigationOptions => {
  const { hash, walletID } = route.params;

  const navigateToTransactionDetails = () => {
    navigation.navigate('TransactionDetails', { hash, walletID });
  };

  return {
    ...navigationStyle({
      title: '',
      headerStyle: {
        backgroundColor: theme.colors.customHeader,
      },
      headerBackTitleStyle: { fontSize: 0 },
      headerBackTitleVisible: true,
      statusBarStyle: 'auto',
    })(theme),
    headerRight: () => (
      <HeaderRightButton
        testID="TransactionDetailsButton"
        disabled={false}
        title={loc.send.create_details}
        onPress={navigateToTransactionDetails}
      />
    ),
  };
};

export default getTransactionStatusOptions;
