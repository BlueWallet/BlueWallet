import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { sha256 } from '@noble/hashes/sha256';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '@rneui/themed';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { satoshiToLocalCurrency } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';
import { BlueText } from '../../BlueComponents';
import { HDSegwitBech32Transaction, HDSegwitBech32Wallet } from '../../class';
import { Transaction, TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import { BlueLoading } from '../../components/BlueLoading';
import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import TransactionIncomingIcon from '../../components/icons/TransactionIncomingIcon';
import TransactionOutgoingIcon from '../../components/icons/TransactionOutgoingIcon';
import TransactionPendingIcon from '../../components/icons/TransactionPendingIcon';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useTheme } from '../../components/themes';
import prompt from '../../helpers/prompt';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import useWalletSubscribe from '../../hooks/useWalletSubscribe';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

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

type TransactionDetailHeaderTitleProps = {
  direction: string;
  date: string;
  directionStyle: any;
  dateStyle: any;
};

const TransactionDetailHeaderTitle: React.FC<TransactionDetailHeaderTitleProps> = ({ direction, date, directionStyle, dateStyle }) => (
  <View style={styles.headerTitleContainer}>
    <BlueText style={directionStyle}>{direction}</BlueText>
    <BlueText style={dateStyle}>{date}</BlueText>
  </View>
);

const TransactionStatus: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isCPFPPossible, isRBFBumpFeePossible, isRBFCancelPossible, tx, isLoading, eta, intervalMs, wallet, loadingError } = state;
  const { wallets, txMetadata, counterpartyMetadata, fetchAndSaveWalletTransactions, saveToDisk } = useStorage();
  const { hash, walletID, tx: initialTx } = useRoute<RouteProps>().params;
  const subscribedWallet = useWalletSubscribe(walletID);
  const { navigate, goBack, setOptions } = useExtendedNavigation<NavigationProps>();
  const { colors } = useTheme();
  const { selectedBlockExplorer } = useSettings();
  const fetchTxInterval = useRef<NodeJS.Timeout>();

  // Advanced section state
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [txHex, setTxHex] = useState<string | null>(null);
  const [isLoadingHex, setIsLoadingHex] = useState(false);
  const [from, setFrom] = useState<string[]>([]);
  const [to, setTo] = useState<string[]>([]);
  const [txFromElectrum, setTxFromElectrum] = useState<any>(null);
  const [mempoolFee, setMempoolFee] = useState<number | null>(null);
  const [counterpartyLabel, setCounterpartyLabel] = useState<string | null>(null);
  const [paymentCode, setPaymentCode] = useState<string | null>(null);

  const stylesHook = StyleSheet.create({
    value: {
      color: colors.foregroundColor,
    },
    valueUnit: {
      color: colors.foregroundColor,
    },
    titleDate: {
      color: colors.alternativeTextColor,
    },
    localCurrency: {
      color: colors.alternativeTextColor,
    },
    counterpartyContainer: {
      backgroundColor: colors.cardSectionHeaderBackground,
    },
    counterpartyAvatar: {
      backgroundColor: colors.lightButton,
    },
    counterpartyAvatarText: {
      color: colors.foregroundColor,
    },
    counterpartyName: {
      color: colors.foregroundColor,
    },
    headerTitleDirection: {
      color: colors.foregroundColor,
    },
    stateLabelPending: {
      color: colors.transactionPendingColor,
    },
    stateLabelSent: {
      color: colors.transactionSentColor,
    },
    stateLabelReceived: {
      color: colors.transactionReceivedColor,
    },
    stateValuePending: {
      color: colors.transactionPendingColor,
    },
    stateValueSent: {
      color: colors.transactionSentColor,
    },
    stateValueReceived: {
      color: colors.transactionReceivedColor,
    },
    detailLabel: {
      color: colors.alternativeTextColor,
    },
    detailValue: {
      color: colors.foregroundColor,
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
      backgroundColor: colors.lightButton,
    },
    explorerButtonText: {
      color: colors.buttonTextColor,
    },
    stateCard: {
      backgroundColor: colors.lightButton || colors.elevated,
    },
    stateCardPending: {
      backgroundColor: colors.transactionPendingBackgroundColor,
    },
    stateCardSent: {
      backgroundColor: colors.outgoingBackgroundColor,
    },
    stateCardReceived: {
      backgroundColor: colors.incomingBackgroundColor,
    },
    card: {
      backgroundColor: colors.elevated || colors.background,
    },
    sectionTitle: {
      backgroundColor: colors.cardSectionHeaderBackground,
    },
    sectionTitleText: {
      color: colors.foregroundColor,
    },
    detailsCard: {
      borderColor: colors.cardBorderColor,
    },
    detailRow: {
      backgroundColor: colors.cardSectionBackground,
      borderBottomColor: colors.cardBorderColor,
    },
    detailRowFullWidth: {
      backgroundColor: colors.cardSectionBackground,
      borderBottomColor: colors.cardBorderColor,
    },
    speedUpButton: {
      backgroundColor: colors.transactionStateBumpButtonBackground,
    },
    speedUpButtonText: {
      color: colors.transactionPendingColor,
    },
    cancelButton: {
      backgroundColor: colors.transactionStateCancelButtonBackground,
    },
    cancelButtonText: {
      color: colors.alternativeTextColor,
    },
    advancedHeader: {
      borderColor: colors.cardBorderColor,
    },
    advancedContent: {
      borderTopColor: colors.cardBorderColor,
    },
    rowValue: {
      color: colors.alternativeTextColor,
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

  // Seed transaction data from navigation param if available (offline / fallback)
  useEffect(() => {
    if (initialTx && !tx) {
      setTX(initialTx);
      setIsLoading(false);
      // Extract from/to addresses from the initial transaction snapshot
      let newFrom: string[] = [];
      let newTo: string[] = [];
      for (const input of initialTx.inputs || []) {
        newFrom = newFrom.concat(input?.addresses ?? []);
      }
      for (const output of initialTx.outputs || []) {
        if (output?.scriptPubKey?.addresses) {
          newTo = newTo.concat(output.scriptPubKey.addresses);
        }
      }
      setFrom(newFrom);
      setTo(newTo);
    }
  }, [initialTx, tx]);

  // Load transaction data from subscribed wallet and Electrum
  useEffect(() => {
    if (subscribedWallet && hash) {
      const transactions = subscribedWallet.getTransactions();
      const newTx = transactions.find((t: Transaction) => t.hash === hash);
      if (newTx) {
        setTX(newTx);
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
          .then(async txMap => {
            const fetchedTx = txMap[hash];
            if (fetchedTx && fetchedTx.vin) {
              // Fetch previous transactions to populate vin.value (needed for fee calculation, especially for received transactions)
              const vinTxids = fetchedTx.vin.map((vin: any) => vin.txid).filter((tid: string) => !!tid);
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
        const fetchedTxMap = await BlueElectrum.multiGetTransactionByTxid([hash], true, 10);
        const fetchedTx = fetchedTxMap[hash];
        if (!fetchedTx) {
          console.error(`Transaction from Electrum with hash ${hash} not found.`);
          return;
        }

        console.debug('got txFromElectrum=', fetchedTx);

        // Update txFromElectrum state so fee calculation can use it
        setTxFromElectrum(fetchedTx);

        const address = fetchedTx.vout?.[0]?.scriptPubKey?.addresses?.pop();
        if (!address) {
          console.error('Address not found in txFromElectrum.');
          return;
        }

        if (!fetchedTx.confirmations && fetchedTx.vsize) {
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

          const satPerVbyte = txFromMempool.fee && fetchedTx.vsize ? Math.round(txFromMempool.fee / fetchedTx.vsize) : 0;
          const fees = await BlueElectrum.estimateFees();

          // Only set ETA if we have valid fee data
          // Validate that fees exist, are numbers, and are positive
          if (
            fees &&
            typeof fees.fast === 'number' &&
            typeof fees.medium === 'number' &&
            fees.fast > 0 &&
            fees.medium > 0 &&
            satPerVbyte > 0
          ) {
            // Fast should be >= medium, but handle edge cases
            if (fees.fast >= fees.medium) {
              // Normal case: fast >= medium
              // If transaction fee is at least 50% of fast fee, consider it reasonable (not 1 day)
              // This handles cases where fees are low and transaction is reasonably close to next block fee
              const reasonableThreshold = fees.fast * 0.5; // 50% of fast fee

              if (satPerVbyte >= fees.fast) {
                setEta(loc.formatString(loc.transactions.eta_10m));
              } else if (satPerVbyte >= fees.medium || satPerVbyte >= reasonableThreshold) {
                // Use 3h if at least medium fee OR at least 50% of fast fee
                setEta(loc.formatString(loc.transactions.eta_3h));
              } else {
                setEta(loc.formatString(loc.transactions.eta_1d));
              }
            } else {
              // Edge case: fast < medium (shouldn't happen, but handle it)
              // Use medium as the threshold since it's higher
              if (satPerVbyte >= fees.medium) {
                setEta(loc.formatString(loc.transactions.eta_10m));
              } else if (satPerVbyte >= fees.fast) {
                setEta(loc.formatString(loc.transactions.eta_3h));
              } else {
                setEta(loc.formatString(loc.transactions.eta_1d));
              }
            }
          }
          // If we don't have valid data, keep showing "Analyzing..." (don't set ETA)
        } else if (fetchedTx.confirmations && fetchedTx.confirmations > 0) {
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
          setEta('');
          // Clear mempool fee when transaction is confirmed (will use calculated fee from vin/vout)
          setMempoolFee(null);

          // Populate vin.value for fee calculation when transaction becomes confirmed
          if (fetchedTx.vin && fetchedTx.vin.length > 0) {
            const vinTxids = fetchedTx.vin.map((vin: any) => vin.txid).filter((tid: string) => !!tid);
            if (vinTxids.length > 0) {
              try {
                const prevTxs = await BlueElectrum.multiGetTransactionByTxid(vinTxids, true, 10);
                // Populate vin.value from previous transaction outputs
                for (let i = 0; i < fetchedTx.vin.length; i++) {
                  const vin = fetchedTx.vin[i];
                  if (prevTxs[vin.txid]?.vout?.[vin.vout]) {
                    vin.value = prevTxs[vin.txid].vout[vin.vout].value;
                  }
                }
              } catch (err) {
                console.error('Error fetching previous transactions when transaction became confirmed:', err);
              }
            }
          }

          // Update txFromElectrum with populated vin values
          setTxFromElectrum(fetchedTx);

          if (tx) {
            setTX({ ...tx, confirmations: fetchedTx.confirmations } as Transaction);
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
                const walletTxs = subscribedWallet.getTransactions();
                const updatedTx = walletTxs.find((t: Transaction) => t.hash === hash);
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
  }, [hash, intervalMs, tx, fetchAndSaveWalletTransactions, wallet, subscribedWallet]);

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
    if (!tx && hash) {
      const fetchTransaction = async () => {
        try {
          const transactions = await BlueElectrum.multiGetTransactionByTxid([hash], true, 10);
          const fetchedTx = transactions[hash];
          if (fetchedTx) {
            setTX(fetchedTx);
            // Raw Electrum tx has no top-level .value; refetch wallet so it computes value and we can show balance
            if (subscribedWallet) {
              fetchAndSaveWalletTransactions(subscribedWallet.getID()).then(() => {
                const walletTxs = subscribedWallet.getTransactions();
                const txWithValue = walletTxs.find((t: Transaction) => t.hash === hash);
                if (txWithValue && txWithValue.value !== undefined) {
                  setTX(txWithValue);
                }
              });
            }
          } else {
            console.error(`Transaction with hash ${hash} not found.`);
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
  }, [tx, hash, subscribedWallet, fetchAndSaveWalletTransactions]);

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

  const navigateToRBFBumpFee = (transaction: Transaction, w: TWallet) => {
    navigate('RBFBumpFee', {
      txid: transaction.hash,
      wallet: w,
    });
  };

  const navigateToRBFCancel = (transaction: Transaction, w: TWallet) => {
    navigate('RBFCancel', {
      txid: transaction.hash,
      wallet: w,
    });
  };

  const navigateToCPFP = (transaction: Transaction, w: TWallet) => {
    navigate('CPFP', {
      txid: transaction.hash,
      wallet: w,
    });
  };

  const handleNotePress = useCallback(async () => {
    const currentMemo = txMetadata[tx.hash]?.memo || '';
    try {
      const newMemo = await prompt(loc.send.details_note_placeholder, '', true, 'plain-text', false, undefined, currentMemo);
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

  const renderCPFP = (transaction: Transaction, w: TWallet) => {
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
          <Button onPress={() => navigateToCPFP(transaction, w)} title={loc.transactions.status_bump} />
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
      const addressStyle = isWeOwnAddress
        ? [styles.rowValue, styles.weOwnAddress, stylesHook.rowValue]
        : [styles.rowValue, stylesHook.rowValue];

      fromArray.push(
        <View key={address} style={styles.addressRow}>
          <CopyTextToClipboard text={address} style={StyleSheet.flatten(addressStyle)} />
          {index !== array.length - 1 && <BlueText style={addressStyle}>,</BlueText>}
        </View>,
      );
    }

    return fromArray;
  };

  // Fee: use tx.fee when set (e.g. Lightning), else mempool for pending, else compute inputs - outputs
  const calculatedFee = useMemo(() => {
    if (!tx) return null;

    if (tx.fee !== undefined && tx.fee !== null) {
      return tx.fee;
    }
    if (!tx.confirmations && mempoolFee != null) {
      return mempoolFee;
    }

    // Fee = sum(inputs) - sum(outputs). Prefer txFromElectrum (vin.value populated) when available.
    const inputs = txFromElectrum?.vin ?? tx.inputs;
    const outputs = txFromElectrum?.vout ?? tx.outputs;
    if (!inputs?.length || !outputs?.length) return null;

    const toSats = (v: number) => (v < 1 ? Math.round(v * 100000000) : v);
    let totalInputs = 0;
    let totalOutputs = 0;
    for (const vin of inputs) {
      if (vin.value != null) totalInputs += toSats(vin.value);
    }
    for (const vout of outputs) {
      if (vout.value != null) totalOutputs += toSats(vout.value);
    }
    if (totalInputs > 0 && totalOutputs > 0) {
      const fee = totalInputs - totalOutputs;
      if (fee >= 0) return fee;
    }
    return null;
  }, [tx, txFromElectrum, mempoolFee]);

  // Calculate fee rate
  const feeRate = calculatedFee && tx?.vsize ? Math.round(calculatedFee / tx.vsize) : null;

  // Get transaction direction and date
  const transactionDirection = tx?.value < 0 ? loc.transactions.details_sent : loc.transactions.details_received;
  const transactionDate = tx?.timestamp ? dayjs(tx.timestamp * 1000).format('LLL') : '-';

  // Get memo
  const memo = tx?.hash ? txMetadata[tx.hash]?.memo || '' : '';

  const shortenContactName = (name: string): string => {
    if (name.length < 20) return name;
    return name.substr(0, 10) + '...' + name.substr(name.length - 10, 10);
  };

  // Derive read-only counterparty info (if any) for BIP47 counterparties
  useEffect(() => {
    if (!tx?.hash || !wallet || !counterpartyMetadata) {
      setCounterpartyLabel(null);
      setPaymentCode(null);
      return;
    }

    try {
      const maybeWallet: any = wallet;
      if (
        typeof maybeWallet.allowBIP47 === 'function' &&
        typeof maybeWallet.isBIP47Enabled === 'function' &&
        'getBip47CounterpartyByTxid' in maybeWallet
      ) {
        if (!maybeWallet.allowBIP47() || !maybeWallet.isBIP47Enabled()) {
          setCounterpartyLabel(null);
          setPaymentCode(null);
          return;
        }
        const foundPaymentCode = maybeWallet.getBip47CounterpartyByTxid(tx.hash);
        if (foundPaymentCode) {
          const meta = counterpartyMetadata[foundPaymentCode];
          setPaymentCode(foundPaymentCode);
          setCounterpartyLabel(meta?.label ?? null);
        } else {
          setCounterpartyLabel(null);
          setPaymentCode(null);
        }
      } else {
        setCounterpartyLabel(null);
        setPaymentCode(null);
      }
    } catch (error) {
      // If anything goes wrong, we silently ignore and do not show a counterparty badge
      setCounterpartyLabel(null);
      setPaymentCode(null);
    }
  }, [tx?.hash, wallet, counterpartyMetadata]);

  const counterpartyDisplayName = useMemo(() => {
    const base = counterpartyLabel || paymentCode;
    if (!base) return null;
    return shortenContactName(base);
  }, [counterpartyLabel, paymentCode]);

  const counterpartyColor = useMemo(() => {
    if (!paymentCode) return null;
    try {
      const digest = sha256(paymentCode);
      return '#' + uint8ArrayToHex(digest).substring(0, 6);
    } catch {
      return null;
    }
  }, [paymentCode]);

  // Set header title with direction and date (inline component required by React Navigation API)
  useEffect(() => {
    if (tx) {
      setOptions({
        // eslint-disable-next-line react/no-unstable-nested-components -- React Navigation setOptions expects a render function
        headerTitle: () => (
          <TransactionDetailHeaderTitle
            direction={transactionDirection}
            date={transactionDate}
            directionStyle={[styles.headerTitleDirection, stylesHook.headerTitleDirection]}
            dateStyle={[styles.headerTitleDate, stylesHook.titleDate]}
          />
        ),
      });
    }
    // stylesHook is derived from colors; omitting to avoid unnecessary effect runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, transactionDirection, transactionDate, setOptions, colors]);

  if (loadingError) {
    return (
      <SafeAreaScrollView>
        <View style={[styles.card, stylesHook.card]}>
          <BlueText>{loc.transactions.transaction_loading_error}</BlueText>
        </View>
      </SafeAreaScrollView>
    );
  }

  if (isLoading || !wallet) {
    return (
      <SafeAreaScrollView>
        <BlueLoading />
      </SafeAreaScrollView>
    );
  }

  if (!tx) {
    return (
      <SafeAreaScrollView>
        <BlueText>{loc.transactions.transaction_not_available}</BlueText>
      </SafeAreaScrollView>
    );
  }

  return (
    <SafeAreaScrollView contentContainerStyle={styles.scrollContent}>
      {/* Value Section */}
      <View style={styles.valueCard}>
        <View style={styles.valueContent}>
          <Text style={[styles.value, stylesHook.value]} selectable>
            {formatBalanceWithoutSuffix(tx.value, wallet.preferredBalanceUnit, true)}
            {` `}
            {wallet?.preferredBalanceUnit !== BitcoinUnit.LOCAL_CURRENCY && (
              <Text style={[styles.valueUnit, stylesHook.valueUnit]}>{wallet.preferredBalanceUnit}</Text>
            )}
          </Text>
          {wallet?.preferredBalanceUnit !== BitcoinUnit.LOCAL_CURRENCY && (
            <Text style={[styles.localCurrency, stylesHook.localCurrency]}>{satoshiToLocalCurrency(Math.abs(tx.value))}</Text>
          )}
        </View>
      </View>

      {/* State Section */}
      <View
        style={[
          styles.stateCard,
          stylesHook.stateCard,
          !tx.confirmations ? stylesHook.stateCardPending : tx.value < 0 ? stylesHook.stateCardSent : stylesHook.stateCardReceived,
        ]}
      >
        <View style={styles.stateSection}>
          {!tx.confirmations ? (
            <>
              <View style={styles.stateIndicator}>
                <TransactionPendingIcon />
                <View style={styles.stateLabelContainer}>
                  <BlueText style={[styles.stateLabel, stylesHook.stateLabelPending]}>{loc.transactions.pending}</BlueText>
                  <BlueText style={[styles.stateValue, stylesHook.stateValuePending, styles.stateValueInline]}>
                    {eta || loc.transactions.details_eta_analyzing}
                  </BlueText>
                </View>
              </View>
              {(isRBFBumpFeePossible === ButtonStatus.Possible || isRBFCancelPossible === ButtonStatus.Possible) && (
                <View style={styles.stateButtons}>
                  {isRBFBumpFeePossible === ButtonStatus.Possible && (
                    <TouchableOpacity
                      onPress={() => navigateToRBFBumpFee(tx, wallet)}
                      style={[styles.speedUpButton, stylesHook.speedUpButton]}
                      accessibilityRole="button"
                    >
                      <BlueText style={[styles.speedUpButtonText, stylesHook.speedUpButtonText]}>{loc.transactions.status_bump}</BlueText>
                    </TouchableOpacity>
                  )}
                  {isRBFCancelPossible === ButtonStatus.Possible && (
                    <TouchableOpacity
                      onPress={() => navigateToRBFCancel(tx, wallet)}
                      style={[styles.cancelButton, stylesHook.cancelButton]}
                      accessibilityRole="button"
                    >
                      <BlueText style={[styles.cancelButtonText, stylesHook.cancelButtonText]}>{loc.transactions.status_cancel}</BlueText>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          ) : tx.value < 0 ? (
            <View style={styles.stateIndicator}>
              <TransactionOutgoingIcon />
              <View style={styles.stateLabelContainer}>
                <BlueText style={[styles.stateLabel, stylesHook.stateLabelSent]}>{loc.transactions.details_sent}</BlueText>
                <BlueText style={[styles.stateValue, stylesHook.stateValueSent, styles.stateValueInline]}>
                  {loc.formatString(loc.transactions.confirmations_lowercase, {
                    confirmations: tx.confirmations > 6 ? '6+' : tx.confirmations,
                  })}
                </BlueText>
              </View>
            </View>
          ) : (
            <View style={styles.stateIndicator}>
              <TransactionIncomingIcon />
              <View style={styles.stateLabelContainer}>
                <BlueText style={[styles.stateLabel, stylesHook.stateLabelReceived]}>{loc.transactions.details_received}</BlueText>
                <BlueText style={[styles.stateValue, stylesHook.stateValueReceived, styles.stateValueInline]}>
                  {loc.formatString(loc.transactions.confirmations_lowercase, {
                    confirmations: tx.confirmations > 6 ? '6+' : tx.confirmations,
                  })}
                </BlueText>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Counterparty badge (read-only, matches contact list style) */}
      {counterpartyDisplayName && (
        <View style={[styles.counterpartyContainer, stylesHook.counterpartyContainer]}>
          <View
            style={[
              styles.counterpartyAvatar,
              stylesHook.counterpartyAvatar,
              counterpartyColor ? { backgroundColor: counterpartyColor } : null,
            ]}
          >
            <Text style={[styles.counterpartyAvatarText, stylesHook.counterpartyAvatarText]}>
              {(counterpartyLabel || paymentCode || '').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.counterpartyName, stylesHook.counterpartyName]} numberOfLines={1}>
            {counterpartyDisplayName}
          </Text>
        </View>
      )}

      {/* Details Section */}
      <View style={[styles.detailsCard, stylesHook.detailsCard]}>
        {/* Details Title */}
        <View style={[styles.sectionTitle, styles.sectionTitleWithButton, stylesHook.sectionTitle]}>
          <BlueText style={[styles.sectionTitleText, stylesHook.sectionTitleText]}>{loc.transactions.details_section}</BlueText>
          {tx?.hash && (
            <TouchableOpacity
              onPress={handleOpenBlockExplorer}
              style={[styles.explorerButton, stylesHook.explorerButton]}
              activeOpacity={0.7}
            >
              <BlueText style={[styles.explorerButtonText, stylesHook.explorerButtonText]}>{loc.transactions.details_explorer}</BlueText>
            </TouchableOpacity>
          )}
        </View>
        {/* Network Fee */}
        <View style={[styles.detailRow, stylesHook.detailRow]}>
          <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.transactions.details_network_fee}</BlueText>
          <View style={styles.detailValueContainer}>
            <CopyTextToClipboard
              text={
                calculatedFee !== null && calculatedFee !== undefined
                  ? `${formatBalanceWithoutSuffix(calculatedFee, BitcoinUnit.SATS, false)} sats / ${satoshiToLocalCurrency(calculatedFee)}`
                  : '-'
              }
              style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
              textAlign="right"
            />
          </View>
        </View>

        {/* To address - sent transactions only */}
        {tx.value < 0 &&
          (() => {
            const externalAddresses = arrDiff(from, to.filter(onlyUnique));
            if (externalAddresses.length === 0) return null;
            const displayText = externalAddresses.map(shortenCounterpartyName).join(', ');
            const copyText = externalAddresses.join(', ');
            return (
              <View style={[styles.detailRow, stylesHook.detailRow]}>
                <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.transactions.details_to_address}</BlueText>
                <View style={styles.detailValueContainer}>
                  <View style={styles.detailValueCopyContainer}>
                    <CopyTextToClipboard
                      text={copyText}
                      displayText={displayText}
                      style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                      selectable
                      textAlign="right"
                    />
                  </View>
                </View>
              </View>
            );
          })()}

        {/* Transaction ID */}
        {tx.hash && (
          <View style={[styles.detailRow, stylesHook.detailRow]}>
            <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.transactions.details_id}</BlueText>
            <View style={styles.detailValueContainer}>
              <View style={styles.detailValueCopyContainer}>
                <CopyTextToClipboard
                  text={tx.hash}
                  style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  selectable
                  textAlign="right"
                />
              </View>
            </View>
          </View>
        )}

        {/* Note/Memo */}
        <View style={[styles.detailRow, styles.detailRowLast, stylesHook.detailRow]}>
          <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.transactions.details_note}</BlueText>
          <View style={styles.detailValueContainer}>
            {memo ? (
              <TouchableOpacity onPress={handleNotePress} activeOpacity={0.7} style={styles.memoContainer}>
                <BlueText style={[styles.memoText, stylesHook.memoText]} numberOfLines={0}>
                  {memo}
                </BlueText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleNotePress} style={[styles.addButton, stylesHook.addButton]} activeOpacity={0.7}>
                <BlueText style={[styles.addButtonText, stylesHook.addButtonText]}>{loc.transactions.details_add_note}</BlueText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Advanced Section */}
      <View style={[styles.detailsCard, stylesHook.detailsCard]}>
        <TouchableOpacity
          onPress={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
          style={[styles.advancedHeader, stylesHook.advancedHeader]}
        >
          <View style={[styles.sectionTitle, stylesHook.sectionTitle, styles.sectionTitleRow]}>
            <BlueText style={[styles.sectionTitleText, stylesHook.sectionTitleText]}>{loc.transactions.details_advanced}</BlueText>
            <Icon
              name={isAdvancedExpanded ? 'chevron-up' : 'chevron-down'}
              type="font-awesome-5"
              size={16}
              color={colors.foregroundColor}
            />
          </View>
        </TouchableOpacity>

        {isAdvancedExpanded && (
          <View style={[styles.advancedContent, stylesHook.advancedContent]}>
            {/* Fee Rate */}
            <View style={[styles.detailRow, stylesHook.detailRow]}>
              <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.transactions.details_fee_rate}</BlueText>
              <View style={styles.detailValueContainer}>
                <CopyTextToClipboard
                  text={feeRate ? `${feeRate} sats/vb` : '-'}
                  style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Size */}
            <View style={[styles.detailRow, stylesHook.detailRow]}>
              <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.transactions.details_size}</BlueText>
              <View style={styles.detailValueContainer}>
                <CopyTextToClipboard
                  text={tx.size ? `${tx.size} B` : '-'}
                  style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Virtual Size */}
            <View style={[styles.detailRow, stylesHook.detailRow]}>
              <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.transactions.details_virtual_size}</BlueText>
              <View style={styles.detailValueContainer}>
                <CopyTextToClipboard
                  text={tx.vsize ? `${tx.vsize} vB` : '-'}
                  style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Transaction Hex */}
            <View style={[styles.detailRow, stylesHook.detailRow]}>
              <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.transactions.details_tx_hex}</BlueText>
              <View style={styles.detailValueContainer}>
                {txHex ? (
                  <CopyTextToClipboard
                    text={txHex}
                    displayText={loc.transactions.details_copy}
                    style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                    textAlign="right"
                  />
                ) : isLoadingHex ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <CopyTextToClipboard
                    text="-"
                    style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
                    textAlign="right"
                  />
                )}
              </View>
            </View>

            {/* Inputs */}
            {tx.inputs && tx.inputs.length > 0 && (
              <View style={[styles.detailRowFullWidth, stylesHook.detailRowFullWidth]}>
                <BlueText style={[styles.detailLabelFullWidth, stylesHook.detailLabel]}>
                  {loc.formatString(loc.transactions.details_inputs_count, { count: tx.inputs.length })}
                </BlueText>
                <View style={styles.detailValueFullWidth}>
                  {from.filter(onlyUnique).length > 0 && renderSection(from.filter(onlyUnique))}
                </View>
              </View>
            )}

            {/* Outputs */}
            {tx.outputs && tx.outputs.length > 0 && (
              <View style={[styles.detailRowFullWidth, styles.detailRowLast, stylesHook.detailRowFullWidth]}>
                <BlueText style={[styles.detailLabelFullWidth, stylesHook.detailLabel]}>
                  {loc.formatString(loc.transactions.details_outputs_count, { count: tx.outputs.length })}
                </BlueText>
                <View style={styles.detailValueFullWidth}>
                  {to.filter(onlyUnique).length > 0 && renderSection(arrDiff(from, to.filter(onlyUnique)))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Action Buttons - Only show CPFP here, Speed Up and Cancel are in state section for pending */}
      {tx.confirmations > 0 && <View style={styles.actions}>{renderCPFP(tx, wallet)}</View>}
    </SafeAreaScrollView>
  );
};

export default TransactionStatus;

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
    backgroundColor: 'transparent',
    marginHorizontal: 24,
    marginBottom: 42,
    padding: 0,
  },
  counterpartyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 32,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  counterpartyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterpartyAvatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  counterpartyName: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  valueContent: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  value: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 32,
    paddingTop: 8,
    minHeight: 38,
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
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 42,
    overflow: 'hidden',
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
  stateLabelContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginLeft: 8,
    flex: 1,
  },
  stateLabel: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 0,
  },
  stateValue: {
    fontSize: 13,
    marginBottom: 0,
    marginTop: 0,
  },
  stateValueInline: {
    marginBottom: 0,
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
  card: {
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 42,
    padding: 20,
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
  },
  sectionTitle: {
    backgroundColor: '#F2F2F2',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sectionTitleRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingVertical: 6,
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
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    minHeight: 24,
    backgroundColor: '#F9F9F9',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    minWidth: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailValueCopyContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  detailValueFullWidth: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'right',
    flexShrink: 1,
    minWidth: 0,
    color: '#000000',
  },
  memoText: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'right',
    flexShrink: 1,
  },
  addButton: {
    paddingVertical: 4,
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
  rowValue: {
    color: 'grey',
  },
  weOwnAddress: {
    fontWeight: '700',
  },
});
