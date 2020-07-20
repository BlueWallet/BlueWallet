import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  InteractionManager,
  StatusBar,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  StyleSheet,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import {
  BlueLoadingHook,
  BlueCopyTextToClipboard,
  BlueButton,
  SecondButton,
  BlueButtonLinkHook,
  is,
  BlueBitcoinAmount,
  BlueText,
  BlueSpacing20,
  BlueAlertWalletExportReminder,
  BlueNavigationStyle,
} from '../../BlueComponents';
import Privacy from '../../Privacy';
import Share from 'react-native-share';
import { Chain, BitcoinUnit } from '../../models/bitcoinUnits';
import Modal from 'react-native-modal';
import HandoffSettings from '../../class/handoff';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import Handoff from 'react-native-handoff';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const currency = require('../../blue_modules/currency');
const notifications = require('../../blue_modules/notifications');

const ReceiveDetails = () => {
  const { secret } = useRoute().params;
  const wallet = BlueApp.getWallets().find(w => w.getSecret() === secret);
  const [isHandOffUseEnabled, setIsHandOffUseEnabled] = useState(false);
  const [address, setAddress] = useState('');
  const [customLabel, setCustomLabel] = useState();
  const [customAmount, setCustomAmount] = useState(0);
  const [customUnit, setCustomUnit] = useState(BitcoinUnit.BTC);
  const [bip21encoded, setBip21encoded] = useState();
  const [isCustom, setIsCustom] = useState(false);
  const [isCustomModalVisible, setIsCustomModalVisible] = useState(false);
  const { navigate, goBack } = useNavigation();
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    modalContent: {
      backgroundColor: BlueCurrentTheme.colors.modal,
      padding: 22,
      justifyContent: 'center',
      alignItems: 'center',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderTopColor: colors.foregroundColor,
      borderWidth: colors.borderWidth,
      minHeight: 350,
      height: 350,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    customAmount: {
      flexDirection: 'row',
      borderColor: BlueCurrentTheme.colors.formBorder,
      borderBottomColor: BlueCurrentTheme.colors.formBorder,
      borderWidth: 1.0,
      borderBottomWidth: 0.5,
      backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
      minHeight: 44,
      height: 44,
      marginHorizontal: 20,
      alignItems: 'center',
      marginVertical: 8,
      borderRadius: 4,
    },
    customAmountText: {
      flex: 1,
      marginHorizontal: 8,
      color: BlueCurrentTheme.colors.foregroundColor,
      minHeight: 33,
    },
    root: {
      flex: 1,
      backgroundColor: BlueCurrentTheme.colors.elevated,
    },
    scroll: {
      justifyContent: 'space-between',
    },
    scrollBody: {
      marginTop: 32,
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    amount: {
      color: BlueCurrentTheme.colors.foregroundColor,
      fontWeight: '600',
      fontSize: 36,
      textAlign: 'center',
      paddingBottom: 24,
    },
    label: {
      color: BlueCurrentTheme.colors.foregroundColor,
      fontWeight: '600',
      textAlign: 'center',
      paddingBottom: 24,
    },
    loading: {
      alignItems: 'center',
      width: 300,
      height: 300,
      backgroundColor: BlueCurrentTheme.colors.elevated,
    },
    share: {
      alignItems: 'center',
      alignContent: 'flex-end',
      marginBottom: 24,
    },
    modalButton: {
      backgroundColor: BlueCurrentTheme.colors.modalButton,
      paddingVertical: 14,
      paddingHorizontal: 70,
      maxWidth: '80%',
      borderRadius: 50,
      fontWeight: '700',
    },
  });

  const renderReceiveDetails = useCallback(async () => {
    console.log('receive/details - componentDidMount');
    wallet.setUserHasSavedExport(true);
    await BlueApp.saveToDisk();
    let address;
    if (wallet.getAddressAsync) {
      if (wallet.chain === Chain.ONCHAIN) {
        try {
          address = await Promise.race([wallet.getAddressAsync(), BlueApp.sleep(1000)]);
        } catch (_) {}
        if (!address) {
          // either sleep expired or getAddressAsync threw an exception
          console.warn('either sleep expired or getAddressAsync threw an exception');
          address = wallet._getExternalAddressByIndex(wallet.next_free_address_index);
        } else {
          BlueApp.saveToDisk(); // caching whatever getAddressAsync() generated internally
        }
      } else if (wallet.chain === Chain.OFFCHAIN) {
        try {
          await Promise.race([wallet.getAddressAsync(), BlueApp.sleep(1000)]);
          address = wallet.getAddress();
        } catch (_) {}
        if (!address) {
          // either sleep expired or getAddressAsync threw an exception
          console.warn('either sleep expired or getAddressAsync threw an exception');
          address = wallet.getAddress();
        } else {
          BlueApp.saveToDisk(); // caching whatever getAddressAsync() generated internally
        }
      }
      setAddress(address);
      await notifications.tryToObtainPermissions();
      notifications.majorTomToGroundControl([address], []);
    } else if (wallet.getAddress) {
      setAddress(wallet.getAddress());
      await notifications.tryToObtainPermissions();
      notifications.majorTomToGroundControl([wallet.getAddress()], []);
    }
    InteractionManager.runAfterInteractions(async () => {
      const bip21encoded = DeeplinkSchemaMatch.bip21encode(address);
      setBip21encoded(bip21encoded);
    });
  }, [wallet]);

  useEffect(() => {
    if (wallet) {
      if (!wallet.getUserHasSavedExport()) {
        BlueAlertWalletExportReminder({
          onSuccess: renderReceiveDetails,
          onFailure: () => {
            goBack();
            navigate('WalletExport', {
              wallet: wallet,
            });
          },
        });
      } else {
        renderReceiveDetails();
      }
    }
    HandoffSettings.isHandoffUseEnabled().then(setIsHandOffUseEnabled);
    Privacy.enableBlur();
    return () => Privacy.disableBlur();
  }, [goBack, navigate, renderReceiveDetails, secret, wallet]);

  const dismissCustomAmountModal = () => {
    Keyboard.dismiss();
    setIsCustomModalVisible(false);
  };

  const showCustomAmountModal = () => {
    setIsCustomModalVisible(true);
  };

  const createCustomAmountAddress = () => {
    setIsCustom(true);
    setIsCustomModalVisible(false);
    let amount = customAmount;
    switch (customUnit) {
      case BitcoinUnit.BTC:
        // nop
        break;
      case BitcoinUnit.SATS:
        amount = currency.satoshiToBTC(customAmount);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        if (BlueBitcoinAmount.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]) {
          // cache hit! we reuse old value that supposedly doesnt have rounding errors
          amount = currency.satoshiToBTC(BlueBitcoinAmount.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]);
        } else {
          amount = currency.fiatToBTC(customAmount);
        }
        break;
    }
    setBip21encoded(DeeplinkSchemaMatch.bip21encode(address, { amount, label: customLabel }));
  };

  const renderCustomAmountModal = () => {
    return (
      <Modal isVisible={isCustomModalVisible} style={styles.bottomModal} onBackdropPress={dismissCustomAmountModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <BlueBitcoinAmount
              unit={customUnit}
              amount={customAmount || ''}
              onChangeText={setCustomAmount}
              onAmountUnitChange={setCustomUnit}
            />
            <View style={styles.customAmount}>
              <TextInput
                onChangeText={setCustomLabel}
                placeholderTextColor="#81868e"
                placeholder={loc.receive.details_label}
                value={customLabel || ''}
                numberOfLines={1}
                style={styles.customAmountText}
              />
            </View>
            <BlueSpacing20 />
            <View>
              <BlueButton style={styles.modalButton} title={loc.receive.details_create} onPress={createCustomAmountAddress} />
              <BlueSpacing20 />
            </View>
            <BlueSpacing20 />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const handleShareButtonPressed = () => {
    Share.open({ message: bip21encoded }).catch(error => console.log(error));
  };

  /**
   * @returns {string} BTC amount, accounting for current `customUnit` and `customUnit`
   */
  const getDisplayAmount = () => {
    switch (customUnit) {
      case BitcoinUnit.BTC:
        return customAmount + ' BTC';
      case BitcoinUnit.SATS:
        return currency.satoshiToBTC(customAmount) + ' BTC';
      case BitcoinUnit.LOCAL_CURRENCY:
        return currency.fiatToBTC(customAmount) + ' BTC';
    }
    return customAmount + ' ' + customUnit;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      {isHandOffUseEnabled && address !== undefined && (
        <Handoff
          title={`Bitcoin Transaction ${address}`}
          type="io.bluewallet.bluewallet"
          url={`https://blockstream.info/address/${address}`}
        />
      )}
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always">
        <View style={styles.scrollBody}>
          {isCustom && (
            <>
              <BlueText style={styles.amount} numberOfLines={1}>
                {getDisplayAmount()}
              </BlueText>
              <BlueText style={styles.label} numberOfLines={1}>
                {customLabel}
              </BlueText>
            </>
          )}
          {bip21encoded === undefined ? (
            <View style={styles.loading}>
              <BlueLoadingHook />
            </View>
          ) : (
            <QRCode
              value={bip21encoded}
              logo={require('../../img/qr-code.png')}
              size={(is.ipad() && 300) || 300}
              logoSize={90}
              color={colors.foregroundColor}
              logoBackgroundColor={colors.brandingColor}
              backgroundColor={colors.background}
              ecl="H"
            />
          )}
          <BlueCopyTextToClipboard text={isCustom ? bip21encoded : address} />
        </View>
        <View style={styles.share}>
          <BlueButtonLinkHook title={loc.receive.details_setAmount} onPress={showCustomAmountModal} />
          <View>
            <SecondButton onPress={handleShareButtonPressed} title={loc.receive.details_share} />
          </View>
        </View>
      </ScrollView>
      {renderCustomAmountModal()}
    </View>
  );
};

ReceiveDetails.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.receive.header,
  headerLeft: null,
});

export default ReceiveDetails;
