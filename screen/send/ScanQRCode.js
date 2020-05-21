/* global alert */
import React, { useState } from 'react';
import { Image, View, TouchableOpacity, Platform } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { Icon } from 'react-native-elements';
import ImagePicker from 'react-native-image-picker';
import PropTypes from 'prop-types';
import { useNavigationParam, useNavigation } from 'react-navigation-hooks';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const createHash = require('create-hash');

const ScanQRCode = ({
  showCloseButton = true,
  // eslint-disable-next-line react-hooks/rules-of-hooks
  showFileImportButton = useNavigationParam('showFileImportButton') || false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { navigate } = useNavigation();
  const launchedBy = useNavigationParam('launchedBy');
  const onBarScanned = useNavigationParam('onBarScanned');
  const scannedCache = {};

  const HashIt = function(s) {
    return createHash('sha256')
      .update(s)
      .digest()
      .toString('hex');
  };

  const onBarCodeRead = ret => {
    const h = HashIt(ret.data);
    if (scannedCache[h]) {
      // this QR was already scanned by this ScanQRCode, lets prevent firing duplicate callbacks
      return;
    }
    scannedCache[h] = +new Date();

    if (!isLoading) {
      setIsLoading(true);
      try {
        if (showCloseButton && launchedBy) {
          navigate(launchedBy);
        }
        if (ret.additionalProperties) {
          onBarScanned(ret.data, ret.additionalProperties);
        } else {
          onBarScanned(ret.data);
        }
      } catch (e) {
        console.log(e);
      }
    }
    setIsLoading(false);
  };

  const showFilePicker = async () => {
    setIsLoading(true);
    try {
      const res = await DocumentPicker.pick();
      const file = await RNFS.readFile(res.uri);
      const fileParsed = JSON.parse(file);
      if (fileParsed.keystore.xpub) {
        let masterFingerprint;
        if (fileParsed.keystore.ckcc_xfp) {
          masterFingerprint = Number(fileParsed.keystore.ckcc_xfp);
        }
        onBarCodeRead({ data: fileParsed.keystore.xpub, additionalProperties: { masterFingerprint, label: fileParsed.keystore.label } });
      } else {
        throw new Error();
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        alert('The selected file does not contain a wallet that can be imported.');
      }
      setIsLoading(false);
    }
    setIsLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {!!isLoading && (
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
            top: 44,
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
          backgroundColor: 'rgba(0,0,0,0.4)',
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
        <Icon name="image" type="font-awesome" color="#ffffff" />
      </TouchableOpacity>
      {showFileImportButton && (
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            borderRadius: 20,
            position: 'absolute',
            left: 96,
            bottom: 48,
          }}
          onPress={showFilePicker}
        >
          <Icon name="file-import" type="material-community" color="#ffffff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

ScanQRCode.navigationOptions = {
  header: null,
};
ScanQRCode.propTypes = {
  showFileImportButton: PropTypes.bool,
  showCloseButton: PropTypes.bool,
};
export default ScanQRCode;
