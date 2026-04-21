import { RouteProp, StackActions, useIsFocused, useRoute } from '@react-navigation/native';
import * as bitcoin from 'bitcoinjs-lib';
import { sha256 } from '@noble/hashes/sha256';
import React, { ReactElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Base43 from '../../blue_modules/base43';
import * as fs from '../../blue_modules/fs';
import { BlueURDecoder, decodeUR, extractSingleWorkload } from '../../blue_modules/ur';
import { BlueText } from '../../BlueComponents';
import { openPrivacyDesktopSettings } from '../../class/camera';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { useTheme } from '../../components/themes';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { isCameraAuthorizationStatusGranted } from '../../helpers/scan-qr';
import loc from '../../loc';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import CameraScreen from '../../components/CameraScreen';
import SafeArea from '../../components/SafeArea';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList.ts';
import { BlueSpacing40 } from '../../components/BlueSpacing';
import { BlueLoading } from '../../components/BlueLoading.tsx';
import { hexToUint8Array, uint8ArrayToBase64, uint8ArrayToHex, uint8ArrayToString } from '../../blue_modules/uint8array-extras/index.js';
import { isDesktop } from '../../blue_modules/environment';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let decoder: BlueURDecoder | undefined;

type RouteProps = RouteProp<SendDetailsStackParamList, 'ScanQRCode'>;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  openSettingsContainer: {
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  backdoorButton: {
    width: 60,
    height: 60,
    position: 'absolute',
    top: 60,
    left: '50%',
    transform: [{ translateX: -30 }],
  },
  backdoorInputWrapper: { position: 'absolute', left: '5%', top: '10%', width: '90%', height: '70%', backgroundColor: 'white' },
  progressWrapper: { position: 'absolute', alignSelf: 'center', alignItems: 'center', top: '50%', padding: 8, borderRadius: 8 },
  backdoorInput: {
    height: '50%',
    marginTop: 5,
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 4,
    textAlignVertical: 'top',
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionSpacer: {
    marginLeft: 12,
  },
});

type HeaderActionButtonProps = {
  icon: React.ComponentProps<typeof Icon>['name'];
  type: React.ComponentProps<typeof Icon>['type'];
  label: string;
  onPress?: () => void;
  active?: boolean;
  testID?: string;
  foregroundColor: string;
  activeIconColor: string;
  buttonStyle: object;
  activeButtonStyle: object;
};

const HeaderActionButton = ({
  icon,
  type,
  label,
  onPress,
  active = false,
  testID,
  foregroundColor,
  activeIconColor,
  buttonStyle,
  activeButtonStyle,
}: HeaderActionButtonProps): ReactElement => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel={label}
    testID={testID}
    style={[styles.headerActionButton, buttonStyle, active && activeButtonStyle]}
    onPress={onPress}
  >
    <Icon name={icon} type={type} size={20} color={active ? activeIconColor : foregroundColor} />
  </TouchableOpacity>
);

type HeaderRightActionsProps = {
  showFileImportButton?: boolean;
  onShowImagePickerButtonPress: () => void;
  showFilePicker: () => void;
  foregroundColor: string;
  buttonStyle: object;
};

const HeaderRightActions = ({
  showFileImportButton,
  onShowImagePickerButtonPress,
  showFilePicker,
  foregroundColor,
  buttonStyle,
}: HeaderRightActionsProps): ReactElement => (
  <View style={styles.headerActionRow}>
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={loc._.pick_image}
      testID="ScanQRCodeImagePickerButton"
      style={[styles.headerActionButton, buttonStyle]}
      onPress={onShowImagePickerButtonPress}
    >
      <Icon name="image" type="font-awesome" size={20} color={foregroundColor} />
    </TouchableOpacity>
    {showFileImportButton && (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc._.pick_file}
        testID="ScanQRCodeFilePickerButton"
        style={[styles.headerActionButton, styles.headerActionSpacer, buttonStyle]}
        onPress={showFilePicker}
      >
        <Icon name="file-import" type="font-awesome-6" size={18} color={foregroundColor} />
      </TouchableOpacity>
    )}
  </View>
);

const ScanQRCode = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useExtendedNavigation();
  const route = useRoute<RouteProps>();
  const navigationState = navigation.getState();
  const previousRoute = navigationState.routes[navigationState.routes.length - 2];
  const defaultLaunchedBy = previousRoute ? previousRoute.name : undefined;

  const { launchedBy = defaultLaunchedBy, showFileImportButton, onBarScanned } = route.params || {};
  // useRef so the dedup cache survives re-renders (a plain variable resets every render)
  const scannedCache = useRef<Record<string, number>>({});
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [backdoorPressed, setBackdoorPressed] = useState(0);
  const [urTotal, setUrTotal] = useState(0);
  const [urHave, setUrHave] = useState(0);
  const [backdoorText, setBackdoorText] = useState('');
  const [backdoorVisible, setBackdoorVisible] = useState(false);
  const useBBQRRef = useRef(false);
  const animatedQRCodeDataRef = useRef<Record<string, string>>({});
  const [cameraStatusGranted, setCameraStatusGranted] = useState<boolean | undefined>(undefined);
  const [torchMode, setTorchMode] = useState(false);
  const stylesHook = StyleSheet.create({
    openSettingsContainer: {
      backgroundColor: colors.brandingColor,
    },
    progressWrapper: { backgroundColor: colors.brandingColor, borderColor: colors.foregroundColor, borderWidth: 4 },
    backdoorButton: {
      backgroundColor: __DEV__ ? colors.brandingColor : 'rgba(0,0,0,0.01)',
      borderWidth: __DEV__ ? 2 : 0,
      borderColor: __DEV__ ? colors.foregroundColor : 'transparent',
      opacity: __DEV__ ? 0.9 : 0.01,
    },
    backdoorInput: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
      color: colors.foregroundColor,
    },
    headerActionButton: {
      backgroundColor: colors.lightButton,
    },
    headerActionButtonActive: {
      backgroundColor: colors.foregroundColor,
    },
  });

  useEffect(() => {
    isCameraAuthorizationStatusGranted().then(setCameraStatusGranted);
  }, []);

  const HashIt = function (s: string): string {
    return uint8ArrayToHex(sha256(s));
  };

  const _onReadUniformResourceV2 = useCallback(
    (part: string) => {
      if (!decoder) decoder = new BlueURDecoder();
      try {
        decoder.receivePart(part);
        if (decoder.isComplete()) {
          const data = decoder.toString();
          decoder = undefined; // nullify for future use (?)
          if (onBarScanned) {
            onBarScanned(data, useBBQRRef.current);
            navigation.goBack();
          } else if (launchedBy) {
            navigation.dispatch(StackActions.popTo(launchedBy, { onBarScanned: data }, { merge: true }));
          }
        } else {
          setUrTotal(100);
          setUrHave(Math.floor(decoder.estimatedPercentComplete() * 100));
        }
      } catch (error: any) {
        console.log('Invalid animated qr code fragment: ' + error.message + ' (continuing scanning)');
      }
    },
    [launchedBy, navigation, onBarScanned],
  );

  /**
   *
   * @deprecated remove when we get rid of URv1 support
   */
  const _onReadUniformResource = useCallback(
    (ur: string) => {
      try {
        const [index, total] = extractSingleWorkload(ur);
        animatedQRCodeDataRef.current[index + 'of' + total] = ur;
        const animatedQrParts = Object.values(animatedQRCodeDataRef.current);
        setUrTotal(total);
        setUrHave(animatedQrParts.length);
        if (animatedQrParts.length === total) {
          const payload = decodeUR(animatedQrParts);
          // lets look inside that data
          let data: false | string = false;
          if (uint8ArrayToString(hexToUint8Array(String(payload))).startsWith('psbt')) {
            // its a psbt, and whoever requested it expects it encoded in base64
            data = uint8ArrayToBase64(hexToUint8Array(String(payload)));
          } else {
            // its something else. probably plain text is expected
            data = uint8ArrayToString(hexToUint8Array(String(payload)));
          }
          if (onBarScanned) {
            onBarScanned(data, useBBQRRef.current);
            navigation.goBack();
          } else if (launchedBy) {
            navigation.dispatch(StackActions.popTo(launchedBy, { onBarScanned: data }, { merge: true }));
          }
        }
      } catch (error: any) {
        console.log('Invalid animated qr code fragment: ' + error.message + ' (continuing scanning)');
      }
    },
    [launchedBy, navigation, onBarScanned],
  );

  const onBarCodeRead = useCallback(
    (ret: { data: string }) => {
      const h = HashIt(ret.data);
      if (scannedCache.current[h]) {
        // this QR was already scanned by this ScanQRCode, lets prevent firing duplicate callbacks
        return;
      }
      scannedCache.current[h] = +new Date();

      if (ret.data.toUpperCase().startsWith('UR:CRYPTO-ACCOUNT')) {
        return _onReadUniformResourceV2(ret.data);
      }

      if (ret.data.toUpperCase().startsWith('UR:CRYPTO-PSBT')) {
        return _onReadUniformResourceV2(ret.data);
      }

      if (ret.data.toUpperCase().startsWith('UR:CRYPTO-OUTPUT')) {
        return _onReadUniformResourceV2(ret.data);
      }

      if (ret.data.toUpperCase().startsWith('B$')) {
        useBBQRRef.current = true;
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
        const data = uint8ArrayToBase64(hexToUint8Array(hex));

        if (onBarScanned) {
          onBarScanned(data, useBBQRRef.current);
          navigation.goBack();
        } else if (launchedBy) {
          navigation.dispatch(StackActions.popTo(launchedBy, { onBarScanned: data }, { merge: true }));
        }
        return;
      } catch (_) {
        if (!isLoading) {
          setIsLoading(true);
          try {
            if (onBarScanned) {
              onBarScanned(ret.data, useBBQRRef.current);
              navigation.goBack();
            } else if (launchedBy) {
              navigation.dispatch(StackActions.popTo(launchedBy, { onBarScanned: ret.data }, { merge: true }));
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
      setIsLoading(false);
    },
    [_onReadUniformResource, _onReadUniformResourceV2, isLoading, launchedBy, navigation, onBarScanned],
  );

  const showFilePicker = useCallback(async () => {
    setIsLoading(true);
    const { data } = await fs.showFilePickerAndReadFile();
    if (data) onBarCodeRead({ data });
    setIsLoading(false);
  }, [onBarCodeRead]);

  const onShowImagePickerButtonPress = useCallback(() => {
    if (!isLoading) {
      setIsLoading(true);
      fs.showImagePickerAndReadImage()
        .then(data => {
          if (data) onBarCodeRead({ data });
        })
        .finally(() => setIsLoading(false));
    }
  }, [isLoading, onBarCodeRead]);

  const headerLeft = useCallback(
    () => (
      <HeaderActionButton
        icon={torchMode ? 'flashlight' : 'flashlight-off'}
        type="material-community"
        label="Toggle torch"
        onPress={() => {
          triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
          setTorchMode(current => !current);
        }}
        active={torchMode}
        testID="ScanQRCodeTorchButton"
        foregroundColor={colors.foregroundColor}
        activeIconColor={colors.background}
        buttonStyle={stylesHook.headerActionButton}
        activeButtonStyle={stylesHook.headerActionButtonActive}
      />
    ),
    [colors.background, colors.foregroundColor, stylesHook.headerActionButton, stylesHook.headerActionButtonActive, torchMode],
  );

  const headerRight = useCallback(
    () => (
      <HeaderRightActions
        showFileImportButton={showFileImportButton}
        onShowImagePickerButtonPress={onShowImagePickerButtonPress}
        showFilePicker={showFilePicker}
        foregroundColor={colors.foregroundColor}
        buttonStyle={stylesHook.headerActionButton}
      />
    ),
    [colors.foregroundColor, onShowImagePickerButtonPress, showFileImportButton, showFilePicker, stylesHook.headerActionButton],
  );

  useLayoutEffect(() => {
    if (isDesktop) {
      navigation.setOptions({
        title: '',
        headerTransparent: true,
        headerLeft: undefined,
        headerRight: undefined,
      });
      return;
    }

    navigation.setOptions({
      title: '',
      headerTransparent: true,
      headerBlurEffect: Platform.OS === 'ios' ? 'regular' : undefined,
      headerStyle: { backgroundColor: 'transparent' },
      headerTintColor: colors.foregroundColor,
      statusBarStyle: 'light',
      headerLeft: cameraStatusGranted ? headerLeft : undefined,
      headerRight,
    });
  }, [
    cameraStatusGranted,
    colors.background,
    colors.foregroundColor,
    headerLeft,
    headerRight,
    navigation,
    onShowImagePickerButtonPress,
    showFilePicker,
    showFileImportButton,
    stylesHook.headerActionButton,
    stylesHook.headerActionButtonActive,
    torchMode,
  ]);

  const dismiss = () => {
    navigation.goBack();
  };

  const handleReadCode = (event: any) => {
    onBarCodeRead({ data: event?.nativeEvent?.codeStringValue });
  };

  const handleBackdoorOkPress = () => {
    setBackdoorVisible(false);
    setBackdoorText('');
    if (backdoorText) onBarCodeRead({ data: backdoorText });
  };

  // this is an invisible backdoor button on bottom left screen corner
  // tapping it 10 times fires prompt dialog asking for a string thats gona be passed to onBarCodeRead.
  // this allows to mock and test QR scanning in e2e tests
  const handleInvisibleBackdoorPress = async () => {
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    if (backdoorPressed < 5) return;
    setBackdoorPressed(0);
    setBackdoorVisible(true);
  };

  const render = isLoading ? (
    <BlueLoading />
  ) : (
    <View>
      {cameraStatusGranted === false ? (
        <View style={[styles.openSettingsContainer, stylesHook.openSettingsContainer]}>
          <BlueText>{loc.send.permission_camera_message}</BlueText>
          <BlueSpacing40 />
          <Button title={loc.send.open_settings} onPress={openPrivacyDesktopSettings} />
          <BlueSpacing40 />
          {showFileImportButton && <Button title={loc.wallets.import_file} onPress={showFilePicker} />}
          <BlueSpacing40 />
          <Button title={loc.wallets.list_long_choose} onPress={onShowImagePickerButtonPress} />
          <BlueSpacing40 />
          <Button title={loc._.cancel} onPress={dismiss} />
        </View>
      ) : isFocused && cameraStatusGranted ? (
        <CameraScreen
          onReadCode={handleReadCode}
          showFilePickerButton={showFileImportButton}
          showImagePickerButton={true}
          onFilePickerButtonPress={showFilePicker}
          onImagePickerButtonPress={onShowImagePickerButtonPress}
          onCancelButtonPress={dismiss}
          hideTopButtons={!isDesktop}
          torchMode={torchMode}
          onTorchButtonPress={() => setTorchMode(current => !current)}
        />
      ) : null}
      {urTotal > 0 && (
        <View style={[styles.progressWrapper, stylesHook.progressWrapper]} testID="UrProgressBar">
          <BlueText>{loc.wallets.please_continue_scanning}</BlueText>
          <BlueText>
            {urHave} / {urTotal}
          </BlueText>
        </View>
      )}
      {backdoorVisible && (
        <View style={[styles.backdoorInputWrapper, { top: insets.top + 24 }]}>
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
          <Button title="OK" testID="scanQrBackdoorOkButton" onPress={handleBackdoorOkPress} />
        </View>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc._.qr_custom_input_button}
        testID="ScanQrBackdoorButton"
        style={[styles.backdoorButton, stylesHook.backdoorButton, { top: insets.top + 68 }]}
        onPress={handleInvisibleBackdoorPress}
      />
    </View>
  );

  if (isFocused && cameraStatusGranted) {
    return <View style={styles.root}>{render}</View>;
  }

  return <SafeArea style={styles.root}>{render}</SafeArea>;
};

export default ScanQRCode;
