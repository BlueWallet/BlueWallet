import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteProp, StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Animated, Easing, Keyboard, StyleSheet, Text, TextInput, View, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SecondButton } from '../components/SecondButton';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList';
import { MODAL_TYPES } from './PromptPasswordConfirmationSheet.types';
import { useStorage } from '../hooks/context/useStorage';
import presentAlert from '../components/Alert';

type DynamicStyles = {
  modalContent: ViewStyle;
  input: TextStyle;
  feeModalCustomText: TextStyle;
  feeModalLabel: TextStyle;
};

const PromptPasswordConfirmationSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DetailViewStackParamList>>();
  const route = useRoute<RouteProp<DetailViewStackParamList, 'PromptPasswordConfirmationSheet'>>();
  const { modalType = MODAL_TYPES.ENTER_PASSWORD, returnTo } = route.params ?? {};

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(modalType === MODAL_TYPES.CREATE_PASSWORD);

  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const explanationOpacity = useRef(new Animated.Value(1)).current;

  const { colors } = useTheme();
  const { encryptStorage, decryptStorage, saveToDisk, cachedPassword, isPasswordInUse, createFakeStorage, resetWallets } = useStorage();

  const stylesHook = useMemo<DynamicStyles>(
    () => ({
      modalContent: {
        backgroundColor: colors.elevated,
      },
      input: {
        backgroundColor: colors.inputBackgroundColor,
        borderColor: colors.formBorder,
        color: colors.foregroundColor,
        width: '100%',
      },
      feeModalCustomText: {
        color: colors.buttonAlternativeTextColor,
      },
      feeModalLabel: {
        color: colors.successColor,
      },
    }),
    [colors],
  );

  const resetState = useCallback(() => {
    setPassword('');
    setConfirmPassword('');
    setIsLoading(false);
    shakeAnimation.setValue(0);
    explanationOpacity.setValue(1);
    setShowExplanation(modalType === MODAL_TYPES.CREATE_PASSWORD);
  }, [modalType, shakeAnimation, explanationOpacity]);

  useEffect(() => {
    resetState();
  }, [modalType, resetState]);

  const performShake = (shakeAnimRef: Animated.Value) => {
    Animated.sequence([
      Animated.timing(shakeAnimRef, {
        toValue: 10,
        duration: 100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimRef, {
        toValue: -10,
        duration: 100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimRef, {
        toValue: 5,
        duration: 100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimRef, {
        toValue: -5,
        duration: 100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimRef, {
        toValue: 0,
        duration: 100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleShakeAnimation = () => {
    triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    performShake(shakeAnimation);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setIsLoading(true);

    const isCreateFlow = modalType === MODAL_TYPES.CREATE_PASSWORD || modalType === MODAL_TYPES.CREATE_FAKE_STORAGE;
    if (isCreateFlow) {
      if (!password || password !== confirmPassword) {
        setIsLoading(false);
        return handleShakeAnimation();
      }
    } else if (!password) {
      setIsLoading(false);
      return handleShakeAnimation();
    }

    const runAction = async () => {
      if (returnTo === 'EncryptStorage') {
        if (modalType === MODAL_TYPES.CREATE_PASSWORD) {
          await encryptStorage(password);
          await saveToDisk();
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
          navigation.goBack();
          return true;
        }
        if (modalType === MODAL_TYPES.ENTER_PASSWORD) {
          await decryptStorage(password);
          await saveToDisk();
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
          const action = StackActions.popToTop();
          navigation.dispatch(action);
          return true;
        }
      }

      if (returnTo === 'PlausibleDeniability' && modalType === MODAL_TYPES.CREATE_FAKE_STORAGE) {
        const isProvidedPasswordInUse = password === cachedPassword || (await isPasswordInUse(password));
        if (isProvidedPasswordInUse) {
          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
          presentAlert({ message: loc.plausibledeniability.password_should_not_match });
          return false;
        }

        await createFakeStorage(password);
        resetWallets();
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        const popToTop = StackActions.popToTop();
        navigation.dispatch(popToTop);
        return true;
      }

      return false;
    };

    try {
      const success = await runAction();
      if (!success) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      }
    } catch (error) {
      presentAlert({ message: (error as Error).message });
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransitionToCreatePassword = () => {
    Animated.timing(explanationOpacity, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start(() => {
      setShowExplanation(false);
      explanationOpacity.setValue(1);
    });
  };

  const animatedViewStyle: Animated.WithAnimatedObject<any> = {
    width: '100%',
  };

  return (
    <SafeAreaView style={[styles.modalContent, stylesHook.modalContent]} edges={['bottom', 'left', 'right']}>
      <View style={styles.flex}>
        <View style={styles.padding} />
        <Animated.View style={[animatedViewStyle, styles.minHeight]}>
          {modalType === MODAL_TYPES.CREATE_PASSWORD && showExplanation && (
            <Animated.View style={{ opacity: explanationOpacity }}>
              <Text style={[styles.textLabel, stylesHook.feeModalLabel]}>{loc.settings.encrypt_storage_explanation_headline}</Text>
              <Animated.View>
                <Text style={[styles.description, stylesHook.feeModalCustomText]} maxFontSizeMultiplier={1.2}>
                  {loc.settings.encrypt_storage_explanation_description_line1}
                </Text>
                <Text style={[styles.description, stylesHook.feeModalCustomText]} maxFontSizeMultiplier={1.2}>
                  {loc.settings.encrypt_storage_explanation_description_line2}
                </Text>
              </Animated.View>
              <View style={styles.feeModalFooter} />
            </Animated.View>
          )}
          {(modalType === MODAL_TYPES.ENTER_PASSWORD ||
            ((modalType === MODAL_TYPES.CREATE_PASSWORD || modalType === MODAL_TYPES.CREATE_FAKE_STORAGE) && !showExplanation)) && (
            <>
              <Text adjustsFontSizeToFit style={[styles.textLabel, stylesHook.feeModalLabel]}>
                {modalType === MODAL_TYPES.CREATE_PASSWORD
                  ? loc.settings.password_explain
                  : modalType === MODAL_TYPES.CREATE_FAKE_STORAGE
                    ? `${loc.settings.password_explain} ${loc.plausibledeniability.create_password_explanation}`
                    : loc._.enter_password}
              </Text>
              <View style={styles.inputContainer}>
                <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
                  <TextInput
                    testID="PasswordInput"
                    secureTextEntry
                    placeholder="Password"
                    value={password}
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect={false}
                    onChangeText={setPassword}
                    style={[styles.input, stylesHook.input]}
                    clearTextOnFocus
                    clearButtonMode="while-editing"
                    autoFocus
                  />
                </Animated.View>
                {(modalType === MODAL_TYPES.CREATE_PASSWORD || modalType === MODAL_TYPES.CREATE_FAKE_STORAGE) && (
                  <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
                    <TextInput
                      testID="ConfirmPasswordInput"
                      secureTextEntry
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      clearTextOnFocus
                      autoCorrect={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      clearButtonMode="while-editing"
                      onChangeText={setConfirmPassword}
                      style={[styles.input, stylesHook.input]}
                    />
                  </Animated.View>
                )}
              </View>
            </>
          )}
        </Animated.View>

        <View style={styles.footerContainer}>
          {showExplanation && modalType === MODAL_TYPES.CREATE_PASSWORD ? (
            <Animated.View style={[{ opacity: explanationOpacity }, styles.feeModalFooterSpacing]}>
              <SecondButton
                title={loc.settings.i_understand}
                onPress={handleTransitionToCreatePassword}
                disabled={isLoading}
                testID="IUnderstandButton"
              />
            </Animated.View>
          ) : (
            <View style={styles.feeModalFooterSpacing}>
              <SecondButton
                title={isLoading ? '' : loc._.ok}
                onPress={handleSubmit}
                testID="OKButton"
                loading={isLoading}
                disabled={isLoading || !password || (modalType === MODAL_TYPES.CREATE_PASSWORD && !confirmPassword)}
              />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PromptPasswordConfirmationSheet;

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    padding: 22,
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  padding: {
    paddingTop: 6,
  },
  minHeight: {
    minHeight: 420,
  },
  feeModalFooter: {
    padding: 16,
  },
  feeModalFooterSpacing: {
    padding: 12,
    gap: 12,
  },
  inputContainer: {
    marginBottom: 10,
    width: '100%',
  },
  input: {
    borderRadius: 4,
    padding: 8,
    marginVertical: 8,
    fontSize: 16,
    width: '100%',
    borderWidth: 1,
  },
  textLabel: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  footerContainer: {
    width: '100%',
  },
});
