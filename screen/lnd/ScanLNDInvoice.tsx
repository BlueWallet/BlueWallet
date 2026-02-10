import React, { useCallback, useEffect, useState } from 'react';
import { RouteProp, useFocusEffect, useRoute, useLocale } from '@react-navigation/native';
import { ActivityIndicator, Keyboard, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@rneui/themed';

import { btcToSatoshi, fiatToBTC } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueCard } from '../../BlueComponents';
import Lnurl from '../../class/lnurl';
import AddressInput from '../../components/AddressInput';
import presentAlert from '../../components/Alert';
import * as AmountInput from '../../components/AmountInput';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import { useBiometrics, unlockWithBiometrics } from '../../hooks/useBiometrics';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { DismissKeyboardInputAccessory, DismissKeyboardInputAccessoryViewID } from '../../components/DismissKeyboardInputAccessory';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { LNDStackParamsList } from '../../navigation/LNDStackParamsList';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { DecodedInvoice, TWallet } from '../../class/wallets/types';
import { useKeyboard } from '../../hooks/useKeyboard';
import { BlueLoading } from '../../components/BlueLoading';
import { LightningArkWallet } from '../../class';

type RouteProps = RouteProp<LNDStackParamsList, 'ScanLNDInvoice'>;
type NavigationProps = NativeStackNavigationProp<LNDStackParamsList, 'ScanLNDInvoice'>;

const ScanLNDInvoice = () => {
  const { wallets, fetchAndSaveWalletTransactions } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { colors } = useTheme();
  const { direction } = useLocale();
  const route = useRoute<RouteProps>();
  const { walletID, uri, invoice } = route.params || {};
  const [wallet, setWallet] = useState<LightningCustodianWallet | undefined>(
    (wallets.find(item => item.getID() === walletID) as LightningCustodianWallet) ||
      (wallets.find(item => item.chain === Chain.OFFCHAIN) as LightningCustodianWallet),
  );
  const { navigate, setParams, goBack, pop } = useExtendedNavigation<NavigationProps>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [renderWalletSelectionButtonHidden, setRenderWalletSelectionButtonHidden] = useState<boolean>(false);
  const [destination, setDestination] = useState<string>('');
  const [unit, setUnit] = useState<BitcoinUnit>(BitcoinUnit.SATS);
  const [decoded, setDecoded] = useState<DecodedInvoice | undefined>();
  const [amount, setAmount] = useState<string | undefined>();
  const [isAmountInitiallyEmpty, setIsAmountInitiallyEmpty] = useState<boolean | undefined>();
  const [expiresIn, setExpiresIn] = useState<string | undefined>();
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
    expiresIn: {
      writingDirection: direction,
      color: '#81868e',
      fontSize: 12,
      left: 20,
      top: 10,
    },
  });

  useEffect(() => {
    if (walletID && wallet?.getID() !== walletID) {
      const newWallet = wallets.find(w => w.getID() === walletID) as LightningCustodianWallet;
      if (newWallet) {
        setWallet(newWallet);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletID]);

  useFocusEffect(
    useCallback(() => {
      if (!wallet) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        goBack();
        setTimeout(
          () => presentAlert({ message: loc.wallets.no_ln_wallet_error, hapticFeedback: HapticFeedbackTypes.NotificationError }),
          500,
        );
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

      if (data.toLowerCase().startsWith('ark1')) {
        const arkw = new LightningArkWallet();
        if (arkw.isAddressValid(data)) {
          setParams({ uri: undefined, invoice: data });
          // @ts-ignore we need it to be set to something
          setDecoded({});
          setIsAmountInitiallyEmpty(true);
          setDestination(data);
          setIsLoading(false);
          return;
        }
      }

      let newDecoded: DecodedInvoice;
      try {
        newDecoded = wallet.decodeInvoice(data);

        const expiryTimeMs = (newDecoded.timestamp * 1 + newDecoded.expiry * 1) * 1000; // ms
        let newExpiresIn: string;

        if (+new Date() > expiryTimeMs) {
          newExpiresIn = loc.lnd.expired;
        } else {
          const time = Math.round((expiryTimeMs - +new Date()) / (60 * 1000));
          newExpiresIn = loc.formatString(loc.lnd.expiresIn, { time });
        }

        Keyboard.dismiss();
        setParams({ uri: undefined, invoice: data });
        setIsAmountInitiallyEmpty(newDecoded.num_satoshis === 0);
        setDestination(data);
        setIsLoading(false);
        setAmount(newDecoded.num_satoshis.toString());
        setExpiresIn(newExpiresIn);
        setDecoded(newDecoded);
      } catch (Err: any) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        Keyboard.dismiss();
        setParams({ uri: undefined });
        setTimeout(() => presentAlert({ message: Err.message, hapticFeedback: HapticFeedbackTypes.NotificationError }), 10);
        setIsLoading(false);
        setAmount(undefined);
        setDestination('');
        setExpiresIn(undefined);
        setDecoded(undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  const _keyboardDidShow = (): void => {
    setRenderWalletSelectionButtonHidden(true);
  };

  const _keyboardDidHide = (): void => {
    setRenderWalletSelectionButtonHidden(false);
  };

  useKeyboard({ onKeyboardDidShow: _keyboardDidShow, onKeyboardDidHide: _keyboardDidHide });

  const processInvoice = (data: string): void => {
    if (Lnurl.isLnurl(data)) return processLnurlPay(data);
    if (Lnurl.isLightningAddress(data)) return processLnurlPay(data);
    setParams({ uri: data });
  };

  const processLnurlPay = (data: string): void => {
    navigate('LnurlPay', {
      lnurl: data,
      walletID: walletID || wallet?.getID() || '',
    });
  };

  const pay = async () => {
    if (!decoded || !wallet || !amount || !invoice) {
      return null;
    }

    const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled) {
      if (!(await unlockWithBiometrics())) {
        return;
      }
    }

    let amountSats: number = parseInt(amount, 10);
    switch (unit) {
      case BitcoinUnit.SATS:
        // amount is already in sats
        break;
      case BitcoinUnit.BTC:
        amountSats = btcToSatoshi(amount);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        amountSats = btcToSatoshi(fiatToBTC(Number(amount)));
        break;
    }
    setIsLoading(true);

    const expiryTimeMs = (decoded.timestamp * 1 + decoded.expiry * 1) * 1000; // ms
    if (+new Date() > expiryTimeMs) {
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
    } catch (Err: any) {
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

  const processTextForInvoice = (text: string): void => {
    if (
      (text && text.toLowerCase().startsWith('lnb')) ||
      text.toLowerCase().startsWith('lightning:lnb') ||
      text.toLowerCase().startsWith('ark1') ||
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

  const shouldDisablePayButton = (): boolean => {
    if (!decoded) {
      return true;
    } else {
      if (!amount) {
        return true;
      }
    }
    return !(parseInt(amount, 10) > 0);
  };

  const naviageToSelectWallet = (): void => {
    navigate('SelectWallet', { onWalletSelect, chainType: Chain.OFFCHAIN });
  };

  const renderWalletSelectionButton = (): JSX.Element | undefined => {
    if (renderWalletSelectionButtonHidden || !wallet) return;
    const walletLabel = wallet.getLabel();
    return (
      <View style={styles.walletSelectRoot}>
        {!isLoading && (
          <TouchableOpacity accessibilityRole="button" style={styles.walletSelectTouch} onPress={naviageToSelectWallet}>
            <Text style={styles.walletSelectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name={direction === 'rtl' ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
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

  const getFees = (): string => {
    if (!decoded) return '';
    const num_satoshis = parseInt(decoded.num_satoshis.toString(), 10);
    const min = Math.floor(num_satoshis * 0.003);
    const max = Math.floor(num_satoshis * 0.01) + 1;
    return `${min} ${BitcoinUnit.SATS} - ${max} ${BitcoinUnit.SATS}`;
  };

  const onBlur = (): void => {
    processTextForInvoice(destination);
  };

  const onWalletSelect = (selectedWallet: TWallet): void => {
    setParams({ walletID: selectedWallet.getID() });
    pop();
  };

  const onBarScanned = useCallback(
    (value: string): void => {
      if (!value) return;
      DeeplinkSchemaMatch.navigationRouteFor({ url: value }, (completionValue: any) => {
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

  const onChangeText = (text: string): void => {
    const trimmedText = text.trim();
    setDestination(trimmedText);
    processTextForInvoice(trimmedText);
  };

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
            <AmountInput.AmountInput
              isLoading={isLoading}
              amount={amount}
              onAmountUnitChange={setUnit}
              onChangeText={setAmount}
              disabled={!isAmountInitiallyEmpty || !decoded || isLoading || decoded.num_satoshis > 0}
              unit={unit}
              inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
            />
          </View>

          <BlueCard>
            <AddressInput
              onChangeText={onChangeText}
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
                <Text style={stylesHook.expiresIn}>{expiresIn}</Text>
                {decoded && decoded.num_satoshis > 0 && (
                  <Text style={stylesHook.expiresIn}>{loc.formatString(loc.lnd.potentialFee, { fee: getFees() })}</Text>
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

export default ScanLNDInvoice;

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
  addressInput: {
    marginHorizontal: 16,
  },
});
