import { getStateFromPath, LinkingOptions } from '@react-navigation/native';
import { Platform } from 'react-native';
import { formatElectrumServer, parseElectrumServer, parseElectrumServerHistoryDeepLink } from '../blue_modules/electrumServer';
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

// Shared by native URL events and in-app QR/clipboard entry points. Only
// validated, supported parameters reach the navigation state.
export const getElectrumSettingsLink = (value: string): string | undefined => {
  const path = value
    .trim()
    .replace(/^(?:(?:bluewallet|blue|lapp):|https:\/\/bluewallet\.io\/)/i, '')
    .replace(/^\/+/, '');
  const match = path.match(/^(setelectrumserver|importelectrumserverhistory|electrum-settings)(?=\?|$)/i);
  if (!match) return undefined;
  const action = match[1].toLowerCase();
  if (action === 'setelectrumserver' || (action === 'electrum-settings' && /[?&]server=/.test(path))) {
    const server = parseElectrumServer(path.replace(/^[^?]+/, 'setelectrumserver'));
    return server ? `/electrum-settings?server=${encodeURIComponent(formatElectrumServer(server))}` : undefined;
  }
  if (action === 'importelectrumserverhistory' || /[?&]serverHistoryImport=/.test(path)) {
    if (Platform.OS !== 'ios') return undefined;
    const historyPath =
      action === 'importelectrumserverhistory'
        ? path
        : `importelectrumserverhistory?data=${path.match(/[?&]serverHistoryImport=([^&#]*)/)?.[1] ?? ''}`;
    const document = parseElectrumServerHistoryDeepLink(historyPath);
    return document ? `/electrum-settings?serverHistoryImport=${encodeURIComponent(document)}` : undefined;
  }
  return '/electrum-settings';
};

export const linking: LinkingOptions<RootParamList> = {
  prefixes: ['bluewallet://', 'bluewallet:', 'blue://', 'blue:', 'lapp://', 'lapp:', 'https://bluewallet.io'],
  getStateFromPath(path, options) {
    if (/^\/?(?:setelectrumserver|importelectrumserverhistory|electrum-settings)(?=\?|$)/i.test(path)) {
      const electrumLink = getElectrumSettingsLink(path);
      return electrumLink ? getStateFromPath(electrumLink, options) : undefined;
    }
    return getStateFromPath(path, options);
  },
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
              ElectrumSettings: {
                path: 'electrum-settings',
                parse: { server: parseElectrumServer },
              },
            },
          },
        },
      },
    },
  },
};
