import { createDrawerNavigator } from '@react-navigation/drawer';
import React, { useState } from 'react';
import { Split } from 'react-native-screens/experimental';
import { isMacCatalyst } from '../blue_modules/environment';
import { SplitLayoutProvider } from '../components/Context/SplitLayoutContext';
import useCompanionListeners from '../hooks/useCompanionListeners';
import { WalletsListSidebar } from '../screen/wallets/WalletsList';
import DetailViewStackScreensStack from './DetailViewScreensStack';
import { DrawerParamList } from './DrawerParamList';

const CatalystDrawer = createDrawerNavigator<DrawerParamList>();

const CatalystDrawerRoot = () => (
  <SplitLayoutProvider isExpanded column="secondary">
    <CatalystDrawer.Navigator
      drawerContent={() => <WalletsListSidebar />}
      initialRouteName="DetailViewStackScreensStack"
      defaultStatus="open"
      screenOptions={{
        drawerStyle: { width: 320, height: '100%' },
        drawerType: 'permanent',
        swipeEnabled: false,
      }}
    >
      <CatalystDrawer.Screen name="DetailViewStackScreensStack" component={DetailViewStackScreensStack} options={{ headerShown: false }} />
    </CatalystDrawer.Navigator>
  </SplitLayoutProvider>
);

const DrawerRoot = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  useCompanionListeners();

  // react-native-screens Split currently crashes while Fabric creates its
  // native host on Mac Catalyst. Keep the established permanent drawer there.
  if (isMacCatalyst) return <CatalystDrawerRoot />;

  return (
    <Split.Host
      columnMetrics={{
        minimumPrimaryColumnWidth: 280,
        preferredPrimaryColumnWidthOrFraction: 320,
        maximumPrimaryColumnWidth: 400,
      }}
      displayModeButtonVisibility="automatic"
      onCollapse={() => setIsExpanded(false)}
      onExpand={() => setIsExpanded(true)}
      preferredDisplayMode="oneBesideSecondary"
      preferredSplitBehavior="tile"
      primaryBackgroundStyle="sidebar"
      showSecondaryToggleButton
      topColumnForCollapsing="secondary"
    >
      <Split.Column>
        <SplitLayoutProvider isExpanded={isExpanded} column="primary">
          <WalletsListSidebar />
        </SplitLayoutProvider>
      </Split.Column>
      <Split.Column>
        <SplitLayoutProvider isExpanded={isExpanded} column="secondary">
          <DetailViewStackScreensStack />
        </SplitLayoutProvider>
      </Split.Column>
    </Split.Host>
  );
};
export default DrawerRoot;
