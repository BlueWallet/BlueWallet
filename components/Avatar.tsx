import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Icon } from './Icon';

interface AvatarProps {
  size?: number;
  rounded?: boolean;
  icon?: {
    name: string;
    type?: string;
    color?: string;
    size?: number;
  };
  containerStyle?: StyleProp<ViewStyle>;
  overlayContainerStyle?: StyleProp<ViewStyle>;
}

export const Avatar: React.FC<AvatarProps> = ({ size = 40, rounded = false, icon, containerStyle, overlayContainerStyle }) => {
  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: rounded ? size / 2 : 0,
      backgroundColor: '#BDBDBD',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={overlayContainerStyle}>
        {icon && (
          <Icon
            name={icon.name}
            type={icon.type as any}
            color={icon.color || '#FFF'}
            size={icon.size || size * 0.6}
          />
        )}
      </View>
    </View>
  );
};
