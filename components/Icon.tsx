import React from 'react';
import { Pressable, StyleProp, TextStyle, View, ViewStyle } from 'react-native';
import Entypo from '@react-native-vector-icons/entypo';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import Ionicons from '@react-native-vector-icons/ionicons';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import MaterialIcons from '@react-native-vector-icons/material-icons';

export type FontAwesomeIconName = React.ComponentProps<typeof FontAwesome>['name'];
export type FontAwesome6IconName = React.ComponentProps<typeof FontAwesome6>['name'];
export type IonIconName = React.ComponentProps<typeof Ionicons>['name'];
export type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];
export type MaterialDesignIconName = React.ComponentProps<typeof MaterialDesignIcons>['name'];
export type EntypoIconName = React.ComponentProps<typeof Entypo>['name'];

type IconType = 'font-awesome' | 'font-awesome-6' | 'ionicons' | 'material' | 'material-community' | 'entypo';

type IconNameFor<T extends IconType> = T extends 'font-awesome'
  ? FontAwesomeIconName
  : T extends 'font-awesome-6'
    ? FontAwesome6IconName
    : T extends 'ionicons'
      ? IonIconName
      : T extends 'material'
      ? MaterialIconName
      : T extends 'material-community'
        ? MaterialDesignIconName
        : T extends 'entypo'
          ? EntypoIconName
          : never;

export interface IconProps<T extends IconType = IconType> {
  name: IconNameFor<T>;
  type?: T;
  /**
   * @default 24
   */
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  iconStyle?: T extends 'font-awesome-6' ? 'solid' | 'brand' | 'regular' : StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

const resolveIconComponent = (type?: IconType): React.ComponentType<any> => {
  switch (type) {
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
    case 'font-awesome':
    default:
      return FontAwesome;
  }
};

const Icon = <T extends IconType = 'font-awesome'>({
  name,
  type,
  size = 24,
  color,
  style,
  iconStyle,
  containerStyle,
  onPress,
  accessibilityLabel,
  testID,
}: IconProps<T>): React.ReactElement | null => {
  const IconComponent = resolveIconComponent(type);
  const isFa6 = type === 'font-awesome-6';
  const fa6IconStyle = isFa6 ? (typeof iconStyle === 'string' ? iconStyle : 'solid') : undefined;
  const mergedStyle = isFa6 ? style : [style, iconStyle];

  const content = (
    <IconComponent
      name={name}
      size={size}
      color={color}
      style={mergedStyle}
      iconStyle={fa6IconStyle}
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
