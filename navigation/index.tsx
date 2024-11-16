import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import DrawerRoot from './DrawerRoot';

export const NavigationDefaultOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'modal',
  headerShadowVisible: false,
};
export const NavigationFormModalOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'formSheet',
};
export const StatusBarLightOptions: NativeStackNavigationOptions = { statusBarStyle: 'light' };

const DetailViewStack = createNativeStackNavigator<DetailViewStackParamList>();

const MainRoot = () => {
  return DrawerRoot();
};

export default MainRoot;
export { DetailViewStack }; // Exporting the navigator to use it in DetailViewScreensStack
