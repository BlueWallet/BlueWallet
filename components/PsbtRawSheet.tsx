import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';

import BlueCard from './BlueCard';
import BlueText from './BlueText';
import CopyTextToClipboard from './CopyTextToClipboard';
import { useTheme } from './themes';
import loc from '../loc';
import { SendDetailsStackParamList } from '../navigation/SendDetailsStackParamList';

const PsbtRawSheet = () => {
  const route = useRoute<RouteProp<SendDetailsStackParamList, 'PsbtRaw'>>();
  const { colors } = useTheme();
  const { psbtBase64 } = route.params;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.elevated }]} edges={['bottom', 'left', 'right']}>
      <BlueCard style={styles.wrap}>
        <BlueText style={[styles.label, { color: colors.foregroundColor }]}>{loc.send.psbt_raw_helper}</BlueText>
        <View
          style={[
            styles.cardTx,
            {
              backgroundColor: colors.incomingBackgroundColor,
              borderColor: colors.formBorder,
            },
          ]}
        >
          <ScrollView
            style={styles.cardTxScroll}
            contentContainerStyle={styles.cardTxScrollContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <CopyTextToClipboard
              text={psbtBase64}
              truncated={false}
              accessibilityLabel={loc.send.psbt_raw_helper}
              style={[styles.cardTxText, { color: colors.incomingForegroundColor }]}
              containerStyle={styles.cardTxCopy}
              copiedContainerStyle={styles.cardTxCopyCopied}
              copiedTextStyle={styles.cardTxTextCopied}
              textTestID="PsbtRawValue"
              buttonTestID="PsbtRawCopy"
            />
          </ScrollView>
        </View>
      </BlueCard>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 160,
    maxHeight: 220,
    overflow: 'hidden',
  },
  cardTxScroll: {
    maxHeight: 188,
  },
  cardTxScrollContent: {
    flexGrow: 1,
  },
  cardTxCopy: {
    width: '100%',
    minHeight: 128,
    justifyContent: 'flex-start',
  },
  cardTxCopyCopied: {
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
  },
  cardTxText: {
    marginVertical: 0,
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'left',
  },
  cardTxTextCopied: {
    textAlign: 'center',
  },
});

export default PsbtRawSheet;
