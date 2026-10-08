import { AccessibilityRole, ViewStyle, ColorValue, GestureResponderEvent } from 'react-native';

export interface Action {
  id: string | number;
  text: string;
  icon?: {
    iconValue: string;
  };
  menuTitle?: string;
  subtitle?: string;
  discoverabilityTitle?: string;
  menuState?: 'mixed' | boolean | undefined;
  displayInline?: boolean; // Indicates if subactions should be displayed inline or nested (iOS only)
  singleSelection?: boolean; // Restricts this menu and its submenus to one selected item (iOS 15+)
  displayAsPalette?: boolean; // Displays child items as a palette (iOS 17+)
  preferredElementSize?: 'automatic' | 'small' | 'medium' | 'large'; // Child layout size (iOS 16+)
  maximumNumberOfTitleLines?: number; // Title/subtitle line limit for immediate children (iOS 17.4+)
  preferredImageVisibility?: 'automatic' | 'visible' | 'hidden'; // Preferred icon visibility (iOS 27+)
  keepsMenuPresented?: boolean; // Keeps the menu open after invoking the action (iOS 16+)
  repeatBehavior?: 'automatic' | 'repeatable' | 'nonRepeatable'; // Press-and-hold repeat behavior (iOS 26+)
  image?: string;
  imageColor?: ColorValue;
  destructive?: boolean;
  hidden?: boolean;
  disabled?: boolean;
  subactions?: Action[]; // Nested/Inline actions (subactions) within an action
}

export interface ToolTipMenuProps {
  actions: Action[] | Action[][];
  children: React.ReactNode;
  enableAndroidRipple?: boolean;
  onPressMenuItem: (id: string) => void;
  title?: string;
  // When true (default) the menu opens on long-press; when false it opens
  // on a single tap (dropdown mode).
  shouldOpenOnLongPress?: boolean;
  // Hint that the trigger should be styled like a button (e.g. center it).
  isButton?: boolean;
  // Optional short-tap action. When provided, the trigger is wrapped in a
  // Pressable so that a quick tap fires this callback while a long-press
  // (or single tap in dropdown mode) still opens the native menu.
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityRole?: AccessibilityRole;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: object;
  buttonStyle?: ViewStyle | ViewStyle[];
}

export enum HandOffActivityType {
  ReceiveOnchain = 'io.bluewallet.bluewallet.receiveonchain',
  Xpub = 'io.bluewallet.bluewallet.xpub',
  ViewInBlockExplorer = 'io.bluewallet.bluewallet.blockexplorer',
}

export interface HandOffComponentProps {
  url?: string;
  title?: string;
  type: HandOffActivityType;
  userInfo?: object;
}
