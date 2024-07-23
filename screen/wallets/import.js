import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Switch, TouchableWithoutFeedback, View } from 'react-native';

import {
  BlueButtonLink,
  BlueDoneAndDismissKeyboardInputAccessory,
  BlueFormLabel,
  BlueFormMultiInput,
  BlueSpacing20,
  BlueText,
} from '../../BlueComponents';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import { requestCameraAuthorization } from '../../helpers/scan-qr';
import usePrivacy from '../../hooks/usePrivacy';
import loc from '../../loc';
import { useSettings } from '../../hooks/context/useSettings';

const WalletsImport = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute();
  const label = route?.params?.label ?? '';
  const triggerImport = route?.params?.triggerImport ?? false;
  const scannedData = route?.params?.scannedData ?? '';
  const { isAdvancedModeEnabled } = useSettings();
  const [importText, setImportText] = useState(label);
  const [isToolbarVisibleForAndroid, setIsToolbarVisibleForAndroid] = useState(false);
  const [, setSpeedBackdoor] = useState(0);
  const [searchAccounts, setSearchAccounts] = useState(false);
  const [askPassphrase, setAskPassphrase] = useState(false);
  const { enableBlur, disableBlur } = usePrivacy();

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
    enableBlur();

    const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      setIsToolbarVisibleForAndroid(true),
    );
    const hideSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setIsToolbarVisibleForAndroid(false),
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      disableBlur();
    };
  }, [disableBlur, enableBlur]);

  useEffect(() => {
    if (triggerImport) importButtonPressed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerImport]);

  useEffect(() => {
    if (scannedData) {
      onBarScanned(scannedData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedData]);

  const importButtonPressed = () => {
    const textToImport = onBlur();
    if (textToImport.trim().length === 0) {
      return;
    }
    importMnemonic(textToImport);
  };

  const importMnemonic = text => {
    navigation.navigate('ImportWalletDiscovery', { importText: text, askPassphrase, searchAccounts });
  };

  const onBarScanned = value => {
    if (value && value.data) value = value.data + ''; // no objects here, only strings
    setImportText(value);
    setTimeout(() => importMnemonic(value), 500);
  };

  const importScan = () => {
    requestCameraAuthorization().then(() =>
      navigation.navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          launchedBy: route.name,
          showFileImportButton: true,
        },
      }),
    );
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
      {isAdvancedModeEnabled && (
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
          <Button
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
    <SafeArea style={styles.root}>
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
    </SafeArea>
  );
};

export default WalletsImport;
