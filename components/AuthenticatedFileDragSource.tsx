import React, { useCallback, useRef } from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import NativeDraggableFile, { Commands } from '../codegen/DraggableFileNativeComponent';
import { unlockWithBiometrics, useBiometrics } from '../hooks/useBiometrics';
import loc from '../loc';

type Props = {
  children: React.ReactNode;
  fileName: string;
  mimeType: string;
  content: string;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const AuthenticatedFileDragSource: React.FC<Props> = ({ children, fileName, mimeType, content, enabled = true, style }) => {
  const nativeRef = useRef<React.ElementRef<typeof NativeDraggableFile>>(null);
  const { biometricEnabled } = useBiometrics();
  const authorizeAndroidExport = useCallback(async () => {
    if (biometricEnabled && !(await unlockWithBiometrics())) return;
    if (nativeRef.current) Commands.startAuthorizedDrag(nativeRef.current);
  }, [biometricEnabled]);

  return (
    <NativeDraggableFile
      ref={nativeRef}
      fileName={fileName}
      mimeType={mimeType}
      content={content}
      dragEnabled={enabled}
      exportOnDrag={enabled && Platform.OS === 'android'}
      secureContentExport={enabled && Platform.OS === 'ios'}
      biometricEnabled={biometricEnabled}
      authenticationPrompt={loc.settings.biom_conf_identity}
      onExportRequested={authorizeAndroidExport}
      style={style}
    >
      {children}
    </NativeDraggableFile>
  );
};

export default AuthenticatedFileDragSource;
