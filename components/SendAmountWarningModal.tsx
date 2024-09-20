import React, { forwardRef, useImperativeHandle, useRef } from 'react';
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

  useImperativeHandle(ref, () => ({
    present: () => {
      modalRef.current?.present();
      hapticIntervalRef.current = setInterval(() => {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
      }, 500); // 500ms interval for "heart beat" effect due to severity of warning

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

  return (
    <BottomModal
      ref={modalRef}
      onClose={onCancel}
      grabber={false}
      dismissible={false}
      footer={
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            testID="HighFeeWarningContinueButton"
            style={[styles.button, { backgroundColor: colors.buttonBackgroundColor }]}
            onPress={onProceed}
          >
            <Text style={[styles.buttonText, { color: colors.buttonTextColor }]}>{loc._.continue}</Text>
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
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default SendAmountWarning;
