import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import loc from '../loc';
import { PromptRequest, setPromptListener } from '../helpers/promptBridge';
import { useTheme } from './themes';

type DynamicStyles = {
  card: ViewStyle;
  title: TextStyle;
  description: TextStyle;
  input: TextStyle;
  cancelText: TextStyle;
  ok: ViewStyle;
  okText: TextStyle;
  okDestructive: ViewStyle;
  okDestructiveText: TextStyle;
};

const PromptInputModal = () => {
  const { colors } = useTheme();
  const [current, setCurrent] = useState<PromptRequest | null>(null);
  const [value, setValue] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    setPromptListener(request => {
      setValue(request.defaultValue ?? '');
      setCurrent(request);
    });
    return () => setPromptListener(null);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, e => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const stylesHook = useMemo<DynamicStyles>(
    () => ({
      card: { backgroundColor: colors.elevated },
      title: { color: colors.foregroundColor },
      description: { color: colors.buttonAlternativeTextColor },
      input: {
        backgroundColor: colors.inputBackgroundColor,
        borderColor: colors.formBorder,
        color: colors.foregroundColor,
      },
      cancelText: { color: colors.foregroundColor },
      ok: { backgroundColor: colors.buttonBackgroundColor },
      okText: { color: colors.buttonAlternativeTextColor },
      okDestructive: { backgroundColor: colors.redBG },
      okDestructiveText: { color: colors.redText },
    }),
    [colors],
  );

  if (!current) return null;

  const dismiss = () => {
    Keyboard.dismiss();
    setCurrent(null);
  };
  const handleSubmit = () => {
    current.resolve(value);
    dismiss();
  };
  const handleCancel = () => {
    current.reject(new Error('Cancel Pressed'));
    dismiss();
  };

  // paddingBottom reserves the keyboard's space so the centered card stays above it.
  const backdropStyle = [styles.backdrop, { paddingBottom: keyboardHeight }];
  const onBackdropPress = current.cancelable ? handleCancel : undefined;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onBackdropPress}>
      <Pressable
        style={backdropStyle}
        onPress={onBackdropPress}
        accessibilityViewIsModal
        accessibilityRole={current.cancelable ? 'button' : undefined}
        accessibilityLabel={current.cancelable ? loc._.cancel : undefined}
        testID="PromptBackdrop"
      >
        <View style={[styles.card, stylesHook.card]} onStartShouldSetResponder={() => true}>
          <Text style={[styles.title, stylesHook.title]} maxFontSizeMultiplier={1.2} accessibilityRole="header">
            {current.title}
          </Text>
          {current.description ? (
            <Text style={[styles.description, stylesHook.description]} maxFontSizeMultiplier={1.2}>
              {current.description}
            </Text>
          ) : null}
          <TextInput
            testID="PromptInput"
            style={[styles.input, stylesHook.input]}
            value={value}
            onChangeText={setValue}
            onSubmitEditing={handleSubmit}
            secureTextEntry={current.secureTextEntry}
            keyboardType={current.keyboardType}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            accessibilityLabel={current.title}
            accessibilityHint={current.description}
          />
          <View style={styles.footer}>
            {current.cancelable ? (
              <Pressable onPress={handleCancel} style={styles.button} accessibilityRole="button" testID="PromptCancelButton">
                <Text style={[styles.buttonText, stylesHook.cancelText]}>{loc._.cancel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleSubmit}
              style={[styles.button, current.destructive ? stylesHook.okDestructive : stylesHook.ok]}
              accessibilityRole="button"
              testID="PromptOkButton"
            >
              <Text style={[styles.buttonText, current.destructive ? stylesHook.okDestructiveText : stylesHook.okText]}>
                {current.continueButtonText}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

export default PromptInputModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  card: {
    borderRadius: 12,
    padding: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    borderRadius: 4,
    borderWidth: 1,
    padding: 10,
    fontSize: 16,
    width: '100%',
  },
  footer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    minWidth: 80,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
