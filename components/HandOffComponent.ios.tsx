import React from 'react';
import DefaultPreference from 'react-native-default-preference';
// @ts-ignore: Handoff is not typed
import Handoff from 'react-native-handoff';
import { useSettings } from '../hooks/context/useSettings';
import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';
import { BlueApp } from '../class';
import { HandOffComponentProps } from './types';

const HandOffComponent: React.FC<HandOffComponentProps> = React.memo(
  props => {
    const { isHandOffUseEnabled } = useSettings();

    if (!props || !props.type || !props.userInfo || Object.keys(props.userInfo).length === 0) {
      return null;
    }

    return isHandOffUseEnabled ? <Handoff {...props} /> : null;
  },
  (prevProps, nextProps) => {
    return (
      prevProps.type === nextProps.type &&
      JSON.stringify(prevProps.userInfo) === JSON.stringify(nextProps.userInfo) &&
      prevProps.title === nextProps.title
    );
  },
);

export const setIsHandOffUseEnabled = async (value: boolean) => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    await DefaultPreference.set(BlueApp.HANDOFF_STORAGE_KEY, value.toString());
    console.debug('setIsHandOffUseEnabled', value);
  } catch (error) {
    console.error('Error setting handoff enabled status:', error);
    throw error; // Propagate error to caller
  }
};

export const getIsHandOffUseEnabled = async (): Promise<boolean> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const isEnabledValue = await DefaultPreference.get(BlueApp.HANDOFF_STORAGE_KEY);
    const result = isEnabledValue === 'true';
    console.debug('getIsHandOffUseEnabled', result);
    return result;
  } catch (error) {
    console.error('Error getting handoff enabled status:', error);
    return false;
  }
};

export default HandOffComponent;
