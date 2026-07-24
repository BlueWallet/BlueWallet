import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React, { lazy } from 'react';
import { Image, Keyboard, Platform, StyleSheet, TouchableOpacity } from 'react-native';

import { createEllipsisHeaderMenuOptions } from '../components/headerMenuOptions';
import { Action } from '../components/types';
import navigationStyle, { CloseButtonPosition, withRouteParamHeaderOptions } from '../components/navigationStyle';
import { isIOS26OrHigher } from '../blue_modules/environment';
import { useTheme } from '../components/themes';
import { HDLegacyP2PKHWallet } from '../class/wallets/hd-legacy-p2pkh-wallet';
import { HDSegwitBech32Wallet } from '../class/wallets/hd-segwit-bech32-wallet';
import { HDTaprootWallet } from '../class/wallets/hd-taproot-wallet';
import { LightningCustodianWallet } from '../class/wallets/lightning-custodian-wallet';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { withLazySuspense } from './LazyLoadingIndicator';
import { ScanQRCodeParamList } from './DetailViewStackParamList';

type HeaderRightRenderer = NonNullable<NativeStackNavigationOptions['headerRight']>;

export type AddWalletStackParamList = {
  AddWallet: {
    entropy?: string;
    words?: number;
    selectedIndex?: number;
    selectedWalletType?: Chain | 'VAULT' | 'ARK';
    headerRight?: HeaderRightRenderer;
    statusBarStyle?: NativeStackNavigationOptions['statusBarStyle'];
  };
  ImportWallet?: {
    label?: string;
    triggerImport?: boolean;
    onBarScanned?: string;
    askPassphraseMenuState?: boolean;
    searchAccountsMenuState?: boolean;
    clearClipboardMenuState?: boolean;
    headerRight?: HeaderRightRenderer;
  };
  ImportWalletDiscovery: {
    importText: string;
    askPassphrase: boolean;
    searchAccounts: boolean;
  };
  ImportSpeed: undefined;
  ImportCustomDerivationPath: {
    importText: string;
    password: string | undefined;
  };
  PleaseBackup: {
    walletID: string;
  };
  PleaseBackupLNDHub: {
    walletID: string;
  };
  ProvideEntropy: {
    words: number;
    entropy?: string;
  };
  WalletsAddMultisig: {
    walletLabel: string;
  };
  MultisigAdvanced: {
    m: number;
    n: number;
    format: string;
    onSave: (m: number, n: number, format: string) => void;
    headerRight?: HeaderRightRenderer;
  };
  WalletsAddMultisigStep2: {
    m: number;
    n: number;
    walletLabel: string;
    format: string;
    onBarScanned?: string;
    sheetAction?: string;
    sheetImportText?: string;
    sheetAskPassphrase?: boolean;
    headerRight?: HeaderRightRenderer;
  };
  WalletsAddMultisigVaultKeySheet: {
    keyIndex: number;
    seed: string;
  };
  WalletsAddMultisigProvideMnemonicsSheet: {
    importText: string;
    askPassphrase: boolean;
  };
  WalletsAddMultisigCosignerXpubSheet: {
    cosignerXpub: string;
    cosignerXpubURv2: string;
    cosignerXpubFilename: string;
  };
  WalletsAddMultisigHelp: undefined;
  ScanQRCode: ScanQRCodeParamList;
};

const Stack = createNativeStackNavigator<AddWalletStackParamList>();

const WalletsAdd = lazy(() => import('../screen/wallets/Add'));
const ImportCustomDerivationPath = lazy(() => import('../screen/wallets/ImportCustomDerivationPath'));
const ImportWalletDiscovery = lazy(() => import('../screen/wallets/ImportWalletDiscovery'));
const ImportSpeed = lazy(() => import('../screen/wallets/ImportSpeed'));
const ImportWallet = lazy(() => import('../screen/wallets/ImportWallet'));
const PleaseBackup = lazy(() => import('../screen/wallets/PleaseBackup'));
const PleaseBackupLNDHub = lazy(() => import('../screen/wallets/pleaseBackupLNDHub'));
const ProvideEntropy = lazy(() => import('../screen/wallets/ProvideEntropy'));
const WalletsAddMultisig = lazy(() => import('../screen/wallets/WalletsAddMultisig'));
const MultisigAdvanced = lazy(() => import('../screen/wallets/MultisigAdvanced'));
const WalletsAddMultisigStep2 = lazy(() => import('../screen/wallets/addMultisigStep2'));
const WalletsAddMultisigHelp = lazy(() => import('../screen/wallets/addMultisigHelp'));
const WalletsAddMultisigVaultKeySheet = lazy(() => import('../screen/wallets/WalletsAddMultisigVaultKeySheet'));
const WalletsAddMultisigProvideMnemonicsSheet = lazy(() => import('../screen/wallets/WalletsAddMultisigProvideMnemonicsSheet'));
const WalletsAddMultisigCosignerXpubSheet = lazy(() => import('../screen/wallets/WalletsAddMultisigCosignerXpubSheet'));
const ScanQRCode = lazy(() => import('../screen/send/ScanQRCode'));

const AddComponent = withLazySuspense(WalletsAdd);
const ImportWalletDiscoveryComponent = withLazySuspense(ImportWalletDiscovery);
const ImportCustomDerivationPathComponent = withLazySuspense(ImportCustomDerivationPath);
const ImportWalletComponent = withLazySuspense(ImportWallet);
const ImportSpeedComponent = withLazySuspense(ImportSpeed);
const PleaseBackupComponent = withLazySuspense(PleaseBackup);
const PleaseBackupLNDHubComponent = withLazySuspense(PleaseBackupLNDHub);
const ProvideEntropyComponent = withLazySuspense(ProvideEntropy);
const WalletsAddMultisigComponent = withLazySuspense(WalletsAddMultisig);
const MultisigAdvancedComponent = withLazySuspense(MultisigAdvanced);
const WalletsAddMultisigStep2Component = withLazySuspense(WalletsAddMultisigStep2);
const WalletsAddMultisigHelpComponent = withLazySuspense(WalletsAddMultisigHelp);
const WalletsAddMultisigVaultKeySheetComponent = withLazySuspense(WalletsAddMultisigVaultKeySheet);
const WalletsAddMultisigProvideMnemonicsSheetComponent = withLazySuspense(WalletsAddMultisigProvideMnemonicsSheet);
const WalletsAddMultisigCosignerXpubSheetComponent = withLazySuspense(WalletsAddMultisigCosignerXpubSheet);
const ScanQRCodeComponent = withLazySuspense(ScanQRCode);
const multisigSheetAllowedDetents = Platform.OS === 'ios' ? 'fitToContents' : [0.9];

const styles = StyleSheet.create({
  closeButton: {
    padding: 10,
  },
});

const addWalletTypes = [
  {
    id: HDSegwitBech32Wallet.type,
    text: `${loc.multisig.native_segwit_title}`,
    subtitle: 'p2wpkh/HD',
  },
  {
    id: HDLegacyP2PKHWallet.type,
    text: `${loc.multisig.legacy_title}`,
    subtitle: 'p2pkh/HD',
  },
  {
    id: HDTaprootWallet.type,
    text: 'Taproot',
    subtitle: 'p2tr/HD',
  },
  {
    id: LightningCustodianWallet.type,
    text: LightningCustodianWallet.typeReadable,
    subtitle: LightningCustodianWallet.subtitleReadable,
  },
];

const createAddWalletOptions = (theme: ReturnType<typeof useTheme>) =>
  navigationStyle({ closeButtonPosition: CloseButtonPosition.Left, title: loc.wallets.add_title }, (options, { navigation, route }) => {
    const selectedIndex = route.params?.selectedIndex ?? 0;
    const selectedWalletType = route.params?.selectedWalletType ?? Chain.ONCHAIN;
    const words = route.params?.words;
    const entropyHex = route.params?.entropy;
    const hasEntropy = !!entropyHex;

    const entropyButtonText = hasEntropy
      ? loc.formatString(loc.wallets.add_entropy_bytes, {
          bytes: Math.floor(entropyHex.length / 2),
        })
      : loc.wallets.add_entropy_provide;

    const onPressMenuItem = (id: string) => {
      if (id === LightningCustodianWallet.type) {
        navigation.setParams({ selectedWalletType: Chain.OFFCHAIN });
      } else if (id === '12_words') {
        navigation.navigate('ProvideEntropy', { words: 12, entropy: entropyHex });
      } else if (id === '24_words') {
        navigation.navigate('ProvideEntropy', { words: 24, entropy: entropyHex });
      } else if (id === CommonToolTipActions.ResetToDefault.id) {
        navigation.setParams({ entropy: undefined, words: undefined, selectedWalletType: Chain.ONCHAIN });
      } else {
        const nextIndex = addWalletTypes.findIndex(item => item.id === id);
        if (nextIndex >= 0) {
          navigation.setParams({ selectedIndex: nextIndex, selectedWalletType: Chain.ONCHAIN });
        }
      }
    };

    const actions: Action[] = [
      {
        id: 'wallets',
        text: loc.multisig.wallet_type,
        displayInline: true,
        subactions: addWalletTypes.map((walletType, index) => ({
          id: walletType.id,
          text: walletType.text,
          subtitle: walletType.subtitle,
          menuState: index === selectedIndex && selectedWalletType === Chain.ONCHAIN,
        })),
      },
    ];

    if (selectedWalletType === Chain.ONCHAIN) {
      actions.push({
        id: CommonToolTipActions.Entropy.id,
        text: entropyButtonText,
        subactions: [
          {
            id: '12_words',
            text: loc.wallets.add_wallet_seed_length_12,
            subtitle: loc.wallets.add_wallet_seed_length,
            menuState: words === 12,
          },
          {
            id: '24_words',
            text: loc.wallets.add_wallet_seed_length_24,
            subtitle: loc.wallets.add_wallet_seed_length,
            menuState: words === 24,
          },
          { ...CommonToolTipActions.ResetToDefault, hidden: !hasEntropy },
        ],
      });
    }

    const headerMenuOptions = createEllipsisHeaderMenuOptions({ actions, onPressMenuItem, title: '' });

    return {
      ...options,
      headerRight: headerMenuOptions.headerRight,
      ...(isIOS26OrHigher ? { unstable_headerRightItems: headerMenuOptions.unstable_headerRightItems } : {}),
    };
  })(theme);

export const createImportWalletOptions = (theme: ReturnType<typeof useTheme>) =>
  navigationStyle({ title: loc.wallets.import_title }, (options, { navigation, route }) => {
    const askPassphraseMenuState = route.params?.askPassphraseMenuState ?? false;
    const searchAccountsMenuState = route.params?.searchAccountsMenuState ?? false;
    const clearClipboardMenuState = route.params?.clearClipboardMenuState ?? true;

    const onPressMenuItem = (menuItem: string) => {
      Keyboard.dismiss();
      if (menuItem === CommonToolTipActions.Passphrase.id) {
        navigation.setParams({ askPassphraseMenuState: !askPassphraseMenuState });
      } else if (menuItem === CommonToolTipActions.SearchAccount.id) {
        navigation.setParams({ searchAccountsMenuState: !searchAccountsMenuState });
      } else if (menuItem === CommonToolTipActions.ClearClipboard.id) {
        navigation.setParams({ clearClipboardMenuState: !clearClipboardMenuState });
      }
    };

    const actions: Action[] = [
      { ...CommonToolTipActions.Passphrase, menuState: askPassphraseMenuState },
      { ...CommonToolTipActions.SearchAccount, menuState: searchAccountsMenuState },
      { ...CommonToolTipActions.ClearClipboard, menuState: clearClipboardMenuState },
    ];

    const headerMenuOptions = createEllipsisHeaderMenuOptions({ actions, onPressMenuItem });

    return {
      ...options,
      headerRight: headerMenuOptions.headerRight,
      ...(isIOS26OrHigher ? { unstable_headerRightItems: headerMenuOptions.unstable_headerRightItems } : {}),
      headerLeft:
        navigation.getState().index === 0
          ? () =>
              React.createElement(
                TouchableOpacity,
                {
                  accessibilityRole: 'button',
                  accessibilityLabel: loc._.close,
                  style: styles.closeButton,
                  onPress: () => navigation.goBack(),
                  testID: 'NavigationCloseButton',
                },
                React.createElement(Image, { source: theme.closeImage }),
              )
          : options.headerLeft,
    };
  })(theme);

const AddWalletStack = () => {
  const theme = useTheme();
  return (
    <Stack.Navigator initialRouteName="AddWallet">
      <Stack.Screen name="AddWallet" component={AddComponent} options={createAddWalletOptions(theme)} />
      <Stack.Screen
        name="ImportCustomDerivationPath"
        component={ImportCustomDerivationPathComponent}
        options={navigationStyle({ statusBarStyle: 'light', title: loc.wallets.import_derivation_title })(theme)}
      />
      <Stack.Screen name="ImportWallet" component={ImportWalletComponent} options={createImportWalletOptions(theme)} />
      <Stack.Screen
        name="ImportSpeed"
        component={ImportSpeedComponent}
        options={navigationStyle({ statusBarStyle: 'light', title: loc.wallets.import_title })(theme)}
      />
      <Stack.Screen
        name="ImportWalletDiscovery"
        component={ImportWalletDiscoveryComponent}
        options={navigationStyle({
          title: loc.wallets.import_discovery_title,
        })(theme)}
      />
      <Stack.Screen
        name="PleaseBackup"
        component={PleaseBackupComponent}
        options={navigationStyle({
          gestureEnabled: false,
          headerBackVisible: false,
          title: loc.pleasebackup.title,
        })(theme)}
      />
      <Stack.Screen
        name="PleaseBackupLNDHub"
        component={PleaseBackupLNDHubComponent}
        options={navigationStyle({ gestureEnabled: false, headerBackVisible: false, title: loc.pleasebackup.title })(theme)}
      />
      <Stack.Screen
        name="ProvideEntropy"
        component={ProvideEntropyComponent}
        options={navigationStyle({ title: loc.entropy.title, headerStyle: { backgroundColor: theme.colors.background } })(theme)}
      />
      <Stack.Screen
        name="WalletsAddMultisig"
        component={WalletsAddMultisigComponent}
        options={navigationStyle({ title: '' })(theme)}
        initialParams={{ walletLabel: loc.multisig.default_label }}
      />
      <Stack.Screen
        name="MultisigAdvanced"
        component={MultisigAdvancedComponent}
        options={navigationStyle(
          {
            title: loc.multisig.vault_advanced_customize,
            presentation: 'formSheet',
            sheetAllowedDetents: multisigSheetAllowedDetents,
            sheetGrabberVisible: true,
            headerShown: true,
            headerTitle: loc.multisig.vault_advanced_customize,
          },
          withRouteParamHeaderOptions({ headerRight: true }),
        )(theme)}
      />
      <Stack.Screen
        name="WalletsAddMultisigStep2"
        component={WalletsAddMultisigStep2Component}
        options={navigationStyle({ title: '', gestureEnabled: false }, withRouteParamHeaderOptions({ headerRight: true }))(theme)}
      />
      <Stack.Screen
        name="WalletsAddMultisigVaultKeySheet"
        component={WalletsAddMultisigVaultKeySheetComponent}
        options={navigationStyle({
          presentation: 'formSheet',
          sheetAllowedDetents: multisigSheetAllowedDetents,
          sheetGrabberVisible: true,
          headerShown: true,
          headerTitle: '',
          closeButtonPosition: CloseButtonPosition.Right,
        })(theme)}
      />
      <Stack.Screen
        name="WalletsAddMultisigProvideMnemonicsSheet"
        component={WalletsAddMultisigProvideMnemonicsSheetComponent}
        options={navigationStyle({
          presentation: 'formSheet',
          sheetAllowedDetents: multisigSheetAllowedDetents,
          sheetGrabberVisible: true,
          headerShown: true,
          headerTitle: '',
          closeButtonPosition: CloseButtonPosition.Right,
        })(theme)}
      />
      <Stack.Screen
        name="WalletsAddMultisigCosignerXpubSheet"
        component={WalletsAddMultisigCosignerXpubSheetComponent}
        options={navigationStyle({
          presentation: 'formSheet',
          sheetAllowedDetents: multisigSheetAllowedDetents,
          sheetGrabberVisible: true,
          headerShown: true,
          headerTitle: '',
          closeButtonPosition: CloseButtonPosition.Right,
        })(theme)}
      />
      <Stack.Screen
        name="WalletsAddMultisigHelp"
        component={WalletsAddMultisigHelpComponent}
        options={navigationStyle({
          title: '',
          gestureEnabled: false,
          headerStyle: {
            backgroundColor: '#0070FF',
          },
          headerTintColor: '#FFFFFF',
          headerBackTitle: undefined,
          statusBarStyle: 'light',
          headerShadowVisible: false,
        })(theme)}
      />
      <Stack.Screen
        name="ScanQRCode"
        component={ScanQRCodeComponent}
        options={navigationStyle({
          statusBarHidden: true,
          presentation: 'fullScreenModal',
          headerTransparent: true,
          headerBlurEffect: 'dark',
          headerShadowVisible: false,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default AddWalletStack;
