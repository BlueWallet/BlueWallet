import { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import BlueText from '../../components/BlueText';
import loc from '../../loc';
import { DetailViewStackParamList } from '../DetailViewStackParamList';

type TransactionStatusRouteProps = RouteProp<DetailViewStackParamList, 'TransactionStatus'>;

type TransactionStatusOptions = NativeStackNavigationOptions & {
  headerTitleContainerStyle?: { flex: number; maxWidth: number };
};

type TransactionStatusHeaderTitleProps = {
  direction: string;
  date: string;
  foregroundColor: string;
  secondaryTextColor: string;
  fontScale: number;
};

const TransactionStatusHeaderTitle: React.FC<TransactionStatusHeaderTitleProps> = ({
  direction,
  date,
  foregroundColor,
  secondaryTextColor,
  fontScale,
}) => (
  <View style={styles.container}>
    <BlueText
      style={[styles.direction, { color: foregroundColor, lineHeight: Math.round(22 * fontScale) }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      {direction}
    </BlueText>
    <BlueText
      style={[styles.date, { color: secondaryTextColor, lineHeight: Math.round(18 * fontScale) }]}
      numberOfLines={2}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      {date}
    </BlueText>
  </View>
);

const createTransactionStatusHeaderTitle = (props: TransactionStatusHeaderTitleProps) => () =>
  React.createElement(TransactionStatusHeaderTitle, props);

const getTransactionStatusOptions = ({
  route,
  screenWidth,
  fontScale,
  foregroundColor,
  secondaryTextColor,
}: {
  route: TransactionStatusRouteProps;
  screenWidth: number;
  fontScale: number;
  foregroundColor: string;
  secondaryTextColor: string;
}): TransactionStatusOptions => {
  const tx = route.params.tx;
  const direction = tx ? (Number(tx.value) < 0 ? loc.transactions.details_sent : loc.transactions.details_received) : undefined;
  const date = tx?.timestamp ? dayjs(tx.timestamp * 1000).format('LLL') : '-';

  return {
    // Keep a meaningful string title at the stack level for navigation metadata,
    // even though the visible header uses the richer two-line title below.
    title: direction ?? loc.transactions.details_title,
    headerTitle: direction
      ? createTransactionStatusHeaderTitle({
          direction,
          date,
          foregroundColor,
          secondaryTextColor,
          fontScale,
        })
      : loc.transactions.details_title,
    headerTitleAlign: direction ? 'left' : undefined,
    headerTitleContainerStyle: direction
      ? {
          flex: 1,
          maxWidth: Math.max(0, screenWidth - 96),
        }
      : undefined,
    headerBackButtonDisplayMode: 'default',
  };
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  direction: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.15,
  },
  date: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default getTransactionStatusOptions;
