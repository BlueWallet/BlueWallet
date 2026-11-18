import React, { useSyncExternalStore } from 'react';

import KeyboardAccessoryBar from './KeyboardAccessoryBar';
import KeyboardAccessorySuggestions from './KeyboardAccessorySuggestions';

interface ImportSeedAccessoryState {
  active: boolean;
  suggestions: string[];
  onSuggestionTapped: (word: string) => void;
}

const emptyState: ImportSeedAccessoryState = {
  active: false,
  suggestions: [],
  onSuggestionTapped: () => {},
};

let state: ImportSeedAccessoryState = emptyState;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): ImportSeedAccessoryState => state;

/** The sheet footer is rendered outside the screen, so it reads the focused field from here. */
export const setImportSeedAccessory = (next: ImportSeedAccessoryState): void => {
  state = next;
  listeners.forEach(listener => listener());
};

export const clearImportSeedAccessory = (): void => {
  setImportSeedAccessory(emptyState);
};

/**
 * Android form-sheet footer. react-native-screens pins this above the keyboard and
 * subtracts the sheet's own slide, which the screen-bottom dock cannot see.
 */
const ImportSeedSheetAccessory: React.FC = () => {
  const accessory = useSyncExternalStore(subscribe, getSnapshot);
  if (!accessory.active) return null;

  return (
    <KeyboardAccessoryBar>
      <KeyboardAccessorySuggestions suggestions={accessory.suggestions} onSuggestionTapped={accessory.onSuggestionTapped} />
    </KeyboardAccessoryBar>
  );
};

export const renderImportSeedSheetAccessory = (): React.ReactElement => <ImportSeedSheetAccessory />;

export default ImportSeedSheetAccessory;
