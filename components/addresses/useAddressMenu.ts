/**
 * What can be done with one of a wallet's addresses: copy it, share it, and —
 * for wallets that sign messages — copy its private key after a confirmation
 * and the biometric unlock. As a menu for the address rows of Manage Wallets,
 * and one by one for the screen of an address.
 */
import { useCallback, useMemo } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import Share from 'react-native-share';

import { setSensitiveClipboardString } from '../../blue_modules/clipboard';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import confirm from '../../helpers/confirm';
import { useStorage } from '../../hooks/context/useStorage';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import loc from '../../loc';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import presentAlert, { AlertType } from '../Alert';

export function useAddressMenu({
  walletID,
  address,
  allowSignVerifyMessage,
}: {
  walletID: string;
  address: string;
  allowSignVerifyMessage: boolean;
}) {
  const { wallets } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();

  const menuActions = useMemo(
    () => [
      { ...CommonToolTipActions.CopyTXID, text: loc.addresses.copy_address },
      CommonToolTipActions.Share,
      { ...CommonToolTipActions.ExportPrivateKey, hidden: !allowSignVerifyMessage },
    ],
    [allowSignVerifyMessage],
  );

  const copy = useCallback(() => {
    Clipboard.setString(address);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    presentAlert({ message: loc.home.copied, type: AlertType.Toast });
  }, [address]);

  const share = useCallback(() => {
    Share.open({ message: address }).catch(error => console.log(error));
  }, [address]);

  const copyPrivateKey = useCallback(async () => {
    const wallet = wallets.find(w => w.getID() === walletID);
    if (!wallet) {
      presentAlert({ message: 'Internal error: cant find wallet' });
      return;
    }
    try {
      const wif = wallet._getWIFbyAddress(address);
      if (!wif) {
        presentAlert({ message: 'Internal error: cant get WIF from the wallet' });
        return;
      }
      triggerHapticFeedback(HapticFeedbackTypes.Selection);
      await setSensitiveClipboardString(wif);
    } catch (error: any) {
      presentAlert({ message: error.message });
    }
  }, [wallets, walletID, address]);

  const exportPrivateKey = useCallback(async () => {
    if (!allowSignVerifyMessage || !(await confirm(loc.addresses.sensitive_private_key))) return;
    if ((await isBiometricUseCapableAndEnabled()) && !(await unlockWithBiometrics())) return;
    await copyPrivateKey();
  }, [allowSignVerifyMessage, copyPrivateKey, isBiometricUseCapableAndEnabled]);

  const onMenuItem = useCallback(
    async (id: string) => {
      if (id === CommonToolTipActions.CopyTXID.id) copy();
      else if (id === CommonToolTipActions.Share.id) share();
      else if (id === CommonToolTipActions.ExportPrivateKey.id) await exportPrivateKey();
    },
    [copy, share, exportPrivateKey],
  );

  return { menuActions, onMenuItem, copy, share, exportPrivateKey, canExportPrivateKey: allowSignVerifyMessage };
}
