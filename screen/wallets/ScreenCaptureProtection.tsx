import React, { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { findNodeHandle, StyleSheet, View } from 'react-native';
import { CaptureEventType, CaptureProtection } from 'react-native-capture-protection';
import ActionSheet from '../ActionSheet';
import BlueText from '../../components/BlueText';
import { useTheme } from '../../components/themes';
import loc from '../../loc';

type Props = PropsWithChildren<{
  enabled: boolean;
}>;

const ScreenCaptureProtection: React.FC<Props> = ({ children, enabled }) => {
  const anchorRef = useRef<View>(null);
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const { colors } = useTheme();

  const showScreenshotAlert = useCallback(() => {
    const anchor = findNodeHandle(anchorRef.current);
    if (anchor === null) return;

    ActionSheet.showActionSheetWithOptions(
      {
        title: loc.settings.screen_capture_protection_title,
        message: loc.settings.screen_capture_protection_message,
        options: [loc._.ok],
        cancelButtonIndex: 0,
        anchor,
      },
      () => {},
    );
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsScreenRecording(false);
      return;
    }

    CaptureProtection.isScreenRecording().then(recording => setIsScreenRecording(Boolean(recording)));
    const subscription = CaptureProtection.addListener(eventType => {
      switch (eventType) {
        case CaptureEventType.CAPTURED:
          showScreenshotAlert();
          break;
        case CaptureEventType.RECORDING:
          setIsScreenRecording(true);
          break;
        case CaptureEventType.END_RECORDING:
          setIsScreenRecording(false);
          break;
      }
    });

    return () => {
      if (subscription) CaptureProtection.removeListener(subscription);
    };
  }, [enabled, showScreenshotAlert]);

  return (
    <View ref={anchorRef} style={styles.root} collapsable={false}>
      {isScreenRecording ? (
        <View style={styles.messageContainer}>
          <BlueText style={[styles.message, { color: colors.foregroundColor }]}>{loc.settings.screen_capture_protection_message}</BlueText>
        </View>
      ) : (
        children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  messageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  message: {
    fontSize: 17,
    textAlign: 'center',
  },
});

export default ScreenCaptureProtection;
