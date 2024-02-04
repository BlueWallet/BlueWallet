import React, { useContext, useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator, useColorScheme, NativeModules } from 'react-native';
import { Icon } from 'react-native-elements';
import Biometric from './class/biometrics';
import { NavigationProp, RouteProp, StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { BlueStorageContext } from './blue_modules/storage-context';
import { isHandset } from './blue_modules/environment';
import triggerHapticFeedback, { HapticFeedbackTypes } from './blue_modules/hapticFeedback';
import SafeArea from './components/SafeArea';
import { styles } from './UnlockWith.styles'; // Import styles

type RootStackParamList = {
  UnlockWith: { unlockOnComponentMount?: boolean }; // Define other screens and their parameters as needed
};

const { SplashScreen } = NativeModules;

const UnlockWith: React.FC = () => {
  const { setWalletsInitialized, isStorageEncrypted, startAndDecrypt } = useContext(BlueStorageContext);
  const navigation = useNavigation<NavigationProp<RootStackParamList, 'UnlockWith'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'UnlockWith'>>();
  const { unlockOnComponentMount } = route.params || {};
  const [biometricType, setBiometricType] = useState<string | undefined>(undefined);
  const [isStorageEncryptedEnabled, setIsStorageEncryptedEnabled] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen?.dismissSplashScreen();
    startUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const successfullyAuthenticated = () => {
    setWalletsInitialized(true);
    navigation.dispatch(StackActions.replace(isHandset ? 'Navigation' : 'DrawerRoot'));
  };

  const unlockWithBiometrics = async () => {
    if (await isStorageEncrypted()) {
      unlockWithKey();
    } else {
      setIsAuthenticating(true);

      if (await Biometric.unlockWithBiometrics()) {
        setIsAuthenticating(false);
        await startAndDecrypt();
        return successfullyAuthenticated();
      }
      setIsAuthenticating(false);
    }
  };

  const unlockWithKey = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    if (await startAndDecrypt()) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      successfullyAuthenticated();
    } else {
      setIsAuthenticating(false);
    }
  };

  const renderUnlockOptions = () => {
    if (isAuthenticating) {
      return <ActivityIndicator />;
    } else {
      const color = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
      if ((biometricType === Biometric.TouchID || biometricType === Biometric.Biometrics) && !isStorageEncryptedEnabled) {
        return (
          <TouchableOpacity accessibilityRole="button" disabled={isAuthenticating} onPress={unlockWithBiometrics}>
            <Icon name="fingerprint" size={64} type="font-awesome5" color={color} />
          </TouchableOpacity>
        );
      } else if (biometricType === Biometric.FaceID && !isStorageEncryptedEnabled) {
        return (
          <TouchableOpacity accessibilityRole="button" disabled={isAuthenticating} onPress={unlockWithBiometrics}>
            <Image
              source={colorScheme === 'dark' ? require('./img/faceid-default.png') : require('./img/faceid-dark.png')}
              style={styles.icon}
            />
          </TouchableOpacity>
        );
      } else if (isStorageEncryptedEnabled) {
        return (
          <TouchableOpacity accessibilityRole="button" disabled={isAuthenticating} onPress={unlockWithKey}>
            <Icon name="lock" size={64} type="font-awesome5" color={color} />
          </TouchableOpacity>
        );
      }
    }
  };

  const startUnlock = async () => {
    if (unlockOnComponentMount) {
      const storageIsEncrypted = await isStorageEncrypted();
      setIsStorageEncryptedEnabled(storageIsEncrypted);
      let type; // Use `type` directly to hold the biometric type info
      if (await Biometric.isBiometricUseCapableAndEnabled()) {
        type = await Biometric.biometricType(); // Directly assign the result to `type`
        // Assuming biometricType() returns "Touch ID", "Face ID", "Biometrics", or true
        if (type === true) {
          // If true means biometrics are available but the type is unknown, you might set a descriptive string
          setBiometricType('Biometrics');
          type = 'Biometrics'; // Update `type` for subsequent checks
        } else if (typeof type === 'string') {
          setBiometricType(type);
        } else {
          // Handle the case where biometrics are not available or the type is not a string
          setBiometricType(undefined);
          type = undefined; // Ensure `type` reflects this state
        }
      }
      // Use `type` for condition checks
      if (!type || storageIsEncrypted) {
        unlockWithKey();
      } else if (typeof type === 'string') {
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

export default UnlockWith;
