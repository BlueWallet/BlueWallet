import React from 'react';
import { Pressable, StyleProp, TextStyle, View, ViewStyle } from 'react-native';
import Entypo from '@react-native-vector-icons/entypo';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import Ionicons from '@react-native-vector-icons/ionicons';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import Octicons from '@react-native-vector-icons/octicons';

type IconComponentType = React.ComponentType<any> | undefined;

type IconType =
  | 'font-awesome'
  | 'fontawesome'
  | 'font-awesome-5'
  | 'font-awesome5'
  | 'fontawesome5'
  | 'font-awesome-6'
  | 'font-awesome6'
  | 'fontawesome6'
  | 'ionicons'
  | 'material'
  | 'material-icons'
  | 'material-community'
  | 'material-design-icons'
  | 'entypo'
  | 'octicon'
  | 'octaicon'
  | 'octicons';

export interface IconProps {
  name: string;
  type?: IconType | string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  iconStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

const resolveIconComponent = (type?: IconType | string): IconComponentType => {
  switch ((type ?? '').toLowerCase()) {
    case 'font-awesome-5':
    case 'font-awesome5':
    case 'fontawesome5':
      return FontAwesome5;
    case 'font-awesome-6':
    case 'font-awesome6':
    case 'fontawesome6':
      return FontAwesome6;
    case 'ionicons':
      return Ionicons;
    case 'material':
    case 'material-icons':
      return MaterialIcons;
    case 'material-community':
    case 'material-design-icons':
      return MaterialDesignIcons;
    case 'entypo':
      return Entypo;
    case 'octicon':
    case 'octaicon':
    case 'octicons':
      return Octicons;
    case 'font-awesome':
    case 'fontawesome':
    default:
      return FontAwesome;
  }
};

const Icon: React.FC<IconProps> = ({ name, type, size, color, style, iconStyle, containerStyle, onPress, accessibilityLabel, testID }) => {
  const IconComponent = resolveIconComponent(type);
  const mergedStyle = [style, iconStyle];
  if (!IconComponent) {
    return null;
  }

  const content = (
    <IconComponent
      name={name as never}
      size={size}
      color={color}
      style={mergedStyle}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="imagebutton" onPress={onPress} style={containerStyle}>
        {content}
      </Pressable>
    );
  }

  if (containerStyle) {
    return <View style={containerStyle}>{content}</View>;
  }

  return content;
};

export default Icon;
