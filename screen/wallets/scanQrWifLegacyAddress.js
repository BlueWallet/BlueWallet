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
import { LegacyWallet } from '../../class';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';
let BlueApp = require('../../BlueApp');
let EV = require('../../events');

export default class CameraExample extends React.Component {
  static navigationOptions = {
    tabBarLabel: 'Wallets',
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-briefcase' : 'ios-briefcase-outline'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
  };

  state = {
    isLoading: false,
    hasCameraPermission: null,
    type: Camera.Constants.Type.back,
  };

  async onBarCodeRead(ret) {
    for (let w of BlueApp.wallets) {
      // lookig for duplicates
      if (w.getSecret() === ret.data) {
        return; // duplicate, not adding
      }
    }

    let newWallet = new LegacyWallet();
    newWallet.setSecret(ret.data);

    if (newWallet.getAddress() === false) return; // bad WIF

    this.setState(
      {
        isLoading: true,
      },
      async () => {
        newWallet.setLabel('NEW2');
        BlueApp.wallets.push(newWallet);
        await BlueApp.saveToDisk();
        this.props.navigation.navigate('WalletsList');
        EV(EV.enum.WALLETS_COUNT_CHANGED);
        alert(
          'Imported WIF ' +
            ret.data +
            ' with address ' +
            newWallet.getAddress(),
        );
      },
    );
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
            onBarCodeRead={ret => this.onBarCodeRead(ret)}
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
    goBack: PropTypes.func,
  }),
};
