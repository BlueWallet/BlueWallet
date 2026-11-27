import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import loc from '../loc';
import Button from './Button';
import { ConnectNoticeCard } from './ConnectUI';
import NeuraiLoader from './NeuraiLoader';

type Props = {
  /** From `useScreenProtect`: the window is protected. */
  ready: boolean;
  /** From `useScreenProtect`: protection could not be enabled. */
  failed: boolean;
  onRetry: () => void;
  loaderStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * Draws a secret (recovery words, seed input, export QR) only on a protected window. While
 * protection is being enabled it shows the loader; when it failed it keeps the secret hidden and
 * offers a retry instead (H09).
 */
const ScreenProtectionGate: React.FC<Props> = ({ ready, failed, onRetry, loaderStyle, children }) => {
  if (ready) return <>{children}</>;
  if (!failed) return <NeuraiLoader style={loaderStyle} />;
  return (
    <View style={styles.failed} testID="ScreenProtectionFailed">
      <ConnectNoticeCard tone="warn" text={loc.wallets.screen_protect_failed} />
      <Button title={loc.wallets.list_tryagain} onPress={onRetry} testID="ScreenProtectionRetry" />
    </View>
  );
};

const styles = StyleSheet.create({
  failed: { rowGap: 16 },
});

export default ScreenProtectionGate;
