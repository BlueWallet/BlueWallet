import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { navigationRef } from '../NavigationService';
import { presentWalletExportReminder } from '../helpers/presentWalletExportReminder';
import { unlockWithBiometrics, useBiometrics } from './useBiometrics';
import { useStorage } from './context/useStorage';
import { requestCameraAuthorization } from '../helpers/scan-qr';
import { useCallback, useMemo } from 'react';

// List of screens that require biometrics
const requiresBiometrics = ['WalletExportRoot', 'WalletXpubRoot', 'ViewEditMultisigCosigners', 'ExportMultisigCoordinationSetupRoot'];

// List of screens that require wallet export to be saved
const requiresWalletExportIsSaved = ['ReceiveDetailsRoot', 'WalletAddresses'];

export const useExtendedNavigation = <T extends NavigationProp<ParamListBase>>(): T & {
  navigateToWalletsList: () => void;
} => {
  const originalNavigation = useNavigation<T>();
  const { wallets, saveToDisk } = useStorage();
  const { isBiometricUseEnabled } = useBiometrics();

  const enhancedNavigate = useCallback(
    (
      ...args:
        | [string]
        | [string, object | undefined]
        | [string, object | undefined, { merge?: boolean }]
        | [{ name: string; params?: object; path?: string; merge?: boolean }]
    ) => {
      let screenName: string;
      let params: any;
      let options: { merge?: boolean } | undefined;

      if (typeof args[0] === 'string') {
        screenName = args[0];
        params = args[1];
        options = args[2];
      } else if (typeof args[0] === 'object' && 'name' in args[0]) {
        screenName = args[0].name;
        params = args[0].params;
        options = { merge: args[0].merge };
      } else {
        throw new Error('Invalid navigation options');
      }

      const isRequiresBiometrics = requiresBiometrics.includes(screenName);
      const isRequiresWalletExportIsSaved = requiresWalletExportIsSaved.includes(screenName);

      const proceedWithNavigation = () => {
        console.log('Proceeding with navigation to', screenName);

        // Normal navigation handling
        if (typeof args[0] === 'string') {
          originalNavigation.navigate(screenName, params, options);
        } else {
          originalNavigation.navigate({
            name: screenName,
            params,
            merge: options?.merge,
          });
        }
      };

      (async () => {
        // Skip checks for ScanQRCode screen
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
              originalNavigation.navigate('WalletExportRoot', {
                screen: 'WalletExport',
                params: { walletID },
              });
            }
            return;
          }
        }

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
  ) as T & { navigateToWalletsList: () => void };
};
