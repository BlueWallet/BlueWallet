import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, PixelRatio } from 'react-native';
import { useTheme } from '@react-navigation/native';

const BORDER_RADIUS = 30;
const PADDINGS = 8;
const ICON_MARGIN = 7;

const cStyles = StyleSheet.create({
  root: {
    position: 'absolute',
    alignSelf: 'center',
    height: '6.3%',
    minHeight: 44,
  },
  rootPre: {
    bottom: -1000,
  },
  rootPost: {
    bottom: 30,
    borderRadius: BORDER_RADIUS,
    flexDirection: 'row',
    overflow: 'hidden',
  },
});

export const FContainer = ({ children }) => {
  const [newWidth, setNewWidth] = useState();
  const layoutCalculated = useRef(false);

  const onLayout = event => {
    if (layoutCalculated.current) return;
    const maxWidth = Dimensions.get('window').width - BORDER_RADIUS - 20;
    const { width } = event.nativeEvent.layout;
    const withPaddings = Math.ceil(width + PADDINGS * 2);
    const len = React.Children.toArray(children).filter(Boolean).length;
    let newWidth = withPaddings * len > maxWidth ? Math.floor(maxWidth / len) : withPaddings;
    if (len === 1 && newWidth < 90) newWidth = 90; // to add Paddings for lonely small button, like Scan on main screen
    setNewWidth(newWidth);
    layoutCalculated.current = true;
  };

  return (
    <View onLayout={onLayout} style={[cStyles.root, newWidth ? cStyles.rootPost : cStyles.rootPre]}>
      {newWidth
        ? React.Children.toArray(children)
            .filter(Boolean)
            .map((c, index, array) =>
              React.cloneElement(c, {
                width: newWidth,
                key: index,
                first: index === 0,
                last: index === array.length - 1,
              }),
            )
        : children}
    </View>
  );
};

FContainer.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.element), PropTypes.element]),
};

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

export const FButton = ({ text, icon, width, first, last, ...props }) => {
  const { colors } = useTheme();
  const bStylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.buttonBackgroundColor,
    },
    text: {
      color: colors.buttonAlternativeTextColor,
    },
  });
  const style = {};

  if (width) {
    const paddingLeft = first ? BORDER_RADIUS / 2 : PADDINGS;
    const paddingRight = last ? BORDER_RADIUS / 2 : PADDINGS;
    style.paddingRight = paddingRight;
    style.paddingLeft = paddingLeft;
    style.width = width + paddingRight + paddingLeft;
  }

  return (
    <TouchableOpacity style={[bStyles.root, bStylesHook.root, style]} {...props}>
      <View style={bStyles.icon}>{icon}</View>
      <Text numberOfLines={1} style={[bStyles.text, bStylesHook.text]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
};

FButton.propTypes = {
  text: PropTypes.string,
  icon: PropTypes.element,
  width: PropTypes.number,
  first: PropTypes.bool,
  last: PropTypes.bool,
};
