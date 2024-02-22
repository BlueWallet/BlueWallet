import React, { useContext, useEffect, useReducer, useRef } from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator, useColorScheme, NativeModules, StyleSheet } from 'react-native';
import { Icon } from 'react-native-elements';
import Biometric, { BiometricType } from './class/biometrics';
import { NavigationProp, RouteProp, StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { BlueStorageContext } from './blue_modules/storage-context';
import { isHandset } from './blue_modules/environment';
import triggerHapticFeedback, { HapticFeedbackTypes } from './blue_modules/hapticFeedback';
import SafeArea from './components/SafeArea';
type RootStackParamList = {
  UnlockWith: { unlockOnComponentMount?: boolean };
};

type State = {
  biometricType: keyof typeof BiometricType | undefined;
  isStorageEncryptedEnabled: boolean;
  isAuthenticating: boolean;
};

const SET_BIOMETRIC_TYPE = 'SET_BIOMETRIC_TYPE';
const SET_IS_STORAGE_ENCRYPTED_ENABLED = 'SET_IS_STORAGE_ENCRYPTED_ENABLED';
const SET_IS_AUTHENTICATING = 'SET_IS_AUTHENTICATING';

type Action =
  | { type: typeof SET_BIOMETRIC_TYPE; payload: keyof typeof BiometricType | undefined }
  | { type: typeof SET_IS_STORAGE_ENCRYPTED_ENABLED; payload: boolean }
  | { type: typeof SET_IS_AUTHENTICATING; payload: boolean };

const initialState: State = {
  biometricType: undefined,
  isStorageEncryptedEnabled: false,
  isAuthenticating: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case SET_BIOMETRIC_TYPE:
      return { ...state, biometricType: action.payload };
    case SET_IS_STORAGE_ENCRYPTED_ENABLED:
      return { ...state, isStorageEncryptedEnabled: action.payload };
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
  const navigation = useNavigation<NavigationProp<RootStackParamList, 'UnlockWith'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'UnlockWith'>>();
  const { unlockOnComponentMount } = route.params;
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen?.dismissSplashScreen();
    startUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const successfullyAuthenticated = () => {
    setWalletsInitialized(true);
    navigation.dispatch(StackActions.replace(isHandset ? 'Navigation' : 'DrawerRoot'));
    isUnlockingWallets.current = false;
  };

  const unlockWithBiometrics = async () => {
    if (isUnlockingWallets.current || state.isAuthenticating) return;
    isUnlockingWallets.current = true;
    dispatch({ type: SET_IS_AUTHENTICATING, payload: true });

    if (await Biometric.unlockWithBiometrics()) {
      await startAndDecrypt();
      successfullyAuthenticated();
    }

    dispatch({ type: SET_IS_AUTHENTICATING, payload: false });
    isUnlockingWallets.current = false;
  };

  const unlockWithKey = async () => {
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
  };

  const renderUnlockOptions = () => {
    if (state.isAuthenticating) {
      return <ActivityIndicator />;
    } else {
      const color = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
      if (
        (state.biometricType === BiometricType.TouchID || state.biometricType === BiometricType.Biometrics) &&
        !state.isStorageEncryptedEnabled
      ) {
        return (
          <TouchableOpacity accessibilityRole="button" disabled={state.isAuthenticating} onPress={unlockWithBiometrics}>
            <Icon name="fingerprint" size={64} type="font-awesome5" color={color} />
          </TouchableOpacity>
        );
      } else if (state.biometricType === BiometricType.FaceID && !state.isStorageEncryptedEnabled) {
        return (
          <TouchableOpacity accessibilityRole="button" disabled={state.isAuthenticating} onPress={unlockWithBiometrics}>
            <Image
              source={colorScheme === 'dark' ? require('./img/faceid-default.png') : require('./img/faceid-dark.png')}
              style={styles.icon}
            />
          </TouchableOpacity>
        );
      } else if (state.isStorageEncryptedEnabled) {
        return (
          <TouchableOpacity accessibilityRole="button" disabled={state.isAuthenticating} onPress={unlockWithKey}>
            <Icon name="lock" size={64} type="font-awesome5" color={color} />
          </TouchableOpacity>
        );
      }
    }
  };

  const startUnlock = async () => {
    if (unlockOnComponentMount) {
      const storageIsEncrypted = await isStorageEncrypted();
      const isBiometricUseCapableAndEnabled = await Biometric.isBiometricUseCapableAndEnabled();
      const rawType = isBiometricUseCapableAndEnabled ? await Biometric.biometricType() : undefined;

      if (!rawType || storageIsEncrypted) {
        dispatch({ type: SET_IS_STORAGE_ENCRYPTED_ENABLED, payload: storageIsEncrypted });
        unlockWithKey();
      } else {
        dispatch({ type: SET_BIOMETRIC_TYPE, payload: rawType });
        unlockWithBiometrics();
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
