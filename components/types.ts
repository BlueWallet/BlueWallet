import { AccessibilityRole, ViewStyle } from 'react-native';

export interface Action {
  id: string | number;
  text: string;
  icon?: {
    iconValue: string;
  };
  menuTitle?: string;
  menuState?: 'mixed' | boolean | undefined;
  disabled?: boolean;
  displayInline?: boolean;
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
