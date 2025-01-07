import React, { useState, useRef } from 'react';
import { Animated, ImageURISource, SafeAreaView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Camera, CameraApi, CameraType, Orientation } from 'react-native-camera-kit';
import loc from '../loc';
import { Icon } from '@rneui/base';

interface CameraScreenProps {
  onCancelButtonPress: () => void;
  showImagePickerButton?: boolean;
  showFilePickerButton?: boolean;
  onImagePickerButtonPress?: () => void;
  onFilePickerButtonPress?: () => void;
  torchOnImage?: ImageURISource;
  torchOffImage?: ImageURISource;
  onReadCode?: (event: any) => void;
  cameraFlipImage?: ImageURISource;
}

const CameraScreen: React.FC<CameraScreenProps> = ({
  onCancelButtonPress,
  showImagePickerButton,
  showFilePickerButton,
  onImagePickerButtonPress,
  onFilePickerButtonPress,
  torchOnImage,
  torchOffImage,
  onReadCode,
  cameraFlipImage,
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
  };

  const onSetTorch = () => {
    setTorchMode(!torchMode);
  };

  // Counter-rotate the icons to indicate the actual orientation of the captured photo.
  // For this example, it'll behave incorrectly since UI orientation is allowed (and already-counter rotates the entire screen)
  // For real phone apps, lock your UI orientation using a library like 'react-native-orientation-locker'
  const rotateUi = true;
  const uiRotation = orientationAnim.interpolate({
    inputRange: [1, 4],
    outputRange: ['180deg', '-90deg'],
  });
  const uiRotationStyle = rotateUi ? { transform: [{ rotate: uiRotation }] } : undefined;

  function rotateUiTo(rotationValue: number) {
    Animated.timing(orientationAnim, {
      toValue: rotationValue,
      useNativeDriver: true,
      duration: 200,
      isInteraction: false,
    }).start();
  }

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <SafeAreaView style={styles.topButtons}>
        <TouchableOpacity style={styles.topButton} onPress={onSetTorch}>
          <Animated.Image
            source={torchMode ? torchOnImage : torchOffImage}
            resizeMode="contain"
            style={[styles.topButtonImg, uiRotationStyle]}
          />
        </TouchableOpacity>
        <View style={styles.rightButtonsContainer}>
          {showImagePickerButton && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={loc._.pick_image}
              style={[styles.topButton, styles.spacing, uiRotationStyle]}
              onPress={onImagePickerButtonPress}
            >
              <Icon name="image" type="font-awesome" color="#ffffff" />
            </TouchableOpacity>
          )}
          {showFilePickerButton && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={loc._.pick_file}
              style={[styles.topButton, styles.spacing, uiRotationStyle]}
              onPress={onFilePickerButtonPress}
            >
              <Icon name="file-import" type="font-awesome-5" color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.cameraPreview}
          cameraType={cameraType}
          resetFocusWhenMotionDetected
          zoom={zoom}
          maxZoom={10}
          onZoom={e => {
            console.debug('zoom', e.nativeEvent.zoom);
            setZoom(e.nativeEvent.zoom);
          }}
          onReadCode={onReadCode}
          torchMode={torchMode ? 'on' : 'off'}
          shutterPhotoSound
          maxPhotoQualityPrioritization="quality"
          onOrientationChange={e => {
            // We recommend locking the camera UI to portrait (using a different library)
            // and rotating the UI elements counter to the orientation
            // However, we include onOrientationChange so you can match your UI to what the camera does
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
          }}
        />
      </View>

      <SafeAreaView style={styles.bottomButtons}>
        <TouchableOpacity onPress={onCancelButtonPress}>
          <Animated.Text style={[styles.backTextStyle, uiRotationStyle]}>{loc._.cancel}</Animated.Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomButton} onPress={onSwitchCameraPressed}>
          <Animated.Image source={cameraFlipImage as ImageURISource} resizeMode="contain" style={[styles.topButtonImg, uiRotationStyle]} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

export default CameraScreen;

const styles = StyleSheet.create({
  screen: {
    height: '100%',
    backgroundColor: '#000000',
  },
  topButtons: {
    margin: 10,
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
    margin: 10,
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
