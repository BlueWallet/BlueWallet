import React, { useState, useRef } from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Camera, CameraApi, CameraType, Orientation } from 'react-native-camera-kit';
import loc from '../loc';
import { Icon } from '@rneui/base';
import { OnOrientationChangeData, OnReadCodeData } from 'react-native-camera-kit/dist/CameraProps';
import { triggerSelectionHapticFeedback } from '../blue_modules/hapticFeedback';

interface CameraScreenProps {
  onCancelButtonPress: () => void;
  showImagePickerButton?: boolean;
  showFilePickerButton?: boolean;
  onImagePickerButtonPress?: () => void;
  onFilePickerButtonPress?: () => void;
  onReadCode?: (event: OnReadCodeData) => void;
}

const CameraScreen: React.FC<CameraScreenProps> = ({
  onCancelButtonPress,
  showImagePickerButton,
  showFilePickerButton,
  onImagePickerButtonPress,
  onFilePickerButtonPress,
  onReadCode,
}) => {
  const cameraRef = useRef<CameraApi>(null);
  const [torchMode, setTorchMode] = useState(false);
  const [cameraType, setCameraType] = useState(CameraType.Back);
  const [zoom, setZoom] = useState<number | undefined>();
  const [orientationAnim] = useState(new Animated.Value(3));

  const onSwitchCameraPressed = () => {
    const direction = cameraType === CameraType.Back ? CameraType.Front : CameraType.Back;
    setCameraType(direction);
    setZoom(1); // When changing camera type, reset to default zoom for that camera
    triggerSelectionHapticFeedback();
  };

  const onSetTorch = () => {
    setTorchMode(!torchMode);
    triggerSelectionHapticFeedback();
  };

  // Counter-rotate the icons to indicate the actual orientation of the captured photo.
  // For this example, it'll behave incorrectly since UI orientation is allowed (and already-counter rotates the entire screen)
  // For real phone apps, lock your UI orientation using a library like 'react-native-orientation-locker'
  const rotateUi = true;
  const uiRotation = orientationAnim.interpolate({
    inputRange: [1, 2, 3, 4],
    outputRange: ['180deg', '90deg', '0deg', '-90deg'],
  });
  const uiRotationStyle = rotateUi ? { transform: [{ rotate: uiRotation }] } : {};

  function rotateUiTo(rotationValue: number) {
    Animated.timing(orientationAnim, {
      toValue: rotationValue,
      useNativeDriver: true,
      duration: 200,
      isInteraction: false,
    }).start();
  }

  const handleZoom = (e: { nativeEvent: { zoom: number } }) => {
    console.debug('zoom', e.nativeEvent.zoom);
    setZoom(e.nativeEvent.zoom);
  };

  const handleOrientationChange = (e: OnOrientationChangeData) => {
    switch (e.nativeEvent.orientation) {
      case Orientation.PORTRAIT_UPSIDE_DOWN:
        console.debug('orientationChange', 'PORTRAIT_UPSIDE_DOWN');
        rotateUiTo(1);
        break;
      case Orientation.LANDSCAPE_LEFT:
        console.debug('orientationChange', 'LANDSCAPE_LEFT');
        rotateUiTo(2);
        break;
      case Orientation.PORTRAIT:
        console.debug('orientationChange', 'PORTRAIT');
        rotateUiTo(3);
        break;
      case Orientation.LANDSCAPE_RIGHT:
        console.debug('orientationChange', 'LANDSCAPE_RIGHT');
        rotateUiTo(4);
        break;
      default:
        console.debug('orientationChange', e.nativeEvent);
        break;
    }
  };

  const handleReadCode = (event: OnReadCodeData) => {
    onReadCode?.(event);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topButtons}>
        <TouchableOpacity style={[styles.topButton, uiRotationStyle, torchMode ? styles.activeTorch : {}]} onPress={onSetTorch}>
          <Animated.View style={styles.topButtonImg}>
            {Platform.OS === 'ios' ? (
              <Icon name={torchMode ? 'flashlight-on' : 'flashlight-off'} type="font-awesome-6" color={torchMode ? '#000' : '#fff'} />
            ) : (
              <Icon name={torchMode ? 'flash-on' : 'flash-off'} type="ionicons" color={torchMode ? '#000' : '#fff'} />
            )}
          </Animated.View>
        </TouchableOpacity>
        <View style={styles.rightButtonsContainer}>
          {showImagePickerButton && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={loc._.pick_image}
              style={[styles.topButton, styles.spacing, uiRotationStyle]}
              onPress={onImagePickerButtonPress}
            >
              <Animated.View style={styles.topButtonImg}>
                <Icon name="image" type="font-awesome" color="#ffffff" />
              </Animated.View>
            </TouchableOpacity>
          )}
          {showFilePickerButton && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={loc._.pick_file}
              style={[styles.topButton, styles.spacing, uiRotationStyle]}
              onPress={onFilePickerButtonPress}
            >
              <Animated.View style={styles.topButtonImg}>
                <Icon name="file-import" type="font-awesome-5" color="#ffffff" />
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.cameraPreview}
          cameraType={cameraType}
          resetFocusWhenMotionDetected
          zoom={zoom}
          maxZoom={10}
          scanBarcode
          resizeMode="cover"
          onZoom={handleZoom}
          onReadCode={handleReadCode}
          torchMode={torchMode ? 'on' : 'off'}
          shutterPhotoSound
          maxPhotoQualityPrioritization="quality"
          onOrientationChange={handleOrientationChange}
        />
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity onPress={onCancelButtonPress}>
          <Animated.Text style={[styles.backTextStyle, uiRotationStyle]}>{loc._.cancel}</Animated.Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomButton, uiRotationStyle]} onPress={onSwitchCameraPressed}>
          <Animated.View style={[styles.topButtonImg, uiRotationStyle]}>
            {Platform.OS === 'ios' ? (
              <Icon name="cameraswitch" type="font-awesome-6" color="#ffffff" />
            ) : (
              <Icon name={cameraType === CameraType.Back ? 'camera-rear' : 'camera-front'} type="ionicons" color="#ffffff" />
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CameraScreen;

const styles = StyleSheet.create({
  activeTorch: {
    backgroundColor: '#fff',
  },
  screen: {
    height: '100%',
    backgroundColor: '#000000',
  },
  topButtons: {
    padding: 10,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topButton: {
    backgroundColor: '#222',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topButtonImg: {
    margin: 10,
    width: 24,
    height: 24,
  },
  cameraContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
  },
  bottomButtons: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backTextStyle: {
    padding: 10,
    color: 'white',
    fontSize: 20,
  },
  rightButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomButton: {
    backgroundColor: '#222',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  spacing: {
    marginLeft: 20,
  },
});
