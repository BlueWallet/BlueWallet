import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
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
import { ACTIONS, initialState, reducer } from './PromptPasswordConfirmationSheet.reducer';
import { useStorage } from '../hooks/context/useStorage';
import presentAlert from '../components/Alert';

type DynamicStyles = {
  modalContent: ViewStyle;
  input: TextStyle;
  feeModalCustomText: TextStyle;
  feeModalLabel: TextStyle;
};

const SHAKE_KEYFRAMES = [10, -10, 5, -5, 0];

const runShake = (value: Animated.Value) => {
  Animated.sequence(
    SHAKE_KEYFRAMES.map(toValue =>
      Animated.timing(value, {
        toValue,
        duration: 100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ),
  ).start();
};

const PromptPasswordConfirmationSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DetailViewStackParamList>>();
  const route = useRoute<RouteProp<DetailViewStackParamList, 'PromptPasswordConfirmationSheet'>>();
  const { modalType = MODAL_TYPES.ENTER_PASSWORD, returnTo } = route.params ?? {};

  const [state, dispatch] = useReducer(reducer, modalType, initialState);
  const { password, confirmPassword, isLoading, showExplanation } = state;

  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const explanationOpacity = useRef(new Animated.Value(1)).current;

  const { colors } = useTheme();
  const { encryptStorage, decryptStorage, saveToDisk, cachedPassword, isPasswordInUse, createFakeStorage, resetWallets } = useStorage();

  const isCreatePassword = modalType === MODAL_TYPES.CREATE_PASSWORD;
  const isCreateFake = modalType === MODAL_TYPES.CREATE_FAKE_STORAGE;
  const isCreateFlow = isCreatePassword || isCreateFake;
  const showPasswordForm = !isCreatePassword || !showExplanation;

  const stylesHook = useMemo<DynamicStyles>(
    () => ({
      modalContent: { backgroundColor: colors.elevated },
      input: {
        backgroundColor: colors.inputBackgroundColor,
        borderColor: colors.formBorder,
        color: colors.foregroundColor,
        width: '100%',
      },
      feeModalCustomText: { color: colors.buttonAlternativeTextColor },
      feeModalLabel: { color: colors.successColor },
    }),
    [colors],
  );

  useEffect(() => {
    dispatch({ type: ACTIONS.RESET, payload: modalType });
    shakeAnimation.setValue(0);
    explanationOpacity.setValue(1);
  }, [modalType, shakeAnimation, explanationOpacity]);

  const failWithShake = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    runShake(shakeAnimation);
  }, [shakeAnimation]);

  const runAction = useCallback(async (): Promise<boolean> => {
    if (returnTo === 'EncryptStorage') {
      if (isCreatePassword) {
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
        navigation.dispatch(StackActions.popToTop());
        return true;
      }
    }

    if (returnTo === 'PlausibleDeniability' && isCreateFake) {
      const inUse = password === cachedPassword || (await isPasswordInUse(password));
      if (inUse) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc.plausibledeniability.password_should_not_match });
        return false;
      }
      await createFakeStorage(password);
      resetWallets();
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      navigation.dispatch(StackActions.popToTop());
      return true;
    }

    return false;
  }, [
    returnTo,
    modalType,
    isCreatePassword,
    isCreateFake,
    password,
    encryptStorage,
    decryptStorage,
    saveToDisk,
    navigation,
    cachedPassword,
    isPasswordInUse,
    createFakeStorage,
    resetWallets,
  ]);

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();

    if (isCreateFlow && password && confirmPassword && password !== confirmPassword) {
      failWithShake();
      presentAlert({ message: loc.settings.passwords_do_not_match });
      return;
    }

    const invalid = isCreateFlow ? !password || password !== confirmPassword : !password;
    if (invalid) {
      failWithShake();
      return;
    }

    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const success = await runAction();
      if (!success) triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    } catch (error) {
      presentAlert({ message: (error as Error).message });
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, [isCreateFlow, password, confirmPassword, failWithShake, runAction]);

  const handleTransitionToCreatePassword = useCallback(() => {
    Animated.timing(explanationOpacity, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start(() => {
      dispatch({ type: ACTIONS.HIDE_EXPLANATION });
      explanationOpacity.setValue(1);
    });
  }, [explanationOpacity]);

  const headerText = isCreatePassword
    ? loc.settings.password_explain
    : isCreateFake
      ? `${loc.settings.password_explain} ${loc.plausibledeniability.create_password_explanation}`
      : loc._.enter_password;

  return (
    <SafeAreaView style={[styles.modalContent, stylesHook.modalContent]} edges={['bottom', 'left', 'right']}>
      <View style={styles.flex}>
        <View style={styles.padding} />
        <Animated.View style={[styles.fullWidth, styles.minHeight]}>
          {isCreatePassword && showExplanation && (
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
          {showPasswordForm && (
            <>
              <Text adjustsFontSizeToFit style={[styles.textLabel, stylesHook.feeModalLabel]}>
                {headerText}
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
                    onChangeText={text => dispatch({ type: ACTIONS.SET_PASSWORD, payload: text })}
                    style={[styles.input, stylesHook.input]}
                    clearTextOnFocus
                    clearButtonMode="while-editing"
                    autoFocus
                  />
                </Animated.View>
                {isCreateFlow && (
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
                      onChangeText={text => dispatch({ type: ACTIONS.SET_CONFIRM_PASSWORD, payload: text })}
                      style={[styles.input, stylesHook.input]}
                    />
                  </Animated.View>
                )}
              </View>
            </>
          )}
        </Animated.View>

        <View style={styles.footerContainer}>
          {showExplanation && isCreatePassword ? (
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
                disabled={isLoading || !password || (isCreatePassword && !confirmPassword)}
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
  fullWidth: {
    width: '100%',
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
