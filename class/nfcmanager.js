/* global alert */
import React, { forwardRef, useEffect, useState } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import NfcManager, { Ndef, NfcError, NfcEvents, NfcTech } from 'react-native-nfc-manager';
import BottomModal from '../components/BottomModal';
import loc from '../loc';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { BlueButton, BlueTextCentered } from '../BlueComponents';
import { useTheme } from '@react-navigation/native';

export class NFCComponentProxy {
  static async isSupportedAndEnabled() {
    return (await NfcManager.isEnabled()) && (await NfcManager.isSupported());
  }

  static cleanUp = () => {
    NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    NfcManager.setEventListener(NfcEvents.SessionClosed, null);
    NfcManager.cancelTechnologyRequest().catch(() => 0);
  };
}

const NFCComponent = (props, ref) => {
  // Android does not have a buil-in NFC UI.So we need to use a BottomModal
  const [isScanning, setIsScanning] = useState(false);
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    modalContent: {
      backgroundColor: colors.modal,
      padding: 22,
      justifyContent: 'center',
      alignItems: 'center',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderTopColor: colors.foregroundColor,
      borderWidth: colors.borderWidth,
    },
  });

  useEffect(() => {
    start();
    return NFCComponentProxy.cleanUp();
  }, []);

  useEffect(() => {
    ref.current.readNdefOnce = readNdefOnce;
    ref.current.writeNdef = writeNdef;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  const start = async () => {
    const supported = await NfcManager.isSupported();
    if (supported) {
      await NfcManager.start();
      NfcManager.setEventListener(NfcEvents.SessionClosed, () => {
        NFCComponentProxy.cleanUp();
      });
    }
    return supported;
  };

  const handleException = ex => {
    if (ex instanceof NfcError.UserCancel) {
      // bypass
    } else if (ex instanceof NfcError.Timeout) {
      alert(loc.wallets.scan_nfc_timeout);
    } else {
      console.warn(ex);
      if (Platform.OS === 'ios') {
        NfcManager.invalidateSessionWithErrorIOS(`${ex}`);
      } else {
        alert(loc.wallets.read_nfc_error, `${ex}`);
      }
    }
    setIsScanning(false);
  };

  async function writeNdef(value) {
    setIsScanning(true);
    let result = false;

    try {
      // Step 1
      await NfcManager.requestTechnology(NfcTech.Ndef);

      const bytes = Ndef.encodeMessage([Ndef.textRecord(value)]);

      if (bytes) {
        await NfcManager.ndefHandler // Step2
          .writeNdefMessage(bytes); // Step3

        if (Platform.OS === 'ios') {
          await NfcManager.setAlertMessageIOS(loc._.success);
        }
      }

      result = true;
    } catch (ex) {
      handleException(ex);
    }

    // Step 4
    NFCComponentProxy.cleanUp();
    setIsScanning(false);
    return result;
  }

  const readNdefOnce = async () => {
    console.log('Attemping to read NFC Tag');
    try {
      const resp = await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: loc.wallets.scan_nfc_tag,
      });
      console.log('NFC tag response:', resp);
      const tag = await NfcManager.getTag();

      if (Ndef.isType(tag.ndefMessage[0], Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
        if (Platform.OS === 'ios') {
          await NfcManager.setAlertMessageIOS(loc._.success);
        }
        return Ndef.text.decodePayload(tag.ndefMessage[0].payload);
      } else {
        alert(loc.wallets.scan_nfc_error);
        return null;
      }
    } catch (e) {
      handleException(e);
      return null;
    } finally {
      setIsScanning(false);
      NFCComponentProxy.cleanUp();
    }
  };

  const closeModal = () => {
    NFCComponentProxy.cleanUp();
    setIsScanning(false);
  };

  const renderAndroidModal = (
    <BottomModal
      onModalShow={() => ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false })}
      isVisible={isScanning}
      onClose={closeModal}
    >
      <View style={[styles.modalContent, stylesHook.modalContent]}>
        <BlueTextCentered>{loc.wallets.scan_nfc_tag}</BlueTextCentered>
        <View style={styles.modelContentButtonLayout}>
          <BlueButton noMinWidth title={loc._.cancel} onPress={closeModal} />
        </View>
      </View>
    </BottomModal>
  );

  return <View ref={ref}>{Platform.OS === 'android' && isScanning ? renderAndroidModal : <></>}</View>;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  space: {
    marginHorizontal: 8,
  },
  modalContent: {
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 200,
    height: 200,
  },
  modelContentButtonLayout: {
    flexDirection: 'row',
    margin: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
});

export default forwardRef(NFCComponent);
