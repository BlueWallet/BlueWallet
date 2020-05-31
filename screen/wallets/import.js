/* global alert */
import React, { useEffect, useState } from 'react';
import { Platform, Dimensions, View, Keyboard, StyleSheet } from 'react-native';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import WalletImport from '../../class/wallet-import';
let loc = require('../../loc');
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
});

const WalletsImport = () => {
  const [isToolbarVisibleForAndroid, setIsToolbarVisibleForAndroid] = useState(false);
  const route = useRoute();
  const label = (route.params && route.params.label) || '';
  const [importText, setImportText] = useState(label);
  const navigation = useNavigation();

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
      navigation.dangerouslyGetParent().pop();
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

  const importScan = () => {
    navigation.navigate('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params: {
        launchedBy: route.name,
        onBarScanned: onBarScanned,
        showFileImportButton: true,
      },
    });
  };

  return (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
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
      <View style={styles.center}>
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
        <BlueButtonLink title={loc.wallets.import.scan_qr} onPress={importScan} />
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
