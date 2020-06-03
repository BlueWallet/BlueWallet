import React from 'react';
import { Image, View, TouchableOpacity, StatusBar, StyleSheet, Dimensions } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';

import { images } from 'app/assets';
import { getStatusBarHeight } from 'app/styles';

const { width } = Dimensions.get('window');
const i18n = require('../../loc');

export interface ScanQrCodeProps extends NavigationInjectedProps {
  onBarCodeScan: (code: string) => void;
}

type Props = NavigationScreenProps<ScanQrCodeProps>;

export default class ScanQrCodeScreen extends React.PureComponent<Props> {
  static navigationOptions = {
    header: null,
  };

  onBarCodeScanned = async (scannedQr: any) => {
    const { navigation } = this.props;
    const onBarCodeScan = navigation.getParam('onBarCodeScan');

    if (scannedQr.data) {
      onBarCodeScan(scannedQr.data);
      navigation.goBack();
    }
  };

  render() {
    return (
      <View style={{ flex: 1 }}>
        <>
          <StatusBar hidden />
          <RNCamera
            captureAudio={false}
            androidCameraPermissionOptions={{
              title: i18n.scanQrCode.permissionTitle,
              message: i18n.scanQrCode.permissionMessage,
              buttonPositive: i18n.scanQrCode.ok,
              buttonNegative: i18n.scanQrCode.cancel,
            }}
            style={{ flex: 1, justifyContent: 'space-between' }}
            onBarCodeRead={this.onBarCodeScanned}
            barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
          />
          <View style={styles.crosshairContainer}>
            <Image style={styles.crosshair} source={images.scanQRcrosshair} />
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => this.props.navigation.goBack()}>
            <Image source={images.close} />
          </TouchableOpacity>
        </>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  crosshairContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshair: {
    width: width * 0.58,
    height: width * 0.58,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    borderRadius: 20,
    position: 'absolute',
    top: getStatusBarHeight(),
    right: 20,
  },
});
