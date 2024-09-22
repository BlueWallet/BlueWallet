import React from 'react';
// @ts-ignore: react-native-handoff is not in the type definition
import Handoff from 'react-native-handoff';
import { useSettings } from '../hooks/context/useSettings';
import { BlueApp } from '../class';
import { HandOffComponentProps } from './types';
import { getUserPreference, setUserPreference } from '../helpers/userPreference';

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
  await setUserPreference({
    key: BlueApp.HANDOFF_STORAGE_KEY,
    value: value.toString(),
    useGroupContainer: false,
  });
  console.debug('setIsHandOffUseEnabled', value);
};

export const getIsHandOffUseEnabled = async (): Promise<boolean> => {
  try {
    const isEnabledValue = await getUserPreference({
      key: BlueApp.HANDOFF_STORAGE_KEY,
      useGroupContainer: false,
    });
    console.debug('getIsHandOffUseEnabled', isEnabledValue);
    return isEnabledValue === 'true';
  } catch (e) {
    console.debug('getIsHandOffUseEnabled error', e);
  }
  return false;
};

export default MemoizedHandOffComponent;
