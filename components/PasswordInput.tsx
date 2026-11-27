/**
 * The unlock screen's password field, in the home's style: a rounded field on
 * the card with a lock, a show/hide toggle, and a border that tells focus,
 * a wrong password (with a shake) and success (with a check).
 */
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, TextInput } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';
import Icon from './Icon';
import { useSettingsPalette } from './settings/SettingsUI';

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
  /** While the password is being checked: no edits, no second submit. */
  disabled?: boolean;
  /** The last password was wrong: red border until the user types again. */
  error?: boolean;
  onChangeText?: (text: string) => void;
}

export const PasswordInput = forwardRef<PasswordInputHandle, PasswordInputProps>(
  ({ onSubmit, placeholder = loc._.enter_password, disabled = false, error = false, onChangeText }, ref) => {
    const [password, setPassword] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [focused, setFocused] = useState(false);
    const [visible, setVisible] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const shakeAnimation = useRef(new Animated.Value(0)).current;
    const checkmarkScale = useRef(new Animated.Value(0)).current;
    const p = useSettingsPalette();

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => setPassword(''),
      getValue: () => password,
      showError: () => {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        setIsSuccess(false);
        Animated.sequence(
          [10, -10, 8, -6, 0].map(toValue =>
            Animated.timing(shakeAnimation, { toValue, duration: 50, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ),
        ).start(() => setPassword(''));
      },
      showSuccess: () => {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        setIsSuccess(true);
        setVisible(false);
        inputRef.current?.blur();
        checkmarkScale.setValue(0);
        Animated.spring(checkmarkScale, { toValue: 1, tension: 100, friction: 5, useNativeDriver: true }).start();
      },
      reset: () => {
        setPassword('');
        setIsSuccess(false);
        shakeAnimation.setValue(0);
        checkmarkScale.setValue(0);
      },
    }));

    const handleSubmit = () => {
      if (password.trim() && !isSuccess && !disabled) onSubmit(password);
    };

    const borderColor = isSuccess ? p.ok.dot : error ? p.fail.dot : focused ? p.accent : 'transparent';

    return (
      <Animated.View style={[styles.field, { backgroundColor: p.ground, borderColor, transform: [{ translateX: shakeAnimation }] }]}>
        <Icon name="lock" type="material" size={20} color={error ? p.fail.dot : p.mutedOnCard} />
        <TextInput
          ref={inputRef}
          testID="PasswordInput"
          style={[styles.input, { color: p.ink }]}
          value={password}
          onChangeText={text => {
            setPassword(text);
            onChangeText?.(text);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={p.mutedOnCard}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
          editable={!isSuccess && !disabled}
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
          enablesReturnKeyAutomatically
          accessibilityLabel={placeholder}
        />
        {isSuccess ? (
          <Animated.View style={[styles.trailing, { transform: [{ scale: checkmarkScale }] }]} pointerEvents="none">
            <Icon name="check-circle" type="material" size={24} color={p.ok.dot} />
          </Animated.View>
        ) : (
          <Pressable
            onPress={() => setVisible(value => !value)}
            hitSlop={10}
            style={styles.trailing}
            accessibilityRole="button"
            accessibilityLabel={visible ? loc._.hide_password : loc._.show_password}
            testID="PasswordVisibilityToggle"
          >
            <Icon name={visible ? 'visibility-off' : 'visibility'} type="material" size={22} color={p.mutedOnCard} />
          </Pressable>
        )}
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 16,
    width: '100%',
  },
  input: { flex: 1, fontSize: 17, paddingVertical: 12 },
  trailing: { width: 28, alignItems: 'center', justifyContent: 'center' },
});

PasswordInput.displayName = 'PasswordInput';
