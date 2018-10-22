import React from 'react';
import { Text, ActivityIndicator, Button, View, TouchableOpacity } from 'react-native';
import { Permissions, BarCodeScanner } from 'expo';
import PropTypes from 'prop-types';
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
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ hasCameraPermission: status === 'granted' });
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
          <BarCodeScanner style={{ flex: 1 }} onBarCodeScanned={ret => this.onBarCodeScanned(ret)}>
            <View
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                flexDirection: 'row',
              }}
            >
              <TouchableOpacity
                style={{
                  alignSelf: 'flex-end',
                  alignItems: 'center',
                  marginBottom: 20,
                  marginLeft: 16,
                }}
              >
                <Button style={{ fontSize: 18 }} title={loc.send.details.cancel} onPress={() => this.props.navigation.goBack()} />
              </TouchableOpacity>
            </View>
          </BarCodeScanner>
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
