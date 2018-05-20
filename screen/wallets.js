import { StackNavigator } from 'react-navigation';

import WalletsList from './wallets/list';
import AddWallet from './wallets/add';
import WalletDetails from './wallets/details';
import WalletExport from './wallets/export';
import scanQrWif from './wallets/scanQrWif';

const WalletsNavigator = StackNavigator(
  {
    WalletsList: {
      screen: WalletsList,
    },
    AddWallet: {
      screen: AddWallet,
    },
    ScanQrWif: {
      screen: scanQrWif,
    },
    WalletDetails: {
      screen: WalletDetails,
    },
    WalletExport: {
      screen: WalletExport,
    },
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);

export default WalletsNavigator;
