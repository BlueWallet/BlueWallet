import React, { useState, useEffect, useRef, useCallback, forwardRef, ForwardedRef } from 'react';
import {
  Dimensions,
  Text,
  LayoutAnimation,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  UIManager,
} from 'react-native';
import { encodeUR } from '../blue_modules/ur';
import { BlueSpacing20 } from '../BlueComponents';
import { useTheme } from '../components/themes';
import loc from '../loc';
import QRCodeComponent from './QRCodeComponent';

const { height, width } = Dimensions.get('window');

interface DynamicQRCodeProps {
  value: string;
  capacity?: number;
  hideControls?: boolean;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const DynamicQRCode = forwardRef<View, DynamicQRCodeProps>(
  ({ value, capacity = 175, hideControls: initialHideControls = true }, ref: ForwardedRef<View>) => {
    const qrCodeHeight = Math.min(height > width ? width - 40 : width / 3, 370);
    const fragmentsRef = useRef<string[]>([]);
    const { colors } = useTheme();
    const [index, setIndex] = useState(0);
    const [total, setTotal] = useState(0);
    const [intervalHandler, setIntervalHandler] = useState<ReturnType<typeof setInterval> | number | null>(null);
    const [displayQRCode, setDisplayQRCode] = useState(true);
    const [hideControls, setHideControls] = useState(initialHideControls);
    const [isLoading, setIsLoading] = useState(true);
    const [fragmentsInitialized, setFragmentsInitialized] = useState(false);

    const moveToNextFragment = useCallback(() => {
      if (!fragmentsRef.current || fragmentsRef.current.length === 0) return;

      if (index === total - 1) {
        setIndex(0);
      } else {
        setIndex(prevIndex => prevIndex + 1);
      }
    }, [index, total]);

    const startAutoMove = useCallback(() => {
      setIntervalHandler(prevHandler => {
        if (prevHandler) {
          clearInterval(prevHandler as number);
        }
        return setInterval(moveToNextFragment, 500);
      });
    }, [moveToNextFragment]);

    const stopAutoMove = useCallback(() => {
      setIntervalHandler(prevHandler => {
        if (prevHandler) {
          clearInterval(prevHandler as number);
        }
        return null;
      });
    }, []);

    const moveToPreviousFragment = useCallback(() => {
      if (index > 0) {
        setIndex(prevIndex => prevIndex - 1);
      } else {
        setIndex(total - 1);
      }
    }, [index, total]);

    const onError = useCallback(() => {
      console.log('Data is too large for QR Code.');
      setDisplayQRCode(false);
    }, []);

    useEffect(() => {
      setIsLoading(true);
      try {
        fragmentsRef.current = encodeUR(value, capacity);
        setTotal(fragmentsRef.current.length);
        setIndex(0); // Reset index when fragments change
        setDisplayQRCode(true);
        setFragmentsInitialized(true);
        setIsLoading(false);
      } catch (e) {
        console.log(e);
        setDisplayQRCode(false);
        setIsLoading(false);
      }
    }, [value, capacity]);

    // Effect to start auto-moving once fragments are ready
    useEffect(() => {
      if (total > 0 && !isLoading && fragmentsInitialized) {
        startAutoMove();
      }
    }, [total, isLoading, fragmentsInitialized, startAutoMove]);

    useEffect(() => {
      return () => {
        if (intervalHandler) {
          clearInterval(intervalHandler as number);
        }
      };
    }, [intervalHandler]);

    useEffect(() => {
      if (total > 0 && index >= total) {
        setIndex(0);
      }
    }, [index, total]);

    const getCurrentFragment = useCallback(() => {
      if (!fragmentsRef.current || index >= fragmentsRef.current.length || index < 0) {
        return '';
      }
      return fragmentsRef.current[index];
    }, [index]);

    const currentFragment = getCurrentFragment();

    return (
      <View style={animatedQRCodeStyle.container} ref={ref}>
        {isLoading ? (
          <ActivityIndicator size="large" />
        ) : !currentFragment && displayQRCode ? (
          <Text style={{ color: colors.foregroundColor }}>{loc.send.dynamic_init}</Text>
        ) : (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              testID="DynamicCode"
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setHideControls(prevState => !prevState);
              }}
            >
              {displayQRCode && (
                <View style={animatedQRCodeStyle.qrcodeContainer}>
                  <QRCodeComponent
                    isLogoRendered={false}
                    value={currentFragment.toUpperCase()}
                    size={qrCodeHeight}
                    isMenuAvailable={false}
                    ecl="L"
                    onError={onError}
                  />
                </View>
              )}
            </TouchableOpacity>

            {!hideControls && (
              <View style={animatedQRCodeStyle.container}>
                <BlueSpacing20 />
                <View>
                  <Text style={[animatedQRCodeStyle.text, { color: colors.foregroundColor }]}>
                    {loc.formatString(loc._.of, { number: index + 1, total })}
                  </Text>
                </View>
                <BlueSpacing20 />
                <View style={animatedQRCodeStyle.controller}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[animatedQRCodeStyle.button, animatedQRCodeStyle.buttonPrev]}
                    onPress={moveToPreviousFragment}
                  >
                    <Text style={[animatedQRCodeStyle.text, { color: colors.foregroundColor }]}>{loc.send.dynamic_prev}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[animatedQRCodeStyle.button, animatedQRCodeStyle.buttonStopStart]}
                    onPress={intervalHandler ? stopAutoMove : startAutoMove}
                  >
                    <Text style={[animatedQRCodeStyle.text, { color: colors.foregroundColor }]}>
                      {intervalHandler ? loc.send.dynamic_stop : loc.send.dynamic_start}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[animatedQRCodeStyle.button, animatedQRCodeStyle.buttonNext]}
                    onPress={moveToNextFragment}
                  >
                    <Text style={[animatedQRCodeStyle.text, { color: colors.foregroundColor }]}>{loc.send.dynamic_next}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    );
  },
);

const animatedQRCodeStyle = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrcodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controller: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 25,
    height: 45,
    paddingHorizontal: 18,
  },
  button: {
    alignItems: 'center',
    height: 45,
    justifyContent: 'center',
  },
  buttonPrev: {
    width: '25%',
    alignItems: 'flex-start',
  },
  buttonStopStart: {
    width: '50%',
  },
  buttonNext: {
    width: '25%',
    alignItems: 'flex-end',
  },
  text: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
