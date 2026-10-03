import React, { useCallback, useRef } from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import NativeDraggableFile, { Commands } from '../codegen/DraggableFileNativeComponent';
import { unlockWithBiometrics, useBiometrics } from '../hooks/useBiometrics';
import loc from '../loc';

type Props = {
  children: React.ReactNode;
  fileName: string;
  mimeType: string;
  content?: string;
  captureViewAsImage?: boolean;
  requireAuthentication?: boolean;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const AuthenticatedFileDragSource: React.FC<Props> = ({
  children,
  fileName,
  mimeType,
  content = '',
  captureViewAsImage = false,
  requireAuthentication = false,
  enabled = true,
  style,
}) => {
  const nativeRef = useRef<React.ElementRef<typeof NativeDraggableFile>>(null);
  const { biometricEnabled, biometricPreferenceLoaded } = useBiometrics();
  const authenticationRequired = requireAuthentication || biometricEnabled;
  const dragEnabled = enabled && biometricPreferenceLoaded;
  const authorizeAndroidExport = useCallback(async () => {
    if (authenticationRequired && !(await unlockWithBiometrics())) return;
    if (nativeRef.current) Commands.startAuthorizedDrag(nativeRef.current);
  }, [authenticationRequired]);

  return (
    <NativeDraggableFile
      ref={nativeRef}
      fileName={fileName}
      mimeType={mimeType}
      content={content}
      captureViewAsImage={captureViewAsImage}
      dragEnabled={dragEnabled}
      exportOnDrag={dragEnabled && Platform.OS === 'android'}
      secureContentExport={dragEnabled && Platform.OS === 'ios'}
      biometricEnabled={authenticationRequired}
      authenticationPrompt={loc.settings.biom_conf_identity}
      onExportRequested={authorizeAndroidExport}
      style={style}
    >
      {children}
    </NativeDraggableFile>
  );
};

export default AuthenticatedFileDragSource;
