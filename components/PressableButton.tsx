import React from 'react';
import { StyleProp, ViewStyle, TextStyle, Pressable, StyleSheet, Text } from 'react-native';

interface PressableButtonProps {
  onPress: () => void;
  text: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

const PressableButton: React.FC<PressableButtonProps> = ({ onPress, text, style, textStyle, disabled }) => {
  return (
    <Pressable 
      onPress={onPress} 
      style={({ pressed }) => [styles.button, style, pressed && styles.pressed]}
      disabled={disabled}
      android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
    >
      <Text style={[styles.buttonText, textStyle, disabled && styles.disabledText]}>
        {text}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.75,
  },
  disabledText: {
    color: '#999',
  },
});

export default PressableButton;
