import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import LocalQRCode from '@remobile/react-native-qrcode-local-image';
import * as bitcoin from 'bitcoinjs-lib';
import createHash from 'create-hash';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraScreen } from 'react-native-camera-kit';
import { Icon } from '@rneui/themed';
import { launchImageLibrary } from 'react-native-image-picker';

import Base43 from '../../blue_modules/base43';
import * as fs from '../../blue_modules/fs';
import { BlueURDecoder, decodeUR, extractSingleWorkload } from '../../blue_modules/ur';
import { BlueLoading, BlueSpacing40, BlueText } from '../../BlueComponents';
import { openPrivacyDesktopSettings } from '../../class/camera';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import { isCameraAuthorizationStatusGranted } from '../../helpers/scan-qr';
import loc from '../../loc';

let decoder = false;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
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
    width: 60,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.01)',
    position: 'absolute',
  },
  backdoorInputWrapper: { position: 'absolute', left: '5%', top: '0%', width: '90%', height: '70%', backgroundColor: 'white' },
  progressWrapper: { position: 'absolute', alignSelf: 'center', alignItems: 'center', top: '50%', padding: 8, borderRadius: 8 },
  backdoorInput: {
    height: '50%',
    marginTop: 5,
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 4,
    textAlignVertical: 'top',
  },
});

const ScanQRCode = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const { launchedBy, onBarScanned, onDismiss, showFileImportButton } = route.params;
  const scannedCache = {};
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [backdoorPressed, setBackdoorPressed] = useState(0);
  const [urTotal, setUrTotal] = useState(0);
  const [urHave, setUrHave] = useState(0);
  const [backdoorText, setBackdoorText] = useState('');
  const [backdoorVisible, setBackdoorVisible] = useState(false);
  const [animatedQRCodeData, setAnimatedQRCodeData] = useState({});
  const [cameraStatusGranted, setCameraStatusGranted] = useState(false);
  const stylesHook = StyleSheet.create({
    openSettingsContainer: {
      backgroundColor: colors.brandingColor,
    },
    progressWrapper: { backgroundColor: colors.brandingColor, borderColor: colors.foregroundColor, borderWidth: 4 },
    backdoorInput: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
      color: colors.foregroundColor,
    },
  });

  useEffect(() => {
    isCameraAuthorizationStatusGranted().then(setCameraStatusGranted);
  }, []);

  const HashIt = function (s) {
    return createHash('sha256').update(s).digest().toString('hex');
  };

  const _onReadUniformResourceV2 = part => {
    if (!decoder) decoder = new BlueURDecoder();
    try {
      decoder.receivePart(part);
      if (decoder.isComplete()) {
        const data = decoder.toString();
        decoder = false; // nullify for future use (?)
        if (launchedBy) {
          let merge = true;
          if (typeof onBarScanned !== 'function') {
            merge = false;
          }
          navigation.navigate({ name: launchedBy, params: { scannedData: data }, merge });
        }
        onBarScanned && onBarScanned({ data });
      } else {
        setUrTotal(100);
        setUrHave(Math.floor(decoder.estimatedPercentComplete() * 100));
      }
    } catch (error) {
      console.warn(error);
      setIsLoading(true);
      Alert.alert(
        loc.send.scan_error,
        loc._.invalid_animated_qr_code_fragment,
        [
          {
            text: loc._.ok,
            onPress: () => {
              setIsLoading(false);
            },
            style: 'default',
          },
        ],
        { cancelabe: false },
      );
    }
  };

  /**
   *
   * @deprecated remove when we get rid of URv1 support
   */
  const _onReadUniformResource = ur => {
    try {
      const [index, total] = extractSingleWorkload(ur);
      animatedQRCodeData[index + 'of' + total] = ur;
      setUrTotal(total);
      setUrHave(Object.values(animatedQRCodeData).length);
      if (Object.values(animatedQRCodeData).length === total) {
        const payload = decodeUR(Object.values(animatedQRCodeData));
        // lets look inside that data
        let data = false;
        if (Buffer.from(payload, 'hex').toString().startsWith('psbt')) {
          // its a psbt, and whoever requested it expects it encoded in base64
          data = Buffer.from(payload, 'hex').toString('base64');
        } else {
          // its something else. probably plain text is expected
          data = Buffer.from(payload, 'hex').toString();
        }
        if (launchedBy) {
          let merge = true;
          if (typeof onBarScanned !== 'function') {
            merge = false;
          }
          navigation.navigate({ name: launchedBy, params: { scannedData: data }, merge });
        }
        onBarScanned && onBarScanned({ data });
      } else {
        setAnimatedQRCodeData(animatedQRCodeData);
      }
    } catch (error) {
      console.warn(error);
      setIsLoading(true);
      Alert.alert(
        loc.send.scan_error,
        loc._.invalid_animated_qr_code_fragment,
        [
          {
            text: loc._.ok,
            onPress: () => {
              setIsLoading(false);
            },
            style: 'default',
          },
        ],
        { cancelabe: false },
      );
    }
  };

  const onBarCodeRead = ret => {
    const h = HashIt(ret.data);
    if (scannedCache[h]) {
      // this QR was already scanned by this ScanQRCode, lets prevent firing duplicate callbacks
      return;
    }
    scannedCache[h] = +new Date();

    if (ret.data.toUpperCase().startsWith('UR:CRYPTO-ACCOUNT')) {
      return _onReadUniformResourceV2(ret.data);
    }

    if (ret.data.toUpperCase().startsWith('UR:CRYPTO-PSBT')) {
      return _onReadUniformResourceV2(ret.data);
    }

    if (ret.data.toUpperCase().startsWith('UR:CRYPTO-OUTPUT')) {
      return _onReadUniformResourceV2(ret.data);
    }

    if (ret.data.toUpperCase().startsWith('UR:BYTES')) {
      const splitted = ret.data.split('/');
      if (splitted.length === 3 && splitted[1].includes('-')) {
        return _onReadUniformResourceV2(ret.data);
      }
    }

    if (ret.data.toUpperCase().startsWith('UR')) {
      return _onReadUniformResource(ret.data);
    }

    // is it base43? stupid electrum desktop
    try {
      const hex = Base43.decode(ret.data);
      bitcoin.Psbt.fromHex(hex); // if it doesnt throw - all good
      const data = Buffer.from(hex, 'hex').toString('base64');
      if (launchedBy) {
        let merge = true;
        if (typeof onBarScanned !== 'function') {
          merge = false;
        }
        navigation.navigate({ name: launchedBy, params: { scannedData: data }, merge });
      }
      onBarScanned && onBarScanned({ data });
      return;
    } catch (_) {}

    if (!isLoading) {
      setIsLoading(true);
      try {
        if (launchedBy) {
          let merge = true;
          if (typeof onBarScanned !== 'function') {
            merge = false;
          }
          navigation.navigate({ name: launchedBy, params: { scannedData: ret.data }, merge });
        }
        onBarScanned && onBarScanned(ret.data);
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
      launchImageLibrary(
        {
          title: null,
          mediaType: 'photo',
          takePhotoButtonTitle: null,
          maxHeight: 800,
          maxWidth: 600,
          selectionLimit: 1,
        },
        response => {
          if (response.didCancel) {
            setIsLoading(false);
          } else {
            const asset = response.assets[0];
            if (asset.uri) {
              const uri = asset.uri.toString().replace('file://', '');
              LocalQRCode.decode(uri, (error, result) => {
                if (!error) {
                  onBarCodeRead({ data: result });
                } else {
                  presentAlert({ message: loc.send.qr_error_no_qrcode });
                  setIsLoading(false);
                }
              });
            } else {
              setIsLoading(false);
            }
          }
        },
      );
    }
  };

  const dismiss = () => {
    if (launchedBy) {
      let merge = true;
      if (typeof onBarScanned !== 'function') {
        merge = false;
      }
      navigation.navigate({ name: launchedBy, params: {}, merge });
    } else {
      navigation.goBack();
    }
    if (onDismiss) onDismiss();
  };

  const render = isLoading ? (
    <BlueLoading />
  ) : (
    <>
      {!cameraStatusGranted ? (
        <View style={[styles.openSettingsContainer, stylesHook.openSettingsContainer]}>
          <BlueText>{loc.send.permission_camera_message}</BlueText>
          <BlueSpacing40 />
          <Button title={loc.send.open_settings} onPress={openPrivacyDesktopSettings} />
        </View>
      ) : isFocused ? (
        <CameraScreen scanBarcode onReadCode={event => onBarCodeRead({ data: event?.nativeEvent?.codeStringValue })} showFrame={false} />
      ) : null}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={loc._.close} style={styles.closeTouch} onPress={dismiss}>
        <Image style={styles.closeImage} source={require('../../img/close-white.png')} />
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc._.pick_image}
        style={styles.imagePickerTouch}
        onPress={showImagePicker}
      >
        <Icon name="image" type="font-awesome" color="#ffffff" />
      </TouchableOpacity>
      {showFileImportButton && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={loc._.pick_file}
          style={styles.filePickerTouch}
          onPress={showFilePicker}
        >
          <Icon name="file-import" type="font-awesome-5" color="#ffffff" />
        </TouchableOpacity>
      )}
      {urTotal > 0 && (
        <View style={[styles.progressWrapper, stylesHook.progressWrapper]} testID="UrProgressBar">
          <BlueText>{loc.wallets.please_continue_scanning}</BlueText>
          <BlueText>
            {urHave} / {urTotal}
          </BlueText>
        </View>
      )}
      {backdoorVisible && (
        <View style={styles.backdoorInputWrapper}>
          <BlueText>Provide QR code contents manually:</BlueText>
          <TextInput
            testID="scanQrBackdoorInput"
            multiline
            underlineColorAndroid="transparent"
            style={[styles.backdoorInput, stylesHook.backdoorInput]}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            selectTextOnFocus={false}
            keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
            value={backdoorText}
            onChangeText={setBackdoorText}
          />
          <Button
            title="OK"
            testID="scanQrBackdoorOkButton"
            onPress={() => {
              setBackdoorVisible(false);
              setBackdoorText('');

              if (backdoorText) onBarCodeRead({ data: backdoorText });
            }}
          />
        </View>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc._.qr_custom_input_button}
        testID="ScanQrBackdoorButton"
        style={styles.backdoorButton}
        onPress={async () => {
          // this is an invisible backdoor button on bottom left screen corner
          // tapping it 10 times fires prompt dialog asking for a string thats gona be passed to onBarCodeRead.
          // this allows to mock and test QR scanning in e2e tests
          setBackdoorPressed(backdoorPressed + 1);
          if (backdoorPressed < 5) return;
          setBackdoorPressed(0);
          setBackdoorVisible(true);
        }}
      />
    </>
  );

  return <View style={styles.root}>{render}</View>;
};

export default ScanQRCode;
