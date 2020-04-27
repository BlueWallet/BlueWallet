/* global alert */
import React, { useEffect, useState } from 'react';
import { Platform, Dimensions, View, Keyboard } from 'react-native';
import {
  BlueFormMultiInput,
  BlueButtonLink,
  BlueFormLabel,
  BlueDoneAndDismissKeyboardInputAccessory,
  BlueButton,
  SafeBlueArea,
  BlueSpacing20,
  BlueNavigationStyle,
} from '../../BlueComponents';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Privacy from '../../Privacy';
import { useNavigation, useNavigationParam } from 'react-navigation-hooks';
import WalletImport from '../../class/walletImport';
let loc = require('../../loc');
const { width } = Dimensions.get('window');

const WalletsImport = () => {
  const [isToolbarVisibleForAndroid, setIsToolbarVisibleForAndroid] = useState(false);
  const [importText, setImportText] = useState(useNavigationParam('label') || '');
  const { navigate, dismiss } = useNavigation();

  useEffect(() => {
    Privacy.enableBlur();
    Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setIsToolbarVisibleForAndroid(true));
    Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setIsToolbarVisibleForAndroid(false));
    return () => {
      Keyboard.removeListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide');
      Keyboard.removeListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow');
      Privacy.disableBlur();
    };
  }, []);

  const importButtonPressed = () => {
    if (importText.trim().length === 0) {
      return;
    }
    importMnemonic(importText);
  };

  /**
   *
   * @param importText
   * @param additionalProperties key-values passed from outside. Used only to set up `masterFingerprint` property for watch-only wallet
   */
  const importMnemonic = (importText, additionalProperties) => {
    try {
      WalletImport.processImportText(importText, additionalProperties);
      dismiss();
    } catch (error) {
      alert(loc.wallets.import.error);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  /**
   *
   * @param value
   * @param additionalProperties key-values passed from outside. Used only to set up `masterFingerprint` property for watch-only wallet
   */
  const onBarScanned = (value, additionalProperties) => {
    setImportText(value);
    importMnemonic(value, additionalProperties);
  };

  return (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1, paddingTop: 40 }}>
      <BlueFormLabel>{loc.wallets.import.explanation}</BlueFormLabel>
      <BlueSpacing20 />
      <BlueFormMultiInput
        testID="MnemonicInput"
        value={importText}
        contextMenuHidden
        onChangeText={setImportText}
        inputAccessoryViewID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}
      />

      <BlueSpacing20 />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <BlueButton
          testID="DoImport"
          disabled={importText.trim().length === 0}
          title={loc.wallets.import.do_import}
          buttonStyle={{
            width: width / 1.5,
          }}
          onPress={importButtonPressed}
        />
        <BlueSpacing20 />
        <BlueButtonLink
          title={loc.wallets.import.scan_qr}
          onPress={() => {
            navigate('ScanQRCode', { launchedBy: 'ImportWallet', onBarScanned, showFileImportButton: true });
          }}
        />
      </View>
      {Platform.select({
        ios: (
          <BlueDoneAndDismissKeyboardInputAccessory
            onClearTapped={() => {
              setImportText('');
              Keyboard.dismiss();
            }}
            onPasteTapped={text => {
              setImportText(text);
              Keyboard.dismiss();
            }}
          />
        ),
        android: isToolbarVisibleForAndroid && (
          <BlueDoneAndDismissKeyboardInputAccessory
            onClearTapped={() => {
              setImportText('');
              Keyboard.dismiss();
            }}
            onPasteTapped={text => {
              setImportText(text);
              Keyboard.dismiss();
            }}
          />
        ),
      })}
    </SafeBlueArea>
  );
};

WalletsImport.navigationOptions = {
  ...BlueNavigationStyle(),
  title: loc.wallets.import.title,
};
export default WalletsImport;
