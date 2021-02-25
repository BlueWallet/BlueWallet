import React, { useCallback, useContext, useRef, useState } from 'react';
import {
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useRoute, useTheme, useFocusEffect } from '@react-navigation/native';
import Share from 'react-native-share';

import {
  BlueLoading,
  BlueCopyTextToClipboard,
  BlueButton,
  SecondButton,
  BlueButtonLink,
  is,
  BlueBitcoinAmount,
  BlueText,
  BlueSpacing20,
  BlueAlertWalletExportReminder,
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import BottomModal from '../../components/BottomModal';
import Privacy from '../../blue_modules/Privacy';
import { Chain, BitcoinUnit } from '../../models/bitcoinUnits';
import HandoffComponent from '../../components/handoff';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import Notifications from '../../blue_modules/notifications';
import ToolTipMenu from '../../components/TooltipMenu';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
const currency = require('../../blue_modules/currency');

const ReceiveDetails = () => {
  const { walletID } = useRoute().params;
  const { wallets, saveToDisk, sleep } = useContext(BlueStorageContext);
  const wallet = wallets.find(w => w.getID() === walletID);
  const [address, setAddress] = useState('');
  const [customLabel, setCustomLabel] = useState();
  const [customAmount, setCustomAmount] = useState(0);
  const [customUnit, setCustomUnit] = useState(BitcoinUnit.BTC);
  const [bip21encoded, setBip21encoded] = useState();
  const [isCustom, setIsCustom] = useState(false);
  const [isCustomModalVisible, setIsCustomModalVisible] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const { navigate, goBack } = useNavigation();
  const { colors } = useTheme();
  const toolTip = useRef();
  const qrCode = useRef();
  const styles = StyleSheet.create({
    modalContent: {
      backgroundColor: colors.modal,
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
    customAmount: {
      flexDirection: 'row',
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      borderWidth: 1.0,
      borderBottomWidth: 0.5,
      backgroundColor: colors.inputBackgroundColor,
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
      color: colors.foregroundColor,
      minHeight: 33,
    },
    qrCodeContainer: { borderWidth: 6, borderRadius: 8, borderColor: '#FFFFFF' },
    root: {
      flex: 1,
      backgroundColor: colors.elevated,
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
      color: colors.foregroundColor,
      fontWeight: '600',
      fontSize: 36,
      textAlign: 'center',
      paddingBottom: 24,
    },
    label: {
      color: colors.foregroundColor,
      fontWeight: '600',
      textAlign: 'center',
      paddingBottom: 24,
    },
    loading: {
      alignItems: 'center',
      width: 300,
      height: 300,
      backgroundColor: colors.elevated,
    },
    share: {
      marginBottom: 24,
      marginHorizontal: 16,
    },
    modalButton: {
      backgroundColor: colors.modalButton,
      paddingVertical: 14,
      paddingHorizontal: 70,
      maxWidth: '80%',
      borderRadius: 50,
      fontWeight: '700',
    },
  });

  const handleShareQRCode = () => {
    qrCode.current.toDataURL(data => {
      const shareImageBase64 = {
        url: `data:image/png;base64,${data}`,
      };
      Share.open(shareImageBase64).catch(error => console.log(error));
    });
  };

  const showToolTipMenu = () => {
    toolTip.current.showMenu();
  };
  const renderReceiveDetails = () => {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always">
        <View style={styles.scrollBody}>
          {isCustom && (
            <>
              <BlueText testID="CustomAmountText" style={styles.amount} numberOfLines={1}>
                {getDisplayAmount()}
              </BlueText>
              <BlueText testID="CustomAmountDescriptionText" style={styles.label} numberOfLines={1}>
                {customLabel}
              </BlueText>
            </>
          )}
          <TouchableWithoutFeedback style={styles.qrCodeContainer} testID="BitcoinAddressQRCodeContainer" onLongPress={showToolTipMenu}>
            <ToolTipMenu
              ref={toolTip}
              anchorRef={qrCode}
              actions={[
                {
                  id: 'shareQRCode',
                  text: loc.receive.details_share,
                  onPress: handleShareQRCode,
                },
              ]}
              onPress={handleShareQRCode}
            />

            <QRCode
              value={bip21encoded}
              logo={require('../../img/qr-code.png')}
              size={(is.ipad() && 300) || 300}
              logoSize={90}
              color="#000000"
              logoBackgroundColor={colors.brandingColor}
              backgroundColor="#FFFFFF"
              ecl="H"
              getRef={qrCode}
            />
          </TouchableWithoutFeedback>
          <BlueCopyTextToClipboard text={isCustom ? bip21encoded : address} />
        </View>
        <View style={styles.share}>
          <BlueButtonLink testID="SetCustomAmountButton" title={loc.receive.details_setAmount} onPress={showCustomAmountModal} />
          <View>
            <SecondButton onPress={handleShareButtonPressed} title={loc.receive.details_share} />
          </View>
        </View>
        {renderCustomAmountModal()}
      </ScrollView>
    );
  };

  const obtainWalletAddress = useCallback(async () => {
    Privacy.enableBlur();
    console.log('receive/details - componentDidMount');
    wallet.setUserHasSavedExport(true);
    await saveToDisk();
    let address;
    if (wallet.getAddressAsync) {
      if (wallet.chain === Chain.ONCHAIN) {
        try {
          address = await Promise.race([wallet.getAddressAsync(), sleep(1000)]);
        } catch (_) {}
        if (!address) {
          // either sleep expired or getAddressAsync threw an exception
          console.warn('either sleep expired or getAddressAsync threw an exception');
          address = wallet._getExternalAddressByIndex(wallet.getNextFreeAddressIndex());
        } else {
          saveToDisk(); // caching whatever getAddressAsync() generated internally
        }
      } else if (wallet.chain === Chain.OFFCHAIN) {
        try {
          await Promise.race([wallet.getAddressAsync(), sleep(1000)]);
          address = wallet.getAddress();
        } catch (_) {}
        if (!address) {
          // either sleep expired or getAddressAsync threw an exception
          console.warn('either sleep expired or getAddressAsync threw an exception');
          address = wallet.getAddress();
        } else {
          saveToDisk(); // caching whatever getAddressAsync() generated internally
        }
      }
      setAddressBIP21Encoded(address);
      await Notifications.tryToObtainPermissions();
      Notifications.majorTomToGroundControl([address], [], []);
    } else if (wallet.getAddress) {
      setAddressBIP21Encoded(wallet.getAddress());
      await Notifications.tryToObtainPermissions();
      Notifications.majorTomToGroundControl([wallet.getAddress()], [], []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAddressBIP21Encoded = address => {
    const bip21encoded = DeeplinkSchemaMatch.bip21encode(address);
    setAddress(address);
    setBip21encoded(bip21encoded);
    setShowAddress(true);
  };

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(async () => {
        if (wallet) {
          if (!wallet.getUserHasSavedExport()) {
            BlueAlertWalletExportReminder({
              onSuccess: obtainWalletAddress,
              onFailure: () => {
                goBack();
                navigate('WalletExportRoot', {
                  screen: 'WalletExport',
                  params: {
                    walletID: wallet.getID(),
                  },
                });
              },
            });
          } else {
            obtainWalletAddress();
          }
        }
      });
      return () => {
        task.cancel();
        Privacy.disableBlur();
      };
    }, [goBack, navigate, obtainWalletAddress, wallet]),
  );

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
    setShowAddress(true);
  };

  const renderCustomAmountModal = () => {
    return (
      <BottomModal isVisible={isCustomModalVisible} onClose={dismissCustomAmountModal}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
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
                testID="CustomAmountDescription"
              />
            </View>
            <BlueSpacing20 />
            <View>
              <BlueButton
                testID="CustomAmountSaveButton"
                style={styles.modalButton}
                title={loc.receive.details_create}
                onPress={createCustomAmountAddress}
              />
              <BlueSpacing20 />
            </View>
            <BlueSpacing20 />
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
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
      {address !== undefined && showAddress && (
        <HandoffComponent
          title={`Bitcoin Transaction ${address}`}
          type="io.bluewallet.bluewallet"
          url={`https://blockstream.info/address/${address}`}
        />
      )}
      {showAddress ? renderReceiveDetails() : <BlueLoading />}
    </View>
  );
};

ReceiveDetails.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerLeft: null,
  },
  opts => ({ ...opts, title: loc.receive.header }),
);

export default ReceiveDetails;
