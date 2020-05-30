import React, { useEffect, useState, useCallback } from 'react';
import { View, InteractionManager, Platform, TextInput, KeyboardAvoidingView, Keyboard, StyleSheet, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import {
  BlueLoading,
  SafeBlueArea,
  BlueCopyTextToClipboard,
  BlueButton,
  BlueButtonLink,
  BlueNavigationStyle,
  is,
  BlueBitcoinAmount,
  BlueText,
  BlueSpacing20,
  BlueAlertWalletExportReminder,
} from '../../BlueComponents';
import Privacy from '../../Privacy';
import Share from 'react-native-share';
import { Chain, BitcoinUnit } from '../../models/bitcoinUnits';
import Modal from 'react-native-modal';
import HandoffSettings from '../../class/handoff';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import Handoff from 'react-native-handoff';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const loc = require('../../loc');

const ReceiveDetails = () => {
  const { secret } = useRoute().params;
  const [wallet, setWallet] = useState();
  const [isHandOffUseEnabled, setIsHandOffUseEnabled] = useState(false);
  const [address, setAddress] = useState('');
  const [customLabel, setCustomLabel] = useState();
  const [customAmount, setCustomAmount] = useState(0);
  const [bip21encoded, setBip21encoded] = useState();
  const [qrCodeSVG, setQrCodeSVG] = useState();
  const [isCustom, setIsCustom] = useState(false);
  const [isCustomModalVisible, setIsCustomModalVisible] = useState(false);
  const { navigate, goBack } = useNavigation();
  const isFocused = useIsFocused();

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
        setAddress(address);
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
    } else if (wallet.getAddress) {
      setAddress(wallet.getAddress());
    }
    InteractionManager.runAfterInteractions(async () => {
      const bip21encoded = DeeplinkSchemaMatch.bip21encode(address);
      setBip21encoded(bip21encoded);
    });
  }, [wallet]);

  useEffect(() => {
    Privacy.enableBlur();

    setWallet(BlueApp.getWallets().find(w => w.getSecret() === secret));

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
    setBip21encoded(DeeplinkSchemaMatch.bip21encode(address, { amount: customAmount, label: customLabel }));
  };

  const clearCustomAmount = () => {
    setIsCustom(false);
    setIsCustomModalVisible(false);
    setCustomAmount('');
    setCustomLabel('');
    setBip21encoded(DeeplinkSchemaMatch.bip21encode(address));
  };

  const renderCustomAmountModal = () => {
    return (
      <Modal isVisible={isCustomModalVisible} style={styles.bottomModal} onBackdropPress={dismissCustomAmountModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <BlueBitcoinAmount amount={customAmount || ''} onChangeText={setCustomAmount} />
            <View style={styles.customAmount}>
              <TextInput
                onChangeText={setCustomLabel}
                placeholder={loc.receive.details.label}
                value={customLabel || ''}
                numberOfLines={1}
                style={styles.customAmountText}
              />
            </View>
            <BlueSpacing20 />
            <View>
              <BlueButton title={loc.receive.details.create} onPress={createCustomAmountAddress} />
              <BlueSpacing20 />
              <BlueButtonLink title="Reset" onPress={clearCustomAmount} />
            </View>
            <BlueSpacing20 />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const handleShareButtonPressed = () => {
    if (qrCodeSVG === undefined) {
      Share.open({ message: bip21encoded }).catch(error => console.log(error));
    } else {
      InteractionManager.runAfterInteractions(async () => {
        qrCodeSVG.toDataURL(data => {
          let shareImageBase64 = {
            message: bip21encoded,
            url: `data:image/png;base64,${data}`,
          };
          Share.open(shareImageBase64).catch(error => console.log(error));
        });
      });
    }
  };

  return (
    <SafeBlueArea style={styles.root}>
      {isHandOffUseEnabled && address !== undefined && (
        <Handoff
          title={`Bitcoin Transaction ${address}`}
          type="io.bluewallet.bluewallet"
          url={`https://blockstream.info/address/${address}`}
        />
      )}
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.scrollBody}>
          {isCustom && (
            <>
              <BlueText style={styles.amount} numberOfLines={1}>
                {customAmount} {BitcoinUnit.BTC}
              </BlueText>
              <BlueText style={styles.label} numberOfLines={1}>
                {customLabel}
              </BlueText>
            </>
          )}
          {bip21encoded === undefined && isFocused ? (
            <View style={styles.loading}>
              <BlueLoading />
            </View>
          ) : (
            <QRCode
              value={bip21encoded}
              logo={require('../../img/qr-code.png')}
              size={(is.ipad() && 300) || 300}
              logoSize={90}
              color={BlueApp.settings.foregroundColor}
              logoBackgroundColor={BlueApp.settings.brandingColor}
              ecl={'H'}
              getRef={setQrCodeSVG}
            />
          )}
          <BlueCopyTextToClipboard text={isCustom ? bip21encoded : address} />
        </View>
        <View style={styles.share}>
          <BlueButtonLink title={loc.receive.details.setAmount} onPress={showCustomAmountModal} />
          <View>
            <BlueButton
              icon={{
                name: 'share-alternative',
                type: 'entypo',
                color: BlueApp.settings.buttonTextColor,
              }}
              onPress={handleShareButtonPressed}
              title={loc.receive.details.share}
            />
          </View>
        </View>
        {renderCustomAmountModal()}
      </ScrollView>
    </SafeBlueArea>
  );
};

ReceiveDetails.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.receive.header,
  headerLeft: null,
});

export default ReceiveDetails;

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 350,
    height: 350,
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  customAmount: {
    flexDirection: 'row',
    borderColor: '#d2d2d2',
    borderBottomColor: '#d2d2d2',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    backgroundColor: '#f5f5f5',
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
    minHeight: 33,
  },
  root: {
    flex: 1,
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
    color: '#0c2550',
    fontWeight: '600',
    fontSize: 36,
    textAlign: 'center',
    paddingBottom: 24,
  },
  label: {
    color: '#0c2550',
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 24,
  },
  loading: {
    alignItems: 'center',
    width: 300,
    height: 300,
  },
  share: {
    alignItems: 'center',
    alignContent: 'flex-end',
    marginBottom: 24,
  },
});
