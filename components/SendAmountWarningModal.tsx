import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

  useImperativeHandle(ref, () => ({
    present: () => {
      modalRef.current?.present();
      hapticIntervalRef.current = setInterval(() => {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
      }, 500); // 500ms interval for "heart beat" effect due to severity of warning
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
        <Text testID="HighFeeWarningTitle" style={[styles.title, { color: colors.redText }]}>
          {loc.send.high_fee_warning}
        </Text>
        <Text style={[styles.message, { color: colors.labelText }]}>
          {loc.send.high_fee_warning_message_part1}
          <Text style={styles.feePercentage}>{`${feePercentage.toFixed(2)}%`}</Text>
          {loc.send.high_fee_warning_message_part2}
        </Text>
      </View>
    </BottomModal>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
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
