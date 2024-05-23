import { ViewStyle } from 'react-native';

export interface Action {
  id: string | number;
  text: string;
  icon: {
    iconType: string;
    iconValue: string;
  };
  menuTitle?: string;
  menuStateOn?: boolean;
  disabled?: boolean;
}

export interface ToolTipMenuProps {
  actions: Action[] | Action[][];
  children: React.ReactNode;
  enableAndroidRipple?: boolean;
  onPressMenuItem: (id: string) => void;
  title?: string;
  isMenuPrimaryAction?: boolean;
  isButton?: boolean;
  renderPreview?: () => React.ReactNode;
  onPress?: () => void;
  previewValue?: string;
  disabled?: boolean;
  buttonStyle?: ViewStyle;
  onMenuWillShow?: () => void;
  onMenuWillHide?: () => void;
}
