import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { palette, typography } from 'app/styles';

import { Image, FastImageSource } from './Image';
import { StyledSwitch } from './StyledSwitch';

interface Props {
  title: string;
  source?: FastImageSource;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitchValueChange?: (value: boolean) => void;
  iconWidth?: number;
  iconHeight?: number;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

export const ListItem = ({
  title,
  source,
  onSwitchValueChange,
  switchValue,
  iconWidth,
  iconHeight,
  onPress,
  disabled,
  containerStyle,
}: Props) => {
  const [switchValueState, setSwitchValueState] = useState(false);

  const isSwitch = () => onSwitchValueChange && typeof switchValue === 'boolean';

  const onSwitchPress = () => {
    setSwitchValueState(!switchValueState);
    onSwitchValueChange && onSwitchValueChange(!switchValueState);
  };

  useEffect(() => {
    if (isSwitch()) {
      setSwitchValueState(switchValue!);
    }
  }, []);

  const handleOnItemPress = () => {
    !!onPress && onPress();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={styles.touchableOpacityContainer}
        onPress={handleOnItemPress}
        activeOpacity={disabled ? 1 : 0.2}
      >
        {!!source && (
          <View style={styles.imageContainer}>
            <Image
              source={source}
              style={[
                styles.image,
                typeof iconWidth === 'number' && { width: iconWidth },
                typeof iconHeight === 'number' && { height: iconHeight },
              ]}
            />
          </View>
        )}
        <View style={[styles.textContainer, { paddingRight: !isSwitch() ? 50 : 0 }]}>
          <Text style={[styles.title, disabled && styles.disabled]}>{title}</Text>
        </View>
      </TouchableOpacity>
      {isSwitch() && (
        <View>
          <StyledSwitch onValueChange={onSwitchPress} value={switchValueState} disabled={disabled || false} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  touchableOpacityContainer: {
    flexDirection: 'row',
  },
  textContainer: {
    paddingLeft: 20,
  },
  title: {
    ...typography.caption,
    color: palette.textBlack,
  },
  image: {
    width: 19,
    height: 19,
  },
  imageContainer: {
    width: 21,
    height: 21,
  },
  disabled: {
    color: palette.textGrey,
  },
});
