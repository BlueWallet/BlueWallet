import React, { useState, useRef, forwardRef, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, PixelRatio } from 'react-native';
import { useTheme } from './themes';

const BORDER_RADIUS = 30;
const PADDINGS = 8;
const ICON_MARGIN = 7;

const cStyles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    height: '6.3%',
    minHeight: 44,
  },
  rootAbsolute: {
    position: 'absolute',
    bottom: 30,
  },
  rootInline: {},
  rootPre: {
    position: 'absolute',
    bottom: -1000,
  },
  rootPost: {
    borderRadius: BORDER_RADIUS,
    flexDirection: 'row',
    overflow: 'hidden',
  },
});

interface FContainerProps {
  children: ReactNode | ReactNode[];
  inline?: boolean;
}

export const FContainer = forwardRef<View, FContainerProps>((props, ref) => {
  const [newWidth, setNewWidth] = useState<number | undefined>(undefined);
  const layoutCalculated = useRef(false);

  const onLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
    if (layoutCalculated.current) return;
    const maxWidth = Dimensions.get('window').width - BORDER_RADIUS - 20;
    const { width } = event.nativeEvent.layout;
    const withPaddings = Math.ceil(width + PADDINGS * 2);
    const len = React.Children.toArray(props.children).filter(Boolean).length;
    let newW = withPaddings * len > maxWidth ? Math.floor(maxWidth / len) : withPaddings;
    if (len === 1 && newW < 90) newW = 90;
    setNewWidth(newW);
    layoutCalculated.current = true;
  };

  return (
    <View
      ref={ref}
      onLayout={onLayout}
      style={[cStyles.root, props.inline ? cStyles.rootInline : cStyles.rootAbsolute, newWidth ? cStyles.rootPost : cStyles.rootPre]}
    >
      {newWidth
        ? React.Children.toArray(props.children)
            .filter(Boolean)
            .map((child, index, array) => {
              if (typeof child === 'string') {
                return (
                  <View key={index} style={{ width: newWidth }}>
                    <Text>{child}</Text>
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
    </View>
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
  icon: ReactNode; // Updated the type to ReactNode
  width?: number;
  first?: boolean;
  last?: boolean;
  disabled?: boolean;
}

export const FButton = ({ text, icon, width, first, last, ...props }: FButtonProps) => {
  const { colors } = useTheme();
  const bStylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.buttonBackgroundColor,
    },
    text: {
      color: colors.buttonAlternativeTextColor,
    },
    textDisabled: {
      color: colors.formBorder,
    },
  });
  const style: Record<string, any> = {};

  if (width) {
    const paddingLeft = first ? BORDER_RADIUS / 2 : PADDINGS;
    const paddingRight = last ? BORDER_RADIUS / 2 : PADDINGS;
    style.paddingRight = paddingRight;
    style.paddingLeft = paddingLeft;
    style.width = width + paddingRight + paddingLeft;
  }

  return (
    <TouchableOpacity accessibilityRole="button" style={[bStyles.root, bStylesHook.root, style]} {...props}>
      <View style={bStyles.icon}>{icon}</View>
      <Text numberOfLines={1} style={[bStyles.text, props.disabled ? bStylesHook.textDisabled : bStylesHook.text]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
};
