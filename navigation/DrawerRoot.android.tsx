import { createDrawerNavigator, DrawerContentComponentProps, DrawerNavigationOptions } from '@react-navigation/drawer';
import { useLocale } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { SplitLayoutProvider } from '../components/Context/SplitLayoutContext';
import useCompanionListeners from '../hooks/useCompanionListeners';
import { WalletsListSidebar } from '../screen/wallets/WalletsList';
import DetailViewStackScreensStack from './DetailViewScreensStack';
import { DrawerParamList } from './DrawerParamList';

const Drawer = createDrawerNavigator<DrawerParamList>();

const DrawerContent = (_props: DrawerContentComponentProps) => {
  const { width } = useWindowDimensions();

  if (width < 768) return null;

  return <WalletsListSidebar />;
};

const DrawerRoot = () => {
  const { width } = useWindowDimensions();
  const { direction } = useLocale();
  const isExpanded = width >= 768;
  useCompanionListeners();

  const drawerOptions: DrawerNavigationOptions = useMemo(
    () => ({
      drawerPosition: direction === 'rtl' ? 'right' : 'left',
      drawerStyle: {
        width: width >= 1024 ? 320 : width >= 768 ? 280 : 0,
        height: '100%',
      },
      drawerType: isExpanded ? 'permanent' : 'front',
      overlayColor: 'rgba(0,0,0,0.4)',
      swipeEnabled: false,
    }),
    [direction, isExpanded, width],
  );

  return (
    <SplitLayoutProvider isExpanded={isExpanded} column="secondary">
      <Drawer.Navigator
        drawerContent={DrawerContent}
        initialRouteName="DetailViewStackScreensStack"
        defaultStatus={isExpanded ? 'open' : 'closed'}
        screenOptions={drawerOptions}
      >
        <Drawer.Screen name="DetailViewStackScreensStack" component={DetailViewStackScreensStack} options={{ headerShown: false }} />
      </Drawer.Navigator>
    </SplitLayoutProvider>
  );
};
export default DrawerRoot;
