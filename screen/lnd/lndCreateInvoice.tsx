import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CommonActions, RouteProp, useFocusEffect, useLocale, useRoute } from '@react-navigation/native';
import { navigationRef, pop } from '../../NavigationService';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Icon } from '@rneui/themed';
import { parse } from 'url'; // eslint-disable-line n/no-deprecated-api
import { btcToSatoshi, fiatToBTC, satoshiToBTC } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import Lnurl from '../../class/lnurl';
import presentAlert from '../../components/Alert';
import * as AmountInput from '../../components/AmountInput';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import { presentWalletExportReminder } from '../../helpers/presentWalletExportReminder';
import loc, { formatBalance, formatBalancePlain, formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { DismissKeyboardInputAccessory, DismissKeyboardInputAccessoryViewID } from '../../components/DismissKeyboardInputAccessory';
import { majorTomToGroundControl, tryToObtainPermissions } from '../../blue_modules/notifications';
import { BlueLoading } from '../../components/BlueLoading';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation.ts';
import { LightningArkWallet, LightningCustodianWallet } from '../../class';
import assert from 'assert';
import { scanQrHelper } from '../../helpers/scan-qr.ts';

type LNDCreateInvoiceRouteParams = {
  walletID: string;
  uri: string;
};

const LNDCreateInvoice = () => {
  const { wallets, saveToDisk } = useStorage();
  const { uri, walletID } = useRoute<RouteProp<{ params: LNDCreateInvoiceRouteParams }, 'params'>>().params;
  const wallet = useRef(wallets.find(item => item.getID() === walletID) || wallets.find(item => item.chain === Chain.OFFCHAIN));
  const { colors } = useTheme();
  const { navigate, goBack, setParams } = useExtendedNavigation();
  const [unit, setUnit] = useState(wallet.current?.getPreferredBalanceUnit() || BitcoinUnit.BTC);
  const [amount, setAmount] = useState<string>();
  const { direction } = useLocale();
  const [renderWalletSelectionButtonHidden, setRenderWalletSelectionButtonHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [lnurlParams, setLNURLParams] = useState<{ k1: any; callback: any; fixed: boolean; min: number; max: number }>();

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

  const processLnurl = useCallback(
    async (data: string) => {
      setIsLoading(true);
      if (!wallet.current) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc.wallets.no_ln_wallet_error });
        return goBack();
      }

      // decoding the lnurl
      const url = Lnurl.getUrlFromLnurl(data);
      const { query } = parse(String(url), true);

      if (query.tag === Lnurl.TAG_LOGIN_REQUEST) {
        // Close the modal first, then navigate to LnurlAuth in the drawer
        goBack();
        setTimeout(() => {
          navigationRef.dispatch(
            CommonActions.navigate({
              name: 'LnurlAuth',
              params: {
                lnurl: data,
                walletID: walletID ?? wallet.current?.getID(),
              },
            }),
          );
        }, 100);
        return;
      }

      // calling the url
      try {
        const resp = await fetch(String(url), { method: 'GET' });
        if (resp.status >= 300) {
          throw new Error('Bad response from server');
        }
        const reply = await resp.json();
        if (reply.status === 'ERROR') {
          throw new Error('Reply from server: ' + reply.reason);
        }

        if (reply.tag === Lnurl.TAG_PAY_REQUEST) {
          // we are here by mistake. user wants to SEND to lnurl-pay, but he is on a screen that creates
          // invoices (including through lnurl-withdraw)
          navigate('ScanLNDInvoiceRoot', {
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
        let newAmount = (reply.maxWithdrawable / 1000).toString();
        const sats = newAmount;
        switch (unit) {
          case BitcoinUnit.SATS:
            // nop
            break;
          case BitcoinUnit.BTC:
            newAmount = satoshiToBTC(+newAmount);
            break;
          case BitcoinUnit.LOCAL_CURRENCY:
            newAmount = formatBalancePlain(+newAmount, BitcoinUnit.LOCAL_CURRENCY);
            AmountInput.setCachedSatoshis(newAmount, sats);
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
        setAmount(newAmount);
        setDescription(reply.defaultDescription);
        setIsLoading(false);
      } catch (Err: any) {
        Keyboard.dismiss();
        setIsLoading(false);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: Err.message });
      }
    },
    [goBack, navigate, unit, walletID],
  );

  useEffect(() => {
    const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', _keyboardDidShow);
    const hideSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', _keyboardDidHide);
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const renderReceiveDetails = async () => {
    try {
      wallet.current?.setUserHasSavedExport(true);
      await saveToDisk();
      if (uri) {
        processLnurl(uri);
      }
    } catch (e) {
      console.log(e);
    }
    setIsLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (wallet.current) {
        if (wallet.current.getUserHasSavedExport()) {
          renderReceiveDetails();
        } else {
          presentWalletExportReminder()
            .then(() => {
              renderReceiveDetails();
            })
            .catch(() => {
              pop();
              navigate('WalletExport', {
                walletID: wallet.current?.getID(),
              });
            });
        }
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc.wallets.add_ln_wallet_first });
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
      let invoiceAmount: string | number = amount ?? 0;
      switch (unit) {
        case BitcoinUnit.SATS:
          invoiceAmount = parseInt(String(invoiceAmount), 10); // basically nop
          break;
        case BitcoinUnit.BTC:
          invoiceAmount = btcToSatoshi(invoiceAmount);
          break;
        case BitcoinUnit.LOCAL_CURRENCY:
          // trying to fetch cached sat equivalent for this fiat amount
          invoiceAmount = AmountInput.getCachedSatoshis(String(invoiceAmount)) || btcToSatoshi(fiatToBTC(+invoiceAmount));
          break;
      }

      if (lnurlParams) {
        invoiceAmount = +invoiceAmount;
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
          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
          presentAlert({ message: text });
          setIsLoading(false);
          return;
        }
      }

      assert(wallet.current instanceof LightningArkWallet || wallet.current instanceof LightningCustodianWallet);

      const invoiceRequest = await wallet.current?.addInvoice(+invoiceAmount, description);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);

      // lets decode payreq and subscribe groundcontrol so we can receive push notification when our invoice is paid
      const decoded = await wallet.current?.decodeInvoice(invoiceRequest);
      tryToObtainPermissions()
        .then(res => majorTomToGroundControl([], [decoded.payment_hash], []))
        .catch(err => console.error(err.message));

      // send to lnurl-withdraw callback url if that exists
      if (lnurlParams) {
        const { callback, k1 } = lnurlParams;
        const callbackUrl = callback + (callback.indexOf('?') !== -1 ? '&' : '?') + 'k1=' + k1 + '&pr=' + invoiceRequest;

        const resp = await fetch(callbackUrl, { method: 'GET' });
        if (resp.status >= 300) {
          const text = await resp.text();
          throw new Error(text);
        }
        const reply = await resp.json();

        if (reply.status === 'ERROR') {
          throw new Error('Reply from server: ' + reply.reason);
        }
      }

      setTimeout(async () => {
        assert(wallet.current instanceof LightningArkWallet || wallet.current instanceof LightningCustodianWallet);
        // wallet object doesnt have this fresh invoice in its internals, so we refetch it and only then save
        await wallet.current?.fetchUserInvoices();
        await saveToDisk();
      }, 1000);

      navigate('LNDViewInvoice', {
        invoice: invoiceRequest,
        walletID: wallet.current?.getID(),
      });
    } catch (Err: any) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      setIsLoading(false);
      presentAlert({ message: Err.message });
    }
  };

  const renderCreateButton = () => {
    return (
      <View style={styles.createButton}>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <Button disabled={!(amount && +amount > 0)} onPress={createInvoice} title={loc.send.details_create} />
        )}
      </View>
    );
  };

  const navigateToScanQRCode = async () => {
    const data = await scanQrHelper();
    if (data) {
      await processLnurl(data);
    }
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
            <Icon name={direction === 'rtl' ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.walletNameWrap}>
          <TouchableOpacity accessibilityRole="button" style={styles.walletNameTouch} onPress={navigateToSelectWallet}>
            <Text style={[styles.walletNameText, styleHooks.walletNameText]}>{wallet.current?.getLabel()}</Text>
            <Text style={[styles.walletNameBalance, styleHooks.walletNameBalance]}>
              {formatBalanceWithoutSuffix(wallet.current?.getBalance(), BitcoinUnit.SATS, false)}
            </Text>
            <Text style={[styles.walletNameSats, styleHooks.walletNameSats]}>{BitcoinUnit.SATS}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const onWalletSelect = (selectedWallet: LightningCustodianWallet | LightningArkWallet) => {
    setParams({ walletID: selectedWallet.getID() });
    pop();
  };

  if (!wallet.current) {
    return (
      <View style={[styles.root, styleHooks.root]}>
        <BlueLoading />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.root, styleHooks.root]}>
        <View style={[styles.amount, styleHooks.amount]}>
          <AmountInput.AmountInput
            isLoading={isLoading}
            amount={amount}
            onAmountUnitChange={setUnit}
            onChangeText={setAmount}
            disabled={isLoading || (lnurlParams && lnurlParams.fixed)}
            unit={unit}
            inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
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
              inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
            />
            {lnurlParams ? null : renderScanClickable()}
          </View>
          <DismissKeyboardInputAccessory />
          {renderCreateButton()}
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
