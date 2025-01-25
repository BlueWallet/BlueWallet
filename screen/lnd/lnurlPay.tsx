import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { I18nManager, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@rneui/themed';
import { btcToSatoshi, fiatToBTC, satoshiToBTC, satoshiToLocalCurrency } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueCard, BlueLoading, BlueSpacing20, BlueText } from '../../BlueComponents';
import Lnurl from '../../class/lnurl';
import presentAlert from '../../components/Alert';
import AmountInput from '../../components/AmountInput';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import prompt from '../../helpers/prompt';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { DismissKeyboardInputAccessory, DismissKeyboardInputAccessoryViewID } from '../../components/DismissKeyboardInputAccessory';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { TWallet } from '../../class/wallets/types';
import { pop } from '../../NavigationService';

type RouteParams = {
  walletID: string;
  lnurl: string;
};

const _cacheFiatToSat: Record<string, string> = {};

const LnurlPay: React.FC = () => {
  const { wallets } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { walletID, lnurl } = route.params;
  const wallet = wallets.find(w => w.getID() === walletID) as LightningCustodianWallet;
  const [unit, setUnit] = useState<BitcoinUnit>(wallet?.getPreferredBalanceUnit() ?? BitcoinUnit.BTC);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [_LN, setLN] = useState<Lnurl | undefined>();
  const [payButtonDisabled, setPayButtonDisabled] = useState<boolean>(true);
  const [payload, setPayload] = useState<any>();
  const { setParams, navigate } = useExtendedNavigation();
  const [amount, setAmount] = useState<string | undefined>();
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    walletWrapLabel: {
      color: colors.buttonAlternativeTextColor,
    },
    walletWrapBalance: {
      color: colors.buttonAlternativeTextColor,
    },
    walletWrapSats: {
      color: colors.buttonAlternativeTextColor,
    },
  });

  useEffect(() => {
    if (lnurl) {
      const ln = new Lnurl(lnurl, AsyncStorage);
      ln.callLnurlPayService()
        .then(setPayload)
        .catch(error => {
          presentAlert({ message: error.message });
          pop();
        });
      setLN(ln);
      setIsLoading(false);
    }
  }, [lnurl]);

  useEffect(() => {
    setPayButtonDisabled(isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (payload && _LN) {
      let originalSatAmount: number | false;
      let newAmount: number | boolean | string = (originalSatAmount = _LN.getMin());
      if (!newAmount) {
        presentAlert({ message: 'Internal error: incorrect LNURL amount' });
        return;
      }
      switch (unit) {
        case BitcoinUnit.BTC:
          newAmount = satoshiToBTC(newAmount);
          break;
        case BitcoinUnit.LOCAL_CURRENCY:
          newAmount = satoshiToLocalCurrency(newAmount, false);
          _cacheFiatToSat[newAmount] = String(originalSatAmount);
          break;
      }
      setAmount(newAmount.toString());
    }
  }, [payload, _LN, unit]);

  const onWalletSelect = (w: TWallet) => {
    setParams({ walletID: w.getID() });
    pop();
  };

  const pay = async () => {
    setPayButtonDisabled(true);
    if (!_LN || !amount) return;

    const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();
    if (isBiometricsEnabled) {
      if (!(await unlockWithBiometrics())) {
        return;
      }
    }

    let amountSats: number | false;
    switch (unit) {
      case BitcoinUnit.SATS:
        amountSats = parseInt(amount, 10);
        break;
      case BitcoinUnit.BTC:
        amountSats = btcToSatoshi(amount);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        if (_cacheFiatToSat[String(amount)]) {
          amountSats = parseInt(_cacheFiatToSat[amount], 10);
        } else {
          amountSats = btcToSatoshi(fiatToBTC(parseFloat(amount)));
        }
        break;
      default:
        throw new Error('Unknown unit type');
    }

    try {
      let comment: string | undefined;
      if (_LN.getCommentAllowed()) {
        comment = await prompt('Comment', '', false, 'plain-text');
      }

      const bolt11payload = await _LN.requestBolt11FromLnurlPayService(amountSats, comment);
      await wallet.payInvoice(bolt11payload.pr);
      const decoded = wallet.decodeInvoice(bolt11payload.pr);
      setPayButtonDisabled(false);

      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      if (wallet.last_paid_invoice_result && wallet.last_paid_invoice_result.payment_preimage) {
        await _LN.storeSuccess(decoded.payment_hash, wallet.last_paid_invoice_result.payment_preimage);
      }

      navigate('ScanLndInvoiceRoot', {
        screen: 'LnurlPaySuccess',
        params: {
          paymentHash: decoded.payment_hash,
          justPaid: true,
          fromWalletID: walletID,
        },
      });
      setIsLoading(false);
    } catch (err) {
      console.log((err as Error).message);
      setIsLoading(false);
      setPayButtonDisabled(false);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      return presentAlert({ message: (err as Error).message });
    }
  };

  const renderWalletSelectionButton = (
    <View style={styles.walletSelectRoot}>
      {!isLoading && (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.walletSelectTouch}
          onPress={() => navigate('SelectWallet', { onWalletSelect, chainType: Chain.OFFCHAIN })}
        >
          <Text style={styles.walletSelectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
          <Icon name={I18nManager.isRTL ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
        </TouchableOpacity>
      )}
      <View style={styles.walletWrap}>
        <TouchableOpacity
          accessibilityRole="button"
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

  const renderGotPayload = () => {
    return (
      <SafeArea>
        <ScrollView contentContainerStyle={styles.scrollviewContainer}>
          <BlueCard>
            <AmountInput
              isLoading={isLoading}
              amount={amount}
              onAmountUnitChange={setUnit}
              onChangeText={setAmount}
              disabled={payload && payload.fixed}
              unit={unit}
              inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
            />
            <DismissKeyboardInputAccessory />
            <BlueText style={styles.alignSelfCenter}>
              {loc.formatString(loc.lndViewInvoice.please_pay_between_and, {
                min: formatBalance(payload?.min, unit),
                max: formatBalance(payload?.max, unit),
              })}
            </BlueText>
            <BlueSpacing20 />
            {payload?.image && (
              <>
                <Image style={styles.img} source={{ uri: payload?.image }} />
                <BlueSpacing20 />
              </>
            )}
            <BlueText style={styles.alignSelfCenter}>{payload?.description}</BlueText>
            <BlueText style={styles.alignSelfCenter}>{payload?.domain}</BlueText>
            <BlueSpacing20 />
            {payButtonDisabled ? <BlueLoading /> : <Button title={loc.lnd.payButton} onPress={pay} />}
            <BlueSpacing20 />
          </BlueCard>
        </ScrollView>
        {renderWalletSelectionButton}
      </SafeArea>
    );
  };

  return isLoading || !wallet || amount === undefined ? (
    <View style={[styles.root, stylesHook.root]}>
      <BlueLoading />
    </View>
  ) : (
    renderGotPayload()
  );
};

export default LnurlPay;

const styles = StyleSheet.create({
  scrollviewContainer: { justifyContent: 'space-around' },
  img: { width: 200, height: 200, alignSelf: 'center' },
  alignSelfCenter: {
    alignSelf: 'center',
  },
  root: {
    flex: 1,
    justifyContent: 'center',
  },
  walletSelectRoot: {
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
});
