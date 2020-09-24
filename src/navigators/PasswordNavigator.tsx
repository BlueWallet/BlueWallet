import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

import { Route } from 'app/consts';
import {
  CreateTransactionPassword,
  ConfirmTransactionPassword,
  CreatePinScreen,
  ConfirmPinScreen,
  MessageScreen,
} from 'app/screens';

const Stack = createStackNavigator();

export const PasswordNavigator = () => (
  <Stack.Navigator headerMode="none">
    <Stack.Screen name={Route.CreatePin} component={CreatePinScreen} />
    <Stack.Screen name={Route.ConfirmPin} component={ConfirmPinScreen} />
    <Stack.Screen name={Route.CreateTransactionPassword} component={CreateTransactionPassword} />
    <Stack.Screen name={Route.ConfirmTransactionPassword} component={ConfirmTransactionPassword} />
    <Stack.Screen name={Route.Message} component={MessageScreen} options={{}} />
  </Stack.Navigator>
);
