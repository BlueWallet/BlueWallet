import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, BackHandler, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@rneui/themed';
import LottieView from 'lottie-react-native';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueCard, BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import { HDSegwitBech32Transaction, HDSegwitBech32Wallet } from '../../class';
import { Transaction, TWallet } from '../../class/wallets/types';
import Button from '../../components/Button';
import HandOffComponent from '../../components/HandOffComponent';
import TransactionIncomingIcon from '../../components/icons/TransactionIncomingIcon';
import TransactionOutgoingIcon from '../../components/icons/TransactionOutgoingIcon';
import TransactionPendingIcon from '../../components/icons/TransactionPendingIcon';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useTheme } from '../../components/themes';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { satoshiToLocalCurrency } from '../../blue_modules/currency';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { HandOffActivityType } from '../../components/types';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import { BlueLoading } from '../../components/BlueLoading';
import useWalletSubscribe from '../../hooks/useWalletSubscribe';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import prompt from '../../helpers/prompt';

dayjs.extend(relativeTime);

enum ButtonStatus {
  Possible,
  Unknown,
  NotPossible,
}

type RouteProps = RouteProp<DetailViewStackParamList, 'TransactionStatus'>;
type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'TransactionStatus'>;

enum ActionType {
  SetCPFPPossible,
  SetRBFBumpFeePossible,
  SetRBFCancelPossible,
  SetTransaction,
  SetLoading,
  SetEta,
  SetIntervalMs,
  SetAllButtonStatus,
  SetWallet,
  SetLoadingError,
}

interface State {
  isCPFPPossible: ButtonStatus;
  isRBFBumpFeePossible: ButtonStatus;
  isRBFCancelPossible: ButtonStatus;
  tx: any;
  isLoading: boolean;
  eta: string;
  intervalMs: number;
  wallet: TWallet | null;
  loadingError: boolean;
}

const initialState: State = {
  isCPFPPossible: ButtonStatus.Unknown,
  isRBFBumpFeePossible: ButtonStatus.Unknown,
  isRBFCancelPossible: ButtonStatus.Unknown,
  tx: undefined,
  isLoading: true,
  eta: '',
  intervalMs: 1000,
  wallet: null,
  loadingError: false,
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
    case ActionType.SetWallet:
      return { ...state, wallet: action.payload };
    case ActionType.SetLoadingError:
      return { ...state, loadingError: action.payload };
    default:
      return state;
  }
};

type TransactionDetailProps = {
  transaction?: {
    amount?: number;
    value?: number;
    confirmations?: number;
  };
  txid?: string;
};

const TransactionDetail: React.FC<TransactionDetailProps> = ({ transaction, txid }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isCPFPPossible, isRBFBumpFeePossible, isRBFCancelPossible, tx, isLoading, eta, intervalMs, wallet, loadingError } = state;
  const { wallets, txMetadata, counterpartyMetadata, fetchAndSaveWalletTransactions, getTransactions, saveToDisk } = useStorage();
  const { hash, walletID } = useRoute<RouteProps>().params;
  const subscribedWallet = useWalletSubscribe(walletID!);
  const { navigate, goBack, setOptions } = useExtendedNavigation<NavigationProps>();
  const { colors } = useTheme();
  const { selectedBlockExplorer } = useSettings();
  const fetchTxInterval = useRef<NodeJS.Timeout>();

  // Advanced section state
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [txHex, setTxHex] = useState<string | null>(null);
  const [isLoadingHex, setIsLoadingHex] = useState(false);
  const [feeRates, setFeeRates] = useState<{ fast: number; medium: number; slow: number } | null>(null);
  const [from, setFrom] = useState<string[]>([]);
  const [to, setTo] = useState<string[]>([]);
  const [txFromElectrum, setTxFromElectrum] = useState<any>(null);
  const [mempoolFee, setMempoolFee] = useState<number | null>(null);
  const [wasPending, setWasPending] = useState<boolean>(false);

  const stylesHook = StyleSheet.create({
    value: {
      color: colors.foregroundColor,
    },
    valueUnit: {
      color: colors.foregroundColor,
    },
    iconRoot: {
      backgroundColor: colors.success,
    },
    titleDate: {
      color: colors.alternativeTextColor,
    },
    localCurrency: {
      color: colors.alternativeTextColor,
    },
    headerTitleDirection: {
      color: colors.foregroundColor,
    },
    stateLabel: {
      color: colors.foregroundColor,
    },
    stateLabelPending: {
      color: '#2757C6',
    },
    stateLabelSent: {
      color: '#BF2828',
    },
    stateLabelReceived: {
      color: '#63BDA2',
    },
    stateValue: {
      color: colors.alternativeTextColor,
    },
    stateValuePending: {
      color: '#2757C6',
    },
    stateValueSent: {
      color: '#BF2828',
    },
    stateValueReceived: {
      color: '#63BDA2',
    },
    detailLabel: {
      color: 'rgba(0, 0, 0, 0.4)',
    },
    detailValue: {
      color: '#000000',
    },
    memoText: {
      color: colors.foregroundColor,
    },
    addButton: {
      backgroundColor: colors.lightButton,
    },
    addButtonText: {
      color: colors.buttonTextColor,
    },
    explorerButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    explorerButtonText: {
      color: colors.buttonTextColor,
    },
    stateCard: {
      backgroundColor: colors.lightButton || colors.elevated,
      borderRadius: 12,
      marginHorizontal: 24,
      marginBottom: 42,
      overflow: 'hidden',
    },
    stateCardPending: {
      backgroundColor: '#DBEFFD',
    },
    stateCardSent: {
      backgroundColor: colors.outgoingBackgroundColor || '#f8d2d2',
    },
    stateCardReceived: {
      backgroundColor: colors.incomingBackgroundColor || '#d2f8d6',
    },
    card: {
      backgroundColor: colors.elevated || colors.background,
      borderRadius: 12,
      marginHorizontal: 24,
      marginBottom: 42,
      padding: 20,
    },
    valueCardContainer: {
      backgroundColor: 'transparent',
      marginHorizontal: 24,
      marginBottom: 42,
      padding: 0,
    },
  });

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

  // Load transaction data
  useEffect(() => {
    if (subscribedWallet && hash) {
      const transactions = subscribedWallet.getTransactions();
      const newTx = transactions.find((t: Transaction) => t.hash === hash);
      if (newTx) {
        setTX(newTx);
        // Track if transaction was pending
        setWasPending(!newTx.confirmations || newTx.confirmations === 0);
        // Extract from/to addresses
        let newFrom: string[] = [];
        let newTo: string[] = [];
        for (const input of newTx.inputs || []) {
          newFrom = newFrom.concat(input?.addresses ?? []);
        }
        for (const output of newTx.outputs || []) {
          if (output?.scriptPubKey?.addresses) {
            newTo = newTo.concat(output.scriptPubKey.addresses);
          }
        }
        setFrom(newFrom);
        setTo(newTo);
        
        // Also fetch from Electrum to get complete transaction data including fee
        // For received transactions, we need to populate vin.value by fetching previous transactions
        BlueElectrum.multiGetTransactionByTxid([hash], true, 10)
          .then(async transactions => {
            const fetchedTx = transactions[hash];
            if (fetchedTx && fetchedTx.vin) {
              // Fetch previous transactions to populate vin.value (needed for fee calculation, especially for received transactions)
              const vinTxids = fetchedTx.vin.map((vin: any) => vin.txid).filter((txid: string) => !!txid);
              if (vinTxids.length > 0) {
                try {
                  const prevTransactions = await BlueElectrum.multiGetTransactionByTxid(vinTxids, true, 10);
                  // Populate vin.value from previous transaction outputs
                  for (let i = 0; i < fetchedTx.vin.length; i++) {
                    const vin = fetchedTx.vin[i];
                    if (prevTransactions[vin.txid]?.vout?.[vin.vout]) {
                      vin.value = prevTransactions[vin.txid].vout[vin.vout].value;
                    }
                  }
                } catch (err) {
                  console.error('Error fetching previous transactions for fee calculation:', err);
                }
              }
              setTxFromElectrum(fetchedTx);
            }
          })
          .catch(err => {
            console.error('Error fetching transaction from Electrum:', err);
          });
      }
    }
  }, [hash, subscribedWallet]);

  useEffect(() => {
    dispatch({ type: ActionType.SetWallet, payload: subscribedWallet });
  }, [subscribedWallet]);


  // Fetch fee rates when advanced section is expanded
  useEffect(() => {
    if (isAdvancedExpanded && !feeRates) {
      BlueElectrum.estimateFees()
        .then(fees => {
          setFeeRates(fees);
        })
        .catch(err => {
          console.error('Error fetching fee rates:', err);
        });
    }
  }, [isAdvancedExpanded, feeRates]);

  // Fetch transaction hex when advanced section is expanded
  useEffect(() => {
    if (isAdvancedExpanded && tx?.hash && !txHex && !isLoadingHex) {
      setIsLoadingHex(true);
      BlueElectrum.multiGetTransactionByTxid([tx.hash], false, 10)
        .then(hexes => {
          const hex = hexes[tx.hash];
          if (hex && typeof hex === 'string') {
            setTxHex(hex);
          }
          setIsLoadingHex(false);
        })
        .catch(err => {
          console.error('Error fetching transaction hex:', err);
          setIsLoadingHex(false);
        });
    }
  }, [isAdvancedExpanded, tx?.hash, txHex, isLoadingHex]);

  // re-fetching tx status periodically
  useEffect(() => {
    console.debug('transactionDetail - useEffect');

    if (!tx || tx?.confirmations) return;
    if (!hash) return;

    if (fetchTxInterval.current) {
      clearInterval(fetchTxInterval.current);
      fetchTxInterval.current = undefined;
    }

    console.debug('setting up interval to check tx...');
    fetchTxInterval.current = setInterval(async () => {
      try {
        setIntervalMs(31000);

        console.debug('checking tx', hash, 'for confirmations...');
        const transactions = await BlueElectrum.multiGetTransactionByTxid([hash], true, 10);
        const txFromElectrum = transactions[hash];
        if (!txFromElectrum) {
          console.error(`Transaction from Electrum with hash ${hash} not found.`);
          return;
        }

        console.debug('got txFromElectrum=', txFromElectrum);
        
        // Update txFromElectrum state so fee calculation can use it
        setTxFromElectrum(txFromElectrum);

        const address = txFromElectrum.vout?.[0]?.scriptPubKey?.addresses?.pop();
        if (!address) {
          console.error('Address not found in txFromElectrum.');
          return;
        }

        if (!txFromElectrum.confirmations && txFromElectrum.vsize) {
          const txsM = await BlueElectrum.getMempoolTransactionsByAddress(address);
          let txFromMempool;
          for (const tempTxM of txsM) {
            if (tempTxM?.tx_hash === hash) {
              txFromMempool = tempTxM;
              break;
            }
          }
          if (!txFromMempool) {
            console.error(`Transaction from mempool with hash ${hash} not found.`);
            return;
          }

          console.debug('txFromMempool=', txFromMempool);
          
          // Store mempool fee for fee calculation
          if (txFromMempool.fee) {
            setMempoolFee(txFromMempool.fee);
          }

          const satPerVbyte = txFromMempool.fee && txFromElectrum.vsize ? Math.round(txFromMempool.fee / txFromElectrum.vsize) : 0;
          const fees = await BlueElectrum.estimateFees();
          console.debug('fees=', fees, 'satPerVbyte=', satPerVbyte);
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
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
          setEta('');
          // Clear mempool fee when transaction is confirmed (will use calculated fee from vin/vout)
          setMempoolFee(null);
          
          // Populate vin.value for fee calculation when transaction becomes confirmed
          if (txFromElectrum.vin && txFromElectrum.vin.length > 0) {
            const vinTxids = txFromElectrum.vin.map((vin: any) => vin.txid).filter((txid: string) => !!txid);
            if (vinTxids.length > 0) {
              try {
                const prevTransactions = await BlueElectrum.multiGetTransactionByTxid(vinTxids, true, 10);
                // Populate vin.value from previous transaction outputs
                for (let i = 0; i < txFromElectrum.vin.length; i++) {
                  const vin = txFromElectrum.vin[i];
                  if (prevTransactions[vin.txid]?.vout?.[vin.vout]) {
                    vin.value = prevTransactions[vin.txid].vout[vin.vout].value;
                  }
                }
              } catch (err) {
                console.error('Error fetching previous transactions when transaction became confirmed:', err);
              }
            }
          }
          
          // Update txFromElectrum with populated vin values
          setTxFromElectrum(txFromElectrum);
          
          if (tx) {
            setTX((prevState: any) => {
              return Object.assign({}, prevState, { confirmations: txFromElectrum.confirmations });
            });
          } else {
            console.error('Cannot set confirmations: tx is undefined.');
          }
          clearInterval(fetchTxInterval.current);
          fetchTxInterval.current = undefined;
          if (wallet?.getID()) {
            // Fetch and save wallet transactions, then refresh the transaction data
            fetchAndSaveWalletTransactions(wallet.getID()).then(() => {
              // After wallet transactions are updated, refresh the transaction data from the wallet
              if (subscribedWallet && hash) {
                const transactions = subscribedWallet.getTransactions();
                const updatedTx = transactions.find((t: Transaction) => t.hash === hash);
                if (updatedTx) {
                  setTX(updatedTx);
                  // Update from/to addresses if needed
                  let newFrom: string[] = [];
                  let newTo: string[] = [];
                  for (const input of updatedTx.inputs || []) {
                    newFrom = newFrom.concat(input?.addresses ?? []);
                  }
                  for (const output of updatedTx.outputs || []) {
                    if (output?.scriptPubKey?.addresses) {
                      newTo = newTo.concat(output.scriptPubKey.addresses);
                    }
                  }
                  setFrom(newFrom);
                  setTo(newTo);
                }
              }
            });
          } else {
            console.error('Cannot fetch and save wallet transactions: wallet ID is undefined.');
          }
        }
      } catch (error) {
        console.error('Error in fetchTxInterval:', error);
      }
    }, intervalMs);

    return () => {
      clearInterval(fetchTxInterval.current);
      fetchTxInterval.current = undefined;
    };
  }, [hash, intervalMs, tx, fetchAndSaveWalletTransactions, wallet]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });

    return () => {
      subscription.remove();
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
      console.error('Error in initialButtonsState:', e);
      setAllButtonStatus(ButtonStatus.NotPossible);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initialButtonsState().catch(error => console.error('Unhandled error in initialButtonsState:', error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, wallets]);

  useEffect(() => {
    if (!tx && txid) {
      const fetchTransaction = async () => {
        try {
          const transactions = await BlueElectrum.multiGetTransactionByTxid([txid], true, 10);
          const fetchedTx = transactions[txid];
          if (fetchedTx) {
            setTX(fetchedTx);
          } else {
            console.error(`Transaction with txid ${txid} not found.`);
            dispatch({ type: ActionType.SetLoadingError, payload: true });
            dispatch({ type: ActionType.SetLoading, payload: false });
          }
        } catch (error) {
          console.error('Error fetching transaction:', error);
          dispatch({ type: ActionType.SetLoadingError, payload: true });
          dispatch({ type: ActionType.SetLoading, payload: false });
        }
      };
      fetchTransaction().catch(error => console.error('Unhandled error in fetchTransaction:', error));
    }
  }, [tx, txid]);

  useEffect(() => {
    if (isLoading) {
      let isComponentMounted = true;
      const loadingTimeout = setTimeout(() => {
        if (isComponentMounted && isLoading) {
          dispatch({ type: ActionType.SetLoadingError, payload: true });
          dispatch({ type: ActionType.SetLoading, payload: false });
          console.error('Loading timed out. There was an issue fetching the transaction.');
        }
      }, 10000);

      return () => {
        isComponentMounted = false;
        clearTimeout(loadingTimeout);
      };
    }
  }, [isLoading]);

  const checkPossibilityOfCPFP = async () => {
    if (!wallet?.allowRBF()) {
      return setIsCPFPPossible(ButtonStatus.NotPossible);
    }

    if (wallet) {
      const cpfbTx = new HDSegwitBech32Transaction(null, tx.hash, wallet as HDSegwitBech32Wallet);
      if ((await cpfbTx.isToUsTransaction()) && (await cpfbTx.getRemoteConfirmationsNum()) === 0) {
        return setIsCPFPPossible(ButtonStatus.Possible);
      } else {
        return setIsCPFPPossible(ButtonStatus.NotPossible);
      }
    }
    return setIsCPFPPossible(ButtonStatus.NotPossible);
  };

  const checkPossibilityOfRBFBumpFee = async () => {
    if (!wallet?.allowRBF()) {
      return setIsRBFBumpFeePossible(ButtonStatus.NotPossible);
    }

    const rbfTx = new HDSegwitBech32Transaction(null, tx.hash, wallet as HDSegwitBech32Wallet);
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
    if (!wallet?.allowRBF()) {
      return setIsRBFCancelPossible(ButtonStatus.NotPossible);
    }

    const rbfTx = new HDSegwitBech32Transaction(null, tx.hash, wallet as HDSegwitBech32Wallet);
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
    if (tx?.hash && wallet) {
      navigate('RBFBumpFee', {
        txid: tx.hash,
        wallet,
      });
    }
  };

  const navigateToRBFCancel = () => {
    if (tx?.hash && wallet) {
      navigate('RBFCancel', {
        txid: tx.hash,
        wallet,
      });
    }
  };

  const navigateToCPFP = () => {
    navigate('CPFP', {
      txid: tx.hash,
      wallet,
    });
  };

  const handleNotePress = useCallback(async () => {
    const currentMemo = txMetadata[tx.hash]?.memo || '';
    try {
      const newMemo = await prompt(loc.send.details_note_placeholder, currentMemo, true, 'plain-text');
      if (newMemo !== undefined) {
        txMetadata[tx.hash] = { memo: newMemo };
        await saveToDisk();
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      }
    } catch (error) {
      // User cancelled
    }
  }, [tx?.hash, txMetadata, saveToDisk]);

  const handleOpenBlockExplorer = useCallback(() => {
    if (!tx?.hash || !selectedBlockExplorer) return;
    const url = `${selectedBlockExplorer.url}/tx/${tx.hash}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url).catch(e => {
            console.log('openURL failed in handleOpenBlockExplorer');
            console.log(e.message);
            triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
            presentAlert({ message: e.message });
          });
        } else {
          console.log('canOpenURL supported is false in handleOpenBlockExplorer');
          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
          presentAlert({ message: loc.transactions.open_url_error });
        }
      })
      .catch(e => {
        console.log('canOpenURL failed in handleOpenBlockExplorer');
        console.log(e.message);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: e.message });
      });
  }, [tx?.hash, selectedBlockExplorer]);

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

  const weOwnAddress = (address: string): TWallet | null => {
    for (const w of wallets) {
      if (w.weOwnAddress(address)) {
        return w;
      }
    }
    return null;
  };

  const navigateToWallet = (wallet: TWallet) => {
    navigate('WalletTransactions', {
      walletID: wallet.getID(),
      walletType: wallet.type,
    });
  };


  const onlyUnique = (value: any, index: number, self: any[]) => {
    return self.indexOf(value) === index;
  };

  const arrDiff = (a1: any[], a2: any[]) => {
    const ret = [];
    for (const v of a2) {
      if (a1.indexOf(v) === -1) {
        ret.push(v);
      }
    }
    return ret;
  };

  const renderSection = (array: any[]) => {
    const fromArray = [];

    for (const [index, address] of array.entries()) {
      const isWeOwnAddress = weOwnAddress(address);
      const addressStyle = isWeOwnAddress ? [styles.rowValue, styles.weOwnAddress] : styles.rowValue;

      fromArray.push(
        <View key={address} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <CopyTextToClipboard
            text={address}
            style={StyleSheet.flatten(addressStyle)}
            containerStyle={{}}
          />
          {index !== array.length - 1 && <BlueText style={addressStyle}>,</BlueText>}
        </View>,
      );
    }

    return fromArray;
  };

  // Calculate fee from transaction data if not available
  // Fee = (sum of all input values) - (sum of all output values)
  // This works for both sent and received transactions
  const calculatedFee = useMemo(() => {
    if (!tx) return null;
    
    // If fee is already available, use it (for Lightning transactions)
    if (tx.fee !== undefined && tx.fee !== null) {
      return tx.fee;
    }
    
    // For pending transactions, use mempool fee if available (most accurate)
    if (!tx.confirmations && mempoolFee !== null && mempoolFee !== undefined) {
      return mempoolFee;
    }
    
    // Try to calculate from Electrum transaction data first (most reliable for both sent and received)
    // txFromElectrum has complete transaction data with all input/output values
    if (txFromElectrum && txFromElectrum.vin && txFromElectrum.vout) {
      let totalInputs = 0;
      let totalOutputs = 0;
      
      // Sum all input values (in BTC, convert to satoshis)
      for (const vin of txFromElectrum.vin) {
        if (vin.value !== undefined && vin.value !== null) {
          totalInputs += Math.round(vin.value * 100000000);
        }
      }
      
      // Sum all output values (in BTC, convert to satoshis)
      for (const vout of txFromElectrum.vout) {
        if (vout.value !== undefined && vout.value !== null) {
          totalOutputs += Math.round(vout.value * 100000000);
        }
      }
      
      // Fee = inputs - outputs
      if (totalInputs > 0 && totalOutputs > 0) {
        const fee = totalInputs - totalOutputs;
        if (fee >= 0) {
          return fee;
        }
      }
    }
    
    // Fallback: calculate from tx.inputs and tx.outputs
    // Note: For received transactions, input.value might not be populated
    // This works better for sent transactions where we own the inputs
    if (tx.inputs && tx.outputs) {
      let totalInputs = 0;
      let totalOutputs = 0;
      
      // Sum all input values
      for (const input of tx.inputs) {
        if (input.value !== undefined && input.value !== null) {
          // Convert to satoshis: if value < 1, it's in BTC, otherwise it might already be in satoshis
          const inputValue = input.value < 1 ? Math.round(input.value * 100000000) : input.value;
          totalInputs += inputValue;
        }
      }
      
      // Sum all output values
      for (const output of tx.outputs) {
        if (output.value !== undefined && output.value !== null) {
          // Convert to satoshis: if value < 1, it's in BTC, otherwise it might already be in satoshis
          const outputValue = output.value < 1 ? Math.round(output.value * 100000000) : output.value;
          totalOutputs += outputValue;
        }
      }
      
      // Fee = inputs - outputs
      // For received transactions, if inputs don't have values, we can't calculate
      // But we should still try if we have at least some input values
      if (totalInputs > 0 && totalOutputs > 0) {
        const fee = totalInputs - totalOutputs;
        if (fee >= 0) {
          return fee;
        }
      }
    }
    
    return null;
  }, [tx, txFromElectrum, mempoolFee]);

  // Calculate fee rate
  const feeRate = calculatedFee && tx?.vsize ? Math.round(calculatedFee / tx.vsize) : null;

  // Extract op_return outputs
  const opReturnOutputs = tx?.outputs?.filter((out: any) => !out.scriptPubKey.addresses || out.scriptPubKey.addresses.length === 0) || [];

  // Get transaction direction and date
  const transactionDirection = tx?.value < 0 ? 'Sent' : 'Received';
  const transactionDate = tx?.timestamp ? dayjs(tx.timestamp * 1000).format('LLL') : '-';

  // Get memo
  const memo = tx?.hash ? txMetadata[tx.hash]?.memo || '' : '';

  // Set header title with direction and date
  useEffect(() => {
    if (tx) {
      setOptions({
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <BlueText style={[styles.headerTitleDirection, stylesHook.headerTitleDirection]}>{transactionDirection}</BlueText>
            <BlueText style={[styles.headerTitleDate, stylesHook.titleDate]}>{transactionDate}</BlueText>
          </View>
        ),
      });
    }
  }, [tx, transactionDirection, transactionDate, setOptions, colors]);

  if (loadingError) {
    return (
      <SafeAreaScrollView>
        <View style={stylesHook.card}>
          <BlueText>{loc.transactions.transaction_loading_error}</BlueText>
        </View>
      </SafeAreaScrollView>
    );
  }

  if (isLoading || !tx || wallet === undefined) {
    return (
      <SafeAreaScrollView>
        <BlueLoading />
      </SafeAreaScrollView>
    );
  }

  if (!transaction && !tx) {
    return (
      <SafeAreaScrollView>
        <BlueText>{loc.transactions.transaction_not_available}</BlueText>
      </SafeAreaScrollView>
    );
  }

  return (
    <SafeAreaScrollView contentContainerStyle={styles.scrollContent}>
      {/* Value Section */}
      <View style={[styles.valueCard, stylesHook.valueCardContainer]}>
        <View style={styles.valueContent}>
          <Text style={[styles.value, stylesHook.value]} selectable>
            {wallet && formatBalanceWithoutSuffix(tx.value, wallet.preferredBalanceUnit, true)}
            {` `}
            {wallet?.preferredBalanceUnit !== BitcoinUnit.LOCAL_CURRENCY && wallet && (
              <Text style={[styles.valueUnit, stylesHook.valueUnit]}>{wallet.preferredBalanceUnit}</Text>
            )}
          </Text>
          {wallet?.preferredBalanceUnit !== BitcoinUnit.LOCAL_CURRENCY && (
            <Text style={[styles.localCurrency, stylesHook.localCurrency]}>
              {satoshiToLocalCurrency(Math.abs(tx.value))}
            </Text>
          )}
        </View>
      </View>

      {/* State Section */}
      <View
        style={[
          styles.stateCard,
          stylesHook.stateCard,
          !tx.confirmations
            ? stylesHook.stateCardPending
            : tx.value < 0
              ? stylesHook.stateCardSent
              : stylesHook.stateCardReceived,
        ]}
      >
        <View style={styles.stateSection}>
          {!tx.confirmations ? (
            <>
              <View style={styles.stateIndicator}>
                <TransactionPendingIcon />
                <BlueText style={[styles.stateLabel, stylesHook.stateLabelPending]}>Pending</BlueText>
              </View>
              {eta && (
                <BlueText style={[styles.stateValue, stylesHook.stateValuePending]}>{eta}</BlueText>
              )}
              {(isRBFBumpFeePossible === ButtonStatus.Possible || isRBFCancelPossible === ButtonStatus.Possible) && (
                <View style={styles.stateButtons}>
                  {isRBFBumpFeePossible === ButtonStatus.Possible && (
                    <TouchableOpacity 
                      onPress={navigateToRBFBumpFee} 
                      style={styles.speedUpButton}
                      accessibilityRole="button"
                    >
                      <BlueText style={styles.speedUpButtonText}>{loc.transactions.status_bump}</BlueText>
                    </TouchableOpacity>
                  )}
                  {isRBFCancelPossible === ButtonStatus.Possible && (
                    <TouchableOpacity 
                      onPress={navigateToRBFCancel} 
                      style={styles.cancelButton}
                      accessibilityRole="button"
                    >
                      <BlueText style={styles.cancelButtonText}>{loc.transactions.status_cancel}</BlueText>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          ) : tx.value < 0 ? (
            <>
              <View style={styles.stateIndicator}>
                <TransactionOutgoingIcon />
                <BlueText style={[styles.stateLabel, stylesHook.stateLabelSent]}>Sent</BlueText>
              </View>
              <BlueText style={[styles.stateValue, stylesHook.stateValueSent]}>
                {loc.formatString(loc.transactions.confirmations_lowercase, {
                  confirmations: tx.confirmations > 6 ? '6+' : tx.confirmations,
                })}
              </BlueText>
            </>
          ) : (
            <>
              <View style={styles.stateIndicator}>
                <TransactionIncomingIcon />
                <BlueText style={[styles.stateLabel, stylesHook.stateLabelReceived]}>Received</BlueText>
              </View>
              <BlueText style={[styles.stateValue, stylesHook.stateValueReceived]}>
                {loc.formatString(loc.transactions.confirmations_lowercase, {
                  confirmations: tx.confirmations > 6 ? '6+' : tx.confirmations,
                })}
              </BlueText>
            </>
          )}
        </View>
      </View>

      {/* Details Section */}
      <View style={styles.detailsCard}>
        {/* Details Title */}
        <View style={[styles.sectionTitle, styles.sectionTitleWithButton]}>
          <BlueText style={styles.sectionTitleText}>Details</BlueText>
          {tx?.hash && (
            <TouchableOpacity 
              onPress={handleOpenBlockExplorer} 
              style={[styles.explorerButton, stylesHook.explorerButton]} 
              activeOpacity={0.7}
            >
              <BlueText style={[styles.explorerButtonText, stylesHook.explorerButtonText]}>explorer</BlueText>
            </TouchableOpacity>
          )}
        </View>
        {/* Network Fee */}
        <View style={styles.detailRow}>
          <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>Network Fee</BlueText>
          <View style={styles.detailValueContainer}>
            <CopyTextToClipboard
              text={
                calculatedFee !== null && calculatedFee !== undefined
                  ? `${formatBalanceWithoutSuffix(calculatedFee, BitcoinUnit.SATS, false)} sats / ${satoshiToLocalCurrency(calculatedFee)}`
                  : '-'
              }
              style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
              containerStyle={{}}
              textAlign="right"
            />
          </View>
        </View>

        {/* Transaction ID */}
        {tx.hash && (
          <View style={styles.detailRow}>
            <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>ID</BlueText>
            <View style={styles.detailValueContainer}>
              <CopyTextToClipboard
                text={tx.hash}
                style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                containerStyle={{}}
                numberOfLines={1}
                ellipsizeMode="middle"
                selectable
                textAlign="right"
              />
            </View>
          </View>
        )}

        {/* Note/Memo */}
        <View style={[styles.detailRow, styles.detailRowLast]}>
          <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>Note</BlueText>
          <View style={styles.detailValueContainer}>
            {memo ? (
              <TouchableOpacity onPress={handleNotePress} activeOpacity={0.7} style={styles.memoContainer}>
                <BlueText style={[styles.memoText, stylesHook.memoText]} numberOfLines={0}>{memo}</BlueText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleNotePress} style={[styles.addButton, stylesHook.addButton]} activeOpacity={0.7}>
                <BlueText style={[styles.addButtonText, stylesHook.addButtonText]}>add</BlueText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Advanced Section */}
      <View style={styles.detailsCard}>
        <TouchableOpacity
          onPress={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
          style={styles.advancedHeader}
        >
          <View style={[styles.sectionTitle, { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <BlueText style={styles.sectionTitleText}>Advanced</BlueText>
            <Icon
              name={isAdvancedExpanded ? 'chevron-up' : 'chevron-down'}
              type="font-awesome-5"
              size={16}
              color="rgba(0, 0, 0, 0.8)"
            />
          </View>
        </TouchableOpacity>

        {isAdvancedExpanded && (
          <View style={styles.advancedContent}>
            {/* Fee Rate */}
            <View style={styles.detailRow}>
              <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>Fee rate</BlueText>
              <View style={styles.detailValueContainer}>
                <CopyTextToClipboard
                  text={feeRate ? `${feeRate} sats/vb` : '-'}
                  style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                  containerStyle={{}}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Fee Rate in Previous Block */}
            <View style={styles.detailRow}>
              <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>Previous block</BlueText>
              <View style={styles.detailValueContainer}>
                <CopyTextToClipboard
                  text={feeRates ? `${feeRates.medium} sats/vb` : '-'}
                  style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                  containerStyle={{}}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Fee Rate in Next Block */}
            <View style={styles.detailRow}>
              <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>Next block</BlueText>
              <View style={styles.detailValueContainer}>
                <CopyTextToClipboard
                  text={feeRates ? `${feeRates.fast} sats/vb` : '-'}
                  style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                  containerStyle={{}}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Size */}
            <View style={styles.detailRow}>
              <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>Size</BlueText>
              <View style={styles.detailValueContainer}>
                <CopyTextToClipboard
                  text={tx.size ? `${tx.size} B` : '-'}
                  style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                  containerStyle={{}}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Virtual Size */}
            <View style={styles.detailRow}>
              <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>Virtual size</BlueText>
              <View style={styles.detailValueContainer}>
                <CopyTextToClipboard
                  text={tx.vsize ? `${tx.vsize} vB` : '-'}
                  style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                  containerStyle={{}}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Transaction Hex */}
            <View style={styles.detailRow}>
              <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>Tx Hex</BlueText>
              <View style={styles.detailValueContainer}>
                {txHex ? (
                  <CopyTextToClipboard
                    text={txHex}
                    displayText="copy"
                    style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                    containerStyle={{}}
                    textAlign="right"
                  />
                ) : isLoadingHex ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <CopyTextToClipboard
                    text="-"
                    style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                    containerStyle={{}}
                    textAlign="right"
                  />
                )}
              </View>
            </View>

            {/* Op_return Data */}
            {opReturnOutputs.length > 0 && (
              <View style={styles.detailRowFullWidth}>
                <BlueText style={[styles.detailLabelFullWidth, stylesHook.detailLabel]}>OP_return</BlueText>
                <View style={styles.detailValueFullWidth}>
                  {opReturnOutputs.map((out: any, index: number) => (
                    <CopyTextToClipboard
                      key={index}
                      text={out.scriptPubKey.hex || '-'}
                      style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                      containerStyle={{}}
                      selectable
                      numberOfLines={0}
                      textAlign="left"
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Inputs */}
            {tx.inputs && tx.inputs.length > 0 && (
              <View style={styles.detailRowFullWidth}>
                <BlueText style={[styles.detailLabelFullWidth, stylesHook.detailLabel]}>Inputs ({tx.inputs.length})</BlueText>
                <View style={styles.detailValueFullWidth}>
                  {from.filter(onlyUnique).length > 0 && renderSection(from.filter(onlyUnique))}
                </View>
              </View>
            )}

            {/* Outputs */}
            {tx.outputs && tx.outputs.length > 0 && (
              <View style={[styles.detailRowFullWidth, styles.detailRowLast]}>
                <BlueText style={[styles.detailLabelFullWidth, stylesHook.detailLabel]}>Outputs ({tx.outputs.length})</BlueText>
                <View style={styles.detailValueFullWidth}>
                  {to.filter(onlyUnique).length > 0 && renderSection(arrDiff(from, to.filter(onlyUnique)))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Action Buttons - Only show CPFP here, Speed Up and Cancel are in state section for pending */}
      {tx.confirmations > 0 && (
        <View style={styles.actions}>
          {renderCPFP()}
        </View>
      )}
    </SafeAreaScrollView>
  );
};

export default TransactionDetail;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: 42,
    paddingBottom: 42,
  },
  headerTitleContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
  },
  headerTitleDirection: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.15,
    color: '#0c2550',
  },
  headerTitleDate: {
    fontSize: 13,
    lineHeight: 18,
  },
  valueCard: {
    marginTop: 0,
  },
  valueContent: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  value: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 48,
  },
  valueUnit: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  localCurrency: {
    fontSize: 16,
    fontWeight: '600',

    marginTop: 6,
    lineHeight: 20,
  },
  stateCard: {
    marginTop: 0,
  },
  stateSection: {
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  stateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stateLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    lineHeight: 22,
  },
  stateValue: {
    fontSize: 14,
    marginBottom: 0,
    lineHeight: 20,
  },
  stateButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    width: '100%',
    paddingHorizontal: 0,
  },
  speedUpButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    minHeight: 44,
  },
  speedUpButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2757C6',
    textAlign: 'center',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    minHeight: 44,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(0, 0, 0, 0.6)',
    textAlign: 'center',
  },
  memoContainer: {
    flex: 1,
    alignItems: 'flex-end',
    maxWidth: '100%',
    flexShrink: 1,
  },
  detailsCard: {
    marginHorizontal: 24,
    marginBottom: 42,
    padding: 0,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  sectionTitle: {
    backgroundColor: '#F2F2F2',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sectionTitleWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.8)',
  },
  explorerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-end',
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explorerButtonText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
    minHeight: 24,
    backgroundColor: '#F9F9F9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  detailRowLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  detailRowFullWidth: {
    flexDirection: 'column',
    marginBottom: 0,
    minHeight: 24,
    backgroundColor: '#F9F9F9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
    paddingRight: 12,
    color: 'rgba(0, 0, 0, 0.4)',
  },
  detailLabelFullWidth: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: 'rgba(0, 0, 0, 0.4)',
    marginBottom: 8,
  },
  detailValueContainer: {
    flex: 1,
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailValueFullWidth: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailSubLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
    lineHeight: 20,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'right',
    flexShrink: 1,
    color: '#000000',
  },
  memoText: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'right',
    flexShrink: 1,
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-end',
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  advancedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 0,
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  advancedHeaderText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  advancedContent: {
    marginTop: 0,
    paddingTop: 0,
    paddingBottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  actions: {
    alignSelf: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    width: '100%',
    paddingHorizontal: 16,
  },
  cancel: {
    marginVertical: 16,
  },
  cancelText: {
    color: '#d0021b',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  rowValue: {
    color: 'grey',
  },
  weOwnAddress: {
    fontWeight: '700',
  },
});
