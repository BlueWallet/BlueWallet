import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { navigationRef } from '../NavigationService';
import { presentWalletExportReminder } from '../helpers/presentWalletExportReminder';
import { unlockWithBiometrics, useBiometrics } from './useBiometrics';
import { useStorage } from './context/useStorage';

// List of screens that require biometrics
const requiresBiometrics = ['WalletExportRoot', 'WalletXpubRoot', 'ViewEditMultisigCosignersRoot', 'ExportMultisigCoordinationSetupRoot'];

// List of screens that require wallet export to be saved
const requiresWalletExportIsSaved = ['ReceiveDetailsRoot', 'WalletAddresses'];

export const useExtendedNavigation = <T extends NavigationProp<ParamListBase>>(): T => {
  const originalNavigation = useNavigation<T>();
  const { wallets, saveToDisk } = useStorage();
  const { isBiometricUseEnabled } = useBiometrics();

  const enhancedNavigate: NavigationProp<ParamListBase>['navigate'] = (
    screenOrOptions: any,
    params?: any,
    options?: { merge?: boolean },
  ) => {
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
        if (typeof screenOrOptions === 'string') {
          originalNavigation.navigate({ name: screenOrOptions, params, merge: options?.merge });
        } else {
          originalNavigation.navigate({ ...screenOrOptions, params, merge: options?.merge });
        }
      }
    };

    (async () => {
      if (isRequiresBiometrics) {
        const isBiometricsEnabled = await isBiometricUseEnabled();
        if (isBiometricsEnabled) {
          const isAuthenticated = await unlockWithBiometrics();
          if (isAuthenticated) {
            proceedWithNavigation();
            return;
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

  const navigateToWalletsList = () => {
    enhancedNavigate('WalletsList');
  }

  return {
    ...originalNavigation,
    navigate: enhancedNavigate,
    navigateToWalletsList,
  };
};

// Usage example:
// type NavigationProps = NativeStackNavigationProp<SendDetailsStackParamList, 'SendDetails'>;
// const navigation = useExtendedNavigation<NavigationProps>();
