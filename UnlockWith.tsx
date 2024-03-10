import React, { useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator, useColorScheme, NativeModules, StyleSheet } from 'react-native';
import { Icon } from 'react-native-elements';
import Biometric, { BiometricType } from './class/biometrics';
import { BlueStorageContext } from './blue_modules/storage-context';
import triggerHapticFeedback, { HapticFeedbackTypes } from './blue_modules/hapticFeedback';
import SafeArea from './components/SafeArea';

enum AuthType {
  Encrypted,
  Biometrics,
  None,
}

type State = {
  auth: {
    type: AuthType;
    detail: keyof typeof BiometricType | undefined;
  };
  isAuthenticating: boolean;
};

const SET_AUTH = 'SET_AUTH';
const SET_IS_AUTHENTICATING = 'SET_IS_AUTHENTICATING';

type Action =
  | { type: typeof SET_AUTH; payload: { type: AuthType; detail: keyof typeof BiometricType | undefined } }
  | { type: typeof SET_IS_AUTHENTICATING; payload: boolean };

const initialState: State = {
  auth: {
    type: AuthType.None,
    detail: undefined,
  },
  isAuthenticating: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case SET_AUTH:
      return { ...state, auth: action.payload };
    case SET_IS_AUTHENTICATING:
      return { ...state, isAuthenticating: action.payload };
    default:
      return state;
  }
}

const { SplashScreen } = NativeModules;

const UnlockWith: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isUnlockingWallets = useRef(false);
  const { setWalletsInitialized, isStorageEncrypted, startAndDecrypt } = useContext(BlueStorageContext);
  const colorScheme = useColorScheme();

  const successfullyAuthenticated = useCallback(() => {
    setWalletsInitialized(true);
    isUnlockingWallets.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlockWithBiometrics = useCallback(async () => {
    if (isUnlockingWallets.current || state.isAuthenticating) return;
    isUnlockingWallets.current = true;
    dispatch({ type: SET_IS_AUTHENTICATING, payload: true });

    if (await Biometric.unlockWithBiometrics()) {
      await startAndDecrypt();
      successfullyAuthenticated();
    }

    dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
    isUnlockingWallets.current = false;
  }, [state.isAuthenticating, startAndDecrypt, successfullyAuthenticated]);

  const unlockWithKey = useCallback(async () => {
    if (isUnlockingWallets.current || state.isAuthenticating) return;
    isUnlockingWallets.current = true;
    dispatch({ type: SET_IS_AUTHENTICATING, payload: true });

    if (await startAndDecrypt()) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      successfullyAuthenticated();
    } else {
      dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
      isUnlockingWallets.current = false;
    }
  }, [state.isAuthenticating, startAndDecrypt, successfullyAuthenticated]);

  useEffect(() => {
    SplashScreen?.dismissSplashScreen();

    const startUnlock = async () => {
      const storageIsEncrypted = await isStorageEncrypted();
      const isBiometricUseCapableAndEnabled = await Biometric.isBiometricUseCapableAndEnabled();
      const biometricType = isBiometricUseCapableAndEnabled ? await Biometric.biometricType() : undefined;

      if (storageIsEncrypted) {
        dispatch({ type: SET_AUTH, payload: { type: AuthType.Encrypted, detail: undefined } });
        unlockWithKey();
      } else if (isBiometricUseCapableAndEnabled) {
        dispatch({ type: SET_AUTH, payload: { type: AuthType.Biometrics, detail: biometricType } });
        unlockWithBiometrics();
      } else {
        dispatch({ type: SET_AUTH, payload: { type: AuthType.None, detail: undefined } });
        unlockWithKey();
      }
    };

    startUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderUnlockOptions = () => {
    const color = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
    if (state.isAuthenticating) {
      return <ActivityIndicator />;
    } else {
      switch (state.auth.type) {
        case AuthType.Biometrics:
          if (state.auth.detail === 'TouchID' || state.auth.detail === 'Biometrics') {
            return (
              <TouchableOpacity accessibilityRole="button" disabled={state.isAuthenticating} onPress={unlockWithBiometrics}>
                <Icon name="fingerprint" size={64} type="font-awesome5" color={color} />
              </TouchableOpacity>
            );
          } else if (state.auth.detail === 'FaceID') {
            return (
              <TouchableOpacity accessibilityRole="button" disabled={state.isAuthenticating} onPress={unlockWithBiometrics}>
                <Image
                  source={colorScheme === 'dark' ? require('./img/faceid-default.png') : require('./img/faceid-dark.png')}
                  style={styles.icon}
                />
              </TouchableOpacity>
            );
          }
          return null;
        case AuthType.Encrypted:
          return (
            <TouchableOpacity accessibilityRole="button" disabled={state.isAuthenticating} onPress={unlockWithKey}>
              <Icon name="lock" size={64} type="font-awesome5" color={color} />
            </TouchableOpacity>
          );
        default:
          return null;
      }
    }
  };

  return (
    <SafeArea style={styles.root}>
      <View style={styles.container}>
        <Image source={require('./img/icon.png')} style={styles.logoImage} resizeMode="contain" />
      </View>
      <View style={styles.biometricRow}>{renderUnlockOptions()}</View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricRow: {
    justifyContent: 'center',
    flexDirection: 'row',
    width: 64,
    height: 64,
    alignSelf: 'center',
    marginBottom: 20,
  },
  icon: {
    width: 64,
    height: 64,
  },
  logoImage: {
    width: 100,
    height: 75,
    alignSelf: 'center',
  },
});

export default UnlockWith;
