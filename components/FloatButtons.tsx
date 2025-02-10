import React, { forwardRef, ReactNode, useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Dimensions, PixelRatio, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './themes';

const BORDER_RADIUS = 8;
const PADDINGS = 24;
const ICON_MARGIN = 7;

const buttonFontSize = (() => {
  const baseSize = PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26);
  return Math.min(22, baseSize);
})();

const containerStyles = StyleSheet.create({
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
  rootRound: {
    borderRadius: 9999,
  },
});

const buttonStyles = StyleSheet.create({
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

  const computeNewWidth = useCallback(
    (layoutWidth: number, totalChildren: number) => {
      const maxWidth = width - BORDER_RADIUS - 140;
      const paddedWidth = Math.ceil(layoutWidth + PADDINGS * 2);
      let calculatedWidth = paddedWidth * totalChildren > maxWidth ? Math.floor(maxWidth / totalChildren) : paddedWidth;
      if (totalChildren === 1 && calculatedWidth < 90) calculatedWidth = 90;
      return calculatedWidth;
    },
    [width],
  );

  const onLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
    if (layoutCalculated.current) return;
    const { width: layoutWidth } = event.nativeEvent.layout;
    const totalChildren = React.Children.toArray(props.children).filter(Boolean).length;
    setNewWidth(computeNewWidth(layoutWidth, totalChildren));
    layoutCalculated.current = true;
  };

  const renderChild = (child: ReactNode, index: number, array: ReactNode[]): ReactNode => {
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
      singleChild: array.length === 1,
    });
  };

  const totalChildren = React.Children.toArray(props.children).filter(Boolean).length;
  return (
    <Animated.View
      ref={ref}
      onLayout={onLayout}
      style={[
        containerStyles.root,
        props.inline ? containerStyles.rootInline : containerStyles.rootAbsolute,
        bottomInsets,
        newWidth ? containerStyles.rootPost : containerStyles.rootPre,
        totalChildren === 1 ? containerStyles.rootRound : null,
        { transform: [{ translateY: slideAnimation }] },
      ]}
    >
      {newWidth ? React.Children.toArray(props.children).filter(Boolean).map(renderChild) : props.children}
    </Animated.View>
  );
});

interface FButtonProps {
  text: string;
  icon: ReactNode;
  width?: number;
  first?: boolean;
  last?: boolean;
  singleChild?: boolean;
  disabled?: boolean;
  testID?: string;
  onPress: () => void;
  onLongPress?: () => void;
}

export const FButton = ({ text, icon, width, first, last, singleChild, testID, ...props }: FButtonProps) => {
  const { colors } = useTheme();
  const customButtonStyles = StyleSheet.create({
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
    rootRound: {
      borderRadius: 9999,
    },
  });
  const style: Record<string, any> = {};
  const additionalStyles = !last ? customButtonStyles.marginRight : {};

  if (width) {
    style.paddingHorizontal = PADDINGS;
    style.width = width + PADDINGS * 2;
  }

  return (
    <TouchableOpacity
      accessibilityLabel={text}
      accessibilityRole="button"
      testID={testID}
      style={[buttonStyles.root, customButtonStyles.root, style, additionalStyles, singleChild ? customButtonStyles.rootRound : null]}
      {...props}
    >
      <View style={buttonStyles.icon}>{icon}</View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[buttonStyles.text, props.disabled ? customButtonStyles.textDisabled : customButtonStyles.text]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
};
