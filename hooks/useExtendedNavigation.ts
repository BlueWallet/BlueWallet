import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { navigationRef } from '../NavigationService';
import { presentWalletExportReminder } from '../helpers/presentWalletExportReminder';
import { unlockWithBiometrics, useBiometrics } from './useBiometrics';
import { useStorage } from './context/useStorage';
import { requestCameraAuthorization } from '../helpers/scan-qr';
import { useCallback, useMemo } from 'react';

// List of screens that require biometrics
const requiresBiometrics = [
  'WalletExportRoot',
  'WalletXpubRoot',
  'ViewEditMultisigCosignersRoot',
  'ExportMultisigCoordinationSetupRoot',
];

// List of screens that require wallet export to be saved
const requiresWalletExportIsSaved = ['ReceiveDetailsRoot', 'WalletAddresses'];

export const useExtendedNavigation = <T extends NavigationProp<ParamListBase>>(): T => {
  const originalNavigation = useNavigation<T>();
  const { wallets, saveToDisk } = useStorage();
  const { isBiometricUseEnabled } = useBiometrics();

  const enhancedNavigate: NavigationProp<ParamListBase>['navigate'] = useCallback(
    (screenOrOptions: any, params?: any, options?: { merge?: boolean }) => {
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
        // NEW: If the current (active) screen is 'ScanQRCode', bypass all checks.
        const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
        if (currentRouteName === 'ScanQRCode') {
          proceedWithNavigation();
          return;
        }

        if (isRequiresBiometrics) {
          const isBiometricsEnabled = await isBiometricUseEnabled();
          if (isBiometricsEnabled) {
            const isAuthenticated = await unlockWithBiometrics();
            if (isAuthenticated) {
              proceedWithNavigation();
              return;
            } else {
              console.error('Biometric authentication failed');
              // Do not proceed if authentication fails.
              return;
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
              await saveToDisk();
              proceedWithNavigation();
            } catch (error) {
              // If there was an error (or the user cancelled), navigate to the wallet export screen.
              originalNavigation.navigate('WalletExportRoot', {
                screen: 'WalletExport',
                params: { walletID },
              });
            }
            return; // Do not proceed with the original navigation if reminder was shown.
          }
        }

        // If the target screen is ScanQRCode, request camera authorization.
        if (screenName === 'ScanQRCode') {
          await requestCameraAuthorization();
        }
        proceedWithNavigation();
      })();
    },
    [originalNavigation, isBiometricUseEnabled, wallets, saveToDisk],
  );

  const navigateToWalletsList = useCallback(() => {
    enhancedNavigate('WalletsList');
  }, [enhancedNavigate]);

  return useMemo(
    () => ({
      ...originalNavigation,
      navigate: enhancedNavigate,
      navigateToWalletsList,
    }),
    [originalNavigation, enhancedNavigate, navigateToWalletsList],
  );
};

// Usage example:
// type NavigationProps = NativeStackNavigationProp<SendDetailsStackParamList, 'SendDetails'>;
// const navigation = useExtendedNavigation<NavigationProps>();