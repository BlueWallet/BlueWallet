import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  View,
  TouchableOpacity,
  Keyboard,
  ScrollView,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { Icon } from 'react-native-elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import { BlueCard, BlueDismissKeyboardInputAccessory, BlueLoading, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import AddressInput from '../../components/AddressInput';
import AmountInput from '../../components/AmountInput';
import Lnurl from '../../class/lnurl';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import Biometric from '../../class/biometrics';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';
import { useTheme } from '../../components/themes';
import Button from '../../components/Button';
const currency = require('../../blue_modules/currency');

const ScanLndInvoice = () => {
  const { wallets, fetchAndSaveWalletTransactions } = useContext(BlueStorageContext);
  const { colors } = useTheme();
  const { walletID, uri, invoice } = useRoute().params;
  const name = useRoute().name;
  /** @type {LightningCustodianWallet} */
  const [wallet, setWallet] = useState(
    wallets.find(item => item.getID() === walletID) || wallets.find(item => item.chain === Chain.OFFCHAIN),
  );
  const { navigate, setParams, goBack, pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [renderWalletSelectionButtonHidden, setRenderWalletSelectionButtonHidden] = useState(false);
  const [destination, setDestination] = useState('');
  const [unit, setUnit] = useState(BitcoinUnit.SATS);
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
    return () => {
      Keyboard.removeAllListeners('keyboardDidShow');
      Keyboard.removeAllListeners('keyboardDidHide');
    };
  }, []);

  useEffect(() => {
    if (walletID && wallet?.getID() !== walletID) {
      setWallet(wallets.find(w => w.getID() === walletID));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletID]);

  useFocusEffect(
    useCallback(() => {
      if (!wallet) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        goBack();
        setTimeout(() => alert(loc.wallets.no_ln_wallet_error), 500);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet]),
  );

  useEffect(() => {
    if (wallet && uri) {
      if (Lnurl.isLnurl(uri)) return processLnurlPay(uri);
      if (Lnurl.isLightningAddress(uri)) return processLnurlPay(uri);

      let data = uri;
      // handling BIP21 w/BOLT11 support
      const ind = data.indexOf('lightning=');
      if (ind !== -1) {
        data = data.substring(ind + 10).split('&')[0];
      }

      data = data.replace('LIGHTNING:', '').replace('lightning:', '');
      console.log(data);

      let newDecoded;
      try {
        newDecoded = wallet.decodeInvoice(data);

        let newExpiresIn = (newDecoded.timestamp * 1 + newDecoded.expiry * 1) * 1000; // ms
        if (+new Date() > newExpiresIn) {
          newExpiresIn = loc.lnd.expired;
        } else {
          const time = Math.round((newExpiresIn - +new Date()) / (60 * 1000));
          newExpiresIn = loc.formatString(loc.lnd.expiresIn, { time });
        }
        Keyboard.dismiss();
        setParams({ uri: undefined, invoice: data });
        setIsAmountInitiallyEmpty(newDecoded.num_satoshis === '0');
        setDestination(data);
        setIsLoading(false);
        setAmount(newDecoded.num_satoshis);
        setExpiresIn(newExpiresIn);
        setDecoded(newDecoded);
      } catch (Err) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        Keyboard.dismiss();
        setParams({ uri: undefined });
        setTimeout(() => alert(Err.message), 10);
        setIsLoading(false);
        setAmount();
        setDestination();
        setExpiresIn();
        setDecoded();
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
    if (Lnurl.isLightningAddress(data)) return processLnurlPay(data);
    setParams({ uri: data });
  };

  const processLnurlPay = data => {
    navigate('ScanLndInvoiceRoot', {
      screen: 'LnurlPay',
      params: {
        lnurl: data,
        walletID: walletID || wallet.getID(),
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
        amountSats = parseInt(amountSats, 10); // nop
        break;
      case BitcoinUnit.BTC:
        amountSats = currency.btcToSatoshi(amountSats);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        amountSats = currency.btcToSatoshi(currency.fiatToBTC(amountSats));
        break;
    }
    setIsLoading(true);

    const newExpiresIn = (decoded.timestamp * 1 + decoded.expiry * 1) * 1000; // ms
    if (+new Date() > newExpiresIn) {
      setIsLoading(false);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      return alert(loc.lnd.errorInvoiceExpired);
    }

    const currentUserInvoices = wallet.user_invoices_raw; // not fetching invoices, as we assume they were loaded previously
    if (currentUserInvoices.some(i => i.payment_hash === decoded.payment_hash)) {
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
    fetchAndSaveWalletTransactions(wallet.getID());
  };

  const processTextForInvoice = text => {
    if (
      text.toLowerCase().startsWith('lnb') ||
      text.toLowerCase().startsWith('lightning:lnb') ||
      Lnurl.isLnurl(text) ||
      Lnurl.isLightningAddress(text)
    ) {
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

  const naviageToSelectWallet = () => {
    navigate('SelectWallet', { onWalletSelect, chainType: Chain.OFFCHAIN });
  };

  const renderWalletSelectionButton = () => {
    if (renderWalletSelectionButtonHidden) return;
    const walletLabel = wallet.getLabel();
    return (
      <View style={styles.walletSelectRoot}>
        {!isLoading && (
          <TouchableOpacity accessibilityRole="button" style={styles.walletSelectTouch} onPress={naviageToSelectWallet}>
            <Text style={styles.walletSelectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name={I18nManager.isRTL ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.walletWrap}>
          <TouchableOpacity accessibilityRole="button" disabled={isLoading} style={styles.walletWrapTouch} onPress={naviageToSelectWallet}>
            <Text style={[styles.walletWrapLabel, stylesHook.walletWrapLabel]}>{walletLabel}</Text>
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
    return `${min} ${BitcoinUnit.SATS} - ${max} ${BitcoinUnit.SATS}`;
  };

  const onBlur = () => {
    processTextForInvoice(destination);
  };

  const onWalletSelect = selectedWallet => {
    setParams({ walletID: selectedWallet.getID() });
    pop();
  };

  if (wallet === undefined || !wallet) {
    return (
      <View style={[styles.loadingIndicator, stylesHook.root]}>
        <BlueLoading />
      </View>
    );
  }

  return (
    <SafeBlueArea style={stylesHook.root}>
      <View style={[styles.root, stylesHook.root]}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <KeyboardAvoidingView enabled behavior="position" keyboardVerticalOffset={20}>
            <View style={styles.scrollMargin}>
              <AmountInput
                pointerEvents={isAmountInitiallyEmpty ? 'auto' : 'none'}
                isLoading={isLoading}
                amount={amount}
                onAmountUnitChange={setUnit}
                onChangeText={setAmount}
                disabled={!decoded || isLoading || decoded.num_satoshis > 0}
                unit={unit}
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              />
            </View>

            <BlueCard>
              <AddressInput
                onChangeText={text => {
                  text = text.trim();
                  setDestination(text);
                }}
                onBarScanned={processInvoice}
                address={destination}
                isLoading={isLoading}
                placeholder={loc.lnd.placeholder}
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
                launchedBy={name}
                onBlur={onBlur}
                keyboardType="email-address"
              />
              <View style={styles.description}>
                <Text numberOfLines={0} style={styles.descriptionText}>
                  {decoded !== undefined ? decoded.description : ''}
                </Text>
              </View>
              {expiresIn !== undefined && (
                <View>
                  <Text style={styles.expiresIn}>{expiresIn}</Text>
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
                    <Button title={loc.lnd.payButton} onPress={pay} disabled={shouldDisablePayButton()} />
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
ScanLndInvoice.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerBackVisible: false,
  },
  opts => ({ ...opts, title: loc.send.header, statusBarStyle: 'light' }),
);

const styles = StyleSheet.create({
  walletSelectRoot: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
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
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    color: '#81868e',
    fontSize: 12,
    left: 20,
    top: 10,
  },
});
