import React, { forwardRef, ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, PixelRatio, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from './themes';

const BORDER_RADIUS = 8;
const PADDINGS = 24;
const ICON_MARGIN = 7;

const cStyles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    height: '6.9%',
    minHeight: 44,
  },
  rootAbsolute: {
    position: 'absolute',
  },
  rootInline: {},
  rootPre: {
    position: 'absolute',
    bottom: -1000,
  },
  rootPost: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
});

interface FContainerProps {
  children: ReactNode | ReactNode[];
  inline?: boolean;
}

export const FContainer = forwardRef<View, FContainerProps>((props, ref) => {
  const insets = useSafeAreaInsets();
  const [newWidth, setNewWidth] = useState<number | undefined>(undefined);
  const layoutCalculated = useRef(false);
  const bottomInsets = { bottom: insets.bottom ? insets.bottom + 10 : 30 };
  const { height, width } = useWindowDimensions();
  const slideAnimation = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    slideAnimation.setValue(height);
    Animated.spring(slideAnimation, {
      toValue: 0,
      useNativeDriver: true,
      speed: 100,
      bounciness: 3,
    }).start();
  }, [height, slideAnimation]);

  const onLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
    if (layoutCalculated.current) return;
    const maxWidth = width - BORDER_RADIUS - 140;
    const layoutWidth = event.nativeEvent.layout.width;
    const withPaddings = Math.ceil(layoutWidth + PADDINGS * 2);
    const len = React.Children.toArray(props.children).filter(Boolean).length;
    let newW = withPaddings * len > maxWidth ? Math.floor(maxWidth / len) : withPaddings;
    if (len === 1 && newW < 90) newW = 90;
    setNewWidth(newW);
    layoutCalculated.current = true;
  };

  return (
    <Animated.View
      ref={ref}
      onLayout={onLayout}
      style={[
        cStyles.root,
        props.inline ? cStyles.rootInline : cStyles.rootAbsolute,
        bottomInsets,
        newWidth ? cStyles.rootPost : cStyles.rootPre,
        { transform: [{ translateY: slideAnimation }] },
      ]}
    >
      {newWidth
        ? React.Children.toArray(props.children)
            .filter(Boolean)
            .map((child, index, array) => {
              if (typeof child === 'string') {
                return (
                  <View key={index} style={{ width: newWidth }}>
                    <Text adjustsFontSizeToFit numberOfLines={1}>
                      {child}
                    </Text>
                  </View>
                );
              }
              return React.cloneElement(child as React.ReactElement<any>, {
                width: newWidth,
                key: index,
                first: index === 0,
                last: index === array.length - 1,
              });
            })
        : props.children}
    </Animated.View>
  );
});

const buttonFontSize =
  PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26) > 22
    ? 22
    : PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26);

const bStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: {
    alignItems: 'center',
  },
  text: {
    fontSize: buttonFontSize,
    fontWeight: '600',
    marginLeft: ICON_MARGIN,
    backgroundColor: 'transparent',
  },
});

interface FButtonProps {
  text: string;
  icon: ReactNode;
  width?: number;
  first?: boolean;
  last?: boolean;
  disabled?: boolean;
  testID?: string;
  onPress: () => void;
  onLongPress?: () => void;
}

export const FButton = ({ text, icon, width, first, last, testID, ...props }: FButtonProps) => {
  const { colors } = useTheme();
  const bStylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.buttonBackgroundColor,
      borderRadius: BORDER_RADIUS,
    },
    text: {
      color: colors.buttonAlternativeTextColor,
    },
    textDisabled: {
      color: colors.formBorder,
    },
    marginRight: {
      marginRight: 10,
    },
  });
  const style: Record<string, any> = {};
  const additionalStyles = !last ? bStylesHook.marginRight : {};

  if (width) {
    style.paddingHorizontal = PADDINGS;
    style.width = width + PADDINGS * 2;
  }

  return (
    <TouchableOpacity
      accessibilityLabel={text}
      accessibilityRole="button"
      testID={testID}
      style={[bStyles.root, bStylesHook.root, style, additionalStyles]}
      {...props}
    >
      <View style={bStyles.icon}>{icon}</View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[bStyles.text, props.disabled ? bStylesHook.textDisabled : bStylesHook.text]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
};
