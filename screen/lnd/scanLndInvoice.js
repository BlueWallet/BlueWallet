import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, I18nManager, Keyboard, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@rneui/themed';

import { btcToSatoshi, fiatToBTC } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueCard, BlueLoading } from '../../BlueComponents';
import Lnurl from '../../class/lnurl';
import AddressInput from '../../components/AddressInput';
import presentAlert from '../../components/Alert';
import AmountInput from '../../components/AmountInput';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import { useBiometrics, unlockWithBiometrics } from '../../hooks/useBiometrics';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { DismissKeyboardInputAccessory, DismissKeyboardInputAccessoryViewID } from '../../components/DismissKeyboardInputAccessory';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';

const ScanLndInvoice = () => {
  const { wallets, fetchAndSaveWalletTransactions } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { colors } = useTheme();
  const route = useRoute();
  const { walletID, uri, invoice } = useRoute().params;
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
    const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', _keyboardDidShow);
    const hideSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', _keyboardDidHide);
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
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
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        goBack();
        setTimeout(() => presentAlert({ message: loc.wallets.no_ln_wallet_error }), 500);
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
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        Keyboard.dismiss();
        setParams({ uri: undefined });
        setTimeout(() => presentAlert({ message: Err.message }), 10);
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

    const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled) {
      if (!(await unlockWithBiometrics())) {
        return;
      }
    }

    let amountSats = amount;
    switch (unit) {
      case BitcoinUnit.SATS:
        amountSats = parseInt(amountSats, 10); // nop
        break;
      case BitcoinUnit.BTC:
        amountSats = btcToSatoshi(amountSats);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        amountSats = btcToSatoshi(fiatToBTC(amountSats));
        break;
    }
    setIsLoading(true);

    const newExpiresIn = (decoded.timestamp * 1 + decoded.expiry * 1) * 1000; // ms
    if (+new Date() > newExpiresIn) {
      setIsLoading(false);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      return presentAlert({ message: loc.lnd.errorInvoiceExpired });
    }

    const currentUserInvoices = wallet.user_invoices_raw; // not fetching invoices, as we assume they were loaded previously
    if (currentUserInvoices.some(i => i.payment_hash === decoded.payment_hash)) {
      setIsLoading(false);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      return presentAlert({ message: loc.lnd.sameWalletAsInvoiceError });
    }

    try {
      await wallet.payInvoice(invoice, amountSats);
    } catch (Err) {
      console.log(Err.message);
      setIsLoading(false);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      return presentAlert({ message: Err.message });
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
      (text && text.toLowerCase().startsWith('lnb')) ||
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

  const onBarScanned = useCallback(
    value => {
      if (!value) return;
      DeeplinkSchemaMatch.navigationRouteFor({ url: value }, completionValue => {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        navigate(...completionValue);
      });
    },
    [navigate],
  );

  useEffect(() => {
    const data = route.params?.onBarScanned;
    if (data) {
      onBarScanned(data);
      setParams({ onBarScanned: undefined });
    }
  }, [navigate, onBarScanned, route.params?.onBarScanned, setParams]);

  if (wallet === undefined || !wallet) {
    return (
      <View style={[styles.loadingIndicator, stylesHook.root]}>
        <BlueLoading />
      </View>
    );
  }

  return (
    <SafeArea style={stylesHook.root}>
      <View style={[styles.root, stylesHook.root]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustContentInsets
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.scrollMargin}>
            <AmountInput
              pointerEvents={isAmountInitiallyEmpty ? 'auto' : 'none'}
              isLoading={isLoading}
              amount={amount}
              onAmountUnitChange={setUnit}
              onChangeText={setAmount}
              disabled={!decoded || isLoading || decoded.num_satoshis > 0}
              unit={unit}
              inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
            />
          </View>

          <BlueCard>
            <AddressInput
              onChangeText={text => {
                text = text.trim();
                setDestination(text);
              }}
              onBarScanned={data => processTextForInvoice(data.data)}
              address={destination}
              isLoading={isLoading}
              placeholder={loc.lnd.placeholder}
              inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
              onBlur={onBlur}
              keyboardType="email-address"
              style={styles.addressInput}
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

          {renderWalletSelectionButton()}
        </ScrollView>
      </View>
      <DismissKeyboardInputAccessory />
    </SafeArea>
  );
};

export default ScanLndInvoice;

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
    marginHorizontal: 16,
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
  addressInput: {
    marginHorizontal: 16,
  },
});
