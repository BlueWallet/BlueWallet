/* global alert */
import React, { useEffect, useState } from 'react';
import { Platform, Dimensions, View, Keyboard, StatusBar, StyleSheet } from 'react-native';
import {
  BlueFormMultiInput,
  BlueButtonLink,
  BlueFormLabel,
  BlueDoneAndDismissKeyboardInputAccessory,
  BlueButton,
  SafeBlueArea,
  BlueSpacing20,
  BlueNavigationStyle,
  BlueLoadingHook,
} from '../../BlueComponents';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Privacy from '../../Privacy';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import WalletImport from '../../class/wallet-import';
import loc from '../../loc';
import { getSystemName } from 'react-native-device-info';
const { width } = Dimensions.get('window');

const WalletsImport = () => {
  const [isToolbarVisibleForAndroid, setIsToolbarVisibleForAndroid] = useState(false);
  const route = useRoute();
  const label = (route.params && route.params.label) || '';
  const [importText, setImportText] = useState(label);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      paddingTop: 40,
      backgroundColor: colors.elevated,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.elevated,
    },
  });

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
    setIsLoading(true);
    try {
      WalletImport.processImportText(importText, additionalProperties);
      navigation.dangerouslyGetParent().pop();
    } catch (error) {
      alert(loc.wallets.import_error);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      setIsLoading(false);
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
      <StatusBar barStyle="default" />
      <BlueSpacing20 />
      <BlueFormLabel>{loc.wallets.import_explanation}</BlueFormLabel>
      <BlueSpacing20 />
      <BlueFormMultiInput
        testID="MnemonicInput"
        value={importText}
        contextMenuHidden={getSystemName() !== 'Mac OS X'}
        editable={!isLoading}
        onChangeText={setImportText}
        inputAccessoryViewID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}
      />

      <BlueSpacing20 />
      <View style={styles.center}>
        {!isLoading ? (
          <>
            <BlueButton
              testID="DoImport"
              disabled={importText.trim().length === 0}
              title={loc.wallets.import_do_import}
              buttonStyle={{
                width: width / 1.5,
              }}
              onPress={importButtonPressed}
            />
            <BlueSpacing20 />
            <BlueButtonLink title={loc.wallets.import_scan_qr} onPress={importScan} />
          </>
        ) : (
          <BlueLoadingHook />
        )}
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

WalletsImport.navigationOptions = ({ navigation, route }) => ({
  ...BlueNavigationStyle(),
  title: loc.wallets.import_title,
});
export default WalletsImport;
