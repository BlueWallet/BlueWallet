import React, { useCallback, useMemo, useRef } from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import NativeDraggableFile, { Commands } from '../codegen/DraggableFileNativeComponent';
import { TWallet } from '../class/wallets/types';
import { WatchOnlyWallet } from '../class/wallets/watch-only-wallet';
import { unlockWithBiometrics, useBiometrics } from '../hooks/useBiometrics';
import loc from '../loc';

type Props = {
  wallet: TWallet;
  children: React.ReactNode;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const WalletExportDragSource: React.FC<Props> = ({ wallet, children, enabled = true, style }) => {
  const nativeRef = useRef<React.ElementRef<typeof NativeDraggableFile>>(null);
  const { biometricEnabled } = useBiometrics();
  const secret = useMemo(() => {
    const value = wallet instanceof WatchOnlyWallet ? wallet.getSecretForExport() : wallet.getSecret();
    return Array.isArray(value) ? value.join('\n') : String(value ?? '');
  }, [wallet]);
  const authorizeAndroidExport = useCallback(async () => {
    if (biometricEnabled && !(await unlockWithBiometrics())) return;
    if (nativeRef.current) Commands.startAuthorizedDrag(nativeRef.current);
  }, [biometricEnabled]);

  return (
    <NativeDraggableFile
      ref={nativeRef}
      fileName="wallet-backup.txt"
      mimeType="text/plain"
      content={secret}
      dragEnabled={enabled}
      exportOnDrag={enabled && Platform.OS === 'android'}
      secureTextExport={enabled && Platform.OS === 'ios'}
      biometricEnabled={biometricEnabled}
      authenticationPrompt={loc.settings.biom_conf_identity}
      onExportRequested={authorizeAndroidExport}
      style={style}
    >
      {children}
    </NativeDraggableFile>
  );
};

export default WalletExportDragSource;
