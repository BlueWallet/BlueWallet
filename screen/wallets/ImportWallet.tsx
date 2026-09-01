import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Keyboard, Platform, StyleSheet, TextInput, TextInputSelectionChangeEvent, TouchableWithoutFeedback, View } from 'react-native';
import AndroidKeyboardAccessoryDock from '../../components/AndroidKeyboardAccessoryDock';
import BlueFormLabel from '../../components/BlueFormLabel';
import BlueFormMultiInput from '../../components/BlueFormMultiInput';
import Button from '../../components/Button';
import {
  DoneAndDismissKeyboardInputAccessory,
  DoneAndDismissKeyboardInputAccessoryViewID,
} from '../../components/DoneAndDismissKeyboardInputAccessory';
import InputClearPasteOverlay from '../../components/InputClearPasteOverlay';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { getImportWalletSuggestions, getWordFragmentAtCursor, replaceWordFragment } from '../../blue_modules/bip39WordSuggestions';

type RouteProps = RouteProp<AddWalletStackParamList, 'ImportWallet'>;
type NavigationProps = NativeStackNavigationProp<AddWalletStackParamList, 'ImportWallet'>;

const ImportWallet = () => {
  const navigation = useNavigation<NavigationProps>();
  const { colors } = useTheme();
  const route = useRoute<RouteProps>();
  const label = route?.params?.label ?? '';
  const triggerImport = route?.params?.triggerImport ?? false;
  const [importText, setImportText] = useState<string>(label);
  const [selection, setSelection] = useState({
    start: label.length,
    end: label.length,
  });
  const importTextRef = useRef(label);
  const selectionRef = useRef({ start: label.length, end: label.length });
  const speedBackdoorTapCountRef = useRef(0);
  const inputRef = useRef<TextInput>(null);
  const askPassphraseMenuState = route.params?.askPassphraseMenuState ?? false;
  const searchAccountsMenuState = route.params?.searchAccountsMenuState ?? false;
  const clearClipboardMenuState = route.params?.clearClipboardMenuState ?? true;
  const { isPrivacyBlurEnabled } = useSettings();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();
  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.elevated,
    },
    root: {
      paddingTop: 10,
      backgroundColor: colors.elevated,
    },
    center: {
      marginHorizontal: 16,
      backgroundColor: colors.elevated,
    },
    importInput: {
      flex: 0,
      flexGrow: 0,
      flexShrink: 0,
      minHeight: 180,
    },
  });

  const commitImportText = useCallback((text: string, cursor?: number) => {
    importTextRef.current = text;
    setImportText(text);
    if (cursor !== undefined) {
      const nextSelection = { start: cursor, end: cursor };
      selectionRef.current = nextSelection;
      setSelection(nextSelection);
    }
  }, []);

  const onBlur = useCallback(() => {
    const valueWithSingleWhitespace = importTextRef.current.replace(/^\s+|\s+$|\s+(?=\s)/g, '');
    commitImportText(valueWithSingleWhitespace);
    return valueWithSingleWhitespace;
  }, [commitImportText]);

  const suggestions = useMemo(() => getImportWalletSuggestions(importText, selection.start), [importText, selection.start]);

  const handleChangeText = useCallback(
    (text: string) => {
      const previous = importTextRef.current;
      const { start, end } = selectionRef.current;
      let nextCursor: number;
      if (start === end && start >= previous.length) {
        nextCursor = text.length;
      } else {
        const insertedLength = text.length - (previous.length - (end - start));
        nextCursor = Math.max(0, Math.min(text.length, start + Math.max(insertedLength, 0)));
      }
      commitImportText(text, nextCursor);
    },
    [commitImportText],
  );

  const handleSelectionChange = useCallback((event: TextInputSelectionChangeEvent) => {
    const { selection: nextSelection } = event.nativeEvent;
    selectionRef.current = nextSelection;
    setSelection(nextSelection);
  }, []);

  const handleSuggestionTapped = useCallback(
    (word: string) => {
      const text = importTextRef.current;
      const fragment = getWordFragmentAtCursor(text, selectionRef.current.start);
      if (!fragment) {
        return;
      }
      const { newText, newCursor } = replaceWordFragment(text, fragment, word);
      commitImportText(newText, newCursor);
      requestAnimationFrame(() => {
        inputRef.current?.setNativeProps({
          selection: { start: newCursor, end: newCursor },
        });
      });
    },
    [commitImportText],
  );

  const handleClearTapped = useCallback(() => {
    commitImportText('', 0);
  }, [commitImportText]);

  const handlePasteTapped = useCallback(
    (text: string) => {
      commitImportText(text, text.length);
      Keyboard.dismiss();
    },
    [commitImportText],
  );

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
      commitImportText(newValue, newValue.length);
      setTimeout(() => importMnemonic(newValue), 500);
    },
    [commitImportText, importMnemonic],
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

  const keyboardAccessory = (
    <DoneAndDismissKeyboardInputAccessory
      onClearTapped={handleClearTapped}
      onPasteTapped={handlePasteTapped}
      suggestions={suggestions}
      onSuggestionTapped={handleSuggestionTapped}
    />
  );

  return (
    <View style={styles.screen}>
      <SafeAreaScrollView
        contentContainerStyle={styles.root}
        keyboardShouldPersistTaps="always"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
            onChangeText={handleChangeText}
            onSelectionChange={handleSelectionChange}
            testID="MnemonicInput"
            numberOfLines={12}
            style={styles.importInput}
            inputAccessoryViewID={DoneAndDismissKeyboardInputAccessoryViewID}
          />
        </InputClearPasteOverlay>
        <BlueSpacing20 />
        <View style={styles.center}>
          <Button disabled={importText.trim().length === 0} title={loc.wallets.import_do_import} testID="DoImport" onPress={handleImport} />
        </View>
        {Platform.OS === 'ios' && keyboardAccessory}
      </SafeAreaScrollView>
      {Platform.OS === 'android' && <AndroidKeyboardAccessoryDock>{keyboardAccessory}</AndroidKeyboardAccessoryDock>}
    </View>
  );
};

export default ImportWallet;
