import { StackNavigator } from 'react-navigation';

import WalletsList from './wallets/list';
import AddWallet from './wallets/add';
import WalletDetails from './wallets/details';
import WalletExport from './wallets/export';
import scanQrWifSegwitP2SHAddress from './wallets/scanQrWifSegwitP2SHAddress';

const WalletsNavigator = StackNavigator(
  {
    WalletsList: {
      screen: WalletsList
    },
    AddWallet: {
      screen: AddWallet
    },
    ScanQrWifSegwitP2SHAddress: {
      screen: scanQrWifSegwitP2SHAddress
    },
    WalletDetails: {
      screen: WalletDetails
    },
    WalletExport: {
      screen: WalletExport
    }
  },
  {
    headerMode: 'none',
    mode: 'modal'
  }
);

export default WalletsNavigator;
