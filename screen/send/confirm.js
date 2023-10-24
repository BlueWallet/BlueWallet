import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, Switch, View } from 'react-native';
import { Text } from 'react-native-elements';
import { PayjoinClient } from 'payjoin-client';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';

import PayjoinTransaction from '../../class/payjoin-transaction';
import { BlueButton, BlueText, SafeBlueArea, BlueCard } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import Biometric from '../../class/biometrics';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';
import Notifications from '../../blue_modules/notifications';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { Psbt } from 'bitcoinjs-lib';
import { useNavigation, useRoute } from '@react-navigation/native';
import alert from '../../components/Alert';
import { useTheme } from '../../components/themes';
const currency = require('../../blue_modules/currency');
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const Bignumber = require('bignumber.js');
const bitcoin = require('bitcoinjs-lib');
const torrific = require('../../blue_modules/torrific');

const Confirm = () => {
  const { wallets, fetchAndSaveWalletTransactions, isElectrumDisabled, isTorDisabled } = useContext(BlueStorageContext);
  const [isBiometricUseCapableAndEnabled, setIsBiometricUseCapableAndEnabled] = useState(false);
  const { params } = useRoute();
  const { recipients = [], walletID, fee, memo, tx, satoshiPerByte, psbt } = params;
  const [isLoading, setIsLoading] = useState(false);
  const [isPayjoinEnabled, setIsPayjoinEnabled] = useState(false);
  const wallet = wallets.find(w => w.getID() === walletID);
  const payjoinUrl = wallet.allowPayJoin() ? params.payjoinUrl : false;
  const feeSatoshi = new Bignumber(fee).multipliedBy(100000000).toNumber();
  const { navigate, setOptions } = useNavigation();
  const { colors } = useTheme();
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

  useEffect(() => {
    console.log('send/confirm - useEffect');
    console.log('address = ', recipients);
    Biometric.isBiometricUseCapableAndEnabled().then(setIsBiometricUseCapableAndEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity
          accessibilityRole="button"
          testID="TransactionDetailsButton"
          style={[styles.txDetails, stylesHook.txDetails]}
          onPress={async () => {
            if (isBiometricUseCapableAndEnabled) {
              if (!(await Biometric.unlockWithBiometrics())) {
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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, fee, feeSatoshi, isBiometricUseCapableAndEnabled, memo, recipients, satoshiPerByte, tx, wallet]);

  /**
   * we need to look into `recipients`, find destination address and return its outputScript
   * (needed for payjoin)
   *
   * @return {string}
   */
  const getPaymentScript = () => {
    return bitcoin.address.toOutputScript(recipients[0].address);
  };

  const send = async () => {
    setIsLoading(true);
    try {
      const txids2watch = [];
      if (!isPayjoinEnabled) {
        await broadcast(tx);
      } else {
        const payJoinWallet = new PayjoinTransaction(psbt, txHex => broadcast(txHex), wallet);
        const paymentScript = getPaymentScript();
        let payjoinClient;
        if (!isTorDisabled && payjoinUrl.includes('.onion')) {
          console.warn('trying TOR....');
          // working through TOR - crafting custom requester that will handle TOR http request
          const customPayjoinRequester = {
            requestPayjoin: async function (psbt2) {
              console.warn('requesting payjoin with psbt:', psbt2.toBase64());
              const api = new torrific.Torsbee();
              const torResponse = await api.post(payjoinUrl, {
                headers: {
                  'Content-Type': 'text/plain',
                },
                body: psbt2.toBase64(),
              });
              console.warn('got torResponse.body');
              if (!torResponse.body) throw new Error('TOR failure, got ' + JSON.stringify(torResponse));
              return Psbt.fromBase64(torResponse.body);
            },
          };
          payjoinClient = new PayjoinClient({
            paymentScript,
            wallet: payJoinWallet,
            payjoinRequester: customPayjoinRequester,
          });
        } else {
          payjoinClient = new PayjoinClient({
            paymentScript,
            wallet: payJoinWallet,
            payjoinUrl,
          });
        }
        await payjoinClient.run();
        const payjoinPsbt = payJoinWallet.getPayjoinPsbt();
        if (payjoinPsbt) {
          const tx2watch = payjoinPsbt.extractTransaction();
          txids2watch.push(tx2watch.getId());
        }
      }

      const txid = bitcoin.Transaction.fromHex(tx).getId();
      txids2watch.push(txid);
      Notifications.majorTomToGroundControl([], [], txids2watch);
      let amount = 0;
      for (const recipient of recipients) {
        amount += recipient.value;
      }

      amount = formatBalanceWithoutSuffix(amount, BitcoinUnit.BTC, false);
      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
      navigate('Success', {
        fee: Number(fee),
        amount,
      });

      setIsLoading(false);

      await new Promise(resolve => setTimeout(resolve, 3000)); // sleep to make sure network propagates
      fetchAndSaveWalletTransactions(walletID);
    } catch (error) {
      ReactNativeHapticFeedback.trigger('notificationError', {
        ignoreAndroidSystemSettings: false,
      });
      setIsLoading(false);
      alert(error.message);
    }
  };

  const broadcast = async transaction => {
    await BlueElectrum.ping();
    await BlueElectrum.waitTillConnected();

    if (isBiometricUseCapableAndEnabled) {
      if (!(await Biometric.unlockWithBiometrics())) {
        return;
      }
    }

    const result = await wallet.broadcastTx(transaction);
    if (!result) {
      throw new Error(loc.errors.broadcast);
    }

    return result;
  };

  const _renderItem = ({ index, item }) => {
    return (
      <>
        <View style={styles.valueWrap}>
          <Text testID="TransactionValue" style={[styles.valueValue, stylesHook.valueValue]}>
            {currency.satoshiToBTC(item.value)}
          </Text>
          <Text style={[styles.valueUnit, stylesHook.valueValue]}>{' ' + loc.units[BitcoinUnit.BTC]}</Text>
        </View>
        <Text style={[styles.transactionAmountFiat, stylesHook.transactionAmountFiat]}>{currency.satoshiToLocalCurrency(item.value)}</Text>
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
  _renderItem.propTypes = {
    index: PropTypes.number.isRequired,
    item: PropTypes.object.isRequired,
  };

  const renderSeparator = () => {
    return <View style={styles.separator} />;
  };

  return (
    <SafeBlueArea style={[styles.root, stylesHook.root]}>
      <View style={styles.cardTop}>
        <FlatList
          scrollEnabled={recipients.length > 1}
          extraData={recipients}
          data={recipients}
          renderItem={_renderItem}
          keyExtractor={(_item, index) => `${index}`}
          ItemSeparatorComponent={renderSeparator}
        />
        {!!payjoinUrl && (
          <View style={styles.cardContainer}>
            <BlueCard>
              <View style={[styles.payjoinWrapper, stylesHook.payjoinWrapper]}>
                <Text style={styles.payjoinText}>Payjoin</Text>
                <Switch testID="PayjoinSwitch" value={isPayjoinEnabled} onValueChange={setIsPayjoinEnabled} />
              </View>
            </BlueCard>
          </View>
        )}
      </View>
      <View style={styles.cardBottom}>
        <BlueCard>
          <Text style={styles.cardText} testID="TransactionFee">
            {loc.send.create_fee}: {formatBalance(feeSatoshi, BitcoinUnit.BTC)} ({currency.satoshiToLocalCurrency(feeSatoshi)})
          </Text>
          {isLoading ? <ActivityIndicator /> : <BlueButton disabled={isElectrumDisabled} onPress={send} title={loc.send.confirm_sendNow} />}
        </BlueCard>
      </View>
    </SafeBlueArea>
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

Confirm.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.send.confirm_header }));
