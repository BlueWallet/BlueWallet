import React, { useContext, useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { Icon } from 'react-native-elements';
import Biometric from './class/biometrics';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { BlueStorageContext } from './blue_modules/storage-context';
import { isHandset } from './blue_modules/environment';
import triggerHapticFeedback, { HapticFeedbackTypes } from './blue_modules/hapticFeedback';
const lottieJson = require('./img/bluewalletsplash.json');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometric: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    marginBottom: 58,
  },
  biometricRow: {
    justifyContent: 'center',
    flexDirection: 'row',
  },
  icon: {
    width: 64,
    height: 64,
  },

  lottie: {
    width: lottieJson.w,
    height: lottieJson.h,
  },
});

const UnlockWith = () => {
  const { setWalletsInitialized, isStorageEncrypted, startAndDecrypt } = useContext(BlueStorageContext);
  const { dispatch } = useNavigation();
  const { unlockOnComponentMount } = useRoute().params;
  const [biometricType, setBiometricType] = useState(false);
  const [isStorageEncryptedEnabled, setIsStorageEncryptedEnabled] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [animationDidFinish, setAnimationDidFinish] = useState(false);
  const colorScheme = useColorScheme();

  const initialRender = async () => {
    let bt = false;
    if (await Biometric.isBiometricUseCapableAndEnabled()) {
      bt = await Biometric.biometricType();
    }

    setBiometricType(bt);
  };

  useEffect(() => {
    initialRender();
  }, []);

  const successfullyAuthenticated = () => {
    setWalletsInitialized(true);
    dispatch(StackActions.replace(isHandset ? 'Navigation' : 'DrawerRoot'));
  };

  const unlockWithBiometrics = async () => {
    if (isAuthenticating) return;
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

  const onAnimationFinish = async () => {
    if (unlockOnComponentMount) {
      const storageIsEncrypted = await isStorageEncrypted();
      setIsStorageEncryptedEnabled(storageIsEncrypted);
      if (!biometricType || storageIsEncrypted) {
        unlockWithKey();
      } else if (typeof biometricType === 'string') unlockWithBiometrics();
    }
    setAnimationDidFinish(true);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <LottieView source={lottieJson} autoPlay loop={false} onAnimationFinish={onAnimationFinish} style={styles.lottie} />
        <View style={styles.biometric}>{animationDidFinish && <View style={styles.biometricRow}>{renderUnlockOptions()}</View>}</View>
      </View>
    </SafeAreaView>
  );
};

export default UnlockWith;
