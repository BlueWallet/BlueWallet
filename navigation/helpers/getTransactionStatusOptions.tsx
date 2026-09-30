import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import BlueText from '../../components/BlueText';
import { useTheme } from '../../components/themes';

type TransactionHeader = { direction: string; date: string };
type TransactionStatusHeaderOptions = NativeStackNavigationOptions & {
  headerTitleContainerStyle?: { flex: number; maxWidth: number };
};

const TransactionDetailHeaderTitle = ({ direction, date }: TransactionHeader) => {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <View style={styles.container}>
      <BlueText
        style={[styles.direction, { color: colors.foregroundColor, lineHeight: Math.round(22 * fontScale) }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {direction}
      </BlueText>
      <BlueText
        style={[styles.date, { color: colors.alternativeTextColor, lineHeight: Math.round(18 * fontScale) }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {date}
      </BlueText>
    </View>
  );
};

export const getTransactionStatusOptions = (
  options: NativeStackNavigationOptions,
  header: TransactionHeader | undefined,
  width: number,
): TransactionStatusHeaderOptions =>
  header
    ? {
        ...options,
        headerTitle: () => <TransactionDetailHeaderTitle {...header} />,
        headerTitleAlign: 'left',
        headerTitleContainerStyle: { flex: 1, maxWidth: Math.max(0, width - 96) },
      }
    : options;

const styles = StyleSheet.create({
  container: { alignItems: 'flex-start', justifyContent: 'center', flex: 1, minWidth: 0 },
  direction: { fontSize: 17, fontWeight: '600', marginBottom: 2, letterSpacing: 0.15 },
  date: { fontSize: 13, lineHeight: 18 },
});
