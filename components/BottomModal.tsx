import React from 'react';
import { StyleSheet, Platform, useWindowDimensions, View } from 'react-native';
import Modal from 'react-native-modal';
import { BlueSpacing10 } from '../BlueComponents';
import loc from '../loc';
import { useTheme } from './themes';
import Button from './Button';

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

interface BottomModalProps {
  children?: React.ReactNode;
  onBackButtonPress?: () => void;
  onBackdropPress?: () => void;
  onClose: () => void;
  windowHeight?: number;
  windowWidth?: number;
  doneButton?: boolean;
  avoidKeyboard?: boolean;
  allowBackdropPress?: boolean;
  isVisible: boolean;
}

const BottomModal: React.FC<BottomModalProps> = ({
  onBackButtonPress,
  onBackdropPress,
  onClose,
  windowHeight,
  windowWidth,
  doneButton,
  isVisible,
  avoidKeyboard = false,
  allowBackdropPress = true,
  ...props
}) => {
  const { height: valueWindowHeight, width: valueWindowWidth } = useWindowDimensions();
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
      isVisible={isVisible}
      {...props}
      accessibilityViewIsModal
      avoidKeyboard={avoidKeyboard}
      useNativeDriverForBackdrop={Platform.OS === 'android'}
    >
      {props.children}
      {doneButton && (
        <View style={[styles.hasDoneButton, stylesHook.hasDoneButton]}>
          <Button title={loc.send.input_done} onPress={onClose} testID="ModalDoneButton" />
          <BlueSpacing10 />
        </View>
      )}
    </Modal>
  );
};

export default BottomModal;
