import { LinkingOptions } from '@react-navigation/native';
import { Chain } from '../models/bitcoinUnits';
import { DetailViewStackParamList } from './DetailViewStackParamList';

export type ShortcutWalletSelectionMode = 'receive' | 'scan';

export const getShortcutWalletDestination = (selectionMode: ShortcutWalletSelectionMode, chain: Chain, walletID: string) => {
  if (selectionMode === 'receive') {
    return chain === Chain.ONCHAIN
      ? { name: 'ReceiveDetails', params: { walletID, address: '' } }
      : { name: 'LNDCreateInvoiceRoot', params: { screen: 'LNDCreateInvoice', params: { walletID } } };
  }

  return chain === Chain.ONCHAIN
    ? { name: 'SendDetailsRoot', params: { screen: 'SendDetails', params: { walletID, openScanner: true } } }
    : {
        name: 'ScanLNDInvoiceRoot',
        params: {
          screen: 'ScanLNDInvoice',
          params: { walletID, uri: undefined, onBarScanned: undefined, openScanner: true },
        },
      };
};

export const linking: LinkingOptions<DetailViewStackParamList> = {
  prefixes: ['bluewallet://'],
  config: {
    screens: {
      DrawerRoot: {
        screens: {
          DetailViewStackScreensStack: {
            screens: {
              ReceiveWalletSelection: 'receive',
              ScanWalletSelection: 'scan',
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
    },
  },
};
