import React from 'react';
import DefaultPreference from 'react-native-default-preference';
// @ts-ignore: react-native-handoff is not in the type definition
import Handoff from 'react-native-handoff';
import { useSettings } from '../hooks/context/useSettings';
import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';
import { BlueApp } from '../class';
import { HandOffComponentProps } from './types';

const HandOffComponent: React.FC<HandOffComponentProps> = props => {
  const { isHandOffUseEnabled } = useSettings();

  if (process.env.NODE_ENV === 'development') {
    console.debug('HandOffComponent: props', props);
  }
  if (isHandOffUseEnabled) {
    return <Handoff {...props} />;
  }
  return null;
};

const MemoizedHandOffComponent = React.memo(HandOffComponent);

export const setIsHandOffUseEnabled = async (value: boolean) => {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  await DefaultPreference.set(BlueApp.HANDOFF_STORAGE_KEY, value.toString());
  console.debug('setIsHandOffUseEnabledAsyncStorage', value);
};

export const getIsHandOffUseEnabled = async (): Promise<boolean> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const isEnabledValue = (await DefaultPreference.get(BlueApp.HANDOFF_STORAGE_KEY)) ?? false;
    console.debug('getIsHandOffUseEnabled', isEnabledValue);
    return isEnabledValue === 'true';
  } catch (e) {
    console.debug('getIsHandOffUseEnabled error', e);
  }
  return false;
};

export default MemoizedHandOffComponent;
