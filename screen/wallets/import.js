import React, { useEffect, useState, useContext } from 'react';
import { Platform, View, Keyboard, StyleSheet, Switch, TouchableWithoutFeedback } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

import {
  BlueButton,
  BlueButtonLink,
  BlueDoneAndDismissKeyboardInputAccessory,
  BlueFormLabel,
  BlueFormMultiInput,
  BlueSpacing20,
  BlueText,
  SafeBlueArea,
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import Privacy from '../../blue_modules/Privacy';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const WalletsImport = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute();
  const label = route?.params?.label ?? '';
  const triggerImport = route?.params?.triggerImport ?? false;
  const { isAdvancedModeEnabled } = useContext(BlueStorageContext);
  const [importText, setImportText] = useState(label);
  const [isToolbarVisibleForAndroid, setIsToolbarVisibleForAndroid] = useState(false);
  const [, setSpeedBackdoor] = useState(0);
  const [isAdvancedModeEnabledRender, setIsAdvancedModeEnabledRender] = useState(false);
  const [searchAccounts, setSearchAccounts] = useState(false);
  const [askPassphrase, setAskPassphrase] = useState(false);

  const styles = StyleSheet.create({
    root: {
      paddingTop: 10,
      backgroundColor: colors.elevated,
    },
    center: {
      flex: 1,
      marginHorizontal: 16,
      backgroundColor: colors.elevated,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 10,
      justifyContent: 'space-between',
    },
  });

  const onBlur = () => {
    const valueWithSingleWhitespace = importText.replace(/^\s+|\s+$|\s+(?=\s)/g, '');
    setImportText(valueWithSingleWhitespace);
    return valueWithSingleWhitespace;
  };

  useEffect(() => {
    Privacy.enableBlur();
    Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setIsToolbarVisibleForAndroid(true));
    Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setIsToolbarVisibleForAndroid(false));
    return () => {
      Keyboard.removeAllListeners(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow');
      Keyboard.removeAllListeners(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide');
      Privacy.disableBlur();
    };
  }, []);

  useEffect(() => {
    isAdvancedModeEnabled().then(setIsAdvancedModeEnabledRender);
    if (triggerImport) importButtonPressed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const importButtonPressed = () => {
    const textToImport = onBlur();
    if (textToImport.trim().length === 0) {
      return;
    }
    importMnemonic(textToImport);
  };

  const importMnemonic = importText => {
    navigation.navigate('ImportWalletDiscovery', { importText, askPassphrase, searchAccounts });
  };

  const onBarScanned = value => {
    if (value && value.data) value = value.data + ''; // no objects here, only strings
    setImportText(value);
    setTimeout(() => importMnemonic(value), 500);
  };

  const importScan = () => {
    navigation.navigate('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params: {
        launchedBy: route.name,
        onBarScanned,
        showFileImportButton: true,
      },
    });
  };

  const speedBackdoorTap = () => {
    setSpeedBackdoor(v => {
      v += 1;
      if (v < 5) return v;
      navigation.navigate('ImportSpeed');
      return 0;
    });
  };

  const renderOptionsAndImportButton = (
    <>
      {isAdvancedModeEnabledRender && (
        <>
          <View style={styles.row}>
            <BlueText>{loc.wallets.import_passphrase}</BlueText>
            <Switch testID="AskPassphrase" value={askPassphrase} onValueChange={setAskPassphrase} />
          </View>
          <View style={styles.row}>
            <BlueText>{loc.wallets.import_search_accounts}</BlueText>
            <Switch testID="SearchAccounts" value={searchAccounts} onValueChange={setSearchAccounts} />
          </View>
        </>
      )}

      <BlueSpacing20 />
      <View style={styles.center}>
        <>
          <BlueButton
            disabled={importText.trim().length === 0}
            title={loc.wallets.import_do_import}
            testID="DoImport"
            onPress={importButtonPressed}
          />
          <BlueSpacing20 />
          <BlueButtonLink title={loc.wallets.import_scan_qr} onPress={importScan} testID="ScanImport" />
        </>
      </View>
    </>
  );

  return (
    <SafeBlueArea style={styles.root}>
      <BlueSpacing20 />
      <TouchableWithoutFeedback accessibilityRole="button" onPress={speedBackdoorTap} testID="SpeedBackdoor">
        <BlueFormLabel>{loc.wallets.import_explanation}</BlueFormLabel>
      </TouchableWithoutFeedback>
      <BlueSpacing20 />
      <BlueFormMultiInput
        value={importText}
        onBlur={onBlur}
        onChangeText={setImportText}
        testID="MnemonicInput"
        inputAccessoryViewID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}
      />

      {Platform.select({ android: !isToolbarVisibleForAndroid && renderOptionsAndImportButton, default: renderOptionsAndImportButton })}
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
