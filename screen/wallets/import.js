import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Keyboard, Platform, StyleSheet, TouchableWithoutFeedback, View, ScrollView } from 'react-native';

import {
  BlueButtonLink,
  BlueDoneAndDismissKeyboardInputAccessory,
  BlueFormLabel,
  BlueFormMultiInput,
  BlueSpacing20,
} from '../../BlueComponents';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import { requestCameraAuthorization } from '../../helpers/scan-qr';
import usePrivacy from '../../hooks/usePrivacy';
import loc from '../../loc';
import { Icon } from '@rneui/themed';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { useKeyboard } from '../../hooks/useKeyboard';
import ToolTipMenu from '../../components/TooltipMenu';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

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
  const [searchAccounts, setSearchAccounts] = useState(false);
  const [askPassphrase, setAskPassphrase] = useState(false);
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

  const toolTipOnPressMenuItem = useCallback(
    menuItem => {
      if (menuItem === CommonToolTipActions.Passphrase.id) {
        setAskPassphrase(!askPassphrase);
      } else if (menuItem === CommonToolTipActions.SearchAccount.id) {
        setSearchAccounts(!searchAccounts);
      }
    },
    [askPassphrase, searchAccounts],
  );

  // ToolTipMenu actions for advanced options
  const toolTipActions = useMemo(() => {
    const askPassphraseAction = CommonToolTipActions.Passphrase;
    askPassphraseAction.menuState = askPassphrase;

    const searchAccountsAction = CommonToolTipActions.SearchAccount;
    searchAccountsAction.menuState = searchAccounts;
    return [askPassphraseAction, searchAccountsAction];
  }, [askPassphrase, searchAccounts]);

  const HeaderRight = useMemo(
    () => (
      <ToolTipMenu
        isButton
        testID="HeaderRightButton"
        isMenuPrimaryAction
        onPressMenuItem={toolTipOnPressMenuItem}
        actions={toolTipActions}
      >
        <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
      </ToolTipMenu>
    ),
    [toolTipOnPressMenuItem, toolTipActions, colors.foregroundColor],
  );

  // Adding the ToolTipMenu to the header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => HeaderRight,
    });
  }, [askPassphrase, searchAccounts, colors.foregroundColor, navigation, toolTipActions, HeaderRight]);

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
      keyboardShouldPersistTaps
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
    </ScrollView>
  );
};

export default WalletsImport;
