import { askBackupSaved, isBackupReminderReady } from '../components/BackupReminder';
import loc from '../loc';
import { appAlert } from '../components/AppDialog';

/**
 * Asks whether the words of a wallet are backed up, the first time it is about
 * to receive. Resolves when they are; rejects when the owner wants to back
 * them up now; never settles on Cancel. In the app's own sheet once it is
 * mounted, in a system dialog before that.
 */
export const presentWalletExportReminder = (walletLabel?: string): Promise<void> => {
  if (isBackupReminderReady()) return askBackupSaved(walletLabel);
  return new Promise<void>((resolve, reject) => {
    appAlert(
      loc.pleasebackup.ask_title,
      loc.pleasebackup.ask_body,
      [
        { text: loc.pleasebackup.ask_saved, onPress: () => resolve(), style: 'default' },
        { text: loc.pleasebackup.ask_backup, onPress: () => reject(new Error('User has denied saving the wallet backup.')) },
        { text: loc._.cancel, style: 'cancel' },
      ],
      { cancelable: true },
    );
  });
};
