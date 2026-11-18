import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InputAccessoryView, Keyboard, Platform, StyleSheet, TextInput, TextInputSelectionChangeEvent } from 'react-native';

import { getImportWalletSuggestions, getWordFragmentAtCursor, replaceWordFragment } from '../blue_modules/bip39WordSuggestions';
import { BlueSpacing20 } from './BlueSpacing';
import BlueFormMultiInput from './BlueFormMultiInput';
import BlueTextCentered from './BlueTextCentered';
import InputClearPasteOverlay from './InputClearPasteOverlay';
import KeyboardAccessoryBar from './KeyboardAccessoryBar';
import KeyboardAccessorySuggestions from './KeyboardAccessorySuggestions';
import SheetKeyboardForm from './SheetKeyboardForm';
import { clearImportSeedAccessory, setImportSeedAccessory } from './ImportSeedAccessory';

const IMPORT_SEED_ACCESSORY_ID = 'import-seed-accessory';

interface ImportSeedFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  onScan: (text: string) => void;
  prompt: string;
  children: React.ReactNode;
  testID?: string;
  scanTestID?: string;
}

/**
 * Seed entry for a form sheet.
 * iOS attaches the suggestion bar to the keyboard. Android publishes it for the sheet footer,
 * which react-native-screens pins above the keyboard.
 * Native caret is the source of truth. Do not bind selection={} on this Android multiline field.
 */
const ImportSeedField: React.FC<ImportSeedFieldProps> = ({
  value,
  onChangeText,
  onScan,
  prompt,
  children,
  testID = 'MnemonicInput',
  scanTestID = 'ScanOrOpenFile',
}) => {
  const importTextRef = useRef(value);
  const selectionRef = useRef({ start: value.length, end: value.length });
  const [selection, setSelection] = useState({ start: value.length, end: value.length });
  const inputRef = useRef<TextInput>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    importTextRef.current = value;
  }, [value]);

  const commitImportText = useCallback(
    (text: string, cursor?: number) => {
      importTextRef.current = text;
      onChangeText(text);
      if (cursor !== undefined) {
        const nextSelection = { start: cursor, end: cursor };
        selectionRef.current = nextSelection;
        setSelection(nextSelection);
      }
    },
    [onChangeText],
  );

  const onBlur = useCallback(() => {
    setIsInputFocused(false);
    const valueWithSingleWhitespace = importTextRef.current.replace(/^\s+|\s+$|\s+(?=\s)/g, '');
    commitImportText(valueWithSingleWhitespace);
  }, [commitImportText]);

  const suggestions = useMemo(() => getImportWalletSuggestions(value, selection.start), [selection.start, value]);

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

  const handleScan = useCallback(
    (text: string) => {
      commitImportText(text, text.length);
      onScan(text);
    },
    [commitImportText, onScan],
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!isInputFocused) {
      clearImportSeedAccessory();
      return;
    }
    setImportSeedAccessory({ active: true, suggestions, onSuggestionTapped: handleSuggestionTapped });
  }, [handleSuggestionTapped, isInputFocused, suggestions]);

  useEffect(() => {
    return () => {
      if (Platform.OS === 'android') clearImportSeedAccessory();
    };
  }, []);

  const suggestionsBar = (
    <KeyboardAccessoryBar>
      <KeyboardAccessorySuggestions suggestions={suggestions} onSuggestionTapped={handleSuggestionTapped} />
    </KeyboardAccessoryBar>
  );

  return (
    <>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={IMPORT_SEED_ACCESSORY_ID} backgroundColor="transparent">
          {suggestionsBar}
        </InputAccessoryView>
      ) : null}
      <SheetKeyboardForm style={styles.content}>
        <BlueTextCentered>{prompt}</BlueTextCentered>
        <BlueSpacing20 />
        <InputClearPasteOverlay
          onClear={handleClearTapped}
          onPaste={handlePasteTapped}
          onScan={handleScan}
          scanTestID={scanTestID}
          actionsRight={8}
        >
          <BlueFormMultiInput
            ref={inputRef}
            value={value}
            onFocus={() => setIsInputFocused(true)}
            onBlur={onBlur}
            onChangeText={handleChangeText}
            onSelectionChange={handleSelectionChange}
            testID={testID}
            numberOfLines={12}
            inputAccessoryViewID={Platform.OS === 'ios' ? IMPORT_SEED_ACCESSORY_ID : undefined}
            style={styles.importInput}
          />
        </InputClearPasteOverlay>
        <BlueSpacing20 />
        {children}
      </SheetKeyboardForm>
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  importInput: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 180,
    marginHorizontal: 0,
  },
});

export default ImportSeedField;
