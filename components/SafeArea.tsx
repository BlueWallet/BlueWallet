import React, { useMemo } from 'react';
import { StyleSheet, ViewProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardDockActive } from './keyboardAccessory';
import { useTheme } from './themes';

interface SafeAreaProps extends ViewProps {
  floatingButtonHeight?: number;
  orientation?: 'portrait' | 'landscape';
  ignoreTopInset?: boolean;
}

const SafeArea = (props: SafeAreaProps) => {
  const { style, floatingButtonHeight, ignoreTopInset = false, ...otherProps } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // The dock already lifts content above the IME, which covers the home indicator.
  const bottomInset = useKeyboardDockActive() ? 0 : insets.bottom;

  const padding = useMemo(
    () =>
      props.orientation === 'portrait'
        ? {
            paddingTop: ignoreTopInset ? 0 : insets.top,
            paddingBottom: bottomInset,
          }
        : {
            paddingTop: ignoreTopInset ? 0 : insets.top,
            paddingBottom: bottomInset + (floatingButtonHeight ?? 0),
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
    [insets, props.orientation, floatingButtonHeight, ignoreTopInset, bottomInset],
  );

  const componentStyle = useMemo(() => {
    return StyleSheet.compose(
      {
        flex: 1,
        backgroundColor: colors.background,
        ...padding,
      },
      style,
    );
  }, [colors.background, padding, style]);

  return <View style={componentStyle} {...otherProps} />;
};

export default SafeArea;
