import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from './Button';
import { SecondButton } from './SecondButton';
import { BlueSpacing10, BlueSpacing20 } from './BlueSpacing';
import { useTheme } from './themes';

interface PassphrasePromptProps {
  visible: boolean;
  title: string;
  message: string;
  cancelButtonText?: string;
  continueButtonText?: string;
  defaultValue?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
  testID?: string;
}

const PassphrasePrompt: React.FC<PassphrasePromptProps> = ({
  visible,
  title,
  message,
  cancelButtonText = 'Cancel',
  continueButtonText = 'OK',
  defaultValue = '',
  onCancel,
  onSubmit,
  testID = 'PassphrasePrompt',
}) => {
  const { colors } = useTheme();
  const [value, setValue] = useState(defaultValue);

  const stylesHook = useMemo(
    () => ({
      content: {
        backgroundColor: colors.elevated,
      },
      title: {
        color: colors.foregroundColor,
      },
      message: {
        color: colors.feeText,
      },
      input: {
        backgroundColor: colors.inputBackgroundColor,
        borderColor: colors.formBorder,
        color: colors.foregroundColor,
      },
    }),
    [colors],
  );

  useEffect(() => {
    if (visible) {
      setValue(defaultValue);
    }
  }, [visible, defaultValue]);

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    onSubmit(value);
  }, [onSubmit, value]);

  const handleCancel = useCallback(() => {
    Keyboard.dismiss();
    onCancel();
  }, [onCancel]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleCancel} presentationStyle="overFullScreen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.overlay}>
          <View style={[styles.content, stylesHook.content]} accessibilityViewIsModal accessibilityLabel={title} testID={testID}>
            <Text style={[styles.title, stylesHook.title]}>{title}</Text>
            <BlueSpacing10 />
            <Text style={[styles.message, stylesHook.message]}>{message}</Text>
            <BlueSpacing20 />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              blurOnSubmit={false}
              onSubmitEditing={handleSubmit}
              onChangeText={setValue}
              placeholder={''}
              secureTextEntry
              style={[styles.input, stylesHook.input]}
              value={value}
              testID={`${testID}Input`}
            />
            <BlueSpacing20 />
            <View style={styles.buttonsRow}>
              <SecondButton title={cancelButtonText} onPress={handleCancel} testID={`${testID}CancelButton`} />
              <View style={styles.buttonSpacer} />
              <Button title={continueButtonText} onPress={handleSubmit} testID={`${testID}ConfirmButton`} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonSpacer: {
    width: 12,
  },
});

export default PassphrasePrompt;
