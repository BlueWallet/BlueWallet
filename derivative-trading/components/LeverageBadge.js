import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text, Appearance } from 'react-native';

export const DEFAULT_CONTAINER_WIDTH = 60;
export const DEFAULT_CONTAINER_HEIGHT = 26;

const colorScheme = Appearance.getColorScheme();

function colorFromLeverage(leverage) {
  const quantile = Math.ceil((leverage / 10000) * 5);

  return {
    1: '#35BBFF',
    2: '#B9B596',
    3: '#FFB25F',
    4: '#FF6235',
    5: '#FF0000',
  }[Math.min(5, Math.max(1, quantile))];
}

const LeverageBadge = ({ leverage, style }) => {
  const badgeLabelTextStyles = {
    ...styles.badgeLabelText,
    color: colorFromLeverage(leverage),
    textShadowColor: colorFromLeverage(leverage),
  };

  return (
    <View style={{ ...styles.badgeContainer, ...style }}>
      <Text style={badgeLabelTextStyles}>{leverage}x</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    width: DEFAULT_CONTAINER_WIDTH,
    height: DEFAULT_CONTAINER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    // backgroundColor: colorScheme === 'dark' ? 'white' : BlueCurrentTheme.colors.offBlack,
    backgroundColor: 'white'
  },

  badgeLabelText: {
    fontWeight: '300',
    fontSize: 12,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    textAlignVertical: 'center',
  },
});

LeverageBadge.propTypes = {
  leverage: PropTypes.number.isRequired,
  style: PropTypes.object,
};

export default LeverageBadge;
