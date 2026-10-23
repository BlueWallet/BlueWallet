import { StyleSheet, TextInputProps } from 'react-native';
import { HIDE_SECRETS_ON_SCREEN } from './e2e-flags';

const styles = StyleSheet.create({
  hidden: {
    color: 'transparent',
  },
});

/** Last style of any text that shows a seed, a private key or a passphrase. */
export const secretTextStyle = HIDE_SECRETS_ON_SCREEN ? styles.hidden : undefined;

/** Props of any text input that receives a seed or a passphrase: the selection and the caret would show it too. */
export const secretInputProps: Pick<TextInputProps, 'selectionColor' | 'cursorColor' | 'caretHidden'> = HIDE_SECRETS_ON_SCREEN
  ? { selectionColor: 'transparent', cursorColor: 'transparent', caretHidden: true }
  : {};

/** QR codes of secrets are rendered as a blank square of the same size. */
export const hideSecretQRCodes = HIDE_SECRETS_ON_SCREEN;
