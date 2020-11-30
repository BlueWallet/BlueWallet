import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import {
  BlueButton,
  SafeBlueArea,
  BlueTransactionOutgoingIcon,
  BlueTransactionPendingIcon,
  BlueTransactionIncomingIcon,
  BlueCard,
  BlueText,
  BlueLoading,
  BlueSpacing20,
  BlueNavigationStyle,
} from '../../BlueComponents';
import { HDSegwitBech32Transaction } from '../../class';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { Icon } from 'react-native-elements';
import Handoff from 'react-native-handoff';
import HandoffSettings from '../../class/handoff';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
const buttonStatus = Object.freeze({
  possible: 1,
  unknown: 2,
  notPossible: 3,
});

const TransactionsStatus = () => {
  const { setSelectedWallet, wallets, txMetadata, getTransactions } = useContext(BlueStorageContext);
  const [isHandOffUseEnabled, setIsHandOffUseEnabled] = useState(false);
  const { hash } = useRoute().params;
  const { navigate, setOptions } = useNavigation();
  const { colors } = useTheme();
  const wallet = useRef();
  const [isCPFPPossible, setIsCPFPPossible] = useState(buttonStatus.unknown);
  const [isRBFBumpFeePossible, setIsRBFBumpFeePossible] = useState(buttonStatus.unknown);
  const [isRBFCancelPossible, setIsRBFCancelPossible] = useState(buttonStatus.unknown);
  const [tx, setTX] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    value: {
      color: colors.alternativeTextColor2,
    },
    valueUnit: {
      color: colors.alternativeTextColor2,
    },
    iconRoot: {
      backgroundColor: colors.success,
    },
    confirmations: {
      backgroundColor: colors.lightButton,
    },
  });

  useEffect(() => {
    setOptions({
      headerStyle: {
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
        shadowOffset: { height: 0, width: 0 },
        backgroundColor: colors.customHeader,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  useEffect(() => {
    for (const tx of getTransactions()) {
      if (tx.hash === hash) {
        setTX(tx);
        break;
      }
    }

    for (const w of wallets) {
      for (const t of w.getTransactions()) {
        if (t.hash === hash) {
          console.log('tx', hash, 'belongs to', w.getLabel());
          wallet.current = w;
          break;
        }
      }
    }

    Promise.all([checkPossibilityOfCPFP(), checkPossibilityOfRBFBumpFee(), checkPossibilityOfRBFCancel()])
      .catch(_ => {
        setIsRBFBumpFeePossible(buttonStatus.notPossible);
        setIsCPFPPossible(buttonStatus.notPossible);
        setIsRBFCancelPossible(buttonStatus.notPossible);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  useEffect(() => {
    if (wallet) {
      setSelectedWallet(wallet.current.getID());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  useEffect(() => {
    console.log('transactions/details - useEffect');
    HandoffSettings.isHandoffUseEnabled().then(setIsHandOffUseEnabled);
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
          <BlueSpacing20 />
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
          <TouchableOpacity style={styles.cancel}>
            <Text onPress={navigateToRBFCancel} style={styles.cancelText}>
              {loc.transactions.status_cancel}
            </Text>
          </TouchableOpacity>
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
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={[styles.root, stylesHook.root]}>
        <BlueLoading />
      </SafeBlueArea>
    );
  }
  return (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={[styles.root, stylesHook.root]}>
      {isHandOffUseEnabled && (
        <Handoff title={`Bitcoin Transaction ${tx.hash}`} type="io.bluewallet.bluewallet" url={`https://blockstream.info/tx/${tx.hash}`} />
      )}
      <StatusBar barStyle="default" />
      <View style={styles.container}>
        <BlueCard>
          <View style={styles.center}>
            <Text style={[styles.value, stylesHook.value]}>
              {formatBalanceWithoutSuffix(tx.value, wallet.current.preferredBalanceUnit, true)}{' '}
              {wallet.current.preferredBalanceUnit !== BitcoinUnit.LOCAL_CURRENCY && (
                <Text style={[styles.valueUnit, stylesHook.valueUnit]}>{wallet.current.preferredBalanceUnit}</Text>
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
                      <BlueTransactionPendingIcon />
                    </View>
                  );
                } else if (tx.value < 0) {
                  return (
                    <View style={styles.icon}>
                      <BlueTransactionOutgoingIcon />
                    </View>
                  );
                } else {
                  return (
                    <View style={styles.icon}>
                      <BlueTransactionIncomingIcon />
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

          <View style={[styles.confirmations, stylesHook.confirmations]}>
            <Text style={styles.confirmationsText}>{tx.confirmations > 6 ? '6+' : tx.confirmations} confirmations</Text>
          </View>
        </BlueCard>

        <View style={styles.actions}>
          {renderCPFP()}
          {renderRBFBumpFee()}
          {renderRBFCancel()}
          <TouchableOpacity style={styles.details} onPress={navigateToTransactionDetials}>
            <Text style={styles.detailsText}>{loc.send.create_details.toLowerCase()}</Text>
            <Icon name="angle-right" size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeBlueArea>
  );
};

export default TransactionsStatus;
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
    borderRadius: 11,
    width: 109,
    height: 21,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationsText: {
    color: '#9aa0aa',
    fontSize: 11,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailsText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
});

TransactionsStatus.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: '',
});
