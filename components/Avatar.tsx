import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Icon, { type IconProps } from './Icon';

export interface AvatarProps {
  rounded?: boolean;
  size?: number;
  containerStyle?: StyleProp<ViewStyle>;
  icon?: Pick<IconProps, 'name' | 'type' | 'color' | 'size'>;
  onPress?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({ rounded, size = 40, containerStyle, icon, onPress }) => {
  const dimensionStyle = { width: size, height: size, borderRadius: rounded ? size / 2 : 0 } as ViewStyle;
  const content = (
    <View style={[styles.container, dimensionStyle, containerStyle]}>
      {icon ? <Icon {...icon} size={icon.size ?? Math.round(size * 0.6)} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.pressable}>
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    alignSelf: 'flex-start',
  },
});

export default Avatar;
