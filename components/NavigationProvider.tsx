import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import Biometric from '../class/biometrics';

interface NavigationContextType {
  navigate: (name: string, params?: object) => void;
}

const NavigationContext = createContext<NavigationContextType>({
  navigate: () => {}, // default empty implementation
});

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const customNavigate = useCallback(
    (name: string, params: object = {}) => {
      if (name === 'WalletExportRoot') {
        Biometric.isBiometricUseEnabled().then((isBiometricsEnabled: boolean) => {
          if (isBiometricsEnabled) {
            Biometric.unlockWithBiometrics().then((isAuthenticated: boolean) => {
              if (isAuthenticated) {
                navigation.navigate(name, params);
              } else {
                console.error('Biometric authentication failed');
              }
            });
          } else {
            console.warn('Biometric authentication is not enabled');
            navigation.navigate(name, params);
          }
        });
      } else {
        navigation.navigate(name, params);
      }
    },
    [navigation],
  );

  return <NavigationContext.Provider value={{ navigate: customNavigate }}>{children}</NavigationContext.Provider>;
};

export const useCustomNavigation = () => useContext(NavigationContext);
