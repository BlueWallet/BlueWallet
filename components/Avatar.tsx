import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Icon from './Icon';

interface AvatarIconProps {
  name: string;
  type?: string;
  size?: number;
  color?: string;
}

export interface AvatarProps {
  rounded?: boolean;
  size?: number;
  containerStyle?: StyleProp<ViewStyle>;
  icon?: AvatarIconProps;
  onPress?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({ rounded, size = 40, containerStyle, icon, onPress }) => {
  const dimensionStyle = { width: size, height: size, borderRadius: rounded ? size / 2 : 0 } as ViewStyle;
  const content = (
    <View style={[styles.container, dimensionStyle, containerStyle]}>
      {icon ? <Icon name={icon.name} type={icon.type} size={icon.size ?? Math.round(size * 0.6)} color={icon.color} /> : null}
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
