import { useFocusEffect, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  InteractionManager,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Share from 'react-native-share';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { fiatToBTC, satoshiToBTC } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueButtonLink, BlueCard, BlueLoading, BlueSpacing20, BlueSpacing40, BlueText } from '../../BlueComponents';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import AmountInput from '../../components/AmountInput';
import BottomModal from '../../components/BottomModal';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import HandOffComponent from '../../components/HandOffComponent';
import QRCodeComponent from '../../components/QRCodeComponent';
import { useTheme } from '../../components/themes';
import { TransactionPendingIconBig } from '../../components/TransactionPendingIconBig';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { SuccessView } from '../send/success';
import { useStorage } from '../../hooks/context/useStorage';
import { HandOffActivityType } from '../../components/types';
import SegmentedControl from '../../components/SegmentControl';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import HeaderMenuButton from '../../components/HeaderMenuButton';
import { useSettings } from '../../hooks/context/useSettings';
import { majorTomToGroundControl, tryToObtainPermissions } from '../../blue_modules/notifications';

const segmentControlValues = [loc.wallets.details_address, loc.bip47.payment_code];

const ReceiveDetails = () => {
  const { walletID, address } = useRoute().params;
  const { wallets, saveToDisk, sleep, fetchAndSaveWalletTransactions } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const wallet = wallets.find(w => w.getID() === walletID);
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState(BitcoinUnit.BTC);
  const [bip21encoded, setBip21encoded] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [tempCustomLabel, setTempCustomLabel] = useState('');
  const [tempCustomAmount, setTempCustomAmount] = useState('');
  const [tempCustomUnit, setTempCustomUnit] = useState(BitcoinUnit.BTC);
  const [showPendingBalance, setShowPendingBalance] = useState(false);
  const [showConfirmedBalance, setShowConfirmedBalance] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [currentTab, setCurrentTab] = useState(segmentControlValues[0]);
  const { goBack, setParams, setOptions } = useExtendedNavigation();
  const bottomModalRef = useRef(null);
  const { colors, closeImage } = useTheme();
  const [intervalMs, setIntervalMs] = useState(5000);
  const [eta, setEta] = useState('');
  const [initialConfirmed, setInitialConfirmed] = useState(0);
  const [initialUnconfirmed, setInitialUnconfirmed] = useState(0);
  const [displayBalance, setDisplayBalance] = useState('');
  const fetchAddressInterval = useRef();
  const stylesHook = StyleSheet.create({
    customAmount: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    customAmountText: {
      color: colors.foregroundColor,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    amount: {
      color: colors.foregroundColor,
    },
    label: {
      color: colors.foregroundColor,
    },
    modalButton: {
      backgroundColor: colors.modalButton,
    },
    tip: {
      backgroundColor: colors.ballOutgoingExpired,
    },
  });

  const setAddressBIP21Encoded = useCallback(
    addr => {
      const newBip21encoded = DeeplinkSchemaMatch.bip21encode(addr);
      setParams({ address: addr });
      setBip21encoded(newBip21encoded);
      setShowAddress(true);
    },
    [setParams],
  );

  const obtainWalletAddress = useCallback(async () => {
    console.debug('receive/details - componentDidMount');
    let newAddress;
    if (address) {
      setAddressBIP21Encoded(address);
      try {
        await tryToObtainPermissions();
        majorTomToGroundControl([address], [], []);
      } catch (error) {
        console.error('Error obtaining notifications permissions:', error);
      }
    } else {
      if (wallet.chain === Chain.ONCHAIN) {
        try {
          if (!isElectrumDisabled) newAddress = await Promise.race([wallet.getAddressAsync(), sleep(1000)]);
        } catch (error) {
          console.warn('Error fetching wallet address (ONCHAIN):', error);
        }
        if (newAddress === undefined) {
          console.warn('either sleep expired or getAddressAsync threw an exception');
          newAddress = wallet._getExternalAddressByIndex(wallet.getNextFreeAddressIndex());
        } else {
          saveToDisk(); // caching whatever getAddressAsync() generated internally
        }
      } else if (wallet.chain === Chain.OFFCHAIN) {
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
      setAddressBIP21Encoded(newAddress);
      try {
        await tryToObtainPermissions();
        majorTomToGroundControl([newAddress], [], []);
      } catch (error) {
        console.error('Error obtaining notifications permissions:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletID, saveToDisk, address, setAddressBIP21Encoded, isElectrumDisabled, sleep]);

  const onEnablePaymentsCodeSwitchValue = useCallback(() => {
    if (wallet.allowBIP47()) {
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

  const isBIP47Enabled = wallet?.isBIP47Enabled();
  const toolTipActions = useMemo(() => {
    const action = { ...CommonToolTipActions.PaymentsCode };
    action.menuState = isBIP47Enabled;
    return [action];
  }, [isBIP47Enabled]);

  const onPressMenuItem = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onEnablePaymentsCodeSwitchValue();
  }, [onEnablePaymentsCodeSwitchValue]);

  const HeaderRight = useMemo(
    () => <HeaderMenuButton actions={toolTipActions} onPressMenuItem={onPressMenuItem} />,
    [onPressMenuItem, toolTipActions],
  );

  const handleClose = useCallback(() => {
    goBack();
  }, [goBack]);

  const HeaderLeft = useMemo(
    () => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc._.close}
        style={styles.button}
        onPress={handleClose}
        testID="NavigationCloseButton"
      >
        <Image source={closeImage} />
      </TouchableOpacity>
    ),
    [closeImage, handleClose],
  );

  useEffect(() => {
    wallet?.allowBIP47() &&
      setOptions({
        headerLeft: () => HeaderLeft,
        headerRight: () => HeaderRight,
      });
  }, [HeaderLeft, HeaderRight, colors.foregroundColor, setOptions, wallet]);

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
            if (rez && rez[tx.tx_hash] && rez[tx.tx_hash].vsize) {
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
            fetchAndSaveWalletTransactions(walletID);
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

  const renderConfirmedBalance = () => {
    return (
      <View style={styles.scrollBody}>
        {isCustom && (
          <>
            <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
              {customLabel}
            </BlueText>
          </>
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
          <>
            <BlueText style={[styles.label, stylesHook.label]} numberOfLines={1}>
              {customLabel}
            </BlueText>
          </>
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

  const handleBackButton = () => {
    goBack(null);
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
      clearInterval(fetchAddressInterval.current);
      fetchAddressInterval.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderReceiveDetails = () => {
    return (
      <>
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

          <QRCodeComponent value={bip21encoded} />
          <CopyTextToClipboard text={isCustom ? bip21encoded : address} />
        </View>
      </>
    );
  };

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(async () => {
        try {
          if (wallet) {
            await obtainWalletAddress();
          } else if (!wallet && address) {
            setAddressBIP21Encoded(address);
          }
        } catch (error) {
          console.error('Error during focus effect:', error);
        }
      });
      return () => {
        task.cancel();
      };
    }, [wallet, address, obtainWalletAddress, setAddressBIP21Encoded]),
  );

  const showCustomAmountModal = () => {
    setTempCustomLabel(customLabel);
    setTempCustomAmount(customAmount);
    setTempCustomUnit(customUnit);
    bottomModalRef.current.present();
  };

  const createCustomAmountAddress = () => {
    bottomModalRef.current.dismiss();
    setIsCustom(true);
    let amount = tempCustomAmount;
    switch (tempCustomUnit) {
      case BitcoinUnit.BTC:
        // nop
        break;
      case BitcoinUnit.SATS:
        amount = satoshiToBTC(tempCustomAmount);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        if (AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]) {
          // cache hit! we reuse old value that supposedly doesnt have rounding errors
          amount = satoshiToBTC(AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]);
        } else {
          amount = fiatToBTC(tempCustomAmount);
        }
        break;
    }
    setCustomLabel(tempCustomLabel);
    setCustomAmount(tempCustomAmount);
    setCustomUnit(tempCustomUnit);
    setBip21encoded(DeeplinkSchemaMatch.bip21encode(address, { amount, label: tempCustomLabel }));
    setShowAddress(true);
  };

  const resetCustomAmount = () => {
    setTempCustomLabel('');
    setTempCustomAmount('');
    setTempCustomUnit(wallet.getPreferredBalanceUnit());
    setCustomLabel();
    setCustomAmount();
    setCustomUnit(wallet.getPreferredBalanceUnit());
    setBip21encoded(DeeplinkSchemaMatch.bip21encode(address));
    setShowAddress(true);
    bottomModalRef.current.dismiss();
  };

  const handleShareButtonPressed = () => {
    Share.open({ message: currentTab === loc.wallets.details_address ? bip21encoded : wallet.getBIP47PaymentCode() }).catch(error =>
      console.debug('Error sharing:', error),
    );
  };

  /**
   * @returns {string} BTC amount, accounting for current `customUnit` and `customUnit`
   */
  const getDisplayAmount = () => {
    if (Number(customAmount) > 0) {
      switch (customUnit) {
        case BitcoinUnit.BTC:
          return customAmount + ' BTC';
        case BitcoinUnit.SATS:
          return satoshiToBTC(customAmount) + ' BTC';
        case BitcoinUnit.LOCAL_CURRENCY:
          return fiatToBTC(customAmount) + ' BTC';
      }
      return customAmount + ' ' + customUnit;
    } else {
      return null;
    }
  };

  const renderTabContent = () => {
    const qrValue = currentTab === segmentControlValues[0] ? bip21encoded : wallet.getBIP47PaymentCode();

    if (currentTab === segmentControlValues[0]) {
      return <View style={styles.container}>{address && renderReceiveDetails()}</View>;
    } else {
      return (
        <View style={styles.container}>
          {!qrValue && <Text>{loc.bip47.not_found}</Text>}
          {qrValue && (
            <>
              <View style={[styles.tip, stylesHook.tip]}>
                <Text style={{ color: colors.foregroundColor }}>{loc.receive.bip47_explanation}</Text>
              </View>
              <QRCodeComponent value={qrValue} />
              <CopyTextToClipboard text={qrValue} truncated={false} />
            </>
          )}
        </View>
      );
    }
  };

  return (
    <>
      <ScrollView
        testID="ReceiveDetailsScrollView"
        contentContainerStyle={[styles.root, stylesHook.root]}
        keyboardShouldPersistTaps="always"
      >
        {wallet?.allowBIP47() && wallet?.isBIP47Enabled() && (
          <View style={styles.tabsContainer}>
            <SegmentedControl
              values={segmentControlValues}
              selectedIndex={segmentControlValues.findIndex(tab => tab === currentTab)}
              onChange={index => {
                setCurrentTab(segmentControlValues[index]);
              }}
            />
          </View>
        )}
        {showAddress && renderTabContent()}
        {address !== undefined && showAddress && (
          <HandOffComponent title={loc.send.details_address} type={HandOffActivityType.ReceiveOnchain} userInfo={{ address }} />
        )}
        {showConfirmedBalance ? renderConfirmedBalance() : null}
        {showPendingBalance ? renderPendingBalance() : null}
        {!showAddress && !showPendingBalance && !showConfirmedBalance ? <BlueLoading /> : null}
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
            <Button onPress={handleShareButtonPressed} title={loc.receive.details_share} />
          </BlueCard>
        </View>
      </ScrollView>
      <BottomModal
        ref={bottomModalRef}
        contentContainerStyle={styles.modalContainerJustify}
        backgroundColor={colors.modal}
        footer={
          <View style={styles.modalButtonContainer}>
            <Button
              testID="CustomAmountResetButton"
              style={[styles.modalButton, stylesHook.modalButton]}
              title={loc.receive.reset}
              onPress={resetCustomAmount}
            />
            <View style={styles.modalButtonSpacing} />
            <Button
              testID="CustomAmountSaveButton"
              style={[styles.modalButton, stylesHook.modalButton]}
              title={loc.receive.details_create}
              onPress={createCustomAmountAddress}
            />
          </View>
        }
      >
        <AmountInput
          unit={tempCustomUnit}
          amount={tempCustomAmount || ''}
          onChangeText={setTempCustomAmount}
          onAmountUnitChange={setTempCustomUnit}
        />
        <View style={[styles.customAmount, stylesHook.customAmount]}>
          <TextInput
            onChangeText={setTempCustomLabel}
            placeholderTextColor="#81868e"
            placeholder={loc.receive.details_label}
            value={tempCustomLabel || ''}
            numberOfLines={1}
            style={[styles.customAmountText, stylesHook.customAmountText]}
            testID="CustomAmountDescription"
          />
        </View>
        <BlueSpacing20 />

        <BlueSpacing20 />
      </BottomModal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContainerJustify: {
    alignContent: 'center',
    padding: 22,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customAmount: {
    flexDirection: 'row',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  root: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  tabsContainer: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    marginTop: 32,
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  share: {
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    marginVertical: 16,
  },
  link: {
    marginVertical: 32,
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
    paddingBottom: 24,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 50,
    fontWeight: '700',
    flex: 0.5,
    alignItems: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  modalButtonSpacing: {
    width: 16,
  },
  customAmountText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
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
    marginVertical: 24,
  },
});

export default ReceiveDetails;
