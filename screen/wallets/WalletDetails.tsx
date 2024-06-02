import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { writeFileAndExport } from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import Notifications from '../../blue_modules/notifications';
import { BlueCard, BlueLoading, BlueSpacing10, BlueSpacing20, BlueText } from '../../BlueComponents';
import {
  HDAezeedWallet,
  HDSegwitBech32Wallet,
  LegacyWallet,
  LightningLdkWallet,
  MultisigHDWallet,
  SegwitBech32Wallet,
  SegwitP2SHWallet,
  WatchOnlyWallet,
} from '../../class';
import { AbstractHDElectrumWallet } from '../../class/wallets/abstract-hd-electrum-wallet';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import HeaderRightButton from '../../components/HeaderRightButton';
import ListItem from '../../components/ListItem';
import SaveFileButton from '../../components/SaveFileButton';
import { SecondButton } from '../../components/SecondButton';
import { useTheme } from '../../components/themes';
import prompt from '../../helpers/prompt';
import { useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { TWallet } from '../../class/wallets/types';
import { popToTop } from '../../NavigationService';

enum ActionType {
  SetLoading = 'SET_LOADING',
  SetBackdoorPressed = 'SET_BACKDOOR_PRESSED',
  SetWalletName = 'SET_WALLET_NAME',
  SetUseWithHardwareWallet = 'SET_USE_WITH_HARDWARE_WALLET',
  SetIsBIP47Enabled = 'SET_IS_BIP47_ENABLED',
  SetHideTransactionsInWalletsList = 'SET_HIDE_TRANSACTIONS_IN_WALLETS_LIST',
  SetMasterFingerprint = 'SET_MASTER_FINGERPRINT',
  SetLightningWalletInfo = 'SET_LIGHTNING_WALLET_INFO',
  SetIsToolTipMenuVisible = 'SET_IS_TOOL_TIP_MENU_VISIBLE',
}

interface State {
  isLoading: boolean;
  backdoorPressed: number;
  walletName: string;
  useWithHardwareWallet: boolean;
  isBIP47Enabled: boolean;
  hideTransactionsInWalletsList: boolean;
  masterFingerprint?: string;
  lightningWalletInfo: Record<string, any>;
  isToolTipMenuVisible: boolean;
}

interface Action {
  type: ActionType;
  payload?: any;
}

const initialState: State = {
  isLoading: false,
  backdoorPressed: 0,
  walletName: '',
  useWithHardwareWallet: false,
  isBIP47Enabled: false,
  hideTransactionsInWalletsList: false,
  masterFingerprint: undefined,
  lightningWalletInfo: {},
  isToolTipMenuVisible: false,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.SetLoading:
      return { ...state, isLoading: action.payload };
    case ActionType.SetBackdoorPressed:
      return { ...state, backdoorPressed: action.payload };
    case ActionType.SetWalletName:
      return { ...state, walletName: action.payload };
    case ActionType.SetUseWithHardwareWallet:
      return { ...state, useWithHardwareWallet: action.payload };
    case ActionType.SetIsBIP47Enabled:
      return { ...state, isBIP47Enabled: action.payload };
    case ActionType.SetHideTransactionsInWalletsList:
      return { ...state, hideTransactionsInWalletsList: action.payload };
    case ActionType.SetMasterFingerprint:
      return { ...state, masterFingerprint: action.payload };
    case ActionType.SetLightningWalletInfo:
      return { ...state, lightningWalletInfo: action.payload };
    case ActionType.SetIsToolTipMenuVisible:
      return { ...state, isToolTipMenuVisible: action.payload };
    default:
      return state;
  }
};

enum WalletType {
  LegacyWallet = 'legacy',
  SegwitBech32Wallet = 'segwitBech32',
  SegwitP2SHWallet = 'segwitP2SH',
  WatchOnlyWallet = 'watchOnly',
  HDSegwitBech32Wallet = 'hdSegwitBech32',
  MultisigHDWallet = 'multisigHD',
  LightningLdkWallet = 'lightningLdk',
  HDAezeedWallet = 'hdAezeed',
  LightningCustodianWallet = 'lightningCustodian',
}

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
  },
  address: {
    alignItems: 'center',
    flex: 1,
  },
  textLabel1: {
    fontWeight: '500',
    fontSize: 14,
    marginVertical: 12,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  textLabel2: {
    fontWeight: '500',
    fontSize: 14,
    marginVertical: 16,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  textValue: {
    fontWeight: '500',
    fontSize: 14,
  },
  input: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 4,
  },
  inputText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    color: '#81868e',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  hardware: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  delete: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  marginRight16: {
    marginRight: 16,
  },
});

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'WalletDetails'>;
type RouteProps = RouteProp<DetailViewStackParamList, 'WalletDetails'>;

const WalletDetails: React.FC = () => {
  const { saveToDisk, wallets, deleteWallet, setSelectedWalletID, txMetadata } = useStorage();
  const { isBiometricUseCapableAndEnabled, unlockWithBiometrics } = useBiometrics();
  const { walletID } = useRoute<RouteProps>().params;
  const { isAdvancedModeEnabled } = useSettings();
  const { goBack, setOptions, navigate } = useExtendedNavigation<NavigationProps>();
  const { colors } = useTheme();
  const wallet = useRef<TWallet>(wallets.find(w => w.getID() === walletID)).current;
  const [isToolTipMenuVisible, setIsToolTipMenuVisible] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    walletName: wallet.getLabel(),
    useWithHardwareWallet: wallet.useWithHardwareWalletEnabled(),
    isBIP47Enabled: wallet.isBIP47Enabled(),
    hideTransactionsInWalletsList: !wallet.getHideTransactionsInWalletsList(),
  });
  const stylesHook = StyleSheet.create({
    textLabel1: {
      color: colors.feeText,
    },
    textLabel2: {
      color: colors.feeText,
    },
    textValue: {
      color: colors.outputValue,
    },
    input: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,

      backgroundColor: colors.inputBackgroundColor,
    },
    delete: {
      color: isToolTipMenuVisible ? colors.buttonDisabledTextColor : '#d0021b',
    },
  });

  const onMenuWillShow = () => setIsToolTipMenuVisible(true);
  const onMenuWillHide = () => setIsToolTipMenuVisible(false);

  const walletTransactionsLength = useMemo(() => wallet.getTransactions().length, [wallet]);
  const derivationPath = useMemo(() => {
    try {
      const path = wallet.getDerivationPath();
      return path.length > 0 ? path : null;
    } catch (e) {
      return null;
    }
  }, [wallet]);

  useEffect(() => {
    if (isAdvancedModeEnabled && wallet.allowMasterFingerprint()) {
      InteractionManager.runAfterInteractions(() => {
        dispatch({ type: ActionType.SetMasterFingerprint, payload: wallet.getMasterFingerprintHex() });
      });
    }
  }, [isAdvancedModeEnabled, wallet]);

  useEffect(() => {
    if (wallet.type === WalletType.LightningLdkWallet) {
      wallet.getInfo().then(info => dispatch({ type: ActionType.SetLightningWalletInfo, payload: info }));
    }
  }, [wallet]);

  useEffect(() => {
    if (wallets.some(w => w.getID() === walletID)) {
      setSelectedWalletID(walletID);
    }
  }, [walletID, wallets, setSelectedWalletID]);

  const handleSave = useCallback(() => {
    dispatch({ type: ActionType.SetLoading, payload: true });
    if (state.walletName.trim().length > 0) {
      wallet.setLabel(state.walletName.trim());
      if (wallet.type === WalletType.WatchOnlyWallet && wallet.isHd()) {
        wallet.setUseWithHardwareWalletEnabled(state.useWithHardwareWallet);
      }
      wallet.setHideTransactionsInWalletsList(!state.hideTransactionsInWalletsList);
      if (wallet.allowBIP47()) {
        wallet.switchBIP47(state.isBIP47Enabled);
      }
    }
    saveToDisk()
      .then(() => {
        presentAlert({ message: loc.wallets.details_wallet_updated });
        goBack();
      })
      .catch(error => {
        console.log(error.message);
        dispatch({ type: ActionType.SetLoading, payload: false });
      });
  }, [state, wallet, saveToDisk, goBack]);

  const SaveButton = useMemo(
    () => <HeaderRightButton title={loc.wallets.details_save} onPress={handleSave} disabled={state.isLoading} testID="Save" />,
    [state.isLoading, handleSave],
  );

  useEffect(() => {
    setOptions({
      headerRight: () => SaveButton,
    });
  }, [SaveButton, setOptions]);

  const navigateToOverviewAndDeleteWallet = () => {
    dispatch({ type: ActionType.SetLoading, payload: true });
    let externalAddresses: string[] = [];
    try {
      externalAddresses = wallet.getAllExternalAddresses();
    } catch (_) {}
    // @ts-ignore: fix later
    Notifications.unsubscribe(externalAddresses, [], []);
    popToTop();
    deleteWallet(wallet);
    saveToDisk(true);
    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
  };

  const presentWalletHasBalanceAlert = useCallback(async () => {
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    try {
      const walletBalanceConfirmation = await prompt(
        loc.wallets.details_delete_wallet,
        loc.formatString(loc.wallets.details_del_wb_q, { balance: wallet.getBalance() }),
        true,
        'plain-text',
        true,
        loc.wallets.details_delete,
      );
      if (Number(walletBalanceConfirmation) === wallet.getBalance()) {
        navigateToOverviewAndDeleteWallet();
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        dispatch({ type: ActionType.SetLoading, payload: false });
        presentAlert({ message: loc.wallets.details_del_wb_err });
      }
    } catch (_) {}
  }, [wallet]);

  const navigateToWalletExport = () => {
    navigate('WalletExportRoot', {
      screen: 'WalletExport',
      params: {
        walletID: wallet.getID(),
      },
    });
  };

  const navigateToMultisigCoordinationSetup = () => {
    navigate('ExportMultisigCoordinationSetupRoot', {
      screen: 'ExportMultisigCoordinationSetup',
      params: {
        walletID: wallet.getID(),
      },
    });
  };

  const navigateToViewEditCosigners = () => {
    navigate('ViewEditMultisigCosignersRoot', {
      screen: 'ViewEditMultisigCosigners',
      params: {
        walletID,
      },
    });
  };

  const navigateToXPub = () =>
    navigate('WalletXpubRoot', {
      screen: 'WalletXpub',
      params: {
        walletID,
      },
    });

  const navigateToSignVerify = () =>
    navigate('SignVerifyRoot', {
      screen: 'SignVerify',
      params: {
        walletID: wallet.getID(),
        address: wallet.getAllExternalAddresses()[0],
      },
    });

  const navigateToLdkViewLogs = () => {
    navigate('LdkViewLogs', {
      walletID,
    });
  };

  const navigateToAddresses = () =>
    navigate('WalletAddresses', {
      walletID: wallet.getID(),
    });

  const exportInternals = async () => {
    if (state.backdoorPressed < 10) return dispatch({ type: ActionType.SetBackdoorPressed, payload: state.backdoorPressed + 1 });
    dispatch({ type: ActionType.SetBackdoorPressed, payload: 0 });
    if (wallet.type !== WalletType.HDSegwitBech32Wallet) return;
    const fileName = 'wallet-externals.json';
    const contents = JSON.stringify(
      {
        _balances_by_external_index: wallet._balances_by_external_index,
        _balances_by_internal_index: wallet._balances_by_internal_index,
        _txs_by_external_index: wallet._txs_by_external_index,
        _txs_by_internal_index: wallet._txs_by_internal_index,
        _utxo: wallet._utxo,
        next_free_address_index: wallet.next_free_address_index,
        next_free_change_address_index: wallet.next_free_change_address_index,
        internal_addresses_cache: wallet.internal_addresses_cache,
        external_addresses_cache: wallet.external_addresses_cache,
        _xpub: wallet._xpub,
        gap_limit: wallet.gap_limit,
        label: wallet.label,
        _lastTxFetch: wallet._lastTxFetch,
        _lastBalanceFetch: wallet._lastBalanceFetch,
      },
      null,
      2,
    );

    await writeFileAndExport(fileName, contents, false);
  };

  const purgeTransactions = async () => {
    if (state.backdoorPressed < 10) return dispatch({ type: ActionType.SetBackdoorPressed, payload: state.backdoorPressed + 1 });
    dispatch({ type: ActionType.SetBackdoorPressed, payload: 0 });
    const msg = 'Transactions purged. Pls go to main screen and back to rerender screen';

    if (wallet.type === WalletType.HDSegwitBech32Wallet) {
      wallet._txs_by_external_index = {};
      wallet._txs_by_internal_index = {};
      presentAlert({ message: msg });
    }

    if (wallet._hdWalletInstance) {
      wallet._hdWalletInstance._txs_by_external_index = {};
      wallet._hdWalletInstance._txs_by_internal_index = {};
      presentAlert({ message: msg });
    }
  };

  const walletNameTextInputOnBlur = () => {
    if (state.walletName.trim().length === 0) {
      const walletLabel = wallet.getLabel();
      dispatch({ type: ActionType.SetWalletName, payload: walletLabel });
    }
  };

  const exportHistoryContent = useCallback(() => {
    const headers = [loc.transactions.date, loc.transactions.txid, `${loc.send.create_amount} (${BitcoinUnit.BTC})`, loc.send.create_memo];
    if (wallet.chain === Chain.OFFCHAIN) {
      headers.push(loc.lnd.payment);
    }

    const rows = [headers.join(',')];
    const transactions = wallet.getTransactions();

    transactions.forEach(transaction => {
      const value = formatBalanceWithoutSuffix(transaction.value, BitcoinUnit.BTC, true);
      let hash = transaction.hash;
      let memo = txMetadata[transaction.hash]?.memo?.trim() ?? '';
      let status;

      if (wallet.chain === Chain.OFFCHAIN) {
        hash = transaction.payment_hash;
        memo = transaction.description;
        status = transaction.ispaid ? loc._.success : loc.lnd.expired;
        if (hash?.type === 'Buffer' && hash?.data) {
          hash = Buffer.from(hash.data).toString('hex');
        }
      }

      const data = [new Date(transaction.received).toString(), hash, value, memo];

      if (wallet.chain === Chain.OFFCHAIN) {
        data.push(status);
      }

      rows.push(data.join(','));
    });

    return rows.join('\n');
  }, [wallet, txMetadata]);

  const handleDeleteButtonTapped = () => {
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    Alert.alert(
      loc.wallets.details_delete_wallet,
      loc.wallets.details_are_you_sure,
      [
        {
          text: loc.wallets.details_yes_delete,
          onPress: async () => {
            const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();

            if (isBiometricsEnabled) {
              if (!(await unlockWithBiometrics())) {
                return;
              }
            }
            if (wallet.getBalance() > 0 && wallet.allowSend()) {
              presentWalletHasBalanceAlert();
            } else {
              navigateToOverviewAndDeleteWallet();
            }
          },
          style: 'destructive',
        },
        { text: loc.wallets.details_no_cancel, onPress: () => {}, style: 'cancel' },
      ],
      { cancelable: false },
    );
  };

  const fileName = useMemo(() => {
    const label = wallet.getLabel().replace(' ', '-');
    return `${label}-history.csv`;
  }, [wallet]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      centerContent={state.isLoading}
      contentContainerStyle={styles.scrollViewContent}
      testID="WalletDetailsScroll"
    >
      {state.isLoading ? (
        <BlueLoading />
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>
            <BlueCard style={styles.address}>
              {(() => {
                if (
                  [WalletType.LegacyWallet, WalletType.SegwitBech32Wallet, WalletType.SegwitP2SHWallet].includes(wallet.type) ||
                  (wallet.type === WalletType.WatchOnlyWallet && !wallet.isHd())
                ) {
                  return (
                    <>
                      <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.details_address.toLowerCase()}</Text>
                      <Text style={[styles.textValue, stylesHook.textValue]}>
                        {(() => {
                          try {
                            return wallet.getAddress();
                          } catch (error) {
                            return error.message;
                          }
                        })()}
                      </Text>
                    </>
                  );
                }
              })()}
              <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.add_wallet_name.toLowerCase()}</Text>
              <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
                <View style={[styles.input, stylesHook.input]}>
                  <TextInput
                    value={state.walletName}
                    onChangeText={text => dispatch({ type: ActionType.SetWalletName, payload: text })}
                    onBlur={walletNameTextInputOnBlur}
                    numberOfLines={1}
                    placeholderTextColor="#81868e"
                    style={styles.inputText}
                    editable={!state.isLoading}
                    underlineColorAndroid="transparent"
                    testID="WalletNameInput"
                  />
                </View>
              </KeyboardAvoidingView>
              <BlueSpacing20 />
              <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.details_type.toLowerCase()}</Text>
              <Text style={[styles.textValue, stylesHook.textValue]}>{wallet.typeReadable}</Text>

              {wallet.type === WalletType.LightningLdkWallet && (
                <>
                  <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.identity_pubkey}</Text>
                  {state.lightningWalletInfo?.identityPubkey ? (
                    <>
                      <BlueText>{state.lightningWalletInfo.identityPubkey}</BlueText>
                    </>
                  ) : (
                    <ActivityIndicator />
                  )}
                </>
              )}
              {wallet.type === WalletType.MultisigHDWallet && (
                <>
                  <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_multisig_type}</Text>
                  <BlueText>
                    {`${wallet.getM()} / ${wallet.getN()} (${
                      wallet.isNativeSegwit() ? 'native segwit' : wallet.isWrappedSegwit() ? 'wrapped segwit' : 'legacy'
                    })`}
                  </BlueText>
                </>
              )}
              {wallet.type === WalletType.MultisigHDWallet && (
                <>
                  <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.multisig.how_many_signatures_can_bluewallet_make}</Text>
                  <BlueText>{wallet.howManySignaturesCanWeMake()}</BlueText>
                </>
              )}

              {wallet.type === WalletType.LightningCustodianWallet && (
                <>
                  <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.details_connected_to.toLowerCase()}</Text>
                  <BlueText>{wallet.getBaseURI()}</BlueText>
                </>
              )}

              {wallet.type === WalletType.HDAezeedWallet && (
                <>
                  <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.identity_pubkey.toLowerCase()}</Text>
                  <BlueText>{wallet.getIdentityPubkey()}</BlueText>
                </>
              )}
              <BlueSpacing20 />
              <>
                <Text onPress={exportInternals} style={[styles.textLabel2, stylesHook.textLabel2]}>
                  {loc.transactions.list_title.toLowerCase()}
                </Text>
                <View style={styles.hardware}>
                  <BlueText onPress={() => dispatch({ type: ActionType.SetBackdoorPressed, payload: state.backdoorBip47Pressed + 1 })}>
                    {loc.wallets.details_display}
                  </BlueText>
                  <Switch
                    disabled={state.isToolTipMenuVisible}
                    value={state.hideTransactionsInWalletsList}
                    onValueChange={value => dispatch({ type: ActionType.SetHideTransactionsInWalletsList, payload: value })}
                  />
                </View>
              </>
              <>
                <Text onPress={purgeTransactions} style={[styles.textLabel2, stylesHook.textLabel2]}>
                  {loc.transactions.transactions_count.toLowerCase()}
                </Text>
                <BlueText>{wallet.getTransactions().length}</BlueText>
              </>

              {state.backdoorBip47Pressed >= 10 && wallet.allowBIP47() ? (
                <>
                  <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.bip47.payment_code}</Text>
                  <View style={styles.hardware}>
                    <BlueText>{loc.bip47.purpose}</BlueText>
                    <Switch
                      value={state.isBIP47Enabled}
                      onValueChange={value => dispatch({ type: ActionType.SetIsBIP47Enabled, payload: value })}
                    />
                  </View>
                </>
              ) : null}

              <View>
                {wallet.type === WalletType.WatchOnlyWallet && wallet.isHd() && (
                  <>
                    <BlueSpacing10 />
                    <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_advanced.toLowerCase()}</Text>
                    <View style={styles.hardware}>
                      <BlueText>{loc.wallets.details_use_with_hardware_wallet}</BlueText>
                      <Switch
                        value={state.useWithHardwareWallet}
                        onValueChange={value => dispatch({ type: ActionType.SetUseWithHardwareWallet, payload: value })}
                      />
                    </View>
                  </>
                )}
                {isAdvancedModeEnabled && (
                  <View style={styles.row}>
                    {wallet.allowMasterFingerprint() && (
                      <View style={styles.marginRight16}>
                        <Text style={[styles.textLabel2, stylesHook.textLabel2]}>
                          {loc.wallets.details_master_fingerprint.toLowerCase()}
                        </Text>
                        <BlueText>{state.masterFingerprint ?? <ActivityIndicator />}</BlueText>
                      </View>
                    )}

                    {derivationPath && (
                      <View>
                        <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_derivation_path}</Text>
                        <BlueText testID="DerivationPath">{derivationPath}</BlueText>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </BlueCard>
            {(wallet instanceof AbstractHDElectrumWallet || (wallet.type === WalletType.WatchOnlyWallet && wallet.isHd())) && (
              <ListItem
                disabled={state.isToolTipMenuVisible}
                onPress={navigateToAddresses}
                title={loc.wallets.details_show_addresses}
                chevron
              />
            )}
            <BlueCard style={styles.address}>
              <View>
                <BlueSpacing20 />
                <Button
                  disabled={state.isToolTipMenuVisible}
                  onPress={navigateToWalletExport}
                  testID="WalletExport"
                  title={loc.wallets.details_export_backup}
                />
                {walletTransactionsLength > 0 && (
                  <>
                    <BlueSpacing20 />
                    <SaveFileButton
                      onMenuWillHide={() => dispatch({ type: ActionType.SetIsToolTipMenuVisible, payload: false })}
                      onMenuWillShow={() => dispatch({ type: ActionType.SetIsToolTipMenuVisible, payload: true })}
                      fileName={fileName}
                      fileContent={exportHistoryContent()}
                    >
                      <SecondButton title={loc.wallets.details_export_history} />
                    </SaveFileButton>
                  </>
                )}
                {wallet.type === WalletType.MultisigHDWallet && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton
                      disabled={state.isToolTipMenuVisible}
                      onPress={navigateToMultisigCoordinationSetup}
                      testID="MultisigCoordinationSetup"
                      title={loc.multisig.export_coordination_setup.replace(/^\w/, c => c.toUpperCase())}
                    />
                  </>
                )}

                {wallet.type === WalletType.MultisigHDWallet && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton
                      disabled={state.isToolTipMenuVisible}
                      onPress={navigateToViewEditCosigners}
                      testID="ViewEditCosigners"
                      title={loc.multisig.view_edit_cosigners}
                    />
                  </>
                )}

                {wallet.allowXpub() && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton
                      disabled={state.isToolTipMenuVisible}
                      onPress={navigateToXPub}
                      testID="XPub"
                      title={loc.wallets.details_show_xpub}
                    />
                  </>
                )}
                {wallet.allowSignVerifyMessage() && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton
                      disabled={state.isToolTipMenuVisible}
                      onPress={navigateToSignVerify}
                      testID="SignVerify"
                      title={loc.addresses.sign_title}
                    />
                  </>
                )}
                {wallet.type === WalletType.LightningLdkWallet && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton
                      disabled={state.isToolTipMenuVisible}
                      onPress={navigateToLdkViewLogs}
                      testID="LdkLogs"
                      title={loc.lnd.view_logs}
                    />
                  </>
                )}
                <BlueSpacing20 />
                <BlueSpacing20 />
                <TouchableOpacity
                  disabled={state.isToolTipMenuVisible}
                  accessibilityRole="button"
                  onPress={handleDeleteButtonTapped}
                  testID="DeleteButton"
                >
                  <Text
                    textBreakStrategy="simple"
                    style={[styles.delete, stylesHook.delete]}
                  >{`${loc.wallets.details_delete}${'  '}`}</Text>
                </TouchableOpacity>
                <BlueSpacing20 />
                <BlueSpacing20 />
              </View>
            </BlueCard>
          </View>
        </TouchableWithoutFeedback>
      )}
    </ScrollView>
  );
};

export default WalletDetails;
