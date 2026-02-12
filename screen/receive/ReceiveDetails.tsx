import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';
import Share from 'react-native-share';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { fiatToBTC, satoshiToBTC } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { majorTomToGroundControl, tryToObtainPermissions } from '../../blue_modules/notifications';
import { BlueButtonLink, BlueCard, BlueText } from '../../BlueComponents';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import HandOffComponent from '../../components/HandOffComponent';
import HeaderMenuButton from '../../components/HeaderMenuButton';
import QRCodeComponent from '../../components/QRCodeComponent';
import SegmentedControl from '../../components/SegmentControl';
import { useTheme } from '../../components/themes';
import TipBox from '../../components/TipBox';
import { TransactionPendingIconBig } from '../../components/TransactionPendingIconBig';
import { HandOffActivityType } from '../../components/types';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { ReceiveDetailsStackParamList } from '../../navigation/ReceiveDetailsStackParamList';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { SuccessView } from '../send/success';
import { BlueSpacing40 } from '../../components/BlueSpacing';
import { BlueLoading } from '../../components/BlueLoading';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';

const segmentControlValues = [loc.wallets.details_address, loc.bip47.payment_code];
const HORIZONTAL_PADDING = 20;

type StickyHeaderProps = {
  wallet: any;
  isBIP47Enabled: boolean;
  tabValues: string[];
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  backgroundColor: string;
};

const StickyHeader = React.memo(({ wallet, isBIP47Enabled, tabValues, currentTab, setCurrentTab, backgroundColor }: StickyHeaderProps) => {
  if (!wallet || !isBIP47Enabled) return null;

  return (
    <View style={[styles.tabsContainer, { backgroundColor }]}>
      <SegmentedControl
        values={tabValues}
        selectedIndex={tabValues.findIndex(tab => tab === currentTab)}
        onChange={index => {
          setCurrentTab(tabValues[index]);
        }}
      />
    </View>
  );
});

type NavigationProps = NativeStackNavigationProp<ReceiveDetailsStackParamList, 'ReceiveDetails'>;
type RouteProps = RouteProp<ReceiveDetailsStackParamList, 'ReceiveDetails'>;

const ReceiveDetails = () => {
  const route = useRoute<RouteProps>();
  const { walletID, address } = route.params;
  const { wallets, saveToDisk, sleep, fetchAndSaveWalletTransactions } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const { colors } = useTheme();
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState<BitcoinUnit>(BitcoinUnit.BTC);
  const [bip21encoded, setBip21encoded] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [showPendingBalance, setShowPendingBalance] = useState(false);
  const [showConfirmedBalance, setShowConfirmedBalance] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [currentTab, setCurrentTab] = useState(segmentControlValues[0]);
  const { goBack, setParams, setOptions, navigate } = useExtendedNavigation<NavigationProps>();
  const [intervalMs, setIntervalMs] = useState(5000);
  const [eta, setEta] = useState('');
  const [initialConfirmed, setInitialConfirmed] = useState(0);
  const [initialUnconfirmed, setInitialUnconfirmed] = useState(0);
  const [displayBalance, setDisplayBalance] = useState('');
  const [qrCodeSize, setQRCodeSize] = useState(90);

  const wallet = walletID ? wallets.find(w => w.getID() === walletID) : undefined;
  const isBIP47Enabled = wallet?.isBIP47Enabled();

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    amount: {
      color: colors.foregroundColor,
    },
    label: {
      color: colors.foregroundColor,
    },
  });

  const setAddressBIP21Encoded = useCallback(
    (addr: string) => {
      const newBip21encoded = DeeplinkSchemaMatch.bip21encode(addr);
      setParams({ address: addr });
      setBip21encoded(newBip21encoded);
      setShowAddress(true);
    },
    [setParams],
  );

  const obtainWalletAddress = useCallback(async () => {
    console.debug('ReceiveDetails - componentDidMount');
    // this function should only be called when wallet exists
    if (!wallet) {
      console.warn('Wallet not found');
      return;
    }
    if (address) {
      try {
        await tryToObtainPermissions();
        majorTomToGroundControl([address], [], []);
      } catch (error) {
        console.error('Error obtaining notifications permissions:', error);
      }
      return;
    }

    let newAddress;
    if (wallet.chain === Chain.ONCHAIN) {
      try {
        if (!isElectrumDisabled) newAddress = await Promise.race([wallet.getAddressAsync(), sleep(1000)]);
      } catch (error) {
        console.warn('Error fetching wallet address (ONCHAIN):', error);
      }
      if (newAddress === undefined) {
        if ('_getExternalAddressByIndex' in wallet) {
          newAddress = wallet._getExternalAddressByIndex(wallet.getNextFreeAddressIndex());
        } else {
          newAddress = wallet.getAddress();
        }
      } else {
        saveToDisk(); // caching whatever getAddressAsync() generated internally
      }
    } else {
      try {
        await Promise.race([wallet.getAddressAsync(), sleep(1000)]);
        newAddress = wallet.getAddress();
      } catch (error) {
        console.warn('Error fetching wallet address (OFFCHAIN):', error);
      }
      if (newAddress === undefined) {
        console.warn('either sleep expired or getAddressAsync threw an exception');
        newAddress = wallet.getAddress();
      } else {
        saveToDisk(); // caching whatever getAddressAsync() generated internally
      }
    }

    if (!newAddress) {
      presentAlert({ title: loc.errors.error, message: loc.receive.address_not_found });
      return;
    }

    setAddressBIP21Encoded(newAddress);

    try {
      await tryToObtainPermissions();
      majorTomToGroundControl([newAddress], [], []);
    } catch (error) {
      console.error('Error obtaining notifications permissions:', error);
    }
  }, [wallet, saveToDisk, address, setAddressBIP21Encoded, isElectrumDisabled, sleep]);

  const onEnablePaymentsCodeSwitchValue = useCallback(() => {
    if (wallet && wallet.allowBIP47()) {
      wallet.switchBIP47(!wallet.isBIP47Enabled());
    }
    saveToDisk();
    obtainWalletAddress();
  }, [wallet, saveToDisk, obtainWalletAddress]);

  useEffect(() => {
    if (showConfirmedBalance) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    }
  }, [showConfirmedBalance]);

  useEffect(() => {
    if (address) {
      setAddressBIP21Encoded(address);
    }
  }, [address, setAddressBIP21Encoded]);

  const toolTipActions = useMemo(() => {
    const action = { ...CommonToolTipActions.PaymentsCode };
    action.menuState = isBIP47Enabled;
    return [action];
  }, [isBIP47Enabled]);

  const onPressMenuItem = useCallback(() => {
    onEnablePaymentsCodeSwitchValue();
  }, [onEnablePaymentsCodeSwitchValue]);

  const HeaderRight = useMemo(
    () => <HeaderMenuButton actions={toolTipActions} onPressMenuItem={onPressMenuItem} />,
    [onPressMenuItem, toolTipActions],
  );

  useEffect(() => {
    wallet?.allowBIP47() &&
      setOptions({
        headerRight: () => HeaderRight,
      });
  }, [HeaderRight, colors.foregroundColor, setOptions, wallet]);

  // re-fetching address balance periodically
  useEffect(() => {
    console.debug('receive/details - useEffect');

    const intervalId = setInterval(async () => {
      try {
        const decoded = DeeplinkSchemaMatch.bip21decode(bip21encoded);
        const addressToUse = address || decoded.address;
        if (!addressToUse) return;

        console.debug('checking address', addressToUse, 'for balance...');
        const balance = await BlueElectrum.getBalanceByAddress(addressToUse);
        console.debug('...got', balance);

        if (balance.unconfirmed > 0) {
          if (initialConfirmed === 0 && initialUnconfirmed === 0) {
            setInitialConfirmed(balance.confirmed);
            setInitialUnconfirmed(balance.unconfirmed);
            setIntervalMs(25000);
            triggerHapticFeedback(HapticFeedbackTypes.ImpactHeavy);
          }

          const txs = await BlueElectrum.getMempoolTransactionsByAddress(addressToUse);
          const tx = txs.pop();
          if (tx) {
            const rez = await BlueElectrum.multiGetTransactionByTxid([tx.tx_hash], true, 10);
            if (rez[tx.tx_hash] && rez[tx.tx_hash].vsize) {
              const satPerVbyte = Math.round(tx.fee / rez[tx.tx_hash].vsize);
              const fees = await BlueElectrum.estimateFees();
              if (satPerVbyte >= fees.fast) {
                setEta(loc.formatString(loc.transactions.eta_10m));
              } else if (satPerVbyte >= fees.medium) {
                setEta(loc.formatString(loc.transactions.eta_3h));
              } else {
                setEta(loc.formatString(loc.transactions.eta_1d));
              }
            }
          }

          setDisplayBalance(
            loc.formatString(loc.transactions.pending_with_amount, {
              amt1: formatBalance(balance.unconfirmed, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
              amt2: formatBalance(balance.unconfirmed, BitcoinUnit.BTC, true).toString(),
            }),
          );
          setShowPendingBalance(true);
          setShowAddress(false);
        } else if (balance.unconfirmed === 0 && initialUnconfirmed !== 0) {
          // now, handling a case when unconfirmed == 0, but in past it wasnt (i.e. it changed while user was
          // staring at the screen)
          const balanceToShow = balance.confirmed - initialConfirmed;

          if (balanceToShow > 0) {
            // address has actually more coins than initially, so we definitely gained something
            setShowConfirmedBalance(true);
            setShowPendingBalance(false);
            setShowAddress(false);
            setDisplayBalance(
              loc.formatString(loc.transactions.received_with_amount, {
                amt1: formatBalance(balanceToShow, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
                amt2: formatBalance(balanceToShow, BitcoinUnit.BTC, true).toString(),
              }),
            );
            if (walletID) {
              fetchAndSaveWalletTransactions(walletID);
            }
          } else {
            // rare case, but probable. transaction evicted from mempool (maybe cancelled by the sender)
            setShowConfirmedBalance(false);
            setShowPendingBalance(false);
            setShowAddress(true);
          }
        }
      } catch (error) {
        console.debug('Error checking balance:', error);
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [bip21encoded, address, initialConfirmed, initialUnconfirmed, intervalMs, fetchAndSaveWalletTransactions, walletID]);

  useEffect(() => {
    const handleBackButton = () => {
      goBack();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => subscription.remove();
  }, [goBack]);

  const renderConfirmedBalance = () => {
    return (
      <View style={styles.scrollBody}>
        {isCustom && (
          <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
            {customLabel}
          </BlueText>
        )}
        <SuccessView />
        <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
          {displayBalance}
        </BlueText>
      </View>
    );
  };

  const renderPendingBalance = () => {
    return (
      <View style={styles.scrollBody}>
        {isCustom && (
          <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
            {customLabel}
          </BlueText>
        )}
        <TransactionPendingIconBig />
        <BlueSpacing40 />
        <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
          {displayBalance}
        </BlueText>
        <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
          {eta}
        </BlueText>
      </View>
    );
  };

  const onLayout = useCallback((e: { nativeEvent: { layout: { height: number; width: number } } }) => {
    const { height, width } = e.nativeEvent.layout;

    const isPortrait = height > width;
    const maxQRSize = 500;

    if (isPortrait) {
      const heightBasedSize = Math.min(height * 0.6, maxQRSize);
      const widthBasedSize = width * 0.85 - HORIZONTAL_PADDING * 2;
      setQRCodeSize(Math.min(heightBasedSize, widthBasedSize));
    } else {
      const heightBasedSize = Math.min(height * 0.7, maxQRSize);
      const widthBasedSize = width * 0.45;
      setQRCodeSize(Math.min(heightBasedSize, widthBasedSize));
    }
  }, []);

  const renderTabContent = () => {
    if (currentTab === segmentControlValues[0]) {
      return (
        <View style={styles.container}>
          {address && (
            <View style={styles.scrollBody}>
              {isCustom && (
                <>
                  {getDisplayAmount() && (
                    <BlueText testID="BitcoinAmountText" style={[styles.amount, stylesHook.amount]} numberOfLines={1}>
                      {getDisplayAmount()}
                    </BlueText>
                  )}
                  {customLabel?.length > 0 && (
                    <BlueText testID="CustomAmountDescriptionText" style={[styles.label, stylesHook.label]} numberOfLines={1}>
                      {customLabel}
                    </BlueText>
                  )}
                </>
              )}
              <View style={styles.qrCodeContainer}>
                <QRCodeComponent value={bip21encoded} size={qrCodeSize} />
              </View>
              <CopyTextToClipboard text={isCustom ? bip21encoded : address} />
            </View>
          )}
        </View>
      );
    } else if (wallet && isBIP47Enabled) {
      // wallet is always defined here
      const qrValue =
        'getBIP47PaymentCode' in wallet && typeof wallet.getBIP47PaymentCode === 'function' ? wallet.getBIP47PaymentCode() : undefined;
      return (
        <View style={styles.container}>
          {qrValue ? (
            <>
              <TipBox description={loc.receive.bip47_explanation} containerStyle={styles.tip} />
              <View style={styles.qrCodeContainer}>
                <QRCodeComponent value={qrValue} size={qrCodeSize} />
              </View>
              <CopyTextToClipboard text={qrValue} truncated={false} />
            </>
          ) : (
            <Text>{loc.bip47.not_found}</Text>
          )}
        </View>
      );
    } else {
      return null;
    }
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          if (wallet) {
            await obtainWalletAddress();
          } else if (!wallet && address) {
            setAddressBIP21Encoded(address);
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Error during focus effect:', error);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [wallet, address, obtainWalletAddress, setAddressBIP21Encoded]),
  );

  const showCustomAmountModal = useCallback(() => {
    if (!address) return;
    navigate('ReceiveCustomAmount', {
      address,
      currentLabel: customLabel,
      currentAmount: customAmount,
      currentUnit: customUnit,
      preferredUnit: wallet?.getPreferredBalanceUnit() || BitcoinUnit.BTC,
    });
  }, [address, customAmount, customLabel, customUnit, navigate, wallet]);

  useEffect(() => {
    const {
      customLabel: incomingLabel,
      customAmount: incomingAmount,
      customUnit: incomingUnit,
      bip21encoded: incomingBip21,
      isCustom: incomingIsCustom,
    } = route.params;

    const noIncomingParams =
      incomingLabel === undefined &&
      incomingAmount === undefined &&
      incomingUnit === undefined &&
      incomingBip21 === undefined &&
      incomingIsCustom === undefined;

    if (noIncomingParams) return;

    if (incomingIsCustom) {
      setIsCustom(true);
      setCustomLabel(incomingLabel ?? '');
      setCustomAmount(incomingAmount ?? '');
      setCustomUnit(incomingUnit ?? BitcoinUnit.BTC);
      if (incomingBip21) {
        setBip21encoded(incomingBip21);
      }
      setShowAddress(true);
      setShowPendingBalance(false);
      setShowConfirmedBalance(false);
    } else {
      const fallbackUnit = wallet?.getPreferredBalanceUnit() || BitcoinUnit.BTC;
      setIsCustom(false);
      setCustomLabel('');
      setCustomAmount('');
      setCustomUnit(fallbackUnit);
      if (incomingBip21) {
        setBip21encoded(incomingBip21);
      }
      setShowAddress(true);
      setShowPendingBalance(false);
      setShowConfirmedBalance(false);
    }

    setParams({ customLabel: undefined, customAmount: undefined, customUnit: undefined, bip21encoded: undefined, isCustom: undefined });
  }, [route.params, setParams, wallet]);

  /**
   * @returns {string} BTC amount, accounting for current `customUnit` and `customUnit`
   */
  const getDisplayAmount = (): string | null => {
    const number = Number(customAmount);
    if (number > 0) {
      switch (customUnit) {
        case BitcoinUnit.BTC:
          return customAmount + ' BTC';
        case BitcoinUnit.SATS:
          return satoshiToBTC(number) + ' BTC';
        case BitcoinUnit.LOCAL_CURRENCY:
          return fiatToBTC(number) + ' BTC';
      }
      return customAmount + ' ' + customUnit;
    } else {
      return null;
    }
  };

  const handleShareButtonPressed = () => {
    let message: string | false = false;
    if (currentTab === segmentControlValues[0]) {
      message = bip21encoded;
    } else {
      message = (wallet && 'getBIP47PaymentCode' in wallet && wallet.getBIP47PaymentCode()) ?? false;
    }

    if (!message) {
      presentAlert({ title: loc.errors.error, message: loc.bip47.not_found });
      return;
    }

    Share.open({ message }).catch(error => console.debug('Error sharing:', error));
  };

  return (
    <Animated.View layout={Layout.duration(200)} style={[styles.flex, stylesHook.root]}>
      <SafeAreaScrollView
        centerContent
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustsScrollIndicatorInsets
        automaticallyAdjustKeyboardInsets
        testID="ReceiveDetailsScrollView"
        style={stylesHook.root}
        contentContainerStyle={[styles.root, stylesHook.root]}
        keyboardShouldPersistTaps="always"
        onLayout={onLayout}
        stickyHeaderIndices={wallet && isBIP47Enabled ? [0] : []}
      >
        {wallet && isBIP47Enabled && (
          <StickyHeader
            wallet={wallet}
            isBIP47Enabled={isBIP47Enabled}
            tabValues={segmentControlValues}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            backgroundColor={colors.elevated}
          />
        )}
        {showAddress && renderTabContent()}
        {showAddress && address !== undefined && (
          <HandOffComponent title={loc.send.details_address} type={HandOffActivityType.ReceiveOnchain} userInfo={{ address }} />
        )}
        {showConfirmedBalance && renderConfirmedBalance()}
        {showPendingBalance && renderPendingBalance()}

        {!showAddress && !showPendingBalance && !showConfirmedBalance && (
          <View style={styles.loadingContainer}>
            <BlueLoading />
          </View>
        )}

        <View style={styles.share}>
          <BlueCard>
            {showAddress && currentTab === loc.wallets.details_address && (
              <BlueButtonLink
                style={styles.link}
                testID="SetCustomAmountButton"
                title={loc.receive.details_setAmount}
                onPress={showCustomAmountModal}
              />
            )}
            <Button
              onPress={handleShareButtonPressed}
              title={loc.receive.details_share}
              disabled={!bip21encoded && !(currentTab === segmentControlValues[1] && isBIP47Enabled)}
            />
          </BlueCard>
        </View>
      </SafeAreaScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  tabsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : undefined,
  },
  scrollBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  share: {
    width: '100%',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  link: {
    marginVertical: 16,
    paddingHorizontal: 32,
  },
  amount: {
    fontWeight: '600',
    fontSize: 36,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 12,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});

export default ReceiveDetails;
