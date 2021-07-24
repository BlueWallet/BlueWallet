import React, { forwardRef, useEffect } from 'react';
import { View } from 'react-native';
import NfcManager, { NfcEvents } from 'react-native-nfc-manager';

export class NFCComponentProxy {
  static async isSupportedAndEnabled() {
    return (await NfcManager.isEnabled()) && (await NfcManager.isSupported());
  }
}

const NFCComponent = (props, ref) => {
  useEffect(() => {
    start();
    return cleanUp();
  }, []);

  const scanTag = async () => {
      let tag = null;

    try {
      await NfcManager.requestTechnology([NfcTech.Ndef]);

      tag = await NfcManager.getTag();
      tag.ndefStatus = await NfcManager.ndefHandler.getNdefStatus();

      if (Platform.OS === 'ios') {
        await NfcManager.setAlertMessageIOS('Success');
      }
      props.onTagFound(tag)
    } catch (ex) {
      // for tag reading, we don't actually need to show any error
      console.log(ex);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  };

  useEffect(() => {
    ref.current.scanTag = scanTag;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  const start = async () => {
    const supported = await NfcManager.isSupported();
    if (supported) {
      await NfcManager.start();
    }
    return supported;
  };

  const cleanUp = () => {
    NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    NfcManager.setEventListener(NfcEvents.SessionClosed, null);
  };

  return <View ref={ref} />;
};

export default forwardRef(NFCComponent);
