import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';

const STORAGE_KEY: string = 'ClipboardReadAllowed';
const LAST_SEEN_HASH_KEY: string = 'ClipboardLastSeenHashV6';

let lastSeenHashMemory: string | undefined;
let clipboardSheetFocused = false;

/** Layout height that means the Detected sheet is actually on screen, not a collapsed card. */
export const CLIPBOARD_SHEET_VISIBLE_MIN_HEIGHT = 80;

export const setClipboardSheetFocused = (focused: boolean): void => {
  clipboardSheetFocused = focused;
};

export const isClipboardSheetFocused = (): boolean => clipboardSheetFocused;

export const isReadClipboardAllowed = async (): Promise<boolean> => {
  try {
    const clipboardAccessAllowed = await AsyncStorage.getItem(STORAGE_KEY);
    if (clipboardAccessAllowed === null) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(true));
      return true;
    }
    return !!JSON.parse(clipboardAccessAllowed);
  } catch {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(true));
    return true;
  }
};

export const setReadClipboardAllowed = async (value: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Boolean(value)));
  } catch (error) {
    console.error('Failed to set clipboard permission:', error);
    throw error;
  }
};

export const getClipboardContent = async (): Promise<string | undefined> => {
  try {
    const isAllowed = await isReadClipboardAllowed();
    if (!isAllowed) return undefined;

    const hasString = await Clipboard.hasString();
    return hasString ? await Clipboard.getString() : undefined;
  } catch (error) {
    console.error('Error accessing clipboard:', error);
    return undefined;
  }
};

/**
 * iOS 16+ can show a system paste prompt and resolve `getString()` with an empty
 * value before the user answers. `pasteBlocked` is true when there is clipboard
 * text we were not allowed to read yet (or the read failed).
 */
export const readClipboardForDetection = async (): Promise<{
  content: string | undefined;
  pasteBlocked: boolean;
}> => {
  try {
    const isAllowed = await isReadClipboardAllowed();
    if (!isAllowed) return { content: undefined, pasteBlocked: false };

    const content = await Clipboard.getString();
    if (content) return { content, pasteBlocked: false };

    const hasString = await Clipboard.hasString();
    if (hasString) return { content: undefined, pasteBlocked: true };
    return { content: undefined, pasteBlocked: false };
  } catch (error) {
    console.error('Error accessing clipboard:', error);
    return { content: undefined, pasteBlocked: true };
  }
};

export const getLastSeenClipboardHash = async (): Promise<string | undefined> => {
  try {
    if (lastSeenHashMemory !== undefined) return lastSeenHashMemory;
    lastSeenHashMemory = (await AsyncStorage.getItem(LAST_SEEN_HASH_KEY)) ?? undefined;
    return lastSeenHashMemory;
  } catch {
    return lastSeenHashMemory;
  }
};

export const setLastSeenClipboardHash = async (hash: string): Promise<void> => {
  lastSeenHashMemory = hash;
  try {
    await AsyncStorage.setItem(LAST_SEEN_HASH_KEY, hash);
  } catch (error) {
    console.error('Failed to persist last-seen clipboard hash:', error);
  }
};
