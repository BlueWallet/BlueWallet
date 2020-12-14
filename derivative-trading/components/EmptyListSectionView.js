import PropTypes from 'prop-types';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const EmptyListSectionView = ({ message, sectionHeight }) => {
  const customStyles = { height: sectionHeight };

  return (
    <View style={[styles.viewContainer, customStyles]}>
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  viewContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  messageText: {
    fontWeight: '500',
    fontSize: 14,
    color: 'grey',
  },
});

EmptyListSectionView.propTypes = {
  message: PropTypes.string.isRequired,
  sectionHeight: PropTypes.number,
};

EmptyListSectionView.defaultProps = {
  sectionHeight: 80,
};

export default EmptyListSectionView;
