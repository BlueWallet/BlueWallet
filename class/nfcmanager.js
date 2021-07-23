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

  const scanTag = () => {
    return new Promise(resolve => {
      let tagFound = null;

      NfcManager.setEventListener(NfcEvents.DiscoverTag, tag => {
        tagFound = tag;
        resolve(tagFound);
        NfcManager.setAlertMessageIOS('NDEF tag found');
        NfcManager.unregisterTagEvent().catch(() => 0);
      });

      NfcManager.setEventListener(NfcEvents.SessionClosed, () => {
        cleanUp();
        if (!tagFound) {
          resolve();
        }
      });

      NfcManager.registerTagEvent();
    });
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
