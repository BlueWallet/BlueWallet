import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import Biometric from '../class/biometrics';
import { navigationRef } from '../NavigationService';
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
      params = screenOrOptions.params; // Assign params from object if present
    } else {
      throw new Error('Invalid navigation options');
    }

    const isRequiresBiometrics = requiresBiometrics.includes(screenName);
    const isRequiresWalletExportIsSaved = requiresWalletExportIsSaved.includes(screenName);

    const proceedWithNavigation = () => {
      console.log('Proceeding with navigation to', screenName);
      if (navigationRef.current?.isReady()) {
        typeof screenOrOptions === 'string'
          ? originalNavigation.navigate(screenOrOptions, params)
          : originalNavigation.navigate(screenName, params); // Fixed to use screenName and params
      }
    };

    (async () => {
      if (isRequiresBiometrics) {
        const isBiometricsEnabled = await Biometric.isBiometricUseEnabled();
        if (isBiometricsEnabled) {
          const isAuthenticated = await Biometric.unlockWithBiometrics();
          if (isAuthenticated) {
            proceedWithNavigation();
            return; // Ensure the function exits if this path is taken
          } else {
            console.error('Biometric authentication failed');
            // Decide if navigation should proceed or not after failed authentication
            return; // Prevent proceeding with the original navigation if bio fails
          }
        }
      }
      if (isRequiresWalletExportIsSaved) {
        console.log('Checking if wallet export is saved');
        let walletID: string | undefined;
        if (params && params.walletID) {
          walletID = params.walletID;
        } else if (params && params.params && params.params.walletID) {
          walletID = params.params.walletID;
        }
        if (!walletID) {
          proceedWithNavigation();
          return;
        }
        const wallet = wallets.find(w => w.getID() === walletID);
        if (wallet && !wallet.getUserHasSavedExport()) {
          try {
            await presentWalletExportReminder();
            wallet.setUserHasSavedExport(true);
            await saveToDisk(); // Assuming saveToDisk() returns a Promise.
            proceedWithNavigation();
          } catch (error) {
            if (error) {
              originalNavigation.navigate('WalletExportRoot', {
                screen: 'WalletExport',
                params: { walletID },
              });
            }
          }

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
