import React from 'react';

export const DeviceQuickActionsStorageKey = 'DeviceQuickActionsEnabled';

interface DeviceQuickActionsFunctions {
  setEnabled: () => void;
  getEnabled: () => Promise<boolean>;
  popInitialAction: () => void;
}

const DeviceQuickActions: React.FC & DeviceQuickActionsFunctions = () => {
  return null;
};

DeviceQuickActions.setEnabled = (): void => {};

DeviceQuickActions.getEnabled = async (): Promise<boolean> => {
  return false;
};

DeviceQuickActions.popInitialAction = (): void => {};

export default DeviceQuickActions;
