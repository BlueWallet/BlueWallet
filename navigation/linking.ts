import { LinkingOptions } from '@react-navigation/native';
import { DetailViewStackParamList } from './DetailViewStackParamList';

export const linking: LinkingOptions<DetailViewStackParamList> = {
  prefixes: ['bluewallet://'],
  config: {
    screens: {
      DrawerRoot: {
        screens: {
          DetailViewStackScreensStack: {
            screens: {
              ReceiveWalletSelection: 'receive',
              ManageWallets: 'manage-wallets',
            },
          },
        },
      },
      SendDetailsRoot: {
        path: 'send',
        screens: {
          SendDetails: '',
        },
      },
      ScanQRCode: 'scan',
    },
  },
};
