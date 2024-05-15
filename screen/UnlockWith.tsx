import React, { useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import Biometric, { BiometricType } from '../class/biometrics';
import { BlueStorageContext } from '../blue_modules/storage-context';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import SafeArea from '../components/SafeArea';
import { BlueTextCentered } from '../BlueComponents';
import loc from '../loc';
import Button from '../components/Button';

enum AuthType {
  Encrypted,
  Biometrics,
  None,
  BiometricsUnavailable,
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

const UnlockWith: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isUnlockingWallets = useRef(false);
  const { setWalletsInitialized, isStorageEncrypted, startAndDecrypt } = useContext(BlueStorageContext);

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
    const startUnlock = async () => {
      const storageIsEncrypted = await isStorageEncrypted();
      const isBiometricUseCapableAndEnabled = await Biometric.isBiometricUseCapableAndEnabled();
      const biometricType = isBiometricUseCapableAndEnabled ? await Biometric.biometricType() : undefined;
      const biometricsUseEnabled = await Biometric.isBiometricUseEnabled();

      if (storageIsEncrypted) {
        dispatch({ type: SET_AUTH, payload: { type: AuthType.Encrypted, detail: undefined } });
        unlockWithKey();
      } else if (isBiometricUseCapableAndEnabled) {
        dispatch({ type: SET_AUTH, payload: { type: AuthType.Biometrics, detail: biometricType } });
        unlockWithBiometrics();
      } else if (biometricsUseEnabled && biometricType === undefined) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        dispatch({ type: SET_AUTH, payload: { type: AuthType.BiometricsUnavailable, detail: undefined } });
      } else {
        dispatch({ type: SET_AUTH, payload: { type: AuthType.None, detail: undefined } });
        unlockWithKey();
      }
    };

    startUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUnlockPressed = () => {
    if (state.auth.type === AuthType.Biometrics) {
      unlockWithBiometrics();
    } else {
      unlockWithKey();
    }
  };

  const renderUnlockOptions = () => {
    if (state.isAuthenticating) {
      return <ActivityIndicator />;
    } else {
      switch (state.auth.type) {
        case AuthType.Biometrics:
        case AuthType.Encrypted:
          return <Button onPress={onUnlockPressed} title={loc._.unlock} />;
        case AuthType.BiometricsUnavailable:
          return <BlueTextCentered>{loc.settings.biometrics_no_longer_available}</BlueTextCentered>;
        default:
          return null;
      }
    }
  };

  return (
    <SafeArea style={styles.root}>
      <View style={styles.container}>
        <Image source={require('../img/icon.png')} style={styles.logoImage} resizeMode="contain" />
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
    width: 300,
    minHeight: 60,
    alignSelf: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  logoImage: {
    width: 100,
    height: 75,
    alignSelf: 'center',
  },
});

export default UnlockWith;
