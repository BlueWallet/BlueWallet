import loc from '../loc';
import prompt from './prompt';

/**
 * Asks the user to enter a new BIP39 passphrase twice. Re-prompts with an error note until both entries match
 * and are not empty, so the user has to type the passphrase twice correctly before the wallet is created.
 * Resolves to undefined if the user cancels.
 */
export const askNewPassphrase = async (): Promise<string | undefined> => {
  let errorNote = '';
  for (;;) {
    let first: string;
    let confirmation: string;
    try {
      first = await prompt(loc.wallets.add_passphrase_title, `${errorNote}${loc.wallets.add_passphrase_message}`);
      confirmation = await prompt(loc.wallets.add_passphrase_title, loc.wallets.add_passphrase_confirm_message);
    } catch {
      return undefined; // user cancelled
    }
    if (!first) {
      errorNote = `${loc.wallets.add_passphrase_empty}\n\n`;
    } else if (first !== confirmation) {
      errorNote = `${loc.wallets.add_passphrase_mismatch}\n\n`;
    } else {
      return first;
    }
  }
};

export default askNewPassphrase;
