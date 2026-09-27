import React, { useCallback } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NativeDraggableFile from '../codegen/DraggableFileNativeComponent';

type Props = {
  walletID: string;
  children: React.ReactNode;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const WalletExportDragSource: React.FC<Props> = ({ walletID, children, enabled = true, style }) => {
  const navigation = useNavigation<any>();
  const openGuardedExport = useCallback(() => {
    navigation.navigate('WalletExport', { walletID });
  }, [navigation, walletID]);

  return (
    <NativeDraggableFile
      fileName=""
      mimeType="application/octet-stream"
      dragEnabled={enabled}
      exportOnDrag={enabled}
      onExportRequested={openGuardedExport}
      style={style}
    >
      {children}
    </NativeDraggableFile>
  );
};

export default WalletExportDragSource;
