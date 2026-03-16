import { AccessibilityRole, ViewStyle, ColorValue } from 'react-native';

export interface Action {
  id: string | number;
  text: string;
  icon?: {
    iconValue: string;
  };
  menuTitle?: string;
  subtitle?: string;
  menuState?: 'mixed' | boolean | undefined;
  displayInline?: boolean; // Indicates if subactions should be displayed inline or nested (iOS only)
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
  dismissMenu?: () => void;
  onPressMenuItem: (id: string) => void;
  title?: string;
  isMenuPrimaryAction?: boolean;
  isButton?: boolean;
  renderPreview?: () => React.ReactNode;
  onPress?: () => void;
  previewValue?: string;
  accessibilityRole?: AccessibilityRole;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: object;
  buttonStyle?: ViewStyle | ViewStyle[];
  onMenuWillShow?: () => void;
  onMenuWillHide?: () => void;
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
