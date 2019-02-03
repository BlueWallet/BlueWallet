import React from 'react';
import { ActivityIndicator, Image, View, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import Camera from 'react-native-camera';
import Permissions from 'react-native-permissions';
import { SafeBlueArea } from '../../BlueComponents';

export default class CameraExample extends React.Component {
  static navigationOptions = {
    header: null,
  };

  state = {
    isLoading: false,
    hasCameraPermission: null,
  };

  onBarCodeScanned(ret) {
    if (this.state.isLoading) return;
    this.setState({ isLoading: true }, () => {
      const onBarScanned = this.props.navigation.getParam('onBarScanned');
      this.props.navigation.goBack();
      onBarScanned(ret.data);
    });
  } // end

  componentDidMount() {
    Permissions.request('camera').then(response => {
      // Response is one of: 'authorized', 'denied', 'restricted', or 'undetermined'
      this.setState({ hasCameraPermission: response === 'authorized' });
    });
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    const { hasCameraPermission } = this.state;
    if (hasCameraPermission === null) {
      return <View />;
    } else if (hasCameraPermission === false) {
      return <View />;
    } else {
      return (
        <SafeBlueArea style={{ flex: 1 }}>
          <Camera style={{ flex: 1, justifyContent: 'space-between' }} onBarCodeRead={ret => this.onBarCodeScanned(ret)}>
            <TouchableOpacity
              style={{ width: 40, height: 80, padding: 14, marginTop: 32 }}
              onPress={() => this.props.navigation.goBack(null)}
            >
              <Image style={{ alignSelf: 'center' }} source={require('../../img/close.png')} />
            </TouchableOpacity>
          </Camera>
        </SafeBlueArea>
      );
    }
  }
}

CameraExample.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    dismiss: PropTypes.func,
    getParam: PropTypes.func,
  }),
};
