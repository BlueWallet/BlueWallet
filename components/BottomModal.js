import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Platform, useWindowDimensions, View } from 'react-native';
import Modal from 'react-native-modal';
import { BlueButton, BlueSpacing10 } from '../BlueComponents';
import loc from '../loc';
import { useTheme } from './themes';

const styles = StyleSheet.create({
  root: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  hasDoneButton: {
    padding: 16,
    paddingBottom: 24,
  },
});

const BottomModal = ({
  onBackButtonPress = undefined,
  onBackdropPress = undefined,
  onClose,
  windowHeight = undefined,
  windowWidth = undefined,
  doneButton = undefined,
  avoidKeyboard = false,
  allowBackdropPress = true,
  ...props
}) => {
  const valueWindowHeight = useWindowDimensions().height;
  const valueWindowWidth = useWindowDimensions().width;
  const handleBackButtonPress = onBackButtonPress ?? onClose;
  const handleBackdropPress = allowBackdropPress ? onBackdropPress ?? onClose : undefined;
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    hasDoneButton: {
      backgroundColor: colors.elevated,
    },
  });
  return (
    <Modal
      style={styles.root}
      deviceHeight={windowHeight ?? valueWindowHeight}
      deviceWidth={windowWidth ?? valueWindowWidth}
      onBackButtonPress={handleBackButtonPress}
      onBackdropPress={handleBackdropPress}
      {...props}
      accessibilityViewIsModal
      avoidKeyboard={avoidKeyboard}
      useNativeDriverForBackdrop={Platform.OS === 'android'}
    >
      {props.children}
      {doneButton && (
        <View style={[styles.hasDoneButton, stylesHook.hasDoneButton]}>
          <BlueButton title={loc.send.input_done} onPress={onClose} />
          <BlueSpacing10 />
        </View>
      )}
    </Modal>
  );
};

BottomModal.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.element), PropTypes.element]),
  onBackButtonPress: PropTypes.func,
  onBackdropPress: PropTypes.func,
  onClose: PropTypes.func,
  doneButton: PropTypes.bool,
  windowHeight: PropTypes.number,
  windowWidth: PropTypes.number,
  avoidKeyboard: PropTypes.bool,
  allowBackdropPress: PropTypes.bool,
};

export default BottomModal;
