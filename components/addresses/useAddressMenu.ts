/**
 * Copying the private key of one of a wallet's addresses, for wallets that
 * sign messages: after a confirmation and the biometric unlock, to the
 * sensitive clipboard. Used by the screen of an address.
 */
import { useCallback } from 'react';

import { setSensitiveClipboardString } from '../../blue_modules/clipboard';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import confirm from '../../helpers/confirm';
import { useStorage } from '../../hooks/context/useStorage';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import loc from '../../loc';
import presentAlert from '../Alert';

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

  return { exportPrivateKey, canExportPrivateKey: allowSignVerifyMessage };
}
