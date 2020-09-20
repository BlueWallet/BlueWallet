import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, PixelRatio } from 'react-native';

import { BlueCurrentTheme } from './themes';

const BORDER_RADIUS = 30;
const ICON_MARGIN = 5;

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
  const flag = useRef(false);

  const onLayout = event => {
    if (flag.current) return;
    const { width } = event.nativeEvent.layout;
    const maxWidth = Dimensions.get('window').width - BORDER_RADIUS * 2 - 10;
    const len = React.Children.count(children);
    const newWidth = width * len > maxWidth ? Math.floor(maxWidth / len) : Math.ceil(width + ICON_MARGIN);
    setNewWidth(newWidth);
    flag.current = true;
  };

  return (
    <View onLayout={onLayout} style={[cStyles.root, newWidth ? cStyles.rootPost : cStyles.rootPre]}>
      {newWidth
        ? React.Children.map(children, (c, index) =>
            React.cloneElement(c, {
              width: newWidth,
              key: index,
              first: index === 0,
              last: index === React.Children.count(children) - 1,
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
    backgroundColor: BlueCurrentTheme.colors.buttonBackgroundColor,
  },
  icon: {
    alignItems: 'center',
  },
  text: {
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontSize: buttonFontSize,
    fontWeight: '600',
    marginLeft: ICON_MARGIN,
    backgroundColor: 'transparent',
  },
});

export const FButton = ({ text, icon, width, first, last, ...props }) => {
  const style = {};
  if (width) {
    let totalWidth = width;
    if (first) {
      style.paddingLeft = BORDER_RADIUS;
      totalWidth += BORDER_RADIUS;
    }
    if (last) {
      style.paddingRight = BORDER_RADIUS;
      totalWidth += BORDER_RADIUS;
    }
    style.width = totalWidth;
  }

  return (
    <TouchableOpacity style={[bStyles.root, style]} {...props}>
      <View style={bStyles.icon}>{icon}</View>
      <Text style={bStyles.text}>{text}</Text>
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
