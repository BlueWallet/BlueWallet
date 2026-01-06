import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import PromptPasswordConfirmationSheet from '../screen/PromptPasswordConfirmationSheet';
import { PromptPasswordConfirmationStackParamList } from './PromptPasswordConfirmationStackParamList';

const Stack = createNativeStackNavigator<PromptPasswordConfirmationStackParamList>();

const PromptPasswordConfirmationStack = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }} initialRouteName="PromptPasswordConfirmationSheet">
      <Stack.Screen
        name="PromptPasswordConfirmationSheet"
        component={PromptPasswordConfirmationSheet}
        options={navigationStyle({
          title: loc.settings.password,
          closeButtonPosition: CloseButtonPosition.Right,
          headerBackButtonDisplayMode: 'minimal',
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default PromptPasswordConfirmationStack;
