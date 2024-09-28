import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager, Animated } from 'react-native';
import { useTheme } from '../components/themes';
import BottomModal, { BottomModalHandle } from '../components/BottomModal';
import loc from '../loc';
import triggerHapticFeedback, { HapticFeedbackTypes, stopHapticFeedback } from '../blue_modules/hapticFeedback';

export interface SendAmountWarningHandle {
  present: () => void;
  dismiss: () => void;
}

interface SendAmountWarningProps {
  feePercentage: number;
  onProceed: () => void;
  onCancel: () => void;
}

const SendAmountWarning = forwardRef<SendAmountWarningHandle, SendAmountWarningProps>(({ feePercentage, onProceed, onCancel }, ref) => {
  const { colors } = useTheme();
  const modalRef = useRef<BottomModalHandle>(null);
  const hapticIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const glowAnim = useRef(new Animated.Value(0)).current;
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const progressOpacityAnim = useRef(new Animated.Value(1)).current;

  useImperativeHandle(ref, () => ({
    present: () => {
      modalRef.current?.present();
      setIsButtonEnabled(false);
      buttonAnim.setValue(0);
      progressOpacityAnim.setValue(1);

      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 3000, // 3 seconds
        useNativeDriver: false,
      }).start(() => {
        setIsButtonEnabled(true);
        Animated.timing(progressOpacityAnim, {
          toValue: 0,
          duration: 500, // 0.5 seconds
          useNativeDriver: true,
        }).start();
      });

      hapticIntervalRef.current = setInterval(() => {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
      }, 500);

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    },
    dismiss: async () => {
      await modalRef.current?.dismiss();
      buttonAnim.stopAnimation();
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }
      stopHapticFeedback();
    },
  }));

  const glowInterpolate = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 0, 0, 0)', 'rgba(255, 0, 0, 0.5)'],
  });

  const buttonProgressWidth = buttonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const buttonStyle = isButtonEnabled
    ? [styles.button, { backgroundColor: colors.buttonBackgroundColor }]
    : [styles.button, styles.buttonDisabled];

  return (
    <BottomModal
      ref={modalRef}
      onClose={onCancel}
      grabber={false}
      dismissible={false}
      footer={
        <View style={styles.buttonsContainer}>
          <TouchableOpacity testID="HighFeeWarningContinueButton" style={buttonStyle} onPress={onProceed} disabled={!isButtonEnabled}>
            {!isButtonEnabled && (
              <Animated.View
                style={[
                  styles.buttonProgress,
                  {
                    width: buttonProgressWidth,
                    opacity: progressOpacityAnim,
                  },
                ]}
              />
            )}
            <Text
              style={[styles.buttonText, { color: isButtonEnabled ? colors.buttonTextColor : colors.buttonDisabledTextColor || '#888' }]}
            >
              {loc._.continue}
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.container}>
        <Animated.View style={[styles.titleContainer, { shadowColor: glowInterpolate }]}>
          <Text testID="HighFeeWarningTitle" style={[styles.title, { color: colors.redText }]}>
            {loc.send.high_fee_warning}
          </Text>
        </Animated.View>
        <Text style={[styles.message, { color: colors.labelText }]}>
          {loc.formatString(loc.send.high_fee_warning_message, {
            percentage: <Text style={styles.feePercentage}>{`${feePercentage.toFixed(2)}%`}</Text>,
          })}
        </Text>
      </View>
    </BottomModal>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  titleContainer: {
    marginVertical: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  feePercentage: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 36,
    marginBottom: 36,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 5,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 1,
  },
});

export default SendAmountWarning;
