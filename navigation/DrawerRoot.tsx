import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerNavigationOptions,
  DrawerNavigationProp,
  useDrawerStatus,
} from '@react-navigation/drawer';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { shouldUseWideLayout } from '../blue_modules/layout';
import DrawerList from '../screen/wallets/DrawerList';
import DetailViewStackScreensStack from './DetailViewScreensStack';
import { DrawerParamList } from './DrawerParamList';
import useCompanionListeners from '../hooks/useCompanionListeners';

const Drawer = createDrawerNavigator<DrawerParamList>();

const DrawerContent = ({ navigation, ...props }: DrawerContentComponentProps) => {
  const { width } = useWindowDimensions();
  const isWideLayout = shouldUseWideLayout(width);
  const drawerStatus = useDrawerStatus();

  useEffect(() => {
    navigation.dispatch(isWideLayout ? DrawerActions.openDrawer() : DrawerActions.closeDrawer());
  }, [isWideLayout, navigation]);

  if (!isWideLayout && drawerStatus === 'closed') return null;

  return <DrawerList {...props} navigation={navigation} />;
};

const ResponsiveDetailView = () => {
  const { width } = useWindowDimensions();
  const isWideLayout = shouldUseWideLayout(width);
  const drawerStatus = useDrawerStatus();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList, 'DetailViewStackScreensStack'>>();

  useEffect(() => {
    navigation.setOptions({ drawerType: isWideLayout && drawerStatus === 'open' ? 'permanent' : 'front' });
  }, [drawerStatus, isWideLayout, navigation]);

  useEffect(() => {
    console.debug(`[DrawerRoot] Drawer ${drawerStatus} at ${width}px`);
  }, [drawerStatus, width]);

  return <DetailViewStackScreensStack />;
};

const DrawerRoot = () => {
  const { height, width } = useWindowDimensions();
  const isWideLayout = shouldUseWideLayout(width);
  const drawerWidth = width >= 744 ? 320 : 280;
  useCompanionListeners();

  useEffect(() => {
    console.debug(`[DrawerRoot] Window ${width}×${height}; ${isWideLayout ? 'split' : 'compact'} layout`);
  }, [height, isWideLayout, width]);

  const screenOptions = useMemo<DrawerNavigationOptions>(
    () => ({
      drawerStyle: {
        width: drawerWidth,
        height: '100%',
      },
      drawerType: isWideLayout ? 'permanent' : 'front',
      overlayStyle: { backgroundColor: 'rgba(0, 0, 0, 0.4)' },
      swipeEnabled: false,
      headerShown: false,
    }),
    [drawerWidth, isWideLayout],
  );

  return (
    <Drawer.Navigator
      screenOptions={screenOptions}
      drawerContent={DrawerContent}
      initialRouteName="DetailViewStackScreensStack"
      defaultStatus={isWideLayout ? 'open' : 'closed'}
    >
      <Drawer.Screen name="DetailViewStackScreensStack" component={ResponsiveDetailView} />
    </Drawer.Navigator>
  );
};

export default DrawerRoot;
