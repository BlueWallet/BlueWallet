import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRoute } from '@react-navigation/native';
import { Keyboard, Platform, StyleSheet, TouchableWithoutFeedback, View, ScrollView } from 'react-native';
import { BlueButtonLink, BlueFormLabel, BlueFormMultiInput, BlueSpacing20 } from '../../BlueComponents';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import { scanQrHelper } from '../../helpers/scan-qr';
import usePrivacy from '../../hooks/usePrivacy';
import loc from '../../loc';
import {
  DoneAndDismissKeyboardInputAccessory,
  DoneAndDismissKeyboardInputAccessoryViewID,
} from '../../components/DoneAndDismissKeyboardInputAccessory';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import Clipboard from '@react-native-clipboard/clipboard';
import HeaderMenuButton from '../../components/HeaderMenuButton';

const WalletsImport = () => {
  const navigation = useExtendedNavigation();
  const { colors } = useTheme();
  const route = useRoute();
  const label = route?.params?.label ?? '';
  const triggerImport = route?.params?.triggerImport ?? false;
  const scannedData = route?.params?.scannedData ?? '';
  const [importText, setImportText] = useState(label);
  const [isToolbarVisibleForAndroid, setIsToolbarVisibleForAndroid] = useState(false);
  const [, setSpeedBackdoor] = useState(0);
  const [searchAccountsMenuState, setSearchAccountsMenuState] = useState(false);
  const [askPassphraseMenuState, setAskPassphraseMenuState] = useState(false);
  const [clearClipboardMenuState, setClearClipboardMenuState] = useState(true);
  const { enableBlur, disableBlur } = usePrivacy();

  // Styles
  const styles = StyleSheet.create({
    root: {
      paddingTop: 10,
      backgroundColor: colors.elevated,
      flex: 1,
    },
    center: {
      flex: 1,
      marginHorizontal: 16,
      backgroundColor: colors.elevated,
    },
  });

  const onBlur = () => {
    const valueWithSingleWhitespace = importText.replace(/^\s+|\s+$|\s+(?=\s)/g, '');
    setImportText(valueWithSingleWhitespace);
    return valueWithSingleWhitespace;
  };

  useKeyboard({
    onKeyboardDidShow: () => {
      setIsToolbarVisibleForAndroid(true);
    },
    onKeyboardDidHide: () => {
      setIsToolbarVisibleForAndroid(false);
    },
  });

  useEffect(() => {
    enableBlur();
    return () => {
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

  const importMnemonic = async text => {
    if (clearClipboardMenuState) {
      try {
        if (await Clipboard.hasString()) {
          Clipboard.setString('');
        }
      } catch (error) {
        console.error('Failed to clear clipboard:', error);
      }
    }
    navigation.navigate('ImportWalletDiscovery', {
      importText: text,
      askPassphrase: askPassphraseMenuState,
      searchAccounts: searchAccountsMenuState,
    });
  };

  const onBarScanned = value => {
    if (value && value.data) value = value.data + ''; // no objects here, only strings
    setImportText(value);
    setTimeout(() => importMnemonic(value), 500);
  };

  const importScan = async () => {
    const data = await scanQrHelper(navigation, true);
    if (data) {
      onBarScanned(data);
    }
  };

  const speedBackdoorTap = () => {
    setSpeedBackdoor(v => {
      v += 1;
      if (v < 5) return v;
      navigation.navigate('ImportSpeed');
      return 0;
    });
  };

  const toolTipOnPressMenuItem = useCallback(
    menuItem => {
      Keyboard.dismiss();
      if (menuItem === CommonToolTipActions.Passphrase.id) {
        setAskPassphraseMenuState(!askPassphraseMenuState);
      } else if (menuItem === CommonToolTipActions.SearchAccount.id) {
        setSearchAccountsMenuState(!searchAccountsMenuState);
      } else if (menuItem === CommonToolTipActions.ClearClipboard.id) {
        setClearClipboardMenuState(!clearClipboardMenuState);
      }
    },
    [askPassphraseMenuState, clearClipboardMenuState, searchAccountsMenuState],
  );

  // ToolTipMenu actions for advanced options
  const toolTipActions = useMemo(() => {
    const askPassphraseAction = CommonToolTipActions.Passphrase;
    askPassphraseAction.menuState = askPassphraseMenuState;
    const searchAccountsAction = CommonToolTipActions.SearchAccount;
    searchAccountsAction.menuState = searchAccountsMenuState;
    const clearClipboardAction = CommonToolTipActions.ClearClipboard;
    clearClipboardAction.menuState = clearClipboardMenuState;
    return [askPassphraseAction, searchAccountsAction, clearClipboardAction];
  }, [askPassphraseMenuState, clearClipboardMenuState, searchAccountsMenuState]);

  const HeaderRight = useMemo(
    () => <HeaderMenuButton onPressMenuItem={toolTipOnPressMenuItem} actions={toolTipActions} />,
    [toolTipOnPressMenuItem, toolTipActions],
  );

  // Adding the ToolTipMenu to the header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => HeaderRight,
    });
  }, [colors.foregroundColor, navigation, toolTipActions, HeaderRight]);

  const renderOptionsAndImportButton = (
    <>
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
    <ScrollView
      contentContainerStyle={styles.root}
      automaticallyAdjustContentInsets
      automaticallyAdjustsScrollIndicatorInsets
      keyboardShouldPersistTaps="always"
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
    >
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
        inputAccessoryViewID={DoneAndDismissKeyboardInputAccessoryViewID}
      />

      {Platform.select({ android: !isToolbarVisibleForAndroid && renderOptionsAndImportButton, default: renderOptionsAndImportButton })}
      {Platform.select({
        ios: (
          <DoneAndDismissKeyboardInputAccessory
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
          <DoneAndDismissKeyboardInputAccessory
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
    </ScrollView>
  );
};

export default WalletsImport;
