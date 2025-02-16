import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Animated, Easing, ViewStyle, Keyboard, Platform, UIManager, ScrollView } from 'react-native';
import BottomModal, { BottomModalHandle } from './BottomModal';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { SecondButton } from './SecondButton';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { useKeyboard } from '../hooks/useKeyboard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const MODAL_TYPES = {
  ENTER_PASSWORD: 'ENTER_PASSWORD',
  CREATE_PASSWORD: 'CREATE_PASSWORD',
  CREATE_FAKE_STORAGE: 'CREATE_FAKE_STORAGE',
  SUCCESS: 'SUCCESS',
} as const;

export type ModalType = (typeof MODAL_TYPES)[keyof typeof MODAL_TYPES];

interface PromptPasswordConfirmationModalProps {
  modalType: ModalType;
  onConfirmationSuccess: (password: string) => Promise<boolean>;
  onConfirmationFailure: () => void;
}

export interface PromptPasswordConfirmationModalHandle {
  present: () => Promise<void>;
  dismiss: () => Promise<void>;
}

const PromptPasswordConfirmationModal = forwardRef<PromptPasswordConfirmationModalHandle, PromptPasswordConfirmationModalProps>(
  ({ modalType, onConfirmationSuccess, onConfirmationFailure }, ref) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false); // State to toggle between explanation and password input for CREATE_PASSWORD and CREATE_FAKE_STORAGE
    const modalRef = useRef<BottomModalHandle>(null);
    const fadeOutAnimation = useRef(new Animated.Value(1)).current;
    const fadeInAnimation = useRef(new Animated.Value(0)).current;
    const scaleAnimation = useRef(new Animated.Value(1)).current;
    const shakeAnimation = useRef(new Animated.Value(0)).current;
    const explanationOpacity = useRef(new Animated.Value(1)).current; // New animated value for opacity
    const { colors } = useTheme();
    const passwordInputRef = useRef<TextInput>(null);
    const confirmPasswordInputRef = useRef<TextInput>(null);
    const scrollView = useRef<ScrollView>(null);
    const { isVisible } = useKeyboard();

    const stylesHook = StyleSheet.create({
      modalContent: {
        backgroundColor: colors.elevated,
        width: '100%',
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
    });

    useImperativeHandle(ref, () => ({
      present: async () => {
        resetState();
        modalRef.current?.present();
        if (modalType === MODAL_TYPES.CREATE_PASSWORD || (modalType === MODAL_TYPES.CREATE_FAKE_STORAGE && !showExplanation)) {
          passwordInputRef.current?.focus();
        } else if (modalType === MODAL_TYPES.ENTER_PASSWORD) {
          passwordInputRef.current?.focus();
        }
      },
      dismiss: async () => {
        await modalRef.current?.dismiss();
        resetState();
      },
    }));

    const resetState = () => {
      setPassword('');
      setConfirmPassword('');
      setIsSuccess(false);
      setIsLoading(false);
      fadeOutAnimation.setValue(1);
      fadeInAnimation.setValue(0);
      scaleAnimation.setValue(1);
      shakeAnimation.setValue(0);
      explanationOpacity.setValue(1);
      setShowExplanation(modalType === MODAL_TYPES.CREATE_PASSWORD);
    };

    useEffect(() => {
      resetState();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modalType]);

    const handleShakeAnimation = () => {
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 5,
          duration: 100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -5,
          duration: 100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        confirmPasswordInputRef.current?.focus();
        confirmPasswordInputRef.current?.setNativeProps({ selection: { start: 0, end: confirmPassword.length } });
      });
    };

    const handleSuccessAnimation = () => {
      // Step 1: Cross-fade current content out and success content in
      Animated.timing(fadeOutAnimation, {
        toValue: 0, // Fade out current content
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setIsSuccess(true);

        Animated.timing(fadeInAnimation, {
          toValue: 1, // Fade in success content
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          // Step 2: Perform any additional animations like scaling if necessary
          Animated.timing(scaleAnimation, {
            toValue: 1.1,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start(() => {
            Animated.timing(scaleAnimation, {
              toValue: 1, // Return scale to normal size
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }).start(() => {
              // Optional delay before dismissing the modal
              setTimeout(async () => {
                await modalRef.current?.dismiss();
              }, 1000);
            });
          });
        });
      });
    };

    const handleSubmit = async () => {
      Keyboard.dismiss();
      setIsLoading(true);
      let success = false;

      try {
        if (modalType === MODAL_TYPES.CREATE_PASSWORD || modalType === MODAL_TYPES.CREATE_FAKE_STORAGE) {
          if (password === confirmPassword && password) {
            success = await onConfirmationSuccess(password);
            if (success) {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
              handleSuccessAnimation();
            } else {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
              onConfirmationFailure();
              if (!isSuccess) {
                // Prevent shake animation if success is detected
                handleShakeAnimation();
              }
            }
          } else {
            triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
            if (!isSuccess) {
              // Prevent shake animation if success is detected
              handleShakeAnimation();
            }
          }
        } else if (modalType === MODAL_TYPES.ENTER_PASSWORD) {
          success = await onConfirmationSuccess(password);
          if (success) {
            triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
            handleSuccessAnimation();
          } else {
            triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
            if (!isSuccess) {
              // Prevent shake animation if success is detected
              handleShakeAnimation();
            }
            onConfirmationFailure();
          }
        }
      } finally {
        setIsLoading(false); // Ensure loading state is reset
        if (success) {
          // Ensure shake animation is reset before starting the success animation
          shakeAnimation.setValue(0);
        }
      }
    };

    const handleTransitionToCreatePassword = () => {
      Animated.timing(explanationOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowExplanation(false);
        explanationOpacity.setValue(1); // Reset opacity for when transitioning back
        passwordInputRef.current?.focus();
      });
    };

    const handleCancel = async () => {
      onConfirmationFailure();
      await modalRef.current?.dismiss();
    };

    const animatedViewStyle: Animated.WithAnimatedObject<ViewStyle> = {
      opacity: fadeOutAnimation,
      transform: [{ scale: scaleAnimation }],
      width: '100%',
    };

    const onModalDismiss = () => {
      resetState();
      onConfirmationFailure();
    };

    return (
      <BottomModal
        ref={modalRef}
        onDismiss={onModalDismiss}
        grabber={false}
        showCloseButton={!isSuccess}
        onCloseModalPressed={handleCancel}
        backgroundColor={colors.modal}
        isGrabberVisible={!isSuccess}
        scrollRef={scrollView}
        dismissible={false}
        footer={
          !isSuccess ? (
            showExplanation && modalType === MODAL_TYPES.CREATE_PASSWORD ? (
              <Animated.View style={[{ opacity: explanationOpacity }, styles.feeModalFooterSpacing]}>
                <SecondButton
                  title={loc.settings.i_understand}
                  onPress={handleTransitionToCreatePassword}
                  disabled={isLoading}
                  testID="IUnderstandButton"
                />
              </Animated.View>
            ) : (
              <Animated.View style={[{ opacity: fadeOutAnimation, transform: [{ scale: scaleAnimation }] }, styles.feeModalFooter]}>
                {!isVisible && (
                  <SecondButton
                    title={isLoading ? '' : loc._.ok}
                    onPress={handleSubmit}
                    testID="OKButton"
                    loading={isLoading}
                    disabled={isLoading || !password || (modalType === MODAL_TYPES.CREATE_PASSWORD && !confirmPassword)}
                  />
                )}
              </Animated.View>
            )
          ) : null
        }
      >
        {!isSuccess && (
          <Animated.View style={[animatedViewStyle, styles.minHeight]}>
            {modalType === MODAL_TYPES.CREATE_PASSWORD && showExplanation && (
              <Animated.View style={{ opacity: explanationOpacity }}>
                <Text style={[styles.textLabel, stylesHook.feeModalLabel]}>{loc.settings.encrypt_storage_explanation_headline}</Text>
                <Animated.ScrollView style={styles.explanationScrollView} ref={scrollView}>
                  <Text style={[styles.description, stylesHook.feeModalCustomText]}>
                    {loc.settings.encrypt_storage_explanation_description_line1}
                  </Text>
                  <Text style={[styles.description, stylesHook.feeModalCustomText]}>
                    {loc.settings.encrypt_storage_explanation_description_line2}
                  </Text>
                </Animated.ScrollView>
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
                      ref={passwordInputRef}
                      secureTextEntry
                      placeholder="Password"
                      value={password}
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
                        ref={confirmPasswordInputRef}
                        secureTextEntry
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        clearTextOnFocus
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
        )}
        {isSuccess && (
          <Animated.View
            style={{
              opacity: fadeInAnimation,
              transform: [{ scale: scaleAnimation }],
            }}
          >
            <View style={styles.successContainer}>
              <View style={styles.circle}>
                <Animated.Text
                  style={[
                    styles.checkmark,
                    {
                      transform: [
                        {
                          scale: scaleAnimation.interpolate({
                            inputRange: [0.8, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  ✔️
                </Animated.Text>
              </View>
            </View>
          </Animated.View>
        )}
      </BottomModal>
    );
  },
);

export default PromptPasswordConfirmationModal;

const styles = StyleSheet.create({
  modalContent: {
    padding: 22,
    width: '100%', // Ensure modal content takes full width
    justifyContent: 'center',
    alignItems: 'center',
  },
  minHeight: {
    minHeight: 280,
  },
  feeModalFooter: {
    padding: 16,
  },
  feeModalFooterSpacing: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 10,
    width: '100%', // Ensure full width
  },
  input: {
    borderRadius: 4,
    padding: 8,
    marginVertical: 8,
    fontSize: 16,
    width: '100%', // Ensure full width
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
  successContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 100,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'green',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 30,
  },
  explanationScrollView: {
    maxHeight: 200,
  },
});
