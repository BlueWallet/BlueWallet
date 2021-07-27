/* global alert */
import React, { forwardRef, useEffect, useRef } from 'react';
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

  static buildTextPayload(valueToWrite) {
    return Ndef.encodeMessage([Ndef.textRecord(valueToWrite)]);
  }
}

const NFCComponent = (props, ref) => {
  const isWriting = useRef(false);

  useEffect(() => {
    start();
    return NFCComponentProxy.cleanUp();
  }, []);

  useEffect(() => {
    ref.current.readNdefOnce = readNdefOnce;
    ref.current.requestNdefWrite = requestNdefWrite;
    ref.current.cancelNdefWrite = cancelNdefWrite;
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
      alert('Tag scanning timeout');
    } else {
      console.warn(ex);
      if (Platform.OS === 'ios') {
        NfcManager.invalidateSessionWithErrorIOS(`${ex}`);
      } else {
        alert('NFC Error', `${ex}`);
      }
    }
  };

  const requestNdefWrite = text => {
    if (isWriting.current) {
      return;
    }

    const bytes = NFCComponentProxy.buildTextPayload(text);

    isWriting.current = true;
    NfcManager.requestNdefWrite(bytes)
      .then(() => console.log('Write completed'))
      .catch(err => console.warn(err))
      .finally(() => {
        isWriting.current = false;
      });
  };

  const cancelNdefWrite = () => {
    NfcManager.cancelNdefWrite()
      .then(() => console.log('write cancelled'))
      .catch(err => console.warn(err))
      .finally(() => {
        isWriting.current = false;
      });
  };

  const readNdefOnce = async () => {
    console.log('attemping to read');
    try {
      const resp = await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: loc.wallets.scan_nfc_tag,
      });
      console.log('rt resp:', resp);
      const tag = await NfcManager.getTag();

      if (Ndef.isType(tag.ndefMessage[0], Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
        if (Platform.OS === 'ios') {
          await NfcManager.setAlertMessageIOS('Success');
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
