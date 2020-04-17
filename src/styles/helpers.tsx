import { Dimensions, Platform, StatusBar } from 'react-native';

const { height, width } = Dimensions.get('window');

const iphoneXHeight = 812;
const iphoneXMaxHeight = 896;

export const isIos = () => Platform.OS === 'ios';

export const isIphoneX = (): boolean => {
  return (
    isIos() &&
    (height === iphoneXHeight || width === iphoneXHeight || height === iphoneXMaxHeight || width === iphoneXMaxHeight)
  );
};

export const ifIphoneX = (iPhoneXValue: any, regularValue: any) => (isIphoneX() ? iPhoneXValue : regularValue);

export const getStatusBarHeight = (): number =>
  Platform.select({
    ios: ifIphoneX(44, 20),
    android: StatusBar.currentHeight,
  });
