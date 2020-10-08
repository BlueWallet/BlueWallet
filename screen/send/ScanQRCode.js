/* global alert */
import React, { useState } from 'react';
import { Image, View, TouchableOpacity, StatusBar, Platform, StyleSheet, Linking, Alert, TextInput } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { Icon } from 'react-native-elements';
import ImagePicker from 'react-native-image-picker';
import { useNavigation, useRoute, useIsFocused, useTheme } from '@react-navigation/native';
import loc from '../../loc';
import { BlueLoadingHook, BlueTextHooks, BlueButtonHook, BlueSpacing40 } from '../../BlueComponents';
import { getSystemName } from 'react-native-device-info';
import { BlueCurrentTheme } from '../../components/themes';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const createHash = require('create-hash');
const isDesktop = getSystemName() === 'Mac OS X';
const fs = require('../../blue_modules/fs');

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
  backdoorButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
    position: 'absolute',
  },
  backdoorInputWrapper: { position: 'absolute', left: '5%', top: '0%', width: '90%', height: '70%', backgroundColor: 'white' },
  backdoorInput: {
    height: '50%',
    marginTop: 5,
    marginHorizontal: 20,
    borderColor: BlueCurrentTheme.colors.formBorder,
    borderBottomColor: BlueCurrentTheme.colors.formBorder,
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
    color: BlueCurrentTheme.colors.foregroundColor,
    textAlignVertical: 'top',
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
  const [backdoorPressed, setBackdoorPressed] = useState(0);
  const [backdoorText, setBackdoorText] = useState('');
  const [backdoorVisible, setBackdoorVisible] = useState(false);
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
    setIsLoading(true);
    const { data } = await fs.showFilePickerAndReadFile();
    if (data) onBarCodeRead({ data });
    setIsLoading(false);
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
          <BlueButtonHook title={loc.send.open_settings} onPress={ScanQRCode.openPrivacyDesktopSettings} />
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
      {backdoorVisible && (
        <View style={styles.backdoorInputWrapper}>
          <BlueTextHooks>Provide QR code contents manually:</BlueTextHooks>
          <TextInput
            testID="scanQrBackdoorInput"
            multiline
            underlineColorAndroid="transparent"
            style={styles.backdoorInput}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            selectTextOnFocus={false}
            keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
            value={backdoorText}
            onChangeText={setBackdoorText}
          />
          <BlueButtonHook
            title="OK"
            testID="scanQrBackdoorOkButton"
            onPress={() => {
              setBackdoorVisible(false);
              let data;
              try {
                data = JSON.parse(backdoorText);
                // this might be a json string (for convenience - in case there are "\n" in there)
              } catch (_) {
                data = backdoorText;
              }

              if (data) onBarCodeRead({ data });
            }}
          />
        </View>
      )}
      <TouchableOpacity
        testID="ScanQrBackdoorButton"
        style={styles.backdoorButton}
        onPress={async () => {
          // this is an invisible backdoor button on bottom left screen corner
          // tapping it 10 times fires prompt dialog asking for a string thats gona be passed to onBarCodeRead.
          // this allows to mock and test QR scanning in e2e tests
          setBackdoorPressed(backdoorPressed + 1);
          if (backdoorPressed < 10) return;
          setBackdoorPressed(0);
          setBackdoorVisible(true);
        }}
      />
    </View>
  );
};

ScanQRCode.openPrivacyDesktopSettings = () => {
  if (isDesktop) {
    Linking.openURL('x-apple.systempreferences:com.apple.preference.security?Privacy_Camera');
  } else {
    Linking.openSettings();
  }
};

ScanQRCode.presentCameraNotAuthorizedAlert = error => {
  Alert.alert(
    loc.errors.error,
    error,
    [
      {
        text: loc.send.open_settings,
        onPress: ScanQRCode.openPrivacyDesktopSettings,
        style: 'default',
      },
      {
        text: loc._.ok,
        onPress: () => {},
        style: 'cancel',
      },
    ],
    { cancelable: true },
  );
};

ScanQRCode.navigationOptions = {
  headerShown: false,
};

export default ScanQRCode;
