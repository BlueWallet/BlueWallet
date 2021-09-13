import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
  useColorScheme,
  LayoutAnimation,
} from 'react-native';
import { Icon } from 'react-native-elements';
import Biometric from './class/biometrics';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { BlueStorageContext } from './blue_modules/storage-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import JailMonkey from 'jail-monkey';
import loc from './loc';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  biometric: {
    flex: 1,
    justifyContent: 'flex-end',
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
  encrypted: {
    width: 0.5,
    height: 20,
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
  const [isJailBreakRiskAccepted, setIsJailBreakRiskAccepted] = useState(false);

  const initialRender = async () => {
    let biometricType = false;
    if (await Biometric.isBiometricUseCapableAndEnabled()) {
      biometricType = await Biometric.biometricType();
    }

    setBiometricType(biometricType);
  };

  useEffect(() => {
    JailMonkey.isDebuggedMode()
      .then(isDebuggedMode => {
        if (isDebuggedMode) {
          setIsJailBreakRiskAccepted(true);
        } else {
          const isJailBroken = JailMonkey.isJailBroken();
          if (isJailBroken) {
            Alert.alert(
              loc._.warning,
              loc.jailbreak.jailbreak_warning,
              [{ text: loc._.continue, onPress: () => setIsJailBreakRiskAccepted(true), style: 'default' }],
              { cancelable: false },
            );
          } else {
            setIsJailBreakRiskAccepted(true);
          }
        }
      })
      .catch(e => {
        console.log(e);
        setIsJailBreakRiskAccepted(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isJailBreakRiskAccepted) {
      initialRender();
    }
  }, [isJailBreakRiskAccepted]);

  const successfullyAuthenticated = () => {
    setWalletsInitialized(true);
    dispatch(StackActions.replace('DrawerRoot'));
  };

  const unlockWithBiometrics = async () => {
    if (await isStorageEncrypted()) {
      unlockWithKey();
    }
    setIsAuthenticating(true);

    if (await Biometric.unlockWithBiometrics()) {
      setIsAuthenticating(false);
      await startAndDecrypt();
      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
      return successfullyAuthenticated();
    }
    setIsAuthenticating(false);
  };

  const unlockWithKey = async () => {
    setIsAuthenticating(true);
    if (await startAndDecrypt()) {
      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      <StatusBar barStyle="default" />
      <View style={styles.container}>
        {isJailBreakRiskAccepted && (
          <>
            <LottieView source={require('./img/bluewalletsplash.json')} autoPlay loop={false} onAnimationFinish={onAnimationFinish} />
            <View style={styles.biometric}>{animationDidFinish && <View style={styles.biometricRow}>{renderUnlockOptions()}</View>}</View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default UnlockWith;
