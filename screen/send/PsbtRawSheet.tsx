import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';

import BlueCard from '../../components/BlueCard';
import BlueText from '../../components/BlueText';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';

const COPY_FEEDBACK_MS = 1500;

const PsbtRawSheet = () => {
  const route = useRoute<RouteProp<SendDetailsStackParamList, 'PsbtRaw'>>();
  const { colors } = useTheme();
  const { psbtBase64 } = route.params;
  const [copied, setCopied] = useState(false);
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }
    },
    [],
  );

  const onCopy = useCallback(() => {
    if (copied || !psbtBase64) {
      return;
    }

    if (copyResetTimeoutRef.current) {
      clearTimeout(copyResetTimeoutRef.current);
    }

    Clipboard.setString(psbtBase64);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    setCopied(true);
    copyResetTimeoutRef.current = setTimeout(() => {
      copyResetTimeoutRef.current = null;
      setCopied(false);
    }, COPY_FEEDBACK_MS);
  }, [copied, psbtBase64]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.elevated }]} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BlueCard style={styles.wrap}>
          <BlueText style={[styles.label, { color: colors.foregroundColor }]}>{loc.send.psbt_raw_helper}</BlueText>
          <View style={styles.cardTx}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={copied ? loc._.copied : psbtBase64}
              testID="PsbtRawCopy"
              style={[styles.cardTxCopy, copied && styles.cardTxCopyCopied]}
              onPress={onCopy}
              disabled={copied}
              activeOpacity={0.7}
            >
              <Text testID="PsbtRawValue" style={[styles.cardTxText, copied && styles.cardTxTextCopied]}>
                {copied ? loc._.copied : psbtBase64}
              </Text>
            </TouchableOpacity>
          </View>
        </BlueCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  wrap: {
    alignItems: 'center',
    width: '100%',
  },
  label: {
    fontWeight: '500',
    alignSelf: 'stretch',
  },
  cardTx: {
    alignSelf: 'stretch',
    borderColor: '#ebebeb',
    backgroundColor: '#d2f8d6',
    borderRadius: 12,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 160,
  },
  cardTxCopy: {
    width: '100%',
    minHeight: 128,
    justifyContent: 'flex-start',
  },
  cardTxCopyCopied: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTxText: {
    color: '#37c0a1',
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'left',
  },
  cardTxTextCopied: {
    textAlign: 'center',
  },
});

export default PsbtRawSheet;
