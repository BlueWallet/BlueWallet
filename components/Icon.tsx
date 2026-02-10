import React from 'react';
import { Pressable, StyleProp, TextStyle, View, ViewStyle } from 'react-native';
import Entypo from '@react-native-vector-icons/entypo';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import Ionicons from '@react-native-vector-icons/ionicons';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import Octicons from '@react-native-vector-icons/octicons';

type IconComponentType = React.ComponentType<any> | undefined;

type IconType = 'font-awesome' | 'font-awesome-6' | 'ionicons' | 'material' | 'material-community' | 'entypo' | 'octicons';

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
    case 'font-awesome-6':
      return FontAwesome6;
    case 'ionicons':
      return Ionicons;
    case 'material':
      return MaterialIcons;
    case 'material-community':
      return MaterialDesignIcons;
    case 'entypo':
      return Entypo;
    case 'octicons':
      return Octicons;
    case 'font-awesome':
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
