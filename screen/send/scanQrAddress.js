import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import { RNCamera } from 'react-native-camera';
import { SafeBlueArea } from '../../BlueComponents';

export default class CameraExample extends React.Component {
  static navigationOptions = {
    header: null,
  };

  state = {
    isLoading: false,
  };

  onBarCodeScanned = ret => {
    if (this.state.isLoading) return;
    this.setState({ isLoading: true }, () => {
      const onBarScannedProp = this.props.navigation.getParam('onBarScanned');
      this.props.navigation.goBack();
      onBarScannedProp(ret.data);
    });
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
          style={{ flex: 1, justifyContent: 'space-between' }}
          onBarCodeRead={this.onBarCodeScanned}
          barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
        />
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            marginLeft: 24,
            backgroundColor: '#FFFFFF',
            justifyContent: 'center',
            borderRadius: 20,
            position: 'absolute',
            top: 64,
          }}
          onPress={() => this.props.navigation.goBack(null)}
        >
          <Image style={{ alignSelf: 'center' }} source={require('../../img/close.png')} />
        </TouchableOpacity>
      </SafeBlueArea>
    );
  }
}

CameraExample.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    dismiss: PropTypes.func,
    getParam: PropTypes.func,
  }),
};
