import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommonActions, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Animated, Easing, Keyboard, StyleSheet, Text, TextInput, View, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SecondButton } from '../components/SecondButton';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { useKeyboard } from '../hooks/useKeyboard';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList';
import { MODAL_TYPES, PasswordSheetResult } from './PromptPasswordConfirmationSheet.types';

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
  const [hasCompleted, setHasCompleted] = useState(false);

  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const explanationOpacity = useRef(new Animated.Value(1)).current;

  const { colors } = useTheme();
  useKeyboard();

  useEffect(() => {
    navigation.setOptions({
      presentation: 'formSheet',
      headerTitle: modalType === MODAL_TYPES.ENTER_PASSWORD ? loc._.enter_password : loc.settings.password,
      sheetAllowedDetents: 'fitToContents',
      sheetGrabberVisible: true,
    });
  }, [modalType, navigation]);

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

  const sendResult = useCallback(
    (result: PasswordSheetResult) => {
      setHasCompleted(true);

      if (returnTo) {
        const targetRouteKey = navigation.getState().routes.find(r => r.name === returnTo)?.key;
        if (targetRouteKey) {
          navigation.dispatch(
            CommonActions.setParams({
              params: { passwordSheetResult: result },
              source: route.key,
              target: targetRouteKey,
            }),
          );
        }
      }

      navigation.goBack();
    },
    [navigation, returnTo, route.key],
  );

  useEffect(
    () => () => {
      if (!hasCompleted) {
        sendResult({ status: 'cancel', modalType });
      }
    },
    [hasCompleted, modalType, sendResult],
  );

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

    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    sendResult({ status: 'success', password, modalType });
    setIsLoading(false);
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

  const handleCancel = () => {
    sendResult({ status: 'cancel', modalType });
  };

  const animatedViewStyle: Animated.WithAnimatedObject<any> = {
    width: '100%',
  };

  return (
    <SafeAreaView style={[styles.modalContent, stylesHook.modalContent]} edges={['bottom', 'left', 'right']}>
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
            <SecondButton title={loc._.cancel} onPress={handleCancel} disabled={isLoading} testID="CancelButton" />
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
            <SecondButton title={loc._.cancel} onPress={handleCancel} disabled={isLoading} testID="CancelButton" />
          </View>
        )}
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
