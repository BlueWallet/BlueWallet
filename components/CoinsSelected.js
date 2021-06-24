import React from 'react';
import PropTypes from 'prop-types';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from 'react-native-elements';

import loc from '../loc';

const styles = StyleSheet.create({
  root: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#3477F6',
    flexDirection: 'row',
  },
  labelContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 16,
  },
  labelText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ball: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
});

const CoinsSelected = ({ number, onContainerPress, onClose }) => (
  <TouchableOpacity accessibilityRole="button" style={styles.root} onPress={onContainerPress}>
    <View style={styles.labelContainer}>
      <Text style={styles.labelText}>{loc.formatString(loc.cc.coins_selected, { number })}</Text>
    </View>
    <TouchableOpacity accessibilityRole="button" style={styles.buttonContainer} onPress={onClose}>
      <Avatar rounded containerStyle={[styles.ball]} icon={{ name: 'close', size: 22, type: 'ionicons', color: 'white' }} />
    </TouchableOpacity>
  </TouchableOpacity>
);

CoinsSelected.propTypes = {
  number: PropTypes.number.isRequired,
  onContainerPress: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CoinsSelected;
