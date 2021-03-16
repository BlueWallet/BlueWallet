import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Modal from 'react-native-modal';

const styles = StyleSheet.create({
  root: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});

const BottomModal = ({ onBackButtonPress, onBackdropPress, onClose, windowHeight, windowWidth, ...props }) => {
  const valueWindowHeight = useWindowDimensions().height;
  const valueWindowWidth = useWindowDimensions().width;
  const handleBackButtonPress = onBackButtonPress ?? onClose;
  const handleBackdropPress = onBackdropPress ?? onClose;

  return (
    <Modal
      style={styles.root}
      deviceHeight={windowHeight ?? valueWindowHeight}
      deviceWidth={windowWidth ?? valueWindowWidth}
      onBackButtonPress={handleBackButtonPress}
      onBackdropPress={handleBackdropPress}
      {...props}
      accessibilityViewIsModal
      useNativeDriver
      useNativeDriverForBackdrop
    />
  );
};

BottomModal.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.element), PropTypes.element]),
  onBackButtonPress: PropTypes.func,
  onBackdropPress: PropTypes.func,
  onClose: PropTypes.func,
  windowHeight: PropTypes.number,
  windowWidth: PropTypes.number,
};

export default BottomModal;
