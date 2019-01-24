/* global alert */
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

  async onBarCodeScanned(ret) {
    if (this.ignoreRead) return;
    this.ignoreRead = true;
    setTimeout(() => {
      this.ignoreRead = false;
    }, 2000);

    const onBarScanned = this.props.navigation.getParam('onBarScanned');
    onBarScanned(ret.data);
  } // end

  componentDidMount() {
    Permissions.request('camera').then(response => {
      // Response is one of: 'authorized', 'denied', 'restricted', or 'undetermined'
      this.setState({ hasCameraPermission: response === 'authorized' });
    });

    // For testing in Simulator
    // const onBarScanned = this.props.navigation.getParam('onBarScanned');
    // onBarScanned('lnbc4223u1pwyj632pp5f2m0rpyflj9dx4a3kljkts6xadjfeuplcfkqz8lecnmjfpl75wyqdphgf5hgun9ve5kcmpqx43ngwfkvyexzwf3xcurvvpsxqcrgefcx3nxgdqcqzysxqr8pqfppjec6wr6uvxqz2dc75f8c9x2u0h6a88f9jzn04eyg7v73at8r8q4h0649h97xr8ukq858xnhumfdw8gecqgr7jac6znpjhdpe6lgymjrwvjwr0ns38ptd5lssvqja2knmlpuz2kssp8v3cst');
    //
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
      alert('BlueWallet does not have permission to use your camera.');
      this.props.navigation.goBack(null);
      return <View />;
    } else {
      return (
        <SafeBlueArea style={{ flex: 1 }}>
          <Camera style={{ flex: 1 }} onBarCodeRead={ret => this.onBarCodeScanned(ret)}>
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
