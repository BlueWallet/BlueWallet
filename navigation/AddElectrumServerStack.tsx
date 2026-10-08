import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import navigationStyle, { CloseButtonPosition, withRouteParamHeaderOptions } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import AddElectrumServer from '../screen/settings/AddElectrumServer';
import { AddElectrumServerStackParamList } from './AddElectrumServerStackParamList';

const Stack = createNativeStackNavigator<AddElectrumServerStackParamList>();

const AddElectrumServerStack = () => {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }} initialRouteName="AddElectrumServer">
      <Stack.Screen
        name="AddElectrumServer"
        component={AddElectrumServer}
        options={navigationStyle(
          {
            title: loc.settings.electrum_add_server,
            closeButtonPosition: CloseButtonPosition.Left,
            headerBackButtonDisplayMode: 'minimal',
          },
          withRouteParamHeaderOptions({ headerRight: true, unstable_headerRightItems: true }),
        )(theme)}
      />
    </Stack.Navigator>
  );
};

export default AddElectrumServerStack;
