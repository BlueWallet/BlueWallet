import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Badge } from 'react-native-elements';
import loc from '../../loc';

const styles = StyleSheet.create({
  badge: {
    borderWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
});

const AddressTypeBadge = ({ isInternal }) => {
  const { colors } = useTheme();

  const oStyles = {
    change: {
      badge: { backgroundColor: colors.changeBackground },
      text: { color: colors.changeText },
    },
    receive: {
      badge: { backgroundColor: colors.receiveBackground },
      text: { color: colors.receiveText },
    },
  };

  const getBadgeText = () => {
    return isInternal ? loc.addresses.type_change : loc.addresses.type_receive;
  };

  const getStyle = () => {
    return isInternal ? oStyles.change : oStyles.receive;
  };

  const oStyle = getStyle();

  return <Badge value={getBadgeText()} badgeStyle={[styles.badge, oStyle.badge]} textStyle={oStyle.text} />;
};

AddressTypeBadge.propTypes = {
  isInternal: PropTypes.bool,
};

export { AddressTypeBadge };
