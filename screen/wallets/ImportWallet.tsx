import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Keyboard, Platform, ScrollView, StyleSheet, TextInput, TextInputSelectionChangeEvent, TouchableWithoutFeedback, View } from 'react-native';
import BlueFormLabel from '../../components/BlueFormLabel';
import BlueFormMultiInput from '../../components/BlueFormMultiInput';
import Button from '../../components/Button';
import ImportWalletKeyboardAccessory, { ImportWalletKeyboardAccessoryViewID } from '../../components/ImportWalletKeyboardAccessory';
import InputClearPasteOverlay from '../../components/InputClearPasteOverlay';
import HeaderMenuButton from '../../components/HeaderMenuButton';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useKeyboard } from '../../hooks/useKeyboard';
import loc from '../../loc';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import SafeArea from '../../components/SafeArea';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { getBip39PrefixMatches, getWordFragmentAtCursor, replaceWordFragment } from '../../blue_modules/bip39WordSuggestions';

type RouteProps = RouteProp<AddWalletStackParamList, 'ImportWallet'>;
type NavigationProps = NativeStackNavigationProp<AddWalletStackParamList, 'ImportWallet'>;

const ImportWallet = () => {
  const navigation = useExtendedNavigation<NavigationProps>();
  const { colors } = useTheme();
  const route = useRoute<RouteProps>();
  const label = route?.params?.label ?? '';
  const triggerImport = route?.params?.triggerImport ?? false;
  const [importText, setImportText] = useState<string>(label);
  const [selection, setSelection] = useState({ start: label.length, end: label.length });
  const { isVisible: isKeyboardVisible, screenY: keyboardScreenY, height: keyboardHeight } = useKeyboard();
  const speedBackdoorTapCountRef = useRef(0);
  const inputRef = useRef<TextInput>(null);
  const screenRef = useRef<View>(null);
  const [anchorScreenY, setAnchorScreenY] = useState(0);
  const [searchAccountsMenuState, setSearchAccountsMenuState] = useState<boolean>(false);
  const [askPassphraseMenuState, setAskPassphraseMenuState] = useState<boolean>(false);
  const [clearClipboardMenuState, setClearClipboardMenuState] = useState<boolean>(true);
  const { isPrivacyBlurEnabled } = useSettings();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();
  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.elevated,
    },
    safeArea: {
      flex: 1,
      backgroundColor: colors.elevated,
    },
    scrollView: {
      flex: 1,
    },
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
    importInput: {
      flex: 0,
      flexGrow: 0,
      minHeight: 180,
    },
  });
  const updateAnchorPosition = useCallback(() => {
    screenRef.current?.measureInWindow((_x, y) => {
      setAnchorScreenY(y);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && isKeyboardVisible) {
      updateAnchorPosition();
      requestAnimationFrame(updateAnchorPosition);
    }
  }, [isKeyboardVisible, keyboardScreenY, keyboardHeight, updateAnchorPosition]);

  const onBlur = useCallback(() => {
    const valueWithSingleWhitespace = importText.replace(/^\s+|\s+$|\s+(?=\s)/g, '');
    setImportText(valueWithSingleWhitespace);
    return valueWithSingleWhitespace;
  }, [importText]);

  const suggestions = useMemo(() => {
    const fragment = getWordFragmentAtCursor(importText, selection.start);
    if (!fragment) {
      return [];
    }
    return getBip39PrefixMatches(fragment.fragment);
  }, [importText, selection.start]);

  const handleSelectionChange = useCallback((event: TextInputSelectionChangeEvent) => {
    const { selection: nextSelection } = event.nativeEvent;
    setSelection(nextSelection);
  }, []);

  const handleSuggestionTapped = useCallback(
    (word: string) => {
      const fragment = getWordFragmentAtCursor(importText, selection.start);
      if (!fragment) {
        return;
      }
      const { newText, newCursor } = replaceWordFragment(importText, fragment, word);
      setImportText(newText);
      setSelection({ start: newCursor, end: newCursor });
      requestAnimationFrame(() => {
        inputRef.current?.setNativeProps({ selection: { start: newCursor, end: newCursor } });
      });
    },
    [importText, selection.start],
  );

  const handleClearTapped = useCallback(() => {
    setImportText('');
    setSelection({ start: 0, end: 0 });
  }, []);

  const handlePasteTapped = useCallback((text: string) => {
    setImportText(text);
    setSelection({ start: text.length, end: text.length });
    Keyboard.dismiss();
  }, []);

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

      Keyboard.dismiss();

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

  useEffect(() => {
    const data = route.params?.onBarScanned;
    if (data) {
      onBarScanned(data);
      navigation.setParams({ onBarScanned: undefined });
    }
  }, [route.name, onBarScanned, route.params?.onBarScanned, navigation]);

  const speedBackdoorTap = () => {
    speedBackdoorTapCountRef.current += 1;
    if (speedBackdoorTapCountRef.current >= 5) {
      speedBackdoorTapCountRef.current = 0;
      navigation.navigate('ImportSpeed');
    }
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

  const renderHeaderRight = useCallback(() => HeaderRight, [HeaderRight]);

  useEffect(() => {
    if (isPrivacyBlurEnabled) {
      enableScreenProtect();
    }
    return () => {
      disableScreenProtect();
    };
  }, [isPrivacyBlurEnabled, enableScreenProtect, disableScreenProtect]);

  useEffect(() => {
    if (triggerImport) handleImport();
  }, [triggerImport, handleImport]);

  // Adding the ToolTipMenu to the header
  useEffect(() => {
    navigation.setOptions({
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight]);

  const renderOptionsAndImportButton = (
    <>
      <BlueSpacing20 />
      <View style={styles.center}>
        <Button disabled={importText.trim().length === 0} title={loc.wallets.import_do_import} testID="DoImport" onPress={handleImport} />
      </View>
    </>
  );

  const showAndroidKeyboardAccessory = isKeyboardVisible;

  return (
    <View ref={screenRef} onLayout={updateAnchorPosition} style={styles.screen}>
      <SafeArea style={styles.safeArea} ignoreTopInset>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.root}
          keyboardShouldPersistTaps="always"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior="never"
        >
        <BlueSpacing20 />
        <TouchableWithoutFeedback accessibilityRole="button" onPress={speedBackdoorTap} testID="SpeedBackdoor">
          <BlueFormLabel>{loc.wallets.import_explanation}</BlueFormLabel>
        </TouchableWithoutFeedback>
        <BlueSpacing20 />
        <InputClearPasteOverlay onClear={handleClearTapped} onPaste={handlePasteTapped} onScan={onBarScanned} scanTestID="ScanImport">
          <BlueFormMultiInput
            ref={inputRef}
            value={importText}
            onBlur={onBlur}
            onChangeText={setImportText}
            onSelectionChange={handleSelectionChange}
            testID="MnemonicInput"
            numberOfLines={12}
            style={styles.importInput}
            inputAccessoryViewID={ImportWalletKeyboardAccessoryViewID}
          />
        </InputClearPasteOverlay>

        {renderOptionsAndImportButton}
        </ScrollView>
        {Platform.OS === 'ios' && (
          <ImportWalletKeyboardAccessory suggestions={suggestions} onSuggestionTapped={handleSuggestionTapped} />
        )}
      </SafeArea>
      {Platform.OS === 'android' && showAndroidKeyboardAccessory && keyboardHeight > 0 && (
        <ImportWalletKeyboardAccessory
          suggestions={suggestions}
          onSuggestionTapped={handleSuggestionTapped}
          keyboardScreenY={keyboardScreenY}
          keyboardHeight={keyboardHeight}
          anchorScreenY={anchorScreenY}
        />
      )}
    </View>
  );
};

export default ImportWallet;
