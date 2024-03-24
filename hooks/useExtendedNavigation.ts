import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import Biometric from '../class/biometrics';
import { navigationRef } from '../NavigationService';
import { BlueStorageContext } from '../blue_modules/storage-context';
import { useContext } from 'react';
import { presentWalletExportReminder } from '../helpers/presentWalletExportReminder';

export const useExtendedNavigation = (): NavigationProp<ParamListBase> => {
  const originalNavigation = useNavigation<NavigationProp<ParamListBase>>();
  const { wallets, saveToDisk } = useContext(BlueStorageContext);

  const enhancedNavigate: NavigationProp<ParamListBase>['navigate'] = (screenOrOptions: any, params?: any) => {
    let screenName: string;
    if (typeof screenOrOptions === 'string') {
      screenName = screenOrOptions;
    } else if (typeof screenOrOptions === 'object' && 'name' in screenOrOptions) {
      screenName = screenOrOptions.name;
      params = screenOrOptions.params; // Assign params from object if present
    } else {
      throw new Error('Invalid navigation options');
    }

    const requiresBiometrics = [
      'WalletExportRoot',
      'WalletXpubRoot',
      'ViewEditMultisigCosignersRoot',
      'ExportMultisigCoordinationSetupRoot',
    ].includes(screenName);
    const requiresWalletExportIsSaved = ['ReceiveDetailsRoot'].includes(screenName);

    const proceedWithNavigation = () => {
      if (navigationRef.current?.isReady()) {
        typeof screenOrOptions === 'string'
          ? originalNavigation.navigate(screenOrOptions, params)
          : originalNavigation.navigate(screenName, params); // Fixed to use screenName and params
      }
    };

    (async () => {
      if (requiresBiometrics) {
        const isBiometricsEnabled = await Biometric.isBiometricUseEnabled();
        if (isBiometricsEnabled) {
          const isAuthenticated = await Biometric.unlockWithBiometrics();
          if (isAuthenticated) {
            proceedWithNavigation();
            return; // Ensure the function exits if this path is taken
          } else {
            console.error('Biometric authentication failed');
            // Decide if navigation should proceed or not after failed authentication
          }
        }
      }
      if (requiresWalletExportIsSaved) {
        console.log('Checking if wallet export is saved');
        const walletID = params?.params ? params.params.walletID : undefined;
        if (!walletID) {
          proceedWithNavigation();
          return;
        }
        const wallet = wallets.find(w => w.getID() === walletID);
        if (wallet && !wallet.getUserHasSavedExport()) {
          await presentWalletExportReminder()
            .then(() => {
              wallet.setUserHasSavedExport(true);
              saveToDisk().finally(() => proceedWithNavigation());
            })
            .catch(() => {
              originalNavigation.navigate('WalletExportRoot', {
                screen: 'WalletExport',
                params: { walletID },
              });
            });
          return; // Prevent proceeding with the original navigation if the reminder is shown
        }
      }
      proceedWithNavigation();
    })();
  };

  return {
    ...originalNavigation,
    navigate: enhancedNavigate,
  };
};
