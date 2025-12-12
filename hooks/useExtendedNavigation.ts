import { useNavigation, NavigationProp, ParamListBase, CommonActions } from '@react-navigation/native';
import { navigationRef } from '../NavigationService';
import { presentWalletExportReminder } from '../helpers/presentWalletExportReminder';
import { unlockWithBiometrics, useBiometrics } from './useBiometrics';
import { useStorage } from './context/useStorage';
import { requestCameraAuthorization } from '../helpers/scan-qr';
import { useCallback, useMemo } from 'react';

// List of screens that require biometrics
const requiresBiometrics = ['WalletExport', 'WalletXpub', 'ViewEditMultisigCosigners', 'ExportMultisigCoordinationSetupRoot'];

// List of screens that require wallet export to be saved
const requiresWalletExportIsSaved = ['ReceiveDetails', 'WalletAddresses'];

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
      let screenOrOptions: any;
      let params: any;
      let options: { merge?: boolean } | undefined;

      if (typeof args[0] === 'string') {
        screenOrOptions = args[0];
        params = args[1];
        options = args[2];
      } else {
        screenOrOptions = args[0];
      }
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

        // Navigation logic based on current route and target screen
        if (navigationRef.current?.isReady()) {
          // Get the current route - we need to know which navigator we're in
          const currentRoute = navigationRef.current.getCurrentRoute();
          const currentRouteName = currentRoute?.name;

          // Handle specific cases for nested navigation
          if (currentRouteName === 'DrawerRoot') {
            // If we're in DrawerRoot and trying to navigate to a screen that exists in DetailViewStackScreensStack
            originalNavigation.navigate('DrawerRoot', {
              screen: 'DetailViewStackScreensStack',
              params: {
                screen: screenName,
                params,
              },
            });
          } else {
            // Normal navigation
            if (typeof screenOrOptions === 'string') {
              originalNavigation.navigate({ name: screenOrOptions, params, merge: options?.merge });
            } else {
              originalNavigation.navigate({ ...screenOrOptions, params, merge: options?.merge });
            }
          }
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
              originalNavigation.navigate('WalletExport', { walletID });
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
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'DrawerRoot',
            state: {
              routes: [
                {
                  name: 'DetailViewStackScreensStack',
                  state: {
                    routes: [
                      {
                        name: 'WalletsList',
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      })
    );
  }
}, []);

  return useMemo(
    () => ({
      ...originalNavigation,
      navigate: enhancedNavigate,
      navigateToWalletsList,
    }),
    [originalNavigation, enhancedNavigate, navigateToWalletsList],
  ) as T & { navigateToWalletsList: () => void };
};