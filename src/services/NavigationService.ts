import { NavigationContainer } from '@react-navigation/native';
import React from 'react';

export const navigationRef: any = React.createRef<typeof NavigationContainer>();

export default class NavigationService {
  navigate = (name: string, params: unknown) => {
    navigationRef.current?.navigate(name, params);
  };
}
