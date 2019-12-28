/* global alert */
import React from 'react';
import { Image, TouchableOpacity, Platform } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { SafeBlueArea } from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import ImagePicker from 'react-native-image-picker';
import { useNavigation, useNavigationParam } from 'react-navigation-hooks';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');

const ScanQRCode = () => {
  let cameraRef = React.createRef();
  const { goBack } = useNavigation();
  const onBarScanned = useNavigationParam('onBarScanned');

  const onBarCodeRead = ret => {
    if (RNCamera.Constants.CameraStatus === RNCamera.Constants.CameraStatus.READY) cameraRef.pausePreview();
    goBack();
    onBarScanned(ret.data);
  }; // end

  return (
    <SafeBlueArea style={{ flex: 1 }}>
      <RNCamera
        captureAudio={false}
        androidCameraPermissionOptions={{
          title: 'Permission to use camera',
          message: 'We need your permission to use your camera',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }}
        ref={cameraRef}
        style={{ flex: 1, justifyContent: 'space-between' }}
        onBarCodeRead={onBarCodeRead}
        barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
      />
      <TouchableOpacity
        style={{
          width: 40,
          height: 40,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          borderRadius: 20,
          position: 'absolute',
          right: 16,
          top: 64,
        }}
        onPress={goBack}
      >
        <Image style={{ alignSelf: 'center' }} source={require('../../img/close-white.png')} />
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          width: 40,
          height: 40,
          backgroundColor: '#FFFFFF',
          justifyContent: 'center',
          borderRadius: 20,
          position: 'absolute',
          left: 24,
          bottom: 48,
        }}
        onPress={() => {
          if (RNCamera.Constants.CameraStatus === RNCamera.Constants.CameraStatus.READY) cameraRef.pausePreview();
          ImagePicker.launchImageLibrary(
            {
              title: null,
              mediaType: 'photo',
              takePhotoButtonTitle: null,
            },
            response => {
              if (response.uri) {
                const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
                LocalQRCode.decode(uri, (error, result) => {
                  if (!error) {
                    onBarCodeRead({ data: result });
                  } else {
                    if (RNCamera.Constants.CameraStatus === RNCamera.Constants.CameraStatus.READY) cameraRef.resumePreview();
                    alert('The selected image does not contain a QR Code.');
                  }
                });
              } else {
                if (RNCamera.Constants.CameraStatus === RNCamera.Constants.CameraStatus.READY) cameraRef.resumePreview();
              }
            },
          );
        }}
      >
        <Icon name="image" type="font-awesome" color="#0c2550" />
      </TouchableOpacity>
    </SafeBlueArea>
  );
};

ScanQRCode.navigationOptions = {
  header: null,
};
export default ScanQRCode;
