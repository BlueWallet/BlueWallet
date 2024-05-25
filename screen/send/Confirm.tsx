import React, { useContext, useEffect, useMemo, useReducer } from 'react';
import { ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, Switch, View } from 'react-native';
import { Text } from 'react-native-elements';
import { PayjoinClient } from 'payjoin-client';
import BigNumber from 'bignumber.js';
import * as bitcoin from 'bitcoinjs-lib';
import { BlueText, BlueCard } from '../../BlueComponents';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';
import Notifications from '../../blue_modules/notifications';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import presentAlert from '../../components/Alert';
import { useTheme } from '../../components/themes';
import Button from '../../components/Button';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import SafeArea from '../../components/SafeArea';
import { satoshiToBTC, satoshiToLocalCurrency } from '../../blue_modules/currency';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { useBiometrics } from '../../hooks/useBiometrics';
import { TWallet, CreateTransactionTarget } from '../../class/wallets/types';
import PayjoinTransaction from '../../class/payjoin-transaction';
import debounce from '../../blue_modules/debounce';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

enum ActionType {
  SET_LOADING = 'SET_LOADING',
  SET_PAYJOIN_ENABLED = 'SET_PAYJOIN_ENABLED',
  SET_BUTTON_DISABLED = 'SET_BUTTON_DISABLED',
}

type Action =
  | { type: ActionType.SET_LOADING; payload: boolean }
  | { type: ActionType.SET_PAYJOIN_ENABLED; payload: boolean }
  | { type: ActionType.SET_BUTTON_DISABLED; payload: boolean };

interface State {
  isLoading: boolean;
  isPayjoinEnabled: boolean;
  isButtonDisabled: boolean;
}

const initialState: State = {
  isLoading: false,
  isPayjoinEnabled: false,
  isButtonDisabled: false,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionType.SET_PAYJOIN_ENABLED:
      return { ...state, isPayjoinEnabled: action.payload };
    case ActionType.SET_BUTTON_DISABLED:
      return { ...state, isButtonDisabled: action.payload };
    default:
      return state;
  }
};

type ConfirmRouteProp = RouteProp<SendDetailsStackParamList, 'Confirm'>;
type ConfirmNavigationProp = NativeStackNavigationProp<SendDetailsStackParamList, 'Confirm'>;

const Confirm: React.FC = () => {
  const { wallets, fetchAndSaveWalletTransactions, isElectrumDisabled } = useContext(BlueStorageContext);
  const { isBiometricUseCapableAndEnabled, unlockWithBiometrics } = useBiometrics();
  const navigation = useExtendedNavigation<ConfirmNavigationProp>();
  const route = useRoute<ConfirmRouteProp>(); // Get the route and its params
  const { recipients, walletID, fee, memo, tx, satoshiPerByte, psbt, payjoinUrl } = route.params; // Destructure params

  const [state, dispatch] = useReducer(reducer, initialState);
  const { navigate, setOptions, goBack } = navigation;
  const wallet = wallets.find((w: TWallet) => w.getID() === walletID) as TWallet;
  const feeSatoshi = new BigNumber(fee).multipliedBy(100000000).toNumber();
  const { colors } = useTheme();

  useEffect(() => {
    if (!wallet) {
      goBack();
    }
  }, [wallet, goBack]);

  const stylesHook = StyleSheet.create({
    transactionDetailsTitle: {
      color: colors.foregroundColor,
    },
    transactionDetailsSubtitle: {
      color: colors.feeText,
    },
    transactionAmountFiat: {
      color: colors.feeText,
    },
    txDetails: {
      backgroundColor: colors.lightButton,
    },
    valueValue: {
      color: colors.alternativeTextColor2,
    },
    valueUnit: {
      color: colors.buttonTextColor,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    payjoinWrapper: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
  });

  const HeaderRightButton = useMemo(
    () => (
      <TouchableOpacity
        accessibilityRole="button"
        testID="TransactionDetailsButton"
        style={[styles.txDetails, stylesHook.txDetails]}
        onPress={async () => {
          if (await isBiometricUseCapableAndEnabled()) {
            if (!(await unlockWithBiometrics())) {
              return;
            }
          }
          navigate('CreateTransaction', {
            fee,
            recipients,
            memo,
            tx,
            satoshiPerByte,
            wallet,
            feeSatoshi,
          });
        }}
      >
        <Text style={[styles.txText, stylesHook.valueUnit]}>{loc.send.create_details}</Text>
      </TouchableOpacity>
    ),
    [
      stylesHook.txDetails,
      stylesHook.valueUnit,
      isBiometricUseCapableAndEnabled,
      navigate,
      fee,
      recipients,
      memo,
      tx,
      satoshiPerByte,
      wallet,
      feeSatoshi,
      unlockWithBiometrics,
    ],
  );

  useEffect(() => {
    console.log('send/confirm - useEffect');
    console.log('address = ', recipients);
  }, [recipients]);

  useEffect(() => {
    setOptions({
      headerRight: () => HeaderRightButton,
    });
  }, [HeaderRightButton, colors, fee, feeSatoshi, memo, recipients, satoshiPerByte, setOptions, tx, wallet]);

  const getPaymentScript = (): Buffer | undefined => {
    if (!(recipients.length > 0) || !recipients[0].address) {
      return undefined;
    }
    return bitcoin.address.toOutputScript(recipients[0].address, bitcoin.networks.bitcoin);
  };

  const send = async () => {
    dispatch({ type: ActionType.SET_BUTTON_DISABLED, payload: true });
    dispatch({ type: ActionType.SET_LOADING, payload: true });
    try {
      const txids2watch = [];
      if (!state.isPayjoinEnabled) {
        await broadcast(tx);
      } else {
        const payJoinWallet = new PayjoinTransaction(psbt, (txHex: string) => broadcast(txHex), wallet);
        const paymentScript = getPaymentScript();
        if (!paymentScript) {
          throw new Error('Invalid payment script');
        }
        const payjoinClient = new PayjoinClient({
          paymentScript,
          wallet: payJoinWallet.getPayjoinPsbt(),
          payjoinUrl: payjoinUrl as string,
        });
        await payjoinClient.run();
        const payjoinPsbt = payJoinWallet.getPayjoinPsbt();
        if (payjoinPsbt) {
          const tx2watch = payjoinPsbt.extractTransaction();
          txids2watch.push(tx2watch.getId());
        }
      }

      const txid = bitcoin.Transaction.fromHex(tx).getId();
      txids2watch.push(txid);
      // @ts-ignore: Notifications has to be TSed
      Notifications.majorTomToGroundControl([], [], txids2watch);
      let amount = 0;
      for (const recipient of recipients) {
        if (recipient.value) {
          amount += recipient.value;
        }
      }

      amount = Number(formatBalanceWithoutSuffix(amount, BitcoinUnit.BTC, false));
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      navigate('Success', {
        fee: Number(fee),
        amount,
      });

      dispatch({ type: ActionType.SET_LOADING, payload: false });

      await new Promise(resolve => setTimeout(resolve, 3000)); // sleep to make sure network propagates
      fetchAndSaveWalletTransactions(walletID);
    } catch (error: any) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      dispatch({ type: ActionType.SET_LOADING, payload: false });
      dispatch({ type: ActionType.SET_BUTTON_DISABLED, payload: false });
      presentAlert({ message: error.message });
    }
  };

  const debouncedSend = debounce(send, 3000);

  const broadcast = async (transaction: string) => {
    await BlueElectrum.ping();
    await BlueElectrum.waitTillConnected();

    if (await isBiometricUseCapableAndEnabled()) {
      if (!(await unlockWithBiometrics())) {
        return;
      }
    }

    const result = await wallet.broadcastTx(transaction);
    if (!result) {
      throw new Error(loc.errors.broadcast);
    }

    return result;
  };

  const renderItem = ({ index, item }: { index: number; item: CreateTransactionTarget }) => {
    return (
      <>
        <View style={styles.valueWrap}>
          <Text testID="TransactionValue" style={[styles.valueValue, stylesHook.valueValue]}>
            {item.value && satoshiToBTC(item.value)}
          </Text>
          <Text style={[styles.valueUnit, stylesHook.valueValue]}>{' ' + loc.units[BitcoinUnit.BTC]}</Text>
        </View>
        <Text style={[styles.transactionAmountFiat, stylesHook.transactionAmountFiat]}>
          {item.value && satoshiToLocalCurrency(item.value)}
        </Text>
        <BlueCard>
          <Text style={[styles.transactionDetailsTitle, stylesHook.transactionDetailsTitle]}>{loc.send.create_to}</Text>
          <Text testID="TransactionAddress" style={[styles.transactionDetailsSubtitle, stylesHook.transactionDetailsSubtitle]}>
            {item.address}
          </Text>
        </BlueCard>
        {recipients.length > 1 && (
          <BlueText style={styles.valueOf}>{loc.formatString(loc._.of, { number: index + 1, total: recipients.length })}</BlueText>
        )}
      </>
    );
  };

  const renderSeparator = () => {
    return <View style={styles.separator} />;
  };

  return (
    <SafeArea style={[styles.root, stylesHook.root]}>
      <View style={styles.cardTop}>
        <FlatList<CreateTransactionTarget>
          scrollEnabled={recipients.length > 1}
          extraData={recipients}
          data={recipients}
          renderItem={renderItem}
          keyExtractor={(_item, index) => `${index}`}
          ItemSeparatorComponent={renderSeparator}
        />
        {!!payjoinUrl && (
          <View style={styles.cardContainer}>
            <BlueCard>
              <View style={[styles.payjoinWrapper, stylesHook.payjoinWrapper]}>
                <Text style={styles.payjoinText}>Payjoin</Text>
                <Switch
                  testID="PayjoinSwitch"
                  value={state.isPayjoinEnabled}
                  onValueChange={value => dispatch({ type: ActionType.SET_PAYJOIN_ENABLED, payload: value })}
                />
              </View>
            </BlueCard>
          </View>
        )}
      </View>
      <View style={styles.cardBottom}>
        <BlueCard>
          <Text style={styles.cardText} testID="TransactionFee">
            {loc.send.create_fee}: {formatBalance(feeSatoshi, BitcoinUnit.BTC)} ({satoshiToLocalCurrency(feeSatoshi)})
          </Text>
          {state.isLoading ? (
            <ActivityIndicator />
          ) : (
            <Button disabled={isElectrumDisabled || state.isButtonDisabled} onPress={debouncedSend} title={loc.send.confirm_sendNow} />
          )}
        </BlueCard>
      </View>
    </SafeArea>
  );
};

export default Confirm;

const styles = StyleSheet.create({
  transactionDetailsTitle: {
    fontWeight: '500',
    fontSize: 17,
    marginBottom: 2,
  },
  transactionDetailsSubtitle: {
    fontWeight: '500',
    fontSize: 15,
    marginBottom: 20,
  },
  transactionAmountFiat: {
    fontWeight: '500',
    fontSize: 15,
    marginVertical: 8,
    textAlign: 'center',
  },
  valueWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  valueValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  valueUnit: {
    fontSize: 16,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  valueOf: {
    alignSelf: 'flex-end',
    marginRight: 18,
    marginVertical: 8,
  },
  separator: {
    height: 0.5,
    margin: 16,
  },
  root: {
    paddingTop: 19,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexGrow: 8,
    marginTop: 16,
    alignItems: 'center',
    maxHeight: '70%',
  },
  cardBottom: {
    flexGrow: 2,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cardContainer: {
    flexGrow: 1,
    width: '100%',
  },
  cardText: {
    flexDirection: 'row',
    color: '#37c0a1',
    fontSize: 14,
    marginVertical: 8,
    marginHorizontal: 24,
    paddingBottom: 6,
    fontWeight: '500',
    alignSelf: 'center',
  },
  txDetails: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    borderRadius: 8,
    height: 38,
  },
  txText: {
    fontSize: 15,
    fontWeight: '600',
  },
  payjoinWrapper: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payjoinText: {
    color: '#81868e',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
