import React from 'react';

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

const HandOffComponent: HandOffComponentWithActivityTypes = props => {
  return null;
};

export const setIsHandOffUseEnabled = async (value: boolean) => {};

export const getIsHandOffUseEnabled = async (): Promise<boolean> => {
  return false;
};

const activityTypes = {
  ReceiveOnchain: 'io.bluewallet.bluewallet.receiveonchain',
  Xpub: 'io.bluewallet.bluewallet.xpub',
  ViewInBlockExplorer: 'io.bluewallet.bluewallet.blockexplorer',
};

HandOffComponent.activityTypes = activityTypes;

export default HandOffComponent;
