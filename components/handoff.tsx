// HandOff.tsx for unsupported platforms

import React from 'react';

interface HandOffComponentProps {
  url?: string;
  title?: string;
  type?: string;
  userInfo?: object;
}

export const activityTypes = {
  ReceiveOnchain: '',
  Xpub: '',
  ViewInBlockExplorer: '',
};

const HandOff: React.FC<HandOffComponentProps> & { activityTypes: typeof activityTypes } = () => {
  return null;
};

HandOff.activityTypes = activityTypes;

export default HandOff;
