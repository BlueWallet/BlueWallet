import React, { useState, useEffect } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import loc from '../loc';
import Button from './Button'; // Adjust the import path as necessary
import { useTheme } from './themes';

enum PromptType {
  SecureText = 'secure-text',
  ConfirmSecureText = 'confirm-secure-text',
  Numeric = 'numeric',
}

let modalParams = {
  title: '',
  text: '',
  type: PromptType.SecureText,
  continueButtonText: loc._.continue,
  isCancelable: true,
};

const handleCancel = async () => {
  rejectPromise(new Error('Cancel Pressed'));
  await TrueSheet.dismiss('PromptModal');
  resetModal();
};

const handleContinue = async (inputValue: string) => {
  resolvePromise(inputValue);
  await TrueSheet.dismiss('PromptModal');
  resetModal();
};

let resolvePromise: (value: string) => void;
let rejectPromise: (reason?: any) => void;

const resetModal = () => {
  modalParams = {
    title: '',
    text: '',
    type: PromptType.SecureText,
    continueButtonText: loc._.continue,
    isCancelable: true,
  };
};

const PromptModal = () => {
  const { colors } = useTheme();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue('');
  }, [modalParams]);

  const onContinue = async () => {
    await handleContinue(inputValue);
  };

  const onCancel = async () => {
    await handleCancel();
  };

  const stylesHook = StyleSheet.create({
    title: {
      color: colors.foregroundColor,
    },
    text: {
      color: colors.foregroundColor,
    },
    input: {
      color: colors.foregroundColor,
      backgroundColor: colors.inputBackgroundColor,
    },
  });

  return (
    <TrueSheet
      name="PromptModal"
      sizes={['auto']}
      blurTint="regular"
      dismissible={modalParams.isCancelable}
      onDismiss={onCancel}
      backgroundColor={colors.modal}
      contentContainerStyle={styles.container}
      FooterComponent={
        <View style={styles.buttonContainer}>
          {modalParams.isCancelable && <Button onPress={onCancel} style={styles.button} title={loc._.cancel} />}
          <Button onPress={onContinue} style={styles.button} title={modalParams.continueButtonText} />
        </View>
      }
    >
      <Text style={[styles.title, stylesHook.title]}>{modalParams.title}</Text>
      <Text style={[styles.text, stylesHook.text]}>{modalParams.text}</Text>
      <TextInput
        style={[styles.input, stylesHook.input]}
        value={inputValue}
        onChangeText={setInputValue}
        keyboardType={modalParams.type === PromptType.Numeric ? 'numeric' : 'default'}
        secureTextEntry={modalParams.type !== PromptType.Numeric}
      />
    </TrueSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  text: {
    fontSize: 16,
    paddingVertical: 20,
    textAlign: 'justify',
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 10,
    marginBottom: 20,
    borderRadius: 10,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 34,
  },
  button: {
    marginLeft: 10,
  },
});

export default PromptModal;
export { PromptType, modalParams, handleCancel, handleContinue };