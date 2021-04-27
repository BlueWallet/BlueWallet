/* global alert */
import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, Switch, View } from 'react-native';
import { Text } from 'react-native-elements';
import { PayjoinClient } from 'payjoin-client';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import PayjoinTransaction from '../../class/payjoin-transaction';
import { BlueButton, BlueText, SafeBlueArea, BlueCard } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import Biometric from '../../class/biometrics';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';
import Notifications from '../../blue_modules/notifications';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { Psbt } from 'bitcoinjs-lib';
import { useNavigation, useRoute } from '@react-navigation/core';
import { useTheme } from '@react-navigation/native';
const currency = require('../../blue_modules/currency');
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const Bignumber = require('bignumber.js');
const bitcoin = require('bitcoinjs-lib');
const torrific = require('../../blue_modules/torrific');

const Confirm = () => {
  const { fetchAndSaveWalletTransactions, wallets } = useContext(BlueStorageContext);
  const { params } = useRoute();
  const {
    psbt,
    fee,
    feeSatoshi = new Bignumber(fee).multipliedBy(100000000).toNumber(),
    memo,
    recipients,
    walletID,
    tx,
    satoshiPerByte,
  } = params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const payjoinUrl = wallet.allowPayJoin() ? params.payjoinUrl : false;
  const [isPayjoinEnabled, setIsPayjoinEnabled] = useState(false);
  const [isBiometricUseCapableAndEnabled, setIsBiometricUseCapableAndEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { navigate } = useNavigation();
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

    valueValue: {
      color: colors.alternativeTextColor2,
    },
    valueUnit: {
      color: colors.alternativeTextColor2,
    },
    root: {
      backgroundColor: colors.elevated,
    },

    feeHelper: {
      color: colors.feeText,
    },
    feeBTC: {
      color: colors.receiveText,
    },

    txText: {
      color: colors.feeText,
    },
    payjoinWrapper: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    payjoinText: {
      color: colors.foregroundColor,
    },
  });

  useEffect(() => {
    console.log('send/confirm - useEffect');
    console.log('address = ', recipients);
    if (!recipients || !recipients.length) alert('Internal error: recipients list empty (this should never happen)');
    Biometric.isBiometricUseCapableAndEnabled().then(setIsBiometricUseCapableAndEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * we need to look into `recipients`, find destination address and return its outputScript
   * (needed for payjoin)
   *
   * @return {string}
   */
  const getPaymentScript = () => {
    for (const recipient of recipients) {
      return bitcoin.address.toOutputScript(recipient.address);
    }
  };

  const send = async () => {
    setIsLoading(true);
    try {
      const txids2watch = [];
      if (!isPayjoinEnabled) {
        await broadcast(tx);
      } else {
        const walletPJTx = new PayjoinTransaction(psbt, txHex => broadcast(txHex), wallet);
        const paymentScript = getPaymentScript();
        let payjoinClient;
        if (payjoinUrl.includes('.onion')) {
          console.warn('trying TOR....');

          // working through TOR - crafting custom requester that will handle TOR http request
          const customPayjoinRequester = {
            requestPayjoin: async function (psbt: Psbt) {
              console.warn('requesting payjoin with psbt:', psbt.toBase64());
              const api = new torrific.Torsbee();
              const torResponse = await api.post(payjoinUrl, {
                headers: {
                  'Content-Type': 'text/plain',
                },
                body: psbt.toBase64(),
              });
              console.warn('got torResponse.body');
              if (!torResponse.body) throw new Error('TOR failure, got ' + JSON.stringify(torResponse));
              return Psbt.fromBase64(torResponse.body);
            },
          };
          payjoinClient = new PayjoinClient({
            paymentScript,
            walletPJTx,
            payjoinRequester: customPayjoinRequester,
          });
        } else {
          payjoinClient = new PayjoinClient({
            paymentScript,
            walletPJTx,
            payjoinUrl,
          });
        }
        await payjoinClient.run();
        const payjoinPsbt = walletPJTx.getPayjoinPsbt();
        if (payjoinPsbt) {
          const tx = payjoinPsbt.extractTransaction();
          txids2watch.push(tx.getId());
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

  const broadcast = async tx => {
    await BlueElectrum.ping();
    await BlueElectrum.waitTillConnected();

    if (isBiometricUseCapableAndEnabled) {
      if (!(await Biometric.unlockWithBiometrics())) {
        return;
      }
    }

    const result = await wallet.broadcastTx(tx);
    if (!result) {
      throw new Error(loc.errors.broadcast);
    }

    return result;
  };

  // eslint-disable-next-line react/prop-types
  const _renderItem = ({ index, item }) => {
    return (
      <>
        <View style={styles.valueWrap}>
          <Text testID="TransactionValue" style={[styles.valueValue, stylesHook.valueValue]}>
            {
              // eslint-disable-next-line react/prop-types
              currency.satoshiToBTC(item.value)
            }
          </Text>
          <Text style={[styles.valueUnit, stylesHook.valueUnit]}>{' ' + loc.units[BitcoinUnit.BTC]}</Text>
        </View>
        <Text style={[styles.transactionAmountFiat, stylesHook.transactionAmountFiat]}>
          {
            // eslint-disable-next-line react/prop-types
            currency.satoshiToLocalCurrency(item.value)
          }
        </Text>
        <BlueCard>
          <Text style={[styles.transactionDetailsTitle, stylesHook.transactionDetailsTitle]}>{loc.send.create_to}</Text>
          <Text testID="TransactionAddress" style={[styles.transactionDetailsSubtitle, stylesHook.transactionDetailsSubtitle]}>
            {
              // eslint-disable-next-line react/prop-types
              item.address
            }
          </Text>
        </BlueCard>
        {recipients.length > 1 && (
          <BlueText style={styles.valueOf}>{loc.formatString(loc._.of, { number: index + 1, total: recipients.length })}</BlueText>
        )}
      </>
    );
  };

  const renderSeparator = <View style={styles.separator} />;

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
                <Text style={[styles.payjoinText, stylesHook.payjoinText]}>Payjoin</Text>
                <Switch testID="PayjoinSwitch" value={isPayjoinEnabled} onValueChange={setIsPayjoinEnabled} />
              </View>
            </BlueCard>
          </View>
        )}
      </View>
      <View style={styles.cardBottom}>
        <BlueCard>
          <View style={styles.cardText}>
            <Text style={[styles.feeHelper, stylesHook.feeHelper]}>
              {loc.send.create_fee} {currency.satoshiToLocalCurrency(feeSatoshi)} -
            </Text>
            <Text style={[styles.feeBTC, stylesHook.feeBTC]} testID="TransactionFee">
              {formatBalance(feeSatoshi, BitcoinUnit.BTC)}
            </Text>
          </View>
          {isLoading ? <ActivityIndicator /> : <BlueButton onPress={send} title={loc.send.confirm_sendNow} />}

          <TouchableOpacity
            testID="TransactionDetailsButton"
            style={styles.txDetails}
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
            <Text style={[styles.txText, stylesHook.txText]}>{loc.transactions.details_transaction_details}</Text>
          </TouchableOpacity>
        </BlueCard>
      </View>
    </SafeBlueArea>
  );
};

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
  },
  cardBottom: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cardContainer: {
    flexGrow: 2,
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
  feeHelper: {
    marginRight: 4,
  },
  feeBTC: {
    fontWeight: '600',
  },
  txDetails: {
    marginTop: 24,
  },
  txText: {
    fontSize: 15,
    fontWeight: '500',
    alignSelf: 'center',
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
    fontSize: 15,
    fontWeight: 'bold',
  },
});

Confirm.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    dismiss: PropTypes.func,
    navigate: PropTypes.func,
    dangerouslyGetParent: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.object,
  }),
};

Confirm.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.send.confirm_header }));

export default Confirm;
