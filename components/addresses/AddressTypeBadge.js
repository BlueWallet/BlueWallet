import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@react-navigation/native';
import { StyleSheet, View, Text } from 'react-native';
import loc from '../../loc';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
  },
});

const AddressTypeBadge = ({ isInternal }) => {
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    changeBadge: { backgroundColor: colors.changeBackground },
    receiveBadge: { backgroundColor: colors.receiveBackground },
    changeText: { color: colors.changeText },
    receiveText: { color: colors.receiveText },
  });

  const badgeLabel = isInternal ? loc.addresses.type_change : loc.addresses.type_receive;

  const badgeStyle = isInternal ? stylesHook.changeBadge : stylesHook.receiveBadge;

  const textStyle = isInternal ? stylesHook.changeText : stylesHook.receiveText;

  return (
    <View style={[styles.container, badgeStyle]}>
      <Text style={[styles.badgeText, textStyle]}>{badgeLabel}</Text>
    </View>
  );
};

AddressTypeBadge.propTypes = {
  isInternal: PropTypes.bool,
};

export { AddressTypeBadge };
