import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { Psbt, Transaction } from 'bitcoinjs-lib';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import BlueCard from '../../components/BlueCard';
import BlueText from '../../components/BlueText';
import { HDSegwitBech32Transaction } from '../../class/hd-segwit-bech32-transaction';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import presentAlert, { AlertType } from '../../components/Alert';
import Button from '../../components/Button';
import TxHex from '../../components/TxHex';
import SafeArea from '../../components/SafeArea';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import loc from '../../loc';
import ReplaceFeeSuggestions from '../../components/ReplaceFeeSuggestions';
import { majorTomToGroundControl } from '../../blue_modules/notifications';
import { BlueSpacing, BlueSpacing20 } from '../../components/BlueSpacing';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { errorMessage } from '../../helpers/errorMessage';
import { TWallet } from '../../class/wallets/types';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { isWatchOnlySegwitBech32 } from '../../util/isWatchOnlySegwitBech32';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stage: {
    paddingTop: 16,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  spacerTop: {
    flex: 2,
  },
  spacerBottom: {
    flex: 3,
  },
  notPossibleText: {
    textAlign: 'center',
    marginHorizontal: 20,
  },
  created: {
    flex: 1,
    padding: 20,
  },
});

const FeeSelectionLayout = ({ children }: { children: React.ReactNode }) => {
  const scrollRef = useRef<ScrollView>(null);
  const { height: keyboardHeight, isVisible } = useKeyboard();
  const androidKeyboardInset = Platform.OS === 'android' && isVisible ? keyboardHeight + 24 : 0;

  const scrollFocusedFieldIntoView = () => {
    if (androidKeyboardInset > 0) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  };

  return (
    <SafeAreaScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      floatingButtonHeight={androidKeyboardInset}
      contentContainerStyle={styles.scrollContent}
      onContentSizeChange={scrollFocusedFieldIntoView}
    >
      {children}
    </SafeAreaScrollView>
  );
};

type Stage =
  | { kind: 'loading' }
  | { kind: 'notPossible' }
  | { kind: 'selectFee'; tx: HDSegwitBech32Transaction; feeRate: number }
  | { kind: 'created'; txhex: string; newTxid: string };

type FeeBumpScreenProps = {
  wallet: TWallet;
  txid: string;
  explainText: string;
  notPossibleText: string;
  getBumpableTx: (wallet: TWallet, txid: string) => Promise<HDSegwitBech32Transaction | undefined>;
  createTx: (tx: HDSegwitBech32Transaction, feeRate: number) => Promise<{ tx?: Transaction; psbt?: Psbt }>;
  onBroadcasted: (newTxid: string) => void;
};

export const FeeBumpScreen: React.FC<FeeBumpScreenProps> = ({
  wallet,
  txid,
  explainText,
  notPossibleText,
  getBumpableTx,
  createTx,
  onBroadcasted,
}) => {
  const navigation = useNavigation();
  const { txMetadata, sleep, fetchAndSaveWalletTransactions } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [isLoading, setIsLoading] = useState(false);
  const [newFeeRate, setNewFeeRate] = useState<number>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tx = await getBumpableTx(wallet, txid);
      if (cancelled) return;
      if (!tx) return setStage({ kind: 'notPossible' });
      const info = await tx.getInfo();
      if (cancelled) return;
      // 1 sat makes a lot of difference, since sometimes because of rounding created tx's fee might be insufficient
      setStage({ kind: 'selectFee', tx, feeRate: info.feeRate + 1 });
    })().catch(e => {
      if (cancelled) return;
      presentAlert({ message: errorMessage(e) });
      navigation.goBack();
    });
    return () => {
      cancelled = true;
    };
  }, [getBumpableTx, wallet, txid, navigation]);

  const createTransaction = async (tx: HDSegwitBech32Transaction, feeRate: number) => {
    if (newFeeRate === undefined || !(newFeeRate > feeRate)) return;
    setIsLoading(true);
    try {
      const { tx: newTx, psbt } = await createTx(tx, newFeeRate);

      // watch-only wallets with enabled HW wallet support have different flow. we have to show PSBT to user as QR code
      // so he can scan it and sign it. then we have to scan it back from user (via camera and QR code), and ask
      // user whether he wants to broadcast it
      if (isWatchOnlySegwitBech32(wallet)) {
        navigation
          .getParent()
          ?.getParent()
          ?.navigate('SendDetailsRoot', {
            screen: 'PsbtWithHardwareWallet',
            params: {
              // porting memo from old tx:
              memo: txMetadata[txid]?.memo,
              walletID: wallet.getID(),
              psbt,
            },
          });
        setIsLoading(false);
        return;
      }

      if (!newTx) throw new Error('Internal error: transaction is not signed');
      setStage({ kind: 'created', txhex: newTx.toHex(), newTxid: newTx.getId() });
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
      presentAlert({ message: loc.errors.error + ': ' + errorMessage(e) });
    }
  };

  const broadcast = async (txhex: string, newTxid: string) => {
    setIsLoading(true);
    try {
      if (!(await BlueElectrum.ensureConnected())) {
        throw new Error(loc.errors.network);
      }
      const result = await wallet.broadcastTx(txhex);
      if (result) {
        onBroadcasted(newTxid);
        sleep(4000).then(() => fetchAndSaveWalletTransactions(wallet.getID()));
        navigation.navigate('Success', {
          amount: undefined,
          walletID: wallet.getID(),
          walletType: wallet.type,
        });
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        setIsLoading(false);
        presentAlert({ message: loc.errors.broadcast });
      }
    } catch (error) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      setIsLoading(false);
      presentAlert({ message: errorMessage(error), type: AlertType.Toast });
    }
  };

  if (isLoading || stage.kind === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (stage.kind === 'created') {
    const { txhex, newTxid } = stage;
    return (
      <SafeArea style={styles.root}>
        <View style={styles.created}>
          <TxHex hex={txhex} />
          <Button disabled={isElectrumDisabled} onPress={() => broadcast(txhex, newTxid)} title={loc.send.confirm_sendNow} />
        </View>
      </SafeArea>
    );
  }

  if (stage.kind === 'notPossible') {
    return (
      <SafeArea ignoreTopInset>
        <View style={styles.spacerTop} />
        <BlueText h4 style={styles.notPossibleText}>
          {notPossibleText}
        </BlueText>
        <View style={styles.spacerBottom} />
      </SafeArea>
    );
  }

  const { tx, feeRate } = stage;
  return (
    <FeeSelectionLayout>
      <View style={styles.stage}>
        <BlueCard>
          <BlueText>{explainText}</BlueText>
          <BlueSpacing20 />
          <ReplaceFeeSuggestions onFeeSelected={setNewFeeRate} transactionMinimum={feeRate} />
          <BlueSpacing />
          <Button
            disabled={newFeeRate === undefined || newFeeRate <= feeRate || !Number.isFinite(newFeeRate)}
            onPress={() => createTransaction(tx, feeRate)}
            title={loc.transactions.cpfp_create}
          />
        </BlueCard>
      </View>
    </FeeSelectionLayout>
  );
};

export const getRBFTransaction = (wallet: TWallet, txid: string): HDSegwitBech32Transaction | undefined => {
  if (isWatchOnlySegwitBech32(wallet)) {
    return new HDSegwitBech32Transaction(null, txid, wallet._hdWalletInstance, wallet.getMasterFingerprint());
  }
  if (wallet.type === HDSegwitBech32Wallet.type) {
    return new HDSegwitBech32Transaction(null, txid, wallet);
  }
};

const getCPFPTransaction = async (wallet: TWallet, txid: string) => {
  if (wallet.type !== HDSegwitBech32Wallet.type) return;
  const tx = new HDSegwitBech32Transaction(null, txid, wallet);
  if ((await tx.isToUsTransaction()) && (await tx.getRemoteConfirmationsNum()) === 0) return tx;
};

const CPFP = () => {
  const { txid, wallet } = useRoute<RouteProp<DetailViewStackParamList, 'CPFP'>>().params;
  const { txMetadata } = useStorage();

  return (
    <FeeBumpScreen
      wallet={wallet}
      txid={txid}
      explainText={loc.transactions.cpfp_exp}
      notPossibleText={loc.transactions.cpfp_no_bump}
      getBumpableTx={getCPFPTransaction}
      createTx={(tx, feeRate) => tx.createCPFPbumpFee(feeRate)}
      onBroadcasted={newTxid => {
        txMetadata[newTxid] = { memo: 'Child pays for parent (CPFP)' };
        majorTomToGroundControl([], [], [newTxid]);
      }}
    />
  );
};

export default CPFP;
