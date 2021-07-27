/* global alert */
import React, { forwardRef, useEffect } from 'react';
import { View, Platform } from 'react-native';
import NfcManager, { Ndef, NfcError, NfcEvents, NfcTech } from 'react-native-nfc-manager';
import loc from '../loc';

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
  };

  async function writeNdef(value) {
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
      console.log(ex);
      alert(loc.wallets.write_nfc_error);
    }

    // Step 4
    NfcManager.cancelTechnologyRequest().catch(() => 0);
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
        NFCComponentProxy.cleanUp();
        return Ndef.text.decodePayload(tag.ndefMessage[0].payload);
      } else {
        alert(loc.wallets.scan_nfc_error);
        return null;
      }
    } catch (e) {
      NFCComponentProxy.cleanUp();
      handleException(e);
      return null;
    }
  };

  return <View ref={ref} />;
};

export default forwardRef(NFCComponent);
