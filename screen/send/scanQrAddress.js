/* global alert */
import React, { useEffect, useState } from 'react';
import { Image, View, TouchableOpacity, Platform } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { Icon } from 'react-native-elements';
import ImagePicker from 'react-native-image-picker';
import PropTypes from 'prop-types';
import { useNavigationParam, useNavigation } from 'react-navigation-hooks';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');

const ScanQRCode = ({
  onBarScanned = useNavigationParam('onBarScanned'),
  cameraPreviewIsPaused = false,
  showCloseButton = true,
  launchedBy = useNavigationParam('launchedBy'),
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { navigate } = useNavigation();

  const onBarCodeRead = ret => {
    if (!isLoading && !cameraPreviewIsPaused) {
      setIsLoading(true);
      try {
        if (showCloseButton && launchedBy) {
          navigate(launchedBy);
        }
        onBarScanned(ret.data);
      } catch (e) {
        console.log(e);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {}, [cameraPreviewIsPaused]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {!cameraPreviewIsPaused && !isLoading && (
        <RNCamera
          captureAudio={false}
          androidCameraPermissionOptions={{
            title: 'Permission to use camera',
            message: 'We need your permission to use your camera',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }}
          style={{ flex: 1, justifyContent: 'space-between', backgroundColor: '#000000' }}
          onBarCodeRead={onBarCodeRead}
          barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
        />
      )}
      {showCloseButton && (
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
          onPress={() => navigate(launchedBy)}
        >
          <Image style={{ alignSelf: 'center' }} source={require('../../img/close-white.png')} />
        </TouchableOpacity>
      )}
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
          if (!isLoading) {
            setIsLoading(true);
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
                      alert('The selected image does not contain a QR Code.');
                    }
                  });
                }
                setIsLoading(false);
              },
            );
          }
        }}
      >
        <Icon name="image" type="font-awesome" color="#0c2550" />
      </TouchableOpacity>
    </View>
  );
};

ScanQRCode.navigationOptions = {
  header: null,
};
ScanQRCode.propTypes = {
  launchedBy: PropTypes.string,
  onBarScanned: PropTypes.func,
  cameraPreviewIsPaused: PropTypes.bool,
  showCloseButton: PropTypes.bool,
};
export default ScanQRCode;
