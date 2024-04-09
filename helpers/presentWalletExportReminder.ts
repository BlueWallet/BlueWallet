import { Alert } from 'react-native';
import loc from '../loc';

export const presentWalletExportReminder = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    Alert.alert(
      loc.wallets.details_title,
      loc.pleasebackup.ask,
      [
        { text: loc.pleasebackup.ask_yes, onPress: () => resolve(), style: 'default' },
        { text: loc.pleasebackup.ask_no, onPress: () => reject(new Error('User has denied saving the wallet backup.')) },
        { text: loc._.cancel, style: 'cancel' },
      ],
      { cancelable: true },
    );
  });
};
