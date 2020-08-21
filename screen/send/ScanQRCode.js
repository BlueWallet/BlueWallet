/* global alert */
import React, { useState } from 'react';
import { Image, View, TouchableOpacity, StatusBar, Platform, StyleSheet, Linking } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { Icon } from 'react-native-elements';
import ImagePicker from 'react-native-image-picker';
import { useNavigation, useRoute, useIsFocused, useTheme } from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import loc from '../../loc';
import { BlueLoadingHook, BlueTextHooks, BlueButtonHook, BlueSpacing40 } from '../../BlueComponents';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const createHash = require('create-hash');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  rnCamera: {
    flex: 1,
  },
  closeTouch: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    borderRadius: 20,
    position: 'absolute',
    right: 16,
    top: 44,
  },
  closeImage: {
    alignSelf: 'center',
  },
  imagePickerTouch: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    borderRadius: 20,
    position: 'absolute',
    left: 24,
    bottom: 48,
  },
  filePickerTouch: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    borderRadius: 20,
    position: 'absolute',
    left: 96,
    bottom: 48,
  },
  openSettingsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
  },
});

const ScanQRCode = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const showFileImportButton = route.params.showFileImportButton || false;
  const { launchedBy, onBarScanned } = route.params;
  const scannedCache = {};
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [cameraStatus, setCameraStatus] = useState(RNCamera.Constants.CameraStatus.PENDING_AUTHORIZATION);
  const stylesHook = StyleSheet.create({
    openSettingsContainer: {
      backgroundColor: colors.brandingColor,
    },
  });
  const HashIt = function (s) {
    return createHash('sha256').update(s).digest().toString('hex');
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
        if (launchedBy) {
          navigation.navigate(launchedBy);
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
    try {
      setIsLoading(true);
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
        alert(loc.send.qr_error_no_wallet);
      }
      setIsLoading(false);
    }
  };

  const showImagePicker = () => {
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
                alert(loc.send.qr_error_no_qrcode);
                setIsLoading(false);
              }
            });
          } else {
            setIsLoading(false);
          }
        },
      );
    }
  };

  const dismiss = () => {
    if (launchedBy) {
      navigation.navigate(launchedBy);
    } else {
      navigation.goBack();
    }
  };

  const handleCameraStatusChange = event => {
    setCameraStatus(event.cameraStatus);
  };

  const handleOpenSettingsTapped = () => {
    Linking.openSettings();
  };

  return isLoading ? (
    <View style={styles.root}>
      <BlueLoadingHook />
    </View>
  ) : (
    <View style={styles.root}>
      <StatusBar hidden />
      {isFocused && cameraStatus !== RNCamera.Constants.CameraStatus.NOT_AUTHORIZED && (
        <RNCamera
          captureAudio={false}
          androidCameraPermissionOptions={{
            title: loc.send.permission_camera_title,
            message: loc.send.permission_camera_message,
            buttonPositive: loc._.ok,
            buttonNegative: loc._.cancel,
          }}
          style={styles.rnCamera}
          onBarCodeRead={onBarCodeRead}
          barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
          onStatusChange={handleCameraStatusChange}
        />
      )}
      {cameraStatus === RNCamera.Constants.CameraStatus.NOT_AUTHORIZED && (
        <View style={[styles.openSettingsContainer, stylesHook.openSettingsContainer]}>
          <BlueTextHooks>{loc.send.permission_camera_message}</BlueTextHooks>
          <BlueSpacing40 />
          <BlueButtonHook title={loc.send.open_settings} onPress={handleOpenSettingsTapped} />
        </View>
      )}
      <TouchableOpacity style={styles.closeTouch} onPress={dismiss}>
        <Image style={styles.closeImage} source={require('../../img/close-white.png')} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.imagePickerTouch} onPress={showImagePicker}>
        <Icon name="image" type="font-awesome" color="#ffffff" />
      </TouchableOpacity>
      {showFileImportButton && (
        <TouchableOpacity style={styles.filePickerTouch} onPress={showFilePicker}>
          <Icon name="file-import" type="material-community" color="#ffffff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

ScanQRCode.navigationOptions = {
  headerShown: false,
};

export default ScanQRCode;
