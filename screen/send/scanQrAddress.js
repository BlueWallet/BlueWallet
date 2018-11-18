import React from 'react';
import { Text, ActivityIndicator, Button, View, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import { Camera } from 'react-native-camera';
import Permissions from 'react-native-permissions';
import { SafeBlueArea } from '../../BlueComponents';
let EV = require('../../events');
let loc = require('../../loc');

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

    this.props.navigation.goBack();
    EV(EV.enum.CREATE_TRANSACTION_NEW_DESTINATION_ADDRESS, ret.data);
  } // end

  async componentDidMount() {
    Permissions.check('camera').then(response => {
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
      return <Text>No access to camera</Text>;
    } else {
      return (
        <SafeBlueArea style={{ flex: 1 }}>
          <Camera style={{ flex: 1 }} onBarCodeRead={ret => this.onBarCodeScanned(ret)} />
        </SafeBlueArea>
      );
    }
  }
}

CameraExample.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
  }),
};
