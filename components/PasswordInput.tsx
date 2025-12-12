import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from './themes';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';

export interface PasswordInputHandle {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  showError: () => void;
  showSuccess: () => void;
  reset: () => void;
  getValue: () => string;
}

interface PasswordInputProps {
  onSubmit: (password: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onChangeText?: (text: string) => void;
}

export const PasswordInput = forwardRef<PasswordInputHandle, PasswordInputProps>(
  ({ onSubmit, placeholder = loc._.enter_password, disabled = false, onChangeText }, ref) => {
    const [password, setPassword] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const shakeAnimation = useRef(new Animated.Value(0)).current;
    const checkmarkScale = useRef(new Animated.Value(0)).current;
    const checkmarkOpacity = useRef(new Animated.Value(0)).current;
    const { colors } = useTheme();

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      blur: () => inputRef.current?.blur(),
      clear: () => setPassword(''),
      getValue: () => password,
      showError: () => {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        setIsSuccess(false);

        // macOS-style shake animation - quick and snappy
        Animated.sequence([
          Animated.timing(shakeAnimation, {
            toValue: 20,
            duration: 80,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: -20,
            duration: 80,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: 20,
            duration: 80,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: 0,
            duration: 80,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Clear password after shake
          setPassword('');
        });
      },
      showSuccess: () => {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        setIsSuccess(true);

        // Dismiss keyboard on success
        inputRef.current?.blur();

        // Quick pop-in animation for checkmark
        checkmarkScale.setValue(0);
        checkmarkOpacity.setValue(0);

        Animated.parallel([
          Animated.spring(checkmarkScale, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(checkmarkOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      },
      reset: () => {
        setPassword('');
        setIsSuccess(false);
        shakeAnimation.setValue(0);
        checkmarkScale.setValue(0);
        checkmarkOpacity.setValue(0);
      },
    }));

    const handleSubmit = () => {
      if (password.trim() && !isSuccess) {
        onSubmit(password);
      }
    };

    const stylesHook = StyleSheet.create({
      container: {
        borderColor: isSuccess ? colors.successColor : colors.formBorder,
        backgroundColor: colors.inputBackgroundColor,
      },
      input: {
        color: colors.foregroundColor,
      },
      checkmark: {
        color: colors.successColor,
      },
    });

    return (
      <Animated.View
        style={[
          styles.container,
          stylesHook.container,
          {
            transform: [{ translateX: shakeAnimation }],
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          testID="PasswordInput"
          style={[styles.input, stylesHook.input]}
          value={password}
          onChangeText={text => {
            setPassword(text);
            onChangeText?.(text);
          }}
          clearButtonMode={isSuccess ? 'never' : 'while-editing'}
          placeholder={placeholder}
          placeholderTextColor={colors.alternativeTextColor}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSuccess}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          enablesReturnKeyAutomatically={true}
        />

        {isSuccess && (
          <Animated.View
            style={[
              styles.checkmarkContainer,
              {
                opacity: checkmarkOpacity,
                transform: [{ scale: checkmarkScale }],
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.checkmarkCircle}>
              <View style={[styles.checkmark, { borderColor: colors.successColor }]} />
            </View>
          </Animated.View>
        )}
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: 16,
    minHeight: 54,
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  checkmarkContainer: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 8,
    height: 14,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    transform: [{ rotate: '45deg' }, { translateY: -2 }],
  },
});

PasswordInput.displayName = 'PasswordInput';
