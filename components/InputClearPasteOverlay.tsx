import React, { useCallback } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { AddressInputScanButton } from './AddressInputScanButton';
import loc from '../loc';
import { useTheme } from './themes';

interface InputClearPasteOverlayChildProps {
  style?: StyleProp<TextStyle>;
}

interface InputClearPasteOverlayProps {
  onClear: () => void;
  onPaste: (text: string) => void;
  onScan: (text: string) => void;
  scanTestID?: string;
  children: React.ReactElement<InputClearPasteOverlayChildProps>;
}

interface InputOverlayActionButtonProps {
  title: string;
  onPress: () => void;
  testID?: string;
}

const InputOverlayActionButton: React.FC<InputOverlayActionButtonProps> = ({ title, onPress, testID }) => {
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    button: {
      backgroundColor: colors.scanLabel,
    },
    text: {
      color: colors.inverseForegroundColor,
    },
  });

  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, stylesHook.button, pressed && styles.pressed]}
    >
      <Text style={[styles.actionButtonText, stylesHook.text]}>{title}</Text>
    </Pressable>
  );
};

const InputClearPasteOverlay: React.FC<InputClearPasteOverlayProps> = ({ onClear, onPaste, onScan, scanTestID, children }) => {
  const onPasteTapped = useCallback(async () => {
    const clipboard = await Clipboard.getString();
    onPaste(clipboard);
  }, [onPaste]);

  return (
    <View style={styles.container}>
      {React.cloneElement(children, {
        style: [children.props.style, styles.inputPadding],
      })}
      <View style={styles.overlay} pointerEvents="box-none">
        <InputOverlayActionButton title={loc.send.input_paste} onPress={onPasteTapped} testID="InputPaste" />
        <AddressInputScanButton type="compact" onChangeText={onScan} testID={scanTestID} />
        <InputOverlayActionButton title={loc.send.input_clear} onPress={onClear} testID="InputClear" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputPadding: {
    paddingBottom: 40,
  },
  overlay: {
    position: 'absolute',
    bottom: 8,
    right: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionButton: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    flexShrink: 0,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginHorizontal: 2,
  },
  actionButtonText: {
    fontSize: 13,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});

export default InputClearPasteOverlay;
