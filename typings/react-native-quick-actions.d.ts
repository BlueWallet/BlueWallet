declare module 'react-native-quick-actions' {
  interface QuickActionItem {
    type: string;
    title: string;
    subtitle?: string;
    icon?: string;
    userInfo?: { [key: string]: string };
  }

  export function setShortcutItems(shortcutItems: QuickActionItem[]): void;
}
