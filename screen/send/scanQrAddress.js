/* global alert */
import React from 'react';
import {
  Text,
  ActivityIndicator,
  Button,
  View,
  TouchableOpacity,
} from 'react-native';
import { Camera, Permissions } from 'expo';
import PropTypes from 'prop-types';
let EV = require('../../events');

export default class CameraExample extends React.Component {
  state = {
    isLoading: false,
    hasCameraPermission: null,
    type: Camera.Constants.Type.back,
  };

  async onBarCodeRead(ret) {
    if (this.ignoreRead) return;
    this.ignoreRead = true;
    let that = this;
    setTimeout(() => {
      that.ignoreRead = false;
    }, 2000);

    this.props.navigation.goBack();
    EV(EV.enum.CREATE_TRANSACTION_NEW_DESTINATION_ADDRESS, ret.data);
  } // end

  async componentWillMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({
      hasCameraPermission: status === 'granted',
      onCameraReady: function() {
        alert('onCameraReady');
      },
      barCodeTypes: [Camera.Constants.BarCodeType.qr],
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
        <View style={{ flex: 1 }}>
          <Camera
            style={{ flex: 1 }}
            type={this.state.type}
            onBarCodeRead={(ret) => this.onBarCodeRead(ret)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                flexDirection: 'row',
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 0.2,
                  alignSelf: 'flex-end',
                  alignItems: 'center',
                }}
                onPress={() => {
                  this.setState({
                    type:
                      this.state.type === Camera.Constants.Type.back
                        ? Camera.Constants.Type.front
                        : Camera.Constants.Type.back,
                  });
                }}
              >
                <Button
                  style={{ fontSize: 18, marginBottom: 10 }}
                  title="Go back"
                  onPress={() => this.props.navigation.goBack()}
                />
              </TouchableOpacity>
            </View>
          </Camera>
        </View>
      );
    }
  }
}

CameraExample.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
  }),
};
