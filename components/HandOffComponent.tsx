import React from 'react';
import { HandOffComponentProps } from './types';

const HandOffComponent: React.FC<HandOffComponentProps> = props => {
  console.debug('HandOffComponent: props', props);
  return null;
};

export const setIsHandOffUseEnabled = async (value: boolean) => {};

export const getIsHandOffUseEnabled = async (): Promise<boolean> => {
  return false;
};

export default HandOffComponent;
