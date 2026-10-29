import { createDrawerNavigator, DrawerContentComponentProps, DrawerNavigationOptions } from '@react-navigation/drawer';
import React, { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { shouldUseWideLayout } from '../blue_modules/layout';
import DrawerList from '../screen/wallets/DrawerList';
import DetailViewStackScreensStack from './DetailViewScreensStack';
import { DrawerParamList } from './DrawerParamList';
import useCompanionListeners from '../hooks/useCompanionListeners';

const Drawer = createDrawerNavigator<DrawerParamList>();

const DrawerContent = (props: DrawerContentComponentProps) => {
  const { height, width } = useWindowDimensions();

  return shouldUseWideLayout(width, height) ? <DrawerList {...props} /> : null;
};

const DrawerRoot = () => {
  const { height, width } = useWindowDimensions();
  const isWideLayout = shouldUseWideLayout(width, height);
  useCompanionListeners();

  const screenOptions = useMemo<DrawerNavigationOptions>(
    () => ({
      drawerStyle: {
        width: isWideLayout ? 320 : 0,
        height: '100%',
      },
      drawerType: isWideLayout ? 'permanent' : 'front',
      overlayStyle: { backgroundColor: 'rgba(0, 0, 0, 0.4)' },
      swipeEnabled: false,
      headerShown: false,
    }),
    [isWideLayout],
  );

  return (
    <Drawer.Navigator
      screenOptions={screenOptions}
      drawerContent={DrawerContent}
      initialRouteName="DetailViewStackScreensStack"
      defaultStatus={isWideLayout ? 'open' : 'closed'}
    >
      <Drawer.Screen name="DetailViewStackScreensStack" component={DetailViewStackScreensStack} />
    </Drawer.Navigator>
  );
};

export default DrawerRoot;
