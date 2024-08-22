import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@rneui/themed';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueCard, BlueLoading, BlueSpacing10, BlueSpacing20, BlueText } from '../../BlueComponents';
import { HDSegwitBech32Transaction, HDSegwitBech32Wallet } from '../../class';
import { Transaction } from '../../class/wallets/types';
import Button from '../../components/Button';
import HandOffComponent from '../../components/HandOffComponent';
import TransactionIncomingIcon from '../../components/icons/TransactionIncomingIcon';
import TransactionOutgoingIcon from '../../components/icons/TransactionOutgoingIcon';
import TransactionPendingIcon from '../../components/icons/TransactionPendingIcon';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { HandOffActivityType } from '../../components/types';
import HeaderRightButton from '../../components/HeaderRightButton';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

enum ButtonStatus {
  Possible,
  Unknown,
  NotPossible,
}

type RouteProps = RouteProp<DetailViewStackParamList, 'TransactionStatus'>;

interface TransactionStatusProps {
  route: RouteProps;
  navigation: NativeStackNavigationProp<any>;
}

enum ActionType {
  SetCPFPPossible,
  SetRBFBumpFeePossible,
  SetRBFCancelPossible,
  SetTransaction,
  SetLoading,
  SetEta,
  SetIntervalMs,
  SetAllButtonStatus,
}

interface State {
  isCPFPPossible: ButtonStatus;
  isRBFBumpFeePossible: ButtonStatus;
  isRBFCancelPossible: ButtonStatus;
  tx: any;
  isLoading: boolean;
  eta: string;
  intervalMs: number;
}

const initialState: State = {
  isCPFPPossible: ButtonStatus.Unknown,
  isRBFBumpFeePossible: ButtonStatus.Unknown,
  isRBFCancelPossible: ButtonStatus.Unknown,
  tx: undefined,
  isLoading: true,
  eta: '',
  intervalMs: 1000,
};

const reducer = (state: State, action: { type: ActionType; payload?: any }): State => {
  switch (action.type) {
    case ActionType.SetCPFPPossible:
      return { ...state, isCPFPPossible: action.payload };
    case ActionType.SetRBFBumpFeePossible:
      return { ...state, isRBFBumpFeePossible: action.payload };
    case ActionType.SetRBFCancelPossible:
      return { ...state, isRBFCancelPossible: action.payload };
    case ActionType.SetTransaction:
      return { ...state, tx: action.payload };
    case ActionType.SetLoading:
      return { ...state, isLoading: action.payload };
    case ActionType.SetEta:
      return { ...state, eta: action.payload };
    case ActionType.SetIntervalMs:
      return { ...state, intervalMs: action.payload };
    case ActionType.SetAllButtonStatus:
      return { ...state, isCPFPPossible: action.payload, isRBFBumpFeePossible: action.payload, isRBFCancelPossible: action.payload };
    default:
      return state;
  }
};

const TransactionStatus = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isCPFPPossible, isRBFBumpFeePossible, isRBFCancelPossible, tx, isLoading, eta, intervalMs } = state;
  const { setSelectedWalletID, wallets, txMetadata, counterpartyMetadata, fetchAndSaveWalletTransactions } = useStorage();
  const { hash, walletID } = useRoute<TransactionStatusProps['route']>().params;
  const { navigate, setOptions, goBack } = useNavigation<TransactionStatusProps['navigation']>();
  const { colors } = useTheme();
  const wallet = useRef(wallets.find(w => w.getID() === walletID));
  const fetchTxInterval = useRef<NodeJS.Timeout>();
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
  });

  // Dispatch Calls

  const setTX = (value: any) => {
    dispatch({ type: ActionType.SetTransaction, payload: value });
  };

  const setIntervalMs = (ms: number) => {
    dispatch({ type: ActionType.SetIntervalMs, payload: ms });
  };

  const setEta = (value: string) => {
    dispatch({ type: ActionType.SetEta, payload: value });
  };

  const setAllButtonStatus = (status: ButtonStatus) => {
    dispatch({ type: ActionType.SetAllButtonStatus, payload: status });
  };

  const setIsLoading = (value: boolean) => {
    dispatch({ type: ActionType.SetLoading, payload: value });
  };

  const setIsCPFPPossible = (status: ButtonStatus) => {
    dispatch({ type: ActionType.SetCPFPPossible, payload: status });
  };

  const setIsRBFBumpFeePossible = (status: ButtonStatus) => {
    dispatch({ type: ActionType.SetRBFBumpFeePossible, payload: status });
  };

  const setIsRBFCancelPossible = (status: ButtonStatus) => {
    dispatch({ type: ActionType.SetRBFCancelPossible, payload: status });
  };

  //

  const navigateToTransactionDetails = useCallback(() => {
    navigate('TransactionDetails', { hash, walletID });
  }, [hash, navigate, walletID]);

  const DetailsButton = useMemo(
    () => (
      <HeaderRightButton
        testID="TransactionDetailsButton"
        disabled={false}
        title={loc.send.create_details}
        onPress={navigateToTransactionDetails}
      />
    ),
    [navigateToTransactionDetails],
  );

  useEffect(() => {
    setOptions({
      headerRight: () => DetailsButton,
    });
  }, [DetailsButton, colors, hash, setOptions]);

  useEffect(() => {
    if (wallet.current) {
      const transactions = wallet.current.getTransactions();
      const newTx = transactions.find((t: Transaction) => t.hash === hash);
      if (newTx) {
        setTX(newTx);
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
        const transactions = await BlueElectrum.multiGetTransactionByTxid([hash], true, 10);
        const txFromElectrum = transactions[hash];
        if (!txFromElectrum) return;

        console.log('got txFromElectrum=', txFromElectrum);

        const address = (txFromElectrum?.vout[0]?.scriptPubKey?.addresses || []).pop();
        if (!address) return;

        if (!txFromElectrum.confirmations && txFromElectrum.vsize) {
          const txsM = await BlueElectrum.getMempoolTransactionsByAddress(address);
          let txFromMempool;
          // searching for a correct tx in case this address has several pending txs:
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
        } else if (txFromElectrum.confirmations && txFromElectrum.confirmations > 0) {
          // now, handling a case when tx became confirmed!
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
          setEta('');
          setTX((prevState: any) => {
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
    goBack();
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

  const initialButtonsState = async () => {
    try {
      await checkPossibilityOfCPFP();
      await checkPossibilityOfRBFBumpFee();
      await checkPossibilityOfRBFCancel();
    } catch (e) {
      setAllButtonStatus(ButtonStatus.NotPossible);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initialButtonsState();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, wallets]);

  useEffect(() => {
    const wID = wallet.current?.getID();
    if (wID) {
      setSelectedWalletID(wallet.current?.getID());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.current]);

  useEffect(() => {
    console.log('transactionStatus - useEffect');
  }, []);

  const checkPossibilityOfCPFP = async () => {
    if (!wallet.current?.allowRBF()) {
      return setIsCPFPPossible(ButtonStatus.NotPossible);
    }

    if (wallet.current) {
      const cpfbTx = new HDSegwitBech32Transaction(null, tx.hash, wallet.current as HDSegwitBech32Wallet);
      if ((await cpfbTx.isToUsTransaction()) && (await cpfbTx.getRemoteConfirmationsNum()) === 0) {
        return setIsCPFPPossible(ButtonStatus.Possible);
      } else {
        return setIsCPFPPossible(ButtonStatus.NotPossible);
      }
    }
    return setIsCPFPPossible(ButtonStatus.NotPossible);
  };

  const checkPossibilityOfRBFBumpFee = async () => {
    if (!wallet.current?.allowRBF()) {
      return setIsRBFBumpFeePossible(ButtonStatus.NotPossible);
    }

    const rbfTx = new HDSegwitBech32Transaction(null, tx.hash, wallet.current as HDSegwitBech32Wallet);
    if (
      (await rbfTx.isOurTransaction()) &&
      (await rbfTx.getRemoteConfirmationsNum()) === 0 &&
      (await rbfTx.isSequenceReplaceable()) &&
      (await rbfTx.canBumpTx())
    ) {
      return setIsRBFBumpFeePossible(ButtonStatus.Possible);
    } else {
      return setIsRBFBumpFeePossible(ButtonStatus.NotPossible);
    }
  };

  const checkPossibilityOfRBFCancel = async () => {
    if (!wallet.current?.allowRBF()) {
      return setIsRBFCancelPossible(ButtonStatus.NotPossible);
    }

    const rbfTx = new HDSegwitBech32Transaction(null, tx.hash, wallet.current as HDSegwitBech32Wallet);
    if (
      (await rbfTx.isOurTransaction()) &&
      (await rbfTx.getRemoteConfirmationsNum()) === 0 &&
      (await rbfTx.isSequenceReplaceable()) &&
      (await rbfTx.canCancelTx())
    ) {
      return setIsRBFCancelPossible(ButtonStatus.Possible);
    } else {
      return setIsRBFCancelPossible(ButtonStatus.NotPossible);
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

  const renderCPFP = () => {
    if (isCPFPPossible === ButtonStatus.Unknown) {
      return (
        <>
          <ActivityIndicator />
          <BlueSpacing20 />
        </>
      );
    } else if (isCPFPPossible === ButtonStatus.Possible) {
      return (
        <>
          <Button onPress={navigateToCPFP} title={loc.transactions.status_bump} />
          <BlueSpacing10 />
        </>
      );
    }
  };

  const renderRBFCancel = () => {
    if (isRBFCancelPossible === ButtonStatus.Unknown) {
      return (
        <>
          <ActivityIndicator />
        </>
      );
    } else if (isRBFCancelPossible === ButtonStatus.Possible) {
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
    if (isRBFBumpFeePossible === ButtonStatus.Unknown) {
      return (
        <>
          <ActivityIndicator />
          <BlueSpacing20 />
        </>
      );
    } else if (isRBFBumpFeePossible === ButtonStatus.Possible) {
      return (
        <>
          <Button onPress={navigateToRBFBumpFee} title={loc.transactions.status_bump} />
          <BlueSpacing10 />
        </>
      );
    }
  };

  const shortenCounterpartyName = (addr: string): string => {
    if (addr.length < 20) return addr;
    return addr.substr(0, 10) + '...' + addr.substr(addr.length - 10, 10);
  };

  const renderTXMetadata = () => {
    if (txMetadata[tx.hash]) {
      if (txMetadata[tx.hash].memo) {
        return (
          <View style={styles.memo}>
            <Text selectable style={styles.memoText}>
              {txMetadata[tx.hash].memo}
            </Text>
          </View>
        );
      }
    }
  };

  const renderTXCounterparty = () => {
    if (!tx.counterparty) return; // no BIP47 counterparty for this tx, return early

    // theres a counterparty. lets lookup if theres an alias for him
    let counterparty = counterpartyMetadata?.[tx.counterparty]?.label ?? tx.counterparty;
    counterparty = shortenCounterpartyName(counterparty);

    return (
      <View style={styles.memo}>
        <Text selectable style={styles.memoText}>
          {tx.value < 0
            ? loc.formatString(loc.transactions.to, {
                counterparty,
              })
            : loc.formatString(loc.transactions.from, {
                counterparty,
              })}
        </Text>
        <BlueSpacing20 />
      </View>
    );
  };

  if (isLoading || !tx || wallet.current === undefined) {
    return (
      <SafeArea>
        <BlueLoading />
      </SafeArea>
    );
  }
  return (
    <SafeArea>
      <HandOffComponent
        title={loc.transactions.details_title}
        type={HandOffActivityType.ViewInBlockExplorer}
        url={`https://mempool.space/tx/${tx.hash}`}
      />

      <View style={styles.container}>
        <BlueCard>
          <View style={styles.center}>
            <Text style={[styles.value, stylesHook.value]} selectable>
              {formatBalanceWithoutSuffix(tx.value, wallet.current.preferredBalanceUnit, true)}{' '}
              {wallet.current?.preferredBalanceUnit !== BitcoinUnit.LOCAL_CURRENCY && (
                <Text style={[styles.valueUnit, stylesHook.valueUnit]}>{loc.units[wallet.current.preferredBalanceUnit]}</Text>
              )}
            </Text>
          </View>

          {renderTXMetadata()}
          {renderTXCounterparty()}

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
                {wallet.current?.preferredBalanceUnit !== BitcoinUnit.LOCAL_CURRENCY && wallet.current?.preferredBalanceUnit}
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
    </SafeArea>
  );
};

export default TransactionStatus;
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
});
