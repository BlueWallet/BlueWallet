/* global alert */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Switch,
  Platform,
  Linking,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SecondButton, SafeBlueArea, BlueCard, BlueSpacing20, BlueNavigationStyle, BlueText, BlueLoadingHook } from '../../BlueComponents';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { HDLegacyBreadwalletWallet } from '../../class/wallets/hd-legacy-breadwallet-wallet';
import { HDLegacyP2PKHWallet } from '../../class/wallets/hd-legacy-p2pkh-wallet';
import { HDSegwitP2SHWallet } from '../../class/wallets/hd-segwit-p2sh-wallet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
import { HDSegwitBech32Wallet, SegwitP2SHWallet, LegacyWallet, SegwitBech32Wallet, WatchOnlyWallet } from '../../class';
import { ScrollView } from 'react-native-gesture-handler';
import loc from '../../loc';
import { useTheme, useRoute, useNavigation } from '@react-navigation/native';
const EV = require('../../blue_modules/events');
const prompt = require('../../blue_modules/prompt');
const BlueApp = require('../../BlueApp');
const notifications = require('../../blue_modules/notifications');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  save: {
    marginHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  address: {
    alignItems: 'center',
    flex: 1,
  },
  textLabel1: {
    fontWeight: '500',
    fontSize: 14,
    marginVertical: 12,
  },
  textLabel2: {
    fontWeight: '500',
    fontSize: 14,
    marginVertical: 16,
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
  },
  hardware: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
  },
  delete: {
    color: '#d0021b',
    fontSize: 15,
    fontWeight: '500',
  },
});

const WalletDetails = () => {
  const { wallet } = useRoute().params;
  const [isLoading, setIsLoading] = useState(true);
  const [walletName, setWalletName] = useState(wallet.getLabel());
  const [useWithHardwareWallet, setUseWithHardwareWallet] = useState(wallet.useWithHardwareWalletEnabled());
  const [hideTransactionsInWalletsList, setHideTransactionsInWalletsList] = useState(!wallet.getHideTransactionsInWalletsList());
  const { setParams, goBack, navigate, popToTop } = useNavigation();
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    textLabel1: {
      color: colors.feeText,
    },
    textLabel2: {
      color: colors.feeText,
    },
    saveText: {
      color: colors.outputValue,
    },
    textValue: {
      color: colors.outputValue,
    },
    input: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,

      backgroundColor: colors.inputBackgroundColor,
    },
  });

  const setLabel = useCallback(async () => {
    setParams({ isLoading: true });
    setIsLoading(true);
    if (walletName.trim().length > 0) {
      wallet.setLabel(walletName);
      if (wallet.type === WatchOnlyWallet.type && wallet.getSecret().startsWith('zpub')) {
        wallet.setUseWithHardwareWalletEnabled(useWithHardwareWallet);
      }
      wallet.setHideTransactionsInWalletsList(!hideTransactionsInWalletsList);
    }
    setParams({ wallet });
    await BlueApp.saveToDisk();
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
    alert(loc.wallets.details_wallet_updated);
    goBack();
  }, [goBack, hideTransactionsInWalletsList, setParams, useWithHardwareWallet, wallet, walletName]);

  useEffect(() => {
    setParams({ isLoading, saveAction: setLabel, saveTextStyle: stylesHook.saveText });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, colors.outputValue, setLabel]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const presentWalletHasBalanceAlert = useCallback(async () => {
    ReactNativeHapticFeedback.trigger('notificationWarning', { ignoreAndroidSystemSettings: false });
    const walletBalanceConfirmation = await prompt(
      loc.wallets.details_del_wb,
      loc.formatString(loc.wallets.details_del_wb_q, { balance: wallet.getBalance() }),
      true,
      'plain-text',
    );
    if (Number(walletBalanceConfirmation) === wallet.getBalance()) {
      setParams({ isLoading: true });
      setIsLoading(true);
      notifications.unsubscribe(wallet.getAllExternalAddresses(), [], []);
      BlueApp.deleteWallet(wallet);
      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
      await BlueApp.saveToDisk();
      EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
      EV(EV.enum.WALLETS_COUNT_CHANGED);
      popToTop();
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      setIsLoading(false);
      alert(loc.wallets.details_del_wb_err);
    }
  }, [popToTop, setParams, wallet]);

  const navigateToWalletExport = () => {
    navigate('WalletExport', {
      wallet,
    });
  };
  const navigateToXPub = () =>
    navigate('WalletXpub', {
      secret: wallet.getSecret(),
    });

  const renderMarketplaceButton = () => {
    return Platform.select({
      android: (
        <SecondButton
          onPress={() =>
            navigate('Marketplace', {
              fromWallet: wallet,
            })
          }
          title={loc.wallets.details_marketplace}
        />
      ),
      ios: (
        <SecondButton
          onPress={async () => {
            Linking.openURL('https://bluewallet.io/marketplace-btc/');
          }}
          title={loc.wallets.details_marketplace}
        />
      ),
    });
  };

  const navigateToBroadcast = () => {
    navigate('Broadcast');
  };

  const walletNameTextInputOnBlur = () => {
    if (walletName.trim().length === 0) {
      const walletLabel = wallet.getLabel();
      setWalletName(walletLabel);
    }
  };

  const handleDeleteButtonTapped = () => {
    ReactNativeHapticFeedback.trigger('notificationWarning', { ignoreAndroidSystemSettings: false });
    Alert.alert(
      loc.wallets.details_delete_wallet,
      loc.wallets.details_are_you_sure,
      [
        {
          text: loc.wallets.details_yes_delete,
          onPress: async () => {
            const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

            if (isBiometricsEnabled) {
              if (!(await Biometric.unlockWithBiometrics())) {
                return;
              }
            }
            if (wallet.getBalance() > 0 && wallet.allowSend()) {
              presentWalletHasBalanceAlert();
            } else {
              setParams({ isLoading: true });
              setIsLoading(true);
              notifications.unsubscribe(wallet.getAllExternalAddresses(), [], []);
              BlueApp.deleteWallet(wallet);
              ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
              await BlueApp.saveToDisk();
              EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
              EV(EV.enum.WALLETS_COUNT_CHANGED);
              popToTop();
            }
          },
          style: 'destructive',
        },
        { text: loc.wallets.details_no_cancel, onPress: () => {}, style: 'cancel' },
      ],
      { cancelable: false },
    );
  };

  return isLoading ? (
    <View style={styles.root}>
      <BlueLoadingHook />
    </View>
  ) : (
    <SafeBlueArea style={styles.root}>
      <StatusBar barStyle="default" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <BlueCard style={styles.address}>
            {(() => {
              if (
                [LegacyWallet.type, SegwitBech32Wallet.type, SegwitP2SHWallet.type].includes(wallet.type) ||
                (wallet.type === WatchOnlyWallet.type && !wallet.isHd())
              ) {
                return (
                  <>
                    <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.details_address.toLowerCase()}</Text>
                    <Text style={[styles.textValue, stylesHook.textValue]}>{wallet.getAddress()}</Text>
                  </>
                );
              }
            })()}
            <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.add_wallet_name.toLowerCase()}</Text>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
              <View style={[styles.input, stylesHook.input]}>
                <TextInput
                  placeholder={loc.send.details_note_placeholder}
                  value={walletName}
                  onChangeText={setWalletName}
                  onBlur={walletNameTextInputOnBlur}
                  numberOfLines={1}
                  placeholderTextColor="#81868e"
                  style={styles.inputText}
                  editable={!isLoading}
                  underlineColorAndroid="transparent"
                />
              </View>
            </KeyboardAvoidingView>
            <BlueSpacing20 />
            <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.details_type.toLowerCase()}</Text>
            <Text style={[styles.textValue, stylesHook.textValue]}>{wallet.typeReadable}</Text>
            {wallet.type === LightningCustodianWallet.type && (
              <>
                <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.details_connected_to.toLowerCase()}</Text>
                <BlueText>{wallet.getBaseURI()}</BlueText>
              </>
            )}
            <>
              <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.transactions.list_title.toLowerCase()}</Text>
              <View style={styles.hardware}>
                <BlueText>{loc.wallets.details_display}</BlueText>
                <Switch value={hideTransactionsInWalletsList} onValueChange={setHideTransactionsInWalletsList} />
              </View>
            </>
            <>
              <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.transactions.transactions_count.toLowerCase()}</Text>
              <BlueText>{wallet.getTransactions().length}</BlueText>
            </>
            <View>
              {wallet.type === WatchOnlyWallet.type && wallet.getSecret().startsWith('zpub') && (
                <>
                  <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_advanced.toLowerCase()}</Text>
                  <View style={styles.hardware}>
                    <BlueText>{loc.wallets.details_use_with_hardware_wallet}</BlueText>
                    <Switch value={useWithHardwareWallet} onValueChange={setUseWithHardwareWallet} />
                  </View>
                  <>
                    <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.details_master_fingerprint.toLowerCase()}</Text>
                    <Text style={[styles.textValue, stylesHook.textValue]}>{wallet.getMasterFingerprintHex()}</Text>
                  </>
                  <BlueSpacing20 />
                </>
              )}
              <BlueSpacing20 />

              <SecondButton onPress={navigateToWalletExport} title={loc.wallets.details_export_backup} />

              <BlueSpacing20 />

              {(wallet.type === HDLegacyBreadwalletWallet.type ||
                wallet.type === HDLegacyP2PKHWallet.type ||
                wallet.type === HDSegwitBech32Wallet.type ||
                wallet.type === HDSegwitP2SHWallet.type) && (
                <>
                  <SecondButton onPress={navigateToXPub} title={loc.wallets.details_show_xpub} />

                  <BlueSpacing20 />
                  {renderMarketplaceButton()}
                </>
              )}
              {wallet.type !== LightningCustodianWallet.type && (
                <>
                  <BlueSpacing20 />
                  <SecondButton onPress={navigateToBroadcast} title={loc.settings.network_broadcast} />
                </>
              )}
              <BlueSpacing20 />
              <BlueSpacing20 />
              <TouchableOpacity style={styles.center} onPress={handleDeleteButtonTapped}>
                <Text style={styles.delete}>{loc.wallets.details_delete}</Text>
              </TouchableOpacity>
            </View>
          </BlueCard>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeBlueArea>
  );
};

WalletDetails.navigationOptions = ({ route }) => ({
  ...BlueNavigationStyle(),
  headerTitle: loc.wallets.details_title,
  headerRight: () => (
    <TouchableOpacity
      disabled={route.params.isLoading === true}
      style={styles.save}
      onPress={() => {
        if (route.params.saveAction) {
          route.params.saveAction();
        }
      }}
    >
      <Text style={route.params.saveTextStyle}>{loc.wallets.details_save}</Text>
    </TouchableOpacity>
  ),
});

export default WalletDetails;
