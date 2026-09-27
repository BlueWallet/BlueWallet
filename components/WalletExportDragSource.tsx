import React, { useMemo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { TWallet } from '../class/wallets/types';
import { WatchOnlyWallet } from '../class/wallets/watch-only-wallet';
import AuthenticatedFileDragSource from './AuthenticatedFileDragSource';
import { makeLabelFileName } from '../blue_modules/dragFileName';

type Props = {
  wallet: TWallet;
  children: React.ReactNode;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const WalletExportDragSource: React.FC<Props> = ({ wallet, children, enabled = true, style }) => {
  const secret = useMemo(() => {
    const value = wallet instanceof WatchOnlyWallet ? wallet.getSecretForExport() : wallet.getSecret();
    return Array.isArray(value) ? value.join('\n') : String(value ?? '');
  }, [wallet]);
  const exportFileName = useMemo(() => makeLabelFileName(wallet.getLabel(), 'txt'), [wallet]);
  return (
    <AuthenticatedFileDragSource fileName={exportFileName} mimeType="text/plain" content={secret} enabled={enabled} style={style}>
      {children}
    </AuthenticatedFileDragSource>
  );
};

export default WalletExportDragSource;
