/* global alert */
import React from 'react';
import { Image, TouchableOpacity, Platform } from 'react-native';
import PropTypes from 'prop-types';
import { RNCamera } from 'react-native-camera';
import { SafeBlueArea } from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import ImagePicker from 'react-native-image-picker';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');

export default class ScanQRCode extends React.Component {
  static navigationOptions = {
    header: null,
  };

  cameraRef = null;

  onBarCodeRead = ret => {
    if (RNCamera.Constants.CameraStatus === RNCamera.Constants.CameraStatus.READY) this.cameraRef.pausePreview();
    const onBarScannedProp = this.props.navigation.getParam('onBarScanned');
    this.props.navigation.goBack();
    onBarScannedProp(ret.data);
  }; // end

  render() {
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
          ref={ref => (this.cameraRef = ref)}
          style={{ flex: 1, justifyContent: 'space-between' }}
          onBarCodeRead={this.onBarCodeRead}
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
          onPress={() => this.props.navigation.goBack(null)}
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
            if (RNCamera.Constants.CameraStatus === RNCamera.Constants.CameraStatus.READY) this.cameraRef.pausePreview();
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
                      this.onBarCodeRead({ data: result });
                    } else {
                      if (RNCamera.Constants.CameraStatus === RNCamera.Constants.CameraStatus.READY) this.cameraRef.resumePreview();
                      alert('The selected image does not contain a QR Code.');
                    }
                  });
                } else {
                  if (RNCamera.Constants.CameraStatus === RNCamera.Constants.CameraStatus.READY) this.cameraRef.resumePreview();
                }
              },
            );
          }}
        >
          <Icon name="image" type="font-awesome" color="#0c2550" />
        </TouchableOpacity>
      </SafeBlueArea>
    );
  }
}

ScanQRCode.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    dismiss: PropTypes.func,
    getParam: PropTypes.func,
  }),
};
