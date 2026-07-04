import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

type HeaderLeftRenderer = NonNullable<NativeStackNavigationOptions['headerLeft']>;
type HeaderRightRenderer = NonNullable<NativeStackNavigationOptions['headerRight']>;

export type ReceiveDetailsStackParamList = {
  ReceiveDetails: {
    walletID?: string;
    address?: string;
    customLabel?: string;
    customAmount?: string;
    customUnit?: import('../models/bitcoinUnits').BitcoinUnit;
    bip21encoded?: string;
    isCustom?: boolean;
    headerLeft?: HeaderLeftRenderer;
    headerRight?: HeaderRightRenderer;
    headerBackVisible?: boolean;
  };
  ReceiveCustomAmount: {
    address: string;
    currentLabel?: string;
    currentAmount?: string;
    currentUnit?: import('../models/bitcoinUnits').BitcoinUnit;
    preferredUnit?: import('../models/bitcoinUnits').BitcoinUnit;
  };
};
