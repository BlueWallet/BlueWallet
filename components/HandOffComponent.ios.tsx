import React from 'react';
import DefaultPreference from 'react-native-default-preference';
// @ts-ignore: react-native-handoff is not in the type definition
import Handoff from 'react-native-handoff';

import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';
import { BlueApp } from '../class';
import { useSettings } from './Context/SettingsContext';

interface HandOffComponentProps {
  url?: string;
  title?: string;
  type: (typeof HandOffComponent.activityTypes)[keyof typeof HandOffComponent.activityTypes];
  userInfo?: object;
}

interface HandOffComponentWithActivityTypes extends React.FC<HandOffComponentProps> {
  activityTypes: {
    ReceiveOnchain: string;
    Xpub: string;
    ViewInBlockExplorer: string;
  };
}

export const setIsHandOffUseEnabled = async (value: boolean) => {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  await DefaultPreference.set(BlueApp.HANDOFF_STORAGE_KEY, value.toString());
  console.log('setIsHandOffUseEnabledAsyncStorage', value);
};

export const getIsHandOffUseEnabled = async (): Promise<boolean> => {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  const isEnabledValue = await DefaultPreference.get(BlueApp.HANDOFF_STORAGE_KEY);
  console.log('getIsHandOffUseEnabledV', isEnabledValue);
  return isEnabledValue === 'true';
};

const HandOffComponent: HandOffComponentWithActivityTypes = props => {
  const { isHandOffUseEnabled } = useSettings();

  if (process.env.NODE_ENV === 'development') {
    console.log('HandOffComponent: props', props);
  }
  if (isHandOffUseEnabled) {
    return <Handoff {...props} />;
  }
  return null;
};

const activityTypes = {
  ReceiveOnchain: 'io.bluewallet.bluewallet.receiveonchain',
  Xpub: 'io.bluewallet.bluewallet.xpub',
  ViewInBlockExplorer: 'io.bluewallet.bluewallet.blockexplorer',
};

HandOffComponent.activityTypes = activityTypes;

export default HandOffComponent;
