import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Keyboard, Platform, ScrollView, StyleSheet, TouchableWithoutFeedback, View, TouchableOpacity, Image } from 'react-native';
import { disallowScreenshot } from 'react-native-screen-capture';
import { BlueButtonLink, BlueFormLabel, BlueFormMultiInput, BlueSpacing20 } from '../../BlueComponents';
import Button from '../../components/Button';
import {
  DoneAndDismissKeyboardInputAccessory,
  DoneAndDismissKeyboardInputAccessoryViewID,
} from '../../components/DoneAndDismissKeyboardInputAccessory';
import HeaderMenuButton from '../../components/HeaderMenuButton';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useKeyboard } from '../../hooks/useKeyboard';
import loc from '../../loc';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { isDesktop } from '../../blue_modules/environment';

type RouteProps = RouteProp<AddWalletStackParamList, 'ImportWallet'>;
type NavigationProps = NativeStackNavigationProp<AddWalletStackParamList, 'ImportWallet'>;

const ImportWallet = () => {
  const navigation = useExtendedNavigation<NavigationProps>();
  const { colors, closeImage } = useTheme();
  const route = useRoute<RouteProps>();
  const label = route?.params?.label ?? '';
  const triggerImport = route?.params?.triggerImport ?? false;
  const [importText, setImportText] = useState<string>(label);
  const [isToolbarVisibleForAndroid, setIsToolbarVisibleForAndroid] = useState<boolean>(false);
  const [, setSpeedBackdoor] = useState<number>(0);
  const [searchAccountsMenuState, setSearchAccountsMenuState] = useState<boolean>(false);
  const [askPassphraseMenuState, setAskPassphraseMenuState] = useState<boolean>(false);
  const [clearClipboardMenuState, setClearClipboardMenuState] = useState<boolean>(true);
  const { isPrivacyBlurEnabled } = useSettings();
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
    button: {
      padding: 10,
    },
  });

  const onBlur = useCallback(() => {
    const valueWithSingleWhitespace = importText.replace(/^\s+|\s+$|\s+(?=\s)/g, '');
    setImportText(valueWithSingleWhitespace);
    return valueWithSingleWhitespace;
  }, [importText]);

  useKeyboard({
    onKeyboardDidShow: () => {
      setIsToolbarVisibleForAndroid(true);
    },
    onKeyboardDidHide: () => {
      setIsToolbarVisibleForAndroid(false);
    },
  });

  const importMnemonic = useCallback(
    async (text: string) => {
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
    },
    [askPassphraseMenuState, clearClipboardMenuState, navigation, searchAccountsMenuState],
  );

  const handleImport = useCallback(() => {
    const textToImport = onBlur();
    if (textToImport.trim().length === 0) {
      return;
    }
    importMnemonic(textToImport);
  }, [importMnemonic, onBlur]);

  const onBarScanned = useCallback(
    (value: string | { data: any }) => {
      // no objects here, only strings
      const newValue: string = typeof value !== 'string' ? value.data + '' : value;
      setImportText(newValue);
      setTimeout(() => importMnemonic(newValue), 500);
    },
    [importMnemonic],
  );

  const importScan = useCallback(async () => {
    navigation.navigate('ScanQRCode', {
      showFileImportButton: true,
    });
  }, [navigation]);

  useEffect(() => {
    const data = route.params?.onBarScanned;
    if (data) {
      onBarScanned(data);
      navigation.setParams({ onBarScanned: undefined });
    }
  }, [route.name, onBarScanned, route.params?.onBarScanned, navigation]);

  const speedBackdoorTap = () => {
    setSpeedBackdoor(v => {
      v += 1;
      if (v < 5) return v;
      navigation.navigate('ImportSpeed');
      return 0;
    });
  };

  const toolTipOnPressMenuItem = useCallback(
    (menuItem: string) => {
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
    return [
      { ...CommonToolTipActions.Passphrase, menuState: askPassphraseMenuState },
      { ...CommonToolTipActions.SearchAccount, menuState: searchAccountsMenuState },
      { ...CommonToolTipActions.ClearClipboard, menuState: clearClipboardMenuState },
    ];
  }, [askPassphraseMenuState, clearClipboardMenuState, searchAccountsMenuState]);

  const HeaderRight = useMemo(
    () => <HeaderMenuButton onPressMenuItem={toolTipOnPressMenuItem} actions={toolTipActions} />,
    [toolTipOnPressMenuItem, toolTipActions],
  );

  useEffect(() => {
    if (!isDesktop) disallowScreenshot(isPrivacyBlurEnabled);
    return () => {
      if (!isDesktop) disallowScreenshot(false);
    };
  }, [isPrivacyBlurEnabled]);

  useEffect(() => {
    if (triggerImport) handleImport();
  }, [triggerImport, handleImport]);

  // Adding the ToolTipMenu to the header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => HeaderRight,
      headerLeft:
        navigation.getState().index === 0
          ? () => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={loc._.close}
                style={styles.button}
                onPress={() => navigation.goBack()}
                testID="NavigationCloseButton"
              >
                <Image source={closeImage} />
              </TouchableOpacity>
            )
          : undefined,
    });
  }, [colors, navigation, toolTipActions, HeaderRight, styles.button, closeImage]);

  const renderOptionsAndImportButton = (
    <>
      <BlueSpacing20 />
      <View style={styles.center}>
        <>
          <Button disabled={importText.trim().length === 0} title={loc.wallets.import_do_import} testID="DoImport" onPress={handleImport} />
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

export default ImportWallet;
