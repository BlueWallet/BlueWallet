/* global alert */
import React, { useContext, useEffect, useState } from 'react';
import { Platform, View, Keyboard, StatusBar, StyleSheet, Alert } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import {
  BlueFormMultiInput,
  BlueButtonLink,
  BlueFormLabel,
  BlueDoneAndDismissKeyboardInputAccessory,
  BlueButton,
  SafeBlueArea,
  BlueSpacing20,
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import Privacy from '../../blue_modules/Privacy';
import WalletImport from '../../class/wallet-import';
import loc from '../../loc';
import { isDesktop, isMacCatalina } from '../../blue_modules/environment';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const fs = require('../../blue_modules/fs');
const BlueElectrum = require('../../blue_modules/BlueElectrum');

const WalletsImport = () => {
  const [isToolbarVisibleForAndroid, setIsToolbarVisibleForAndroid] = useState(false);
  const route = useRoute();
  const { isImportingWallet, isElectrumDisabled } = useContext(BlueStorageContext);
  const label = (route.params && route.params.label) || '';
  const triggerImport = (route.params && route.params.triggerImport) || false;
  const [importText, setImportText] = useState(label);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    root: {
      paddingTop: 40,
      backgroundColor: colors.elevated,
    },
    center: {
      flex: 1,
      marginHorizontal: 16,
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

  useEffect(() => {
    if (triggerImport) importButtonPressed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
   */
  const importMnemonic = async importText => {
    if (!importText.trim().startsWith('lndhub://')) {
      const config = await BlueElectrum.getConfig();
      if (config.connected !== 1) {
        return alert(loc.settings.electrum_connnected_not_description);
      }
    }

    if (isImportingWallet && isImportingWallet.isFailure === false) {
      return;
    }

    let res;
    try {
      res = await WalletImport.askPasswordIfNeeded(importText);
    } catch (e) {
      // prompt cancelled
      return;
    }
    const { text, password } = res;

    WalletImport.addPlaceholderWallet(text);
    navigation.dangerouslyGetParent().pop();
    await new Promise(resolve => setTimeout(resolve, 500)); // giving some time to animations
    try {
      await WalletImport.processImportText(text, password);
      WalletImport.removePlaceholderWallet();
    } catch (error) {
      console.log(error);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      Alert.alert(
        loc.wallets.add_details,
        loc.wallets.list_import_problem,
        [
          {
            text: loc.wallets.list_tryagain,
            onPress: () => {
              navigation.navigate('AddWalletRoot', { screen: 'ImportWallet', params: { label: importText } });
              WalletImport.removePlaceholderWallet();
            },
            style: 'default',
          },
          {
            text: loc._.cancel,
            onPress: () => {
              WalletImport.removePlaceholderWallet();
            },
            style: 'cancel',
          },
        ],
        { cancelable: false },
      );
    }
  };

  /**
   *
   * @param value
   */
  const onBarScanned = value => {
    if (value && value.data) value = value.data + ''; // no objects here, only strings
    setImportText(value);
    setTimeout(() => importMnemonic(value), 500);
  };

  const importScan = () => {
    if (isMacCatalina) {
      fs.showActionSheet().then(onBarScanned);
    } else {
      navigation.navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          launchedBy: route.name,
          onBarScanned: onBarScanned,
          showFileImportButton: true,
        },
      });
    }
  };

  const isImportDisabled = () => {
    let disabled = false;
    const seed = importText.trim();

    if (seed.length === 0) {
      disabled = true;
    }

    if (!seed.startsWith('lndhub://') && isElectrumDisabled) {
      disabled = true;
    }

    return disabled;
  };

  return (
    <SafeBlueArea style={styles.root}>
      <StatusBar barStyle="light-content" />
      <BlueSpacing20 />
      <BlueFormLabel>{loc.wallets.import_explanation}</BlueFormLabel>
      <BlueSpacing20 />
      <BlueFormMultiInput
        testID="MnemonicInput"
        value={importText}
        contextMenuHidden={!isDesktop}
        onChangeText={setImportText}
        inputAccessoryViewID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}
      />

      <BlueSpacing20 />
      <View style={styles.center}>
        <>
          <BlueButton testID="DoImport" disabled={isImportDisabled()} title={loc.wallets.import_do_import} onPress={importButtonPressed} />
          <BlueSpacing20 />
          <BlueButtonLink title={loc.wallets.import_scan_qr} onPress={importScan} testID="ScanImport" />
        </>
      </View>
      {Platform.select({
        ios: (
          <BlueDoneAndDismissKeyboardInputAccessory
            onClearTapped={() => {
              setImportText('');
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

WalletsImport.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.wallets.import_title }));

export default WalletsImport;
