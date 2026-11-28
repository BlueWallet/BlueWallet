import { StyleSheet, TextInputProps } from 'react-native';

const styles = StyleSheet.create({
  hidden: {
    color: 'transparent',
  },
});

// E2e launches pass -e2eHideSecrets (Detox launchArgs, Appium arguments); native forwards it as the hideSecretsOnScreen initial prop.
let hidden = false;
export const setHideSecretsOnScreen = (value: boolean) => {
  hidden = value;
};

/** Last style of any text that shows a seed, a private key or a passphrase. */
export const secretTextStyle = () => (hidden ? styles.hidden : undefined);

/** Props of any text input that receives a seed or a passphrase: the selection and the caret would show it too. */
export const secretInputProps = (): Pick<TextInputProps, 'selectionColor' | 'cursorColor' | 'caretHidden'> =>
  hidden ? { selectionColor: 'transparent', cursorColor: 'transparent', caretHidden: true } : {};

/** QR codes of secrets are rendered as a blank square of the same size. */
export const hideSecretQRCodes = () => hidden;
