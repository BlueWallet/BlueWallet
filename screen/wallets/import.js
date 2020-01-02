/* global alert */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Dimensions, View, TouchableWithoutFeedback, Keyboard } from 'react-native';
import {
  BlueFormMultiInput,
  BlueButtonLink,
  BlueFormLabel,
  BlueDoneAndDismissKeyboardInputAccessory,
  SafeBlueArea,
  BlueSpacing20,
  BlueNavigationStyle,
} from '../../BlueComponents';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Privacy from '../../Privacy';
import { useNavigation, useNavigationParam } from 'react-navigation-hooks';
import WalletImport from '../../class/walletImport';
import NFC from '../../class/nfc';
const loc = require('../../loc');

const WalletsImport = () => {
  const [isToolbarVisibleForAndroid, setIsToolbarVisibleForAndroid] = useState(false);
  const [importText, setImportText] = useState(useNavigationParam('label') || '');
  const { navigate, dismiss } = useNavigation();
  const [isNFCSupported, setIsNFCSupported] = useState(false);

  useEffect(() => {
    Privacy.enableBlur();
    NFC.isSupported()
      .then(value => {
        if (value) {
          NFC.start();
          setIsNFCSupported(true);
        }
      })
      .catch(_error => setIsNFCSupported(false));
    return () => Privacy.disableBlur();
  });

  const importButtonPressed = () => {
    if (importText.trim().length === 0) {
      return;
    }
    importMnemonic(importText);
  };

  const importMnemonic = importText => {
    try {
      WalletImport.processImportText(importText);
      dismiss();
    } catch (error) {
      alert(loc.wallets.import.error);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const onBarScanned = value => {
    setImportText(value);
    importMnemonic(value);
  };

  return (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1, paddingTop: 40 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView behavior="position" enabled>
          <BlueFormLabel>{loc.wallets.import.explanation}</BlueFormLabel>
          <BlueSpacing20 />
          <BlueFormMultiInput
            value={importText}
            contextMenuHidden
            onChangeText={setImportText}
            inputAccessoryViewID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}
            onFocus={() => setIsToolbarVisibleForAndroid(true)}
            onBlur={() => setIsToolbarVisibleForAndroid(false)}
          />
          <BlueSpacing20 />
          <BlueButtonLink
            title={loc.wallets.import.scan_qr}
            onPress={() => {
              navigate('ScanQrWif');
            }}
          />
          {isNFCSupported && <BlueButtonLink title="or scan Near Me" onPress={onNFCScanPressed} />}
        </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeBlueArea>
    );
  }
}

WalletsImport.navigationOptions = {
  ...BlueNavigationStyle(),
  title: loc.wallets.import.title,
};
export default WalletsImport;
