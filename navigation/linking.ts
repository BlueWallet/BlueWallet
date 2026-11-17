import { LinkingOptions } from '@react-navigation/native';
import { Chain } from '../models/bitcoinUnits';
import { RootParamList } from './RootParamList';

export type ShortcutWalletSelectionMode = 'send' | 'receive' | 'scan';

type ShortcutWallet = {
  chain: Chain;
  allowSend: () => boolean;
  allowReceive: () => boolean;
};

export const isShortcutWalletCompatible = (selectionMode: ShortcutWalletSelectionMode, wallet: ShortcutWallet) => {
  if (selectionMode === 'send') return wallet.chain === Chain.ONCHAIN && wallet.allowSend();
  if (selectionMode === 'receive') return wallet.allowReceive();
  return wallet.allowSend();
};

export const getCompatibleShortcutWallets = <T extends ShortcutWallet>(selectionMode: ShortcutWalletSelectionMode, wallets: readonly T[]) =>
  wallets.filter(wallet => isShortcutWalletCompatible(selectionMode, wallet));

export const getShortcutWalletDestination = (selectionMode: ShortcutWalletSelectionMode, chain: Chain, walletID: string) => {
  if (selectionMode === 'send') {
    return {
      name: 'SendDetailsRoot',
      params: { screen: 'SendDetails', params: { walletID } },
    };
  }

  if (selectionMode === 'receive') {
    return chain === Chain.ONCHAIN
      ? {
          name: 'DrawerRoot',
          params: {
            screen: 'DetailViewStackScreensStack',
            params: { screen: 'ReceiveDetails', params: { walletID, address: '' } },
          },
        }
      : {
          name: 'LNDCreateInvoiceRoot',
          params: { screen: 'LNDCreateInvoice', params: { walletID } },
        };
  }

  return chain === Chain.ONCHAIN
    ? {
        name: 'SendDetailsRoot',
        params: {
          screen: 'SendDetails',
          params: { walletID, openScanner: true },
        },
      }
    : {
        name: 'ScanLNDInvoiceRoot',
        params: {
          screen: 'ScanLNDInvoice',
          params: {
            walletID,
            uri: undefined,
            onBarScanned: undefined,
            openScanner: true,
          },
        },
      };
};

export const linking: LinkingOptions<RootParamList> = {
  prefixes: ['bluewallet://', 'https://bluewallet.io'],
  config: {
    initialRouteName: 'DrawerRoot',
    screens: {
      AppShortcut: ':selectionMode(send|receive|scan)',
      DrawerRoot: {
        screens: {
          DetailViewStackScreensStack: {
            // DrawerParamList intentionally avoids NavigatorScreenParams to break
            // its type cycle, so React Navigation cannot infer this nested key.
            initialRouteName: 'WalletsList' as never,
            screens: {
              ManageWallets: 'manage-wallets',
            },
          },
        },
      },
    },
  },
};
