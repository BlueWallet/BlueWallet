import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  I18nManager,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Icon } from 'react-native-elements';
import { useFocusEffect, useNavigation, useRoute, useTheme } from '@react-navigation/native';

import { BlueAlertWalletExportReminder, BlueButton, BlueDismissKeyboardInputAccessory, BlueLoading } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import AmountInput from '../../components/AmountInput';
import * as NavigationService from '../../NavigationService';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import loc, { formatBalance, formatBalanceWithoutSuffix, formatBalancePlain } from '../../loc';
import Lnurl from '../../class/lnurl';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import Notifications from '../../blue_modules/notifications';
import alert from '../../components/Alert';
import { parse } from 'url'; // eslint-disable-line n/no-deprecated-api
const currency = require('../../blue_modules/currency');
const torrific = require('../../blue_modules/torrific');

const LNDCreateInvoice = () => {
  const { wallets, saveToDisk, setSelectedWallet, isTorDisabled } = useContext(BlueStorageContext);
  const { walletID, uri } = useRoute().params;
  const wallet = useRef(wallets.find(item => item.getID() === walletID) || wallets.find(item => item.chain === Chain.OFFCHAIN));
  const { name } = useRoute();
  const { colors } = useTheme();
  const { navigate, dangerouslyGetParent, goBack, pop, setParams } = useNavigation();
  const [unit, setUnit] = useState(wallet.current?.getPreferredBalanceUnit() || BitcoinUnit.BTC);
  const [amount, setAmount] = useState();
  const [renderWalletSelectionButtonHidden, setRenderWalletSelectionButtonHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [lnurlParams, setLNURLParams] = useState();

  const styleHooks = StyleSheet.create({
    scanRoot: {
      backgroundColor: colors.scanLabel,
    },
    scanClick: {
      color: colors.inverseForegroundColor,
    },
    walletNameText: {
      color: colors.buttonAlternativeTextColor,
    },
    walletNameBalance: {
      color: colors.buttonAlternativeTextColor,
    },
    walletNameSats: {
      color: colors.buttonAlternativeTextColor,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    amount: {
      backgroundColor: colors.elevated,
    },
    fiat: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
  });

  useEffect(() => {
    // console.log(params)
    Keyboard.addListener('keyboardDidShow', _keyboardDidShow);
    Keyboard.addListener('keyboardDidHide', _keyboardDidHide);
    return () => {
      Keyboard.removeAllListeners('keyboardDidShow');
      Keyboard.removeAllListeners('keyboardDidHide');
    };
  }, []);

  const renderReceiveDetails = async () => {
    try {
      wallet.current.setUserHasSavedExport(true);
      await saveToDisk();
      if (uri) {
        processLnurl(uri);
      }
    } catch (e) {
      console.log(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (wallet.current && wallet.current.getID() !== walletID) {
      const newWallet = wallets.find(w => w.getID() === walletID);
      if (newWallet) {
        wallet.current = newWallet;
        setSelectedWallet(newWallet.getID());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletID]);

  useFocusEffect(
    useCallback(() => {
      if (wallet.current) {
        setSelectedWallet(walletID);
        if (wallet.current.getUserHasSavedExport()) {
          renderReceiveDetails();
        } else {
          BlueAlertWalletExportReminder({
            onSuccess: () => renderReceiveDetails(),
            onFailure: () => {
              dangerouslyGetParent().pop();
              NavigationService.navigate('WalletExportRoot', {
                screen: 'WalletExport',
                params: {
                  walletID,
                },
              });
            },
          });
        }
      } else {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        alert(loc.wallets.add_ln_wallet_first);
        goBack();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet]),
  );

  const _keyboardDidShow = () => {
    setRenderWalletSelectionButtonHidden(true);
  };

  const _keyboardDidHide = () => {
    setRenderWalletSelectionButtonHidden(false);
  };

  const createInvoice = async () => {
    setIsLoading(true);
    try {
      let invoiceAmount = amount;
      switch (unit) {
        case BitcoinUnit.SATS:
          invoiceAmount = parseInt(invoiceAmount); // basically nop
          break;
        case BitcoinUnit.BTC:
          invoiceAmount = currency.btcToSatoshi(invoiceAmount);
          break;
        case BitcoinUnit.LOCAL_CURRENCY:
          // trying to fetch cached sat equivalent for this fiat amount
          invoiceAmount = AmountInput.getCachedSatoshis(invoiceAmount) || currency.btcToSatoshi(currency.fiatToBTC(invoiceAmount));
          break;
      }

      if (lnurlParams) {
        const { min, max } = lnurlParams;
        if (invoiceAmount < min || invoiceAmount > max) {
          let text;
          if (invoiceAmount < min) {
            text =
              unit === BitcoinUnit.SATS
                ? loc.formatString(loc.receive.minSats, { min })
                : loc.formatString(loc.receive.minSatsFull, { min, currency: formatBalance(min, unit) });
          } else {
            text =
              unit === BitcoinUnit.SATS
                ? loc.formatString(loc.receive.maxSats, { max })
                : loc.formatString(loc.receive.maxSatsFull, { max, currency: formatBalance(max, unit) });
          }
          ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
          alert(text);
          setIsLoading(false);
          return;
        }
      }

      const invoiceRequest = await wallet.current.addInvoice(invoiceAmount, description);
      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });

      // lets decode payreq and subscribe groundcontrol so we can receive push notification when our invoice is paid
      /** @type LightningCustodianWallet */
      const decoded = await wallet.current.decodeInvoice(invoiceRequest);
      await Notifications.tryToObtainPermissions();
      Notifications.majorTomToGroundControl([], [decoded.payment_hash], []);

      // send to lnurl-withdraw callback url if that exists
      if (lnurlParams) {
        const { callback, k1 } = lnurlParams;
        const callbackUrl = callback + (callback.indexOf('?') !== -1 ? '&' : '?') + 'k1=' + k1 + '&pr=' + invoiceRequest;

        let reply;
        if (!isTorDisabled && callbackUrl.includes('.onion')) {
          const api = new torrific.Torsbee();
          const torResponse = await api.get(callbackUrl);
          reply = torResponse.body;
          if (reply && typeof reply === 'string') reply = JSON.parse(reply);
        } else {
          const resp = await fetch(callbackUrl, { method: 'GET' });
          if (resp.status >= 300) {
            const text = await resp.text();
            throw new Error(text);
          }
          reply = await resp.json();
        }

        if (reply.status === 'ERROR') {
          throw new Error('Reply from server: ' + reply.reason);
        }
      }

      setTimeout(async () => {
        // wallet object doesnt have this fresh invoice in its internals, so we refetch it and only then save
        await wallet.current.fetchUserInvoices(1);
        await saveToDisk();
      }, 1000);

      navigate('LNDViewInvoice', {
        invoice: invoiceRequest,
        walletID: wallet.current.getID(),
      });
    } catch (Err) {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      setIsLoading(false);
      alert(Err.message);
    }
  };

  const processLnurl = async data => {
    setIsLoading(true);
    if (!wallet.current) {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      alert(loc.wallets.no_ln_wallet_error);
      return goBack();
    }

    // decoding the lnurl
    const url = Lnurl.getUrlFromLnurl(data);
    const { query } = parse(url, true);

    if (query.tag === Lnurl.TAG_LOGIN_REQUEST) {
      navigate('LnurlAuth', {
        lnurl: data,
        walletID: walletID ?? wallet.current.getID(),
      });
      return;
    }

    // calling the url
    let reply;
    try {
      if (!isTorDisabled && url.includes('.onion')) {
        const api = new torrific.Torsbee();
        const torResponse = await api.get(url);
        reply = torResponse.body;
        if (reply && typeof reply === 'string') reply = JSON.parse(reply);
      } else {
        const resp = await fetch(url, { method: 'GET' });
        if (resp.status >= 300) {
          throw new Error('Bad response from server');
        }
        reply = await resp.json();
        if (reply.status === 'ERROR') {
          throw new Error('Reply from server: ' + reply.reason);
        }
      }

      if (reply.tag === Lnurl.TAG_PAY_REQUEST) {
        // we are here by mistake. user wants to SEND to lnurl-pay, but he is on a screen that creates
        // invoices (including through lnurl-withdraw)
        navigate('ScanLndInvoiceRoot', {
          screen: 'LnurlPay',
          params: {
            lnurl: data,
            walletID: walletID ?? wallet.current.getID(),
          },
        });
        return;
      }

      if (reply.tag !== Lnurl.TAG_WITHDRAW_REQUEST) {
        throw new Error('Unsupported lnurl');
      }

      // amount that comes from lnurl is always in sats
      let amount = (reply.maxWithdrawable / 1000).toString();
      const sats = amount;
      switch (unit) {
        case BitcoinUnit.SATS:
          // nop
          break;
        case BitcoinUnit.BTC:
          amount = currency.satoshiToBTC(amount);
          break;
        case BitcoinUnit.LOCAL_CURRENCY:
          amount = formatBalancePlain(amount, BitcoinUnit.LOCAL_CURRENCY);
          AmountInput.setCachedSatoshis(amount, sats);
          break;
      }

      // setting the invoice creating screen with the parameters
      setLNURLParams({
        k1: reply.k1,
        callback: reply.callback,
        fixed: reply.minWithdrawable === reply.maxWithdrawable,
        min: (reply.minWithdrawable || 0) / 1000,
        max: reply.maxWithdrawable / 1000,
      });
      setAmount(amount);
      setDescription(reply.defaultDescription);
      setIsLoading(false);
    } catch (Err) {
      Keyboard.dismiss();
      setIsLoading(false);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      alert(Err.message);
    }
  };

  const renderCreateButton = () => {
    return (
      <View style={styles.createButton}>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <BlueButton disabled={!(amount > 0)} onPress={createInvoice} title={loc.send.details_create} />
        )}
      </View>
    );
  };

  const navigateToScanQRCode = () => {
    NavigationService.navigate('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params: {
        onBarScanned: processLnurl,
        launchedBy: name,
      },
    });
    Keyboard.dismiss();
  };

  const renderScanClickable = () => {
    return (
      <TouchableOpacity
        disabled={isLoading}
        onPress={navigateToScanQRCode}
        style={[styles.scanRoot, styleHooks.scanRoot]}
        accessibilityRole="button"
        accessibilityLabel={loc.send.details_scan}
        accessibilityHint={loc.send.details_scan_hint}
      >
        <Image style={{}} source={require('../../img/scan-white.png')} />
        <Text style={[styles.scanClick, styleHooks.scanClick]}>{loc.send.details_scan}</Text>
      </TouchableOpacity>
    );
  };

  const navigateToSelectWallet = () => {
    navigate('SelectWallet', { onWalletSelect, chainType: Chain.OFFCHAIN });
  };

  const renderWalletSelectionButton = () => {
    if (renderWalletSelectionButtonHidden) return;
    return (
      <View style={styles.walletRoot}>
        {!isLoading && (
          <TouchableOpacity accessibilityRole="button" style={styles.walletChooseWrap} onPress={navigateToSelectWallet}>
            <Text style={styles.walletChooseText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name={I18nManager.isRTL ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.walletNameWrap}>
          <TouchableOpacity accessibilityRole="button" style={styles.walletNameTouch} onPress={navigateToSelectWallet}>
            <Text style={[styles.walletNameText, styleHooks.walletNameText]}>{wallet.current.getLabel()}</Text>
            <Text style={[styles.walletNameBalance, styleHooks.walletNameBalance]}>
              {formatBalanceWithoutSuffix(wallet.current.getBalance(), BitcoinUnit.SATS, false)}
            </Text>
            <Text style={[styles.walletNameSats, styleHooks.walletNameSats]}>{BitcoinUnit.SATS}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const onWalletSelect = selectedWallet => {
    setParams({ walletID: selectedWallet.getID() });
    pop();
  };

  if (!wallet.current) {
    return (
      <View style={[styles.root, styleHooks.root]}>
        <StatusBar barStyle="light-content" />
        <BlueLoading />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.root, styleHooks.root]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.amount, styleHooks.amount]}>
          <KeyboardAvoidingView enabled={!Platform.isPad} behavior="position">
            <AmountInput
              isLoading={isLoading}
              amount={amount}
              onAmountUnitChange={setUnit}
              onChangeText={setAmount}
              disabled={isLoading || (lnurlParams && lnurlParams.fixed)}
              unit={unit}
              inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
            />
            <View style={[styles.fiat, styleHooks.fiat]}>
              <TextInput
                onChangeText={setDescription}
                placeholder={loc.receive.details_label}
                value={description}
                numberOfLines={1}
                placeholderTextColor="#81868e"
                style={styles.fiat2}
                editable={!isLoading}
                onSubmitEditing={Keyboard.dismiss}
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              />
              {lnurlParams ? null : renderScanClickable()}
            </View>
            <BlueDismissKeyboardInputAccessory />
            {renderCreateButton()}
          </KeyboardAvoidingView>
        </View>
        {renderWalletSelectionButton()}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  createButton: {
    marginHorizontal: 16,
    marginVertical: 16,
    minHeight: 45,
  },
  scanRoot: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  scanClick: {
    marginLeft: 4,
  },
  walletRoot: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletChooseWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletChooseText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
  walletNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  walletNameTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletNameText: {
    fontSize: 14,
  },
  walletNameBalance: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 4,
  },
  walletNameSats: {
    fontSize: 11,
    fontWeight: '600',
    textAlignVertical: 'bottom',
    marginTop: 2,
  },
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  amount: {
    flex: 1,
  },
  fiat: {
    flexDirection: 'row',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  fiat2: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    color: '#81868e',
  },
});

export default LNDCreateInvoice;
LNDCreateInvoice.routeName = 'LNDCreateInvoice';
LNDCreateInvoice.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerHideBackButton: true,
  },
  opts => ({ ...opts, title: loc.receive.header }),
);
