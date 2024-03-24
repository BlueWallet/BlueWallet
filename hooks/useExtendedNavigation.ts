import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import Biometric from '../class/biometrics';
import { navigationRef } from '../NavigationService';

export const useExtendedNavigation = (): NavigationProp<ParamListBase> => {
  const originalNavigation = useNavigation<NavigationProp<ParamListBase>>();

  const enhancedNavigate: any = (screenOrOptions: any, params?: any) => {
    let screenName: string;
    if (typeof screenOrOptions === 'string') {
      screenName = screenOrOptions;
    } else if (typeof screenOrOptions === 'object' && 'name' in screenOrOptions) {
      screenName = screenOrOptions.name;
    } else {
      throw new Error('Invalid navigation options');
    }

    const requiresBiometrics = [
      'WalletExportRoot',
      'WalletXpubRoot',
      'ViewEditMultisigCosignersRoot',
      'ExportMultisigCoordinationSetupRoot',
    ].includes(screenName);

    const proceedWithNavigation = () => {
      if (navigationRef.current?.isReady()) {
        typeof screenOrOptions === 'string'
          ? originalNavigation.navigate(screenOrOptions, params)
          : originalNavigation.navigate(screenOrOptions);
      }
    };

    if (requiresBiometrics) {
      Biometric.isBiometricUseEnabled().then(isBiometricsEnabled => {
        if (isBiometricsEnabled) {
          Biometric.unlockWithBiometrics().then(isAuthenticated => {
            if (isAuthenticated) {
              proceedWithNavigation();
            } else {
              console.error('Biometric authentication failed');
            }
          });
        } else {
          console.warn('Biometric authentication is not enabled');
          proceedWithNavigation();
        }
      });
    } else {
      proceedWithNavigation();
    }
  };

  return {
    ...originalNavigation,
    navigate: enhancedNavigate,
  };
};
