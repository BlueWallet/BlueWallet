/* global alert */
import React, { useContext, useEffect, useState } from 'react';
import {
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  View,
  TouchableOpacity,
  StatusBar,
  Keyboard,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueDismissKeyboardInputAccessory,
  BlueNavigationStyle,
  BlueAddressInput,
  BlueBitcoinAmount,
  BlueLoading,
} from '../../BlueComponents';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import Lnurl from '../../class/lnurl';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { Icon } from 'react-native-elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
const currency = require('../../blue_modules/currency');

const ScanLndInvoice = () => {
  const { wallets, fetchAndSaveWalletTransactions } = useContext(BlueStorageContext);
  const { colors } = useTheme();
  const { walletID, uri, invoice } = useRoute().params;
  const name = useRoute().name;
  /** @type {LightningCustodianWallet} */
  const wallet = wallets.find(item => item.getID() === walletID) || wallets.find(item => item.type === LightningCustodianWallet.type);
  const { navigate, dangerouslyGetParent, setParams, pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [renderWalletSelectionButtonHidden, setRenderWalletSelectionButtonHidden] = useState(false);
  const [destination, setDestination] = useState('');
  const [unit, setUnit] = useState(wallet.getPreferredBalanceUnit());
  const [decoded, setDecoded] = useState();
  const [amount, setAmount] = useState();
  const [isAmountInitiallyEmpty, setIsAmountInitiallyEmpty] = useState();
  const [expiresIn, setExpiresIn] = useState();
  const stylesHook = StyleSheet.create({
    walletWrapLabel: {
      color: colors.buttonAlternativeTextColor,
    },
    walletWrapBalance: {
      color: colors.buttonAlternativeTextColor,
    },
    walletWrapSats: {
      color: colors.buttonAlternativeTextColor,
    },
    root: {
      backgroundColor: colors.elevated,
    },
  });

  useEffect(() => {
    console.log('scanLndInvoice useEffect');
    Keyboard.addListener('keyboardDidShow', _keyboardDidShow);
    Keyboard.addListener('keyboardDidHide', _keyboardDidHide);

    if (!wallets.some(item => item.type === LightningCustodianWallet.type)) {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      alert(loc.wallets.no_ln_wallet_error);
      dangerouslyGetParent().pop();
    }
    return () => {
      Keyboard.removeListener('keyboardDidShow', _keyboardDidShow);
      Keyboard.removeListener('keyboardDidHide', _keyboardDidHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (uri) {
      let data = uri;
      // handling BIP21 w/BOLT11 support
      const ind = data.indexOf('lightning=');
      if (ind !== -1) {
        data = data.substring(ind + 10).split('&')[0];
      }

      data = data.replace('LIGHTNING:', '').replace('lightning:', '');
      console.log(data);

      /**
       * @type {LightningCustodianWallet}
       */
      let decoded;
      try {
        decoded = wallet.decodeInvoice(data);

        let expiresIn = (decoded.timestamp * 1 + decoded.expiry * 1) * 1000; // ms
        if (+new Date() > expiresIn) {
          expiresIn = loc.lnd.expiredLow;
        } else {
          expiresIn = Math.round((expiresIn - +new Date()) / (60 * 1000)) + ' min';
        }
        Keyboard.dismiss();
        setParams({ uri: undefined, invoice: data });
        setIsAmountInitiallyEmpty(decoded.num_satoshis === '0');
        setDestination(data);
        setIsLoading(false);
        setAmount(decoded.num_satoshis);
        setExpiresIn(expiresIn);
        setDecoded(decoded);
      } catch (Err) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        Keyboard.dismiss();
        setParams({ uri: undefined });
        setTimeout(() => alert(Err.message), 10);
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  const _keyboardDidShow = () => {
    setRenderWalletSelectionButtonHidden(true);
  };

  const _keyboardDidHide = () => {
    setRenderWalletSelectionButtonHidden(false);
  };

  const processInvoice = data => {
    if (Lnurl.isLnurl(data)) return processLnurlPay(data);
    setParams({ uri: data });
  };

  const processLnurlPay = data => {
    navigate('ScanLndInvoiceRoot', {
      screen: 'LnurlPay',
      params: {
        lnurl: data,
        fromWalletID: walletID,
      },
    });
  };

  const pay = async () => {
    if (!decoded) {
      return null;
    }

    const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled) {
      if (!(await Biometric.unlockWithBiometrics())) {
        return;
      }
    }

    let amountSats = amount;
    switch (unit) {
      case BitcoinUnit.SATS:
        amountSats = parseInt(amountSats); // nop
        break;
      case BitcoinUnit.BTC:
        amountSats = currency.btcToSatoshi(amountSats);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        amountSats = currency.btcToSatoshi(currency.fiatToBTC(amountSats));
        break;
    }
    setIsLoading(true);

    const expiresIn = (decoded.timestamp * 1 + decoded.expiry * 1) * 1000; // ms
    if (+new Date() > expiresIn) {
      setIsLoading(false);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      return alert(loc.lnd.errorInvoiceExpired);
    }

    const currentUserInvoices = wallet.user_invoices_raw; // not fetching invoices, as we assume they were loaded previously
    if (currentUserInvoices.some(invoice => invoice.payment_hash === decoded.payment_hash)) {
      setIsLoading(false);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      return alert(loc.lnd.sameWalletAsInvoiceError);
    }

    try {
      await wallet.payInvoice(invoice, amountSats);
    } catch (Err) {
      console.log(Err.message);
      setIsLoading(false);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      return alert(Err.message);
    }

    navigate('Success', {
      amount: amountSats,
      amountUnit: BitcoinUnit.SATS,
      invoiceDescription: decoded.description,
    });
    fetchAndSaveWalletTransactions(walletID);
  };

  const processTextForInvoice = text => {
    if (text.toLowerCase().startsWith('lnb') || text.toLowerCase().startsWith('lightning:lnb') || Lnurl.isLnurl(text)) {
      processInvoice(text);
    } else {
      setDecoded(undefined);
      setExpiresIn(undefined);
      setDestination(text);
    }
  };

  const shouldDisablePayButton = () => {
    if (!decoded) {
      return true;
    } else {
      if (!amount) {
        return true;
      }
    }
    return !(amount > 0);
    // return decoded.num_satoshis <= 0 || isLoading || isNaN(decoded.num_satoshis);
  };

  const renderWalletSelectionButton = () => {
    if (renderWalletSelectionButtonHidden) return;
    return (
      <View style={styles.walletSelectRoot}>
        {!isLoading && (
          <TouchableOpacity
            style={styles.walletSelectTouch}
            onPress={() => navigate('SelectWallet', { onWalletSelect, chainType: Chain.OFFCHAIN })}
          >
            <Text style={styles.walletSelectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name="angle-right" size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.walletWrap}>
          <TouchableOpacity
            style={styles.walletWrapTouch}
            onPress={() => navigate('SelectWallet', { onWalletSelect, chainType: Chain.OFFCHAIN })}
          >
            <Text style={[styles.walletWrapLabel, stylesHook.walletWrapLabel]}>{wallet.getLabel()}</Text>
            <Text style={[styles.walletWrapBalance, stylesHook.walletWrapBalance]}>
              {formatBalanceWithoutSuffix(wallet.getBalance(), BitcoinUnit.SATS, false)}
            </Text>
            <Text style={[styles.walletWrapSats, stylesHook.walletWrapSats]}>{BitcoinUnit.SATS}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getFees = () => {
    const min = Math.floor(decoded.num_satoshis * 0.003);
    const max = Math.floor(decoded.num_satoshis * 0.01) + 1;
    return `${min} sat - ${max} sat`;
  };

  const onWalletSelect = selectedWallet => {
    setParams({ walletID: selectedWallet.getID() });
    pop();
  };

  if (!wallet) {
    return <BlueLoading />;
  }

  return (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.root, stylesHook.root]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <KeyboardAvoidingView enabled behavior="position" keyboardVerticalOffset={20}>
            <View style={styles.scrollMargin}>
              <BlueBitcoinAmount
                pointerEvents={isAmountInitiallyEmpty ? 'auto' : 'none'}
                isLoading={isLoading}
                amount={amount}
                onAmountUnitChange={setUnit}
                onChangeText={setAmount}
                disabled={!decoded || isLoading || (decoded && decoded.num_satoshis > 0)}
                unit={BitcoinUnit.SATS}
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              />
            </View>

            <BlueCard>
              <BlueAddressInput
                onChangeText={text => {
                  text = text.trim();
                  processTextForInvoice(text);
                }}
                onBarScanned={processInvoice}
                address={destination}
                isLoading={isLoading}
                placeholder={loc.lnd.placeholder}
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
                launchedBy={name}
              />
              <View style={styles.description}>
                <Text numberOfLines={0} style={styles.descriptionText}>
                  {decoded !== undefined ? decoded.description : ''}
                </Text>
              </View>
              {expiresIn !== undefined && (
                <View>
                  <Text style={styles.expiresIn}>{loc.formatString(loc.lnd.expiresIn, { time: expiresIn })}</Text>
                  {decoded && decoded.num_satoshis > 0 && (
                    <Text style={styles.expiresIn}>{loc.formatString(loc.lnd.potentialFee, { fee: getFees() })}</Text>
                  )}
                </View>
              )}
              <BlueCard>
                {isLoading ? (
                  <View>
                    <ActivityIndicator />
                  </View>
                ) : (
                  <View>
                    <BlueButton title={loc.lnd.payButton} onPress={pay} disabled={shouldDisablePayButton()} />
                  </View>
                )}
              </BlueCard>
            </BlueCard>
          </KeyboardAvoidingView>
          {renderWalletSelectionButton()}
        </ScrollView>
      </View>
      <BlueDismissKeyboardInputAccessory />
    </SafeBlueArea>
  );
};

export default ScanLndInvoice;

ScanLndInvoice.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.send.header,
  headerLeft: null,
});

const styles = StyleSheet.create({
  walletSelectRoot: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  walletSelectTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletSelectText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
  walletWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  walletWrapTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletWrapLabel: {
    fontSize: 14,
  },
  walletWrapBalance: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 4,
  },
  walletWrapSats: {
    fontSize: 11,
    fontWeight: '600',
    textAlignVertical: 'bottom',
    marginTop: 2,
  },
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollMargin: {
    marginTop: 60,
  },
  description: {
    flexDirection: 'row',
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 0,
    borderRadius: 4,
  },
  descriptionText: {
    color: '#81868e',
    fontWeight: '500',
    fontSize: 14,
  },
  expiresIn: {
    color: '#81868e',
    fontSize: 12,
    left: 20,
    top: 10,
  },
});
