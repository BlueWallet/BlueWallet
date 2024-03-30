import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import Biometric from '../class/biometrics';
import { BlueStorageContext } from '../blue_modules/storage-context';
import { useContext } from 'react';
import { presentWalletExportReminder } from '../helpers/presentWalletExportReminder';

// List of screens that require biometrics

const requiresBiometrics = ['WalletExportRoot', 'WalletXpubRoot', 'ViewEditMultisigCosignersRoot', 'ExportMultisigCoordinationSetupRoot'];

// List of screens that require wallet export to be saved

const requiresWalletExportIsSaved = ['ReceiveDetailsRoot', 'WalletAddresses'];

export const useExtendedNavigation = (): NavigationProp<ParamListBase> => {
  const originalNavigation = useNavigation<NavigationProp<ParamListBase>>();
  const { wallets, saveToDisk } = useContext(BlueStorageContext);

  const enhancedNavigate: NavigationProp<ParamListBase>['navigate'] = (screenOrOptions: any, params?: any) => {
    let screenName: string;
    if (typeof screenOrOptions === 'string') {
      screenName = screenOrOptions;
    } else if (typeof screenOrOptions === 'object' && 'name' in screenOrOptions) {
      screenName = screenOrOptions.name;
      params = screenOrOptions.params;
    } else {
      throw new Error('Invalid navigation options');
    }

    // Directly proceed if the screen doesn't require checks.
    if (!requiresBiometrics.includes(screenName) && !requiresWalletExportIsSaved.includes(screenName)) {
      originalNavigation.navigate(screenOrOptions, params);
      return;
    }

    const proceedWithNavigation = () => originalNavigation.navigate(screenOrOptions, params);

    (async () => {
      if (requiresBiometrics.includes(screenName)) {
        const isBiometricsEnabled = await Biometric.isBiometricUseEnabled();
        if (isBiometricsEnabled) {
          const isAuthenticated = await Biometric.unlockWithBiometrics();
          if (!isAuthenticated) {
            console.error('Biometric authentication failed');
            return; // Stops navigation if authentication fails
          }
        }
      }

      if (requiresWalletExportIsSaved.includes(screenName)) {
        const walletID = params?.walletID || params?.params?.walletID;
        if (walletID) {
          const wallet = wallets.find(w => w.getID() === walletID);
          if (wallet && !wallet.getUserHasSavedExport()) {
            try {
              await presentWalletExportReminder();
              wallet.setUserHasSavedExport(true);
              await saveToDisk();
            } catch {
              originalNavigation.navigate('WalletExportRoot', { screen: 'WalletExport', params: { walletID } });
              return; // Stops navigation if the user needs to save the export first
            }
          }
        }
      }

      // Proceeds if all checks pass
      proceedWithNavigation();
    })();
  };

  return {
    ...originalNavigation,
    navigate: enhancedNavigate,
  };
};
