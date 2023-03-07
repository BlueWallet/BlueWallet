import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, StatusBar, BackHandler } from 'react-native';
import { Icon } from 'react-native-elements';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import { BlueButton, BlueCard, BlueLoading, BlueSpacing10, BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import TransactionIncomingIcon from '../../components/icons/TransactionIncomingIcon';
import TransactionOutgoingIcon from '../../components/icons/TransactionOutgoingIcon';
import TransactionPendingIcon from '../../components/icons/TransactionPendingIcon';
import navigationStyle from '../../components/navigationStyle';
import HandoffComponent from '../../components/handoff';
import { HDSegwitBech32Transaction } from '../../class';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';

const buttonStatus = Object.freeze({
  possible: 1,
  unknown: 2,
  notPossible: 3,
});

const TransactionsStatus = () => {
  const { setSelectedWallet, wallets, txMetadata, fetchAndSaveWalletTransactions } = useContext(BlueStorageContext);
  const { hash, walletID } = useRoute().params;
  const { navigate, setOptions, goBack } = useNavigation();
  const { colors } = useTheme();
  const wallet = useRef(wallets.find(w => w.getID() === walletID));
  const [isCPFPPossible, setIsCPFPPossible] = useState();
  const [isRBFBumpFeePossible, setIsRBFBumpFeePossible] = useState();
  const [isRBFCancelPossible, setIsRBFCancelPossible] = useState();
  const [tx, setTX] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const fetchTxInterval = useRef();
  const [intervalMs, setIntervalMs] = useState(1000);
  const [eta, setEta] = useState('');
  const stylesHook = StyleSheet.create({
    value: {
      color: colors.alternativeTextColor2,
    },
    valueUnit: {
      color: colors.alternativeTextColor2,
    },
    iconRoot: {
      backgroundColor: colors.success,
    },
    detailsText: {
      color: colors.buttonTextColor,
    },
    details: {
      backgroundColor: colors.lightButton,
    },
  });

  useEffect(() => {
    setIsCPFPPossible(buttonStatus.unknown);
    setIsRBFBumpFeePossible(buttonStatus.unknown);
    setIsRBFCancelPossible(buttonStatus.unknown);
  }, []);

  useLayoutEffect(() => {
    setOptions({
      headerRight: () => (
        <TouchableOpacity
          accessibilityRole="button"
          testID="TransactionDetailsButton"
          style={[styles.details, stylesHook.details]}
          onPress={navigateToTransactionDetials}
        >
          <Text style={[styles.detailsText, stylesHook.detailsText]}>{loc.send.create_details}</Text>
        </TouchableOpacity>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, tx]);

  useEffect(() => {
    for (const tx of wallet.current.getTransactions()) {
      if (tx.hash === hash) {
        setTX(tx);
        break;
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, wallet.current]);

  useEffect(() => {
    wallet.current = wallets.find(w => w.getID() === walletID);
  }, [walletID, wallets]);

  // re-fetching tx status periodically
  useEffect(() => {
    console.log('transactionStatus - useEffect');

    if (!tx || tx?.confirmations) return;
    if (!hash) return;

    if (fetchTxInterval.current) {
      // interval already exists, lets cleanup it and recreate, so theres no duplicate intervals
      clearInterval(fetchTxInterval.current);
      fetchTxInterval.current = undefined;
    }

    console.log('setting up interval to check tx...');
    fetchTxInterval.current = setInterval(async () => {
      try {
        setIntervalMs(31000); // upon first execution we increase poll interval;

        console.log('checking tx', hash, 'for confirmations...');
        const transactions = await BlueElectrum.multiGetTransactionByTxid([hash], 10, true);
        const txFromElectrum = transactions[hash];
        console.log('got txFromElectrum=', txFromElectrum);

        const address = (txFromElectrum?.vout[0]?.scriptPubKey?.addresses || []).pop();

        if (txFromElectrum && !txFromElectrum.confirmations && txFromElectrum.vsize && address) {
          const txsM = await BlueElectrum.getMempoolTransactionsByAddress(address);
          let txFromMempool;
          // searhcing for a correct tx in case this address has several pending txs:
          for (const tempTxM of txsM) {
            if (tempTxM.tx_hash === hash) txFromMempool = tempTxM;
          }
          if (!txFromMempool) return;
          console.log('txFromMempool=', txFromMempool);

          const satPerVbyte = Math.round(txFromMempool.fee / txFromElectrum.vsize);
          const fees = await BlueElectrum.estimateFees();
          console.log('fees=', fees, 'satPerVbyte=', satPerVbyte);
          if (satPerVbyte >= fees.fast) {
            setEta(loc.formatString(loc.transactions.eta_10m));
          }
          if (satPerVbyte >= fees.medium && satPerVbyte < fees.fast) {
            setEta(loc.formatString(loc.transactions.eta_3h));
          }
          if (satPerVbyte < fees.medium) {
            setEta(loc.formatString(loc.transactions.eta_1d));
          }
        } else if (txFromElectrum.confirmations > 0) {
          // now, handling a case when tx became confirmed!
          ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
          setEta('');
          setTX(prevState => {
            return Object.assign({}, prevState, { confirmations: txFromElectrum.confirmations });
          });
          clearInterval(fetchTxInterval.current);
          fetchTxInterval.current = undefined;
          wallet?.current?.getID() && fetchAndSaveWalletTransactions(wallet.current.getID());
        }
      } catch (error) {
        console.log(error);
      }
    }, intervalMs);
  }, [hash, intervalMs, tx, fetchAndSaveWalletTransactions]);

  const handleBackButton = () => {
    goBack(null);
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
      clearInterval(fetchTxInterval.current);
      fetchTxInterval.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialState = async () => {
    try {
      await checkPossibilityOfCPFP();
      await checkPossibilityOfRBFBumpFee();
      await checkPossibilityOfRBFCancel();
    } catch (e) {
      setIsCPFPPossible(buttonStatus.notPossible);
      setIsRBFBumpFeePossible(buttonStatus.notPossible);
      setIsRBFCancelPossible(buttonStatus.notPossible);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initialState();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, wallets]);

  useEffect(() => {
    const walletID = wallet.current?.getID();
    if (walletID) {
      setSelectedWallet(wallet.current?.getID());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.current]);

  useEffect(() => {
    console.log('transactionStatus - useEffect');
  }, []);

  const checkPossibilityOfCPFP = async () => {
    if (!wallet.current.allowRBF()) {
      return setIsCPFPPossible(buttonStatus.notPossible);
    }

    const cpfbTx = new HDSegwitBech32Transaction(null, tx.hash, wallet.current);
    if ((await cpfbTx.isToUsTransaction()) && (await cpfbTx.getRemoteConfirmationsNum()) === 0) {
      return setIsCPFPPossible(buttonStatus.possible);
    } else {
      return setIsCPFPPossible(buttonStatus.notPossible);
    }
  };

  const checkPossibilityOfRBFBumpFee = async () => {
    if (!wallet.current.allowRBF()) {
      return setIsRBFBumpFeePossible(buttonStatus.notPossible);
    }

    const rbfTx = new HDSegwitBech32Transaction(null, tx.hash, wallet.current);
    if (
      (await rbfTx.isOurTransaction()) &&
      (await rbfTx.getRemoteConfirmationsNum()) === 0 &&
      (await rbfTx.isSequenceReplaceable()) &&
      (await rbfTx.canBumpTx())
    ) {
      return setIsRBFBumpFeePossible(buttonStatus.possible);
    } else {
      return setIsRBFBumpFeePossible(buttonStatus.notPossible);
    }
  };

  const checkPossibilityOfRBFCancel = async () => {
    if (!wallet.current.allowRBF()) {
      return setIsRBFCancelPossible(buttonStatus.notPossible);
    }

    const rbfTx = new HDSegwitBech32Transaction(null, tx.hash, wallet.current);
    if (
      (await rbfTx.isOurTransaction()) &&
      (await rbfTx.getRemoteConfirmationsNum()) === 0 &&
      (await rbfTx.isSequenceReplaceable()) &&
      (await rbfTx.canCancelTx())
    ) {
      return setIsRBFCancelPossible(buttonStatus.possible);
    } else {
      return setIsRBFCancelPossible(buttonStatus.notPossible);
    }
  };

  const navigateToRBFBumpFee = () => {
    navigate('RBFBumpFee', {
      txid: tx.hash,
      wallet: wallet.current,
    });
  };

  const navigateToRBFCancel = () => {
    navigate('RBFCancel', {
      txid: tx.hash,
      wallet: wallet.current,
    });
  };

  const navigateToCPFP = () => {
    navigate('CPFP', {
      txid: tx.hash,
      wallet: wallet.current,
    });
  };
  const navigateToTransactionDetials = () => {
    navigate('TransactionDetails', { hash: tx.hash });
  };

  const renderCPFP = () => {
    if (isCPFPPossible === buttonStatus.unknown) {
      return (
        <>
          <ActivityIndicator />
          <BlueSpacing20 />
        </>
      );
    } else if (isCPFPPossible === buttonStatus.possible) {
      return (
        <>
          <BlueButton onPress={navigateToCPFP} title={loc.transactions.status_bump} />
          <BlueSpacing10 />
        </>
      );
    }
  };

  const renderRBFCancel = () => {
    if (isRBFCancelPossible === buttonStatus.unknown) {
      return (
        <>
          <ActivityIndicator />
        </>
      );
    } else if (isRBFCancelPossible === buttonStatus.possible) {
      return (
        <>
          <TouchableOpacity accessibilityRole="button" style={styles.cancel}>
            <Text onPress={navigateToRBFCancel} style={styles.cancelText}>
              {loc.transactions.status_cancel}
            </Text>
          </TouchableOpacity>
          <BlueSpacing10 />
        </>
      );
    }
  };

  const renderRBFBumpFee = () => {
    if (isRBFBumpFeePossible === buttonStatus.unknown) {
      return (
        <>
          <ActivityIndicator />
          <BlueSpacing20 />
        </>
      );
    } else if (isRBFBumpFeePossible === buttonStatus.possible) {
      return (
        <>
          <BlueButton onPress={navigateToRBFBumpFee} title={loc.transactions.status_bump} />
          <BlueSpacing10 />
        </>
      );
    }
  };

  const renderTXMetadata = () => {
    if (txMetadata[tx.hash]) {
      if (txMetadata[tx.hash].memo) {
        return (
          <View style={styles.memo}>
            <Text style={styles.memoText}>{txMetadata[tx.hash].memo}</Text>
            <BlueSpacing20 />
          </View>
        );
      }
    }
  };

  if (isLoading || !tx) {
    return (
      <SafeBlueArea>
        <BlueLoading />
      </SafeBlueArea>
    );
  }
  return (
    <SafeBlueArea>
      <HandoffComponent
        title={loc.transactions.details_title}
        type={HandoffComponent.activityTypes.ViewInBlockExplorer}
        url={`https://mempool.space/tx/${tx.hash}`}
      />

      <StatusBar barStyle="default" />
      <View style={styles.container}>
        <BlueCard>
          <View style={styles.center}>
            <Text style={[styles.value, stylesHook.value]}>
              {formatBalanceWithoutSuffix(tx.value, wallet.current.preferredBalanceUnit, true)}{' '}
              {wallet.current.preferredBalanceUnit !== BitcoinUnit.LOCAL_CURRENCY && (
                <Text style={[styles.valueUnit, stylesHook.valueUnit]}>{loc.units[wallet.current.preferredBalanceUnit]}</Text>
              )}
            </Text>
          </View>

          {renderTXMetadata()}

          <View style={[styles.iconRoot, stylesHook.iconRoot]}>
            <View>
              <Icon name="check" size={50} type="font-awesome" color={colors.successCheck} />
            </View>
            <View style={[styles.iconWrap, styles.margin]}>
              {(() => {
                if (!tx.confirmations) {
                  return (
                    <View style={styles.icon}>
                      <TransactionPendingIcon />
                    </View>
                  );
                } else if (tx.value < 0) {
                  return (
                    <View style={styles.icon}>
                      <TransactionOutgoingIcon />
                    </View>
                  );
                } else {
                  return (
                    <View style={styles.icon}>
                      <TransactionIncomingIcon />
                    </View>
                  );
                }
              })()}
            </View>
          </View>

          {tx.fee && (
            <View style={styles.fee}>
              <BlueText style={styles.feeText}>
                {loc.send.create_fee.toLowerCase()} {formatBalanceWithoutSuffix(tx.fee, wallet.current.preferredBalanceUnit, true)}{' '}
                {wallet.current.preferredBalanceUnit !== BitcoinUnit.LOCAL_CURRENCY && wallet.current.preferredBalanceUnit}
              </BlueText>
            </View>
          )}

          <View style={styles.confirmations}>
            <Text style={styles.confirmationsText}>
              {loc.formatString(loc.transactions.confirmations_lowercase, {
                confirmations: tx.confirmations > 6 ? '6+' : tx.confirmations,
              })}
            </Text>
          </View>
          {eta ? (
            <View style={styles.eta}>
              <BlueSpacing10 />
              <Text style={styles.confirmationsText}>{eta}</Text>
            </View>
          ) : null}
        </BlueCard>

        <View style={styles.actions}>
          {renderCPFP()}
          {renderRBFBumpFee()}
          {renderRBFCancel()}
        </View>
      </View>
    </SafeBlueArea>
  );
};

export default TransactionsStatus;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
  },
  value: {
    fontSize: 36,
    fontWeight: '600',
  },
  valueUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  memo: {
    alignItems: 'center',
    marginVertical: 8,
  },
  memoText: {
    color: '#9aa0aa',
    fontSize: 14,
  },
  iconRoot: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: 43,
    marginBottom: 53,
  },
  iconWrap: {
    minWidth: 30,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    borderRadius: 15,
  },
  margin: {
    marginBottom: -40,
  },
  icon: {
    width: 25,
  },
  fee: {
    marginTop: 15,
    marginBottom: 13,
  },
  feeText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    color: '#00c49f',
    alignSelf: 'center',
  },
  confirmations: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationsText: {
    color: '#9aa0aa',
    fontSize: 13,
  },
  eta: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    alignSelf: 'center',
    justifyContent: 'center',
  },
  cancel: {
    marginVertical: 16,
  },
  cancelText: {
    color: '#d0021b',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  details: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    borderRadius: 8,
    height: 34,
  },
  detailsText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

TransactionsStatus.navigationOptions = navigationStyle(
  {
    headerTitle: '',
  },
  (options, { theme }) => ({
    ...options,
    headerStyle: {
      backgroundColor: theme.colors.customHeader,
      borderBottomWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      shadowOffset: { height: 0, width: 0 },
    },
  }),
);
