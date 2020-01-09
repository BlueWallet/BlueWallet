/* global alert */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Dimensions, View, TouchableWithoutFeedback, Keyboard } from 'react-native';
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
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <BlueSpacing20 />
      <View
        style={{
          alignItems: 'center',
        }}
      >
        <BlueButton
          disabled={importText.trim().length === 0}
          title={loc.wallets.import.do_import}
          buttonStyle={{
            width: width / 1.5,
          }}
          onPress={importButtonPressed}
        />
        <BlueButtonLink
          title={loc.wallets.import.scan_qr}
          onPress={() => {
            navigate('ScanQrAddress', { onBarScanned });
          }}
        />
      </View>
    </SafeBlueArea>
  );
};

WalletsImport.navigationOptions = {
  ...BlueNavigationStyle(),
  title: loc.wallets.import.title,
};
export default WalletsImport;
