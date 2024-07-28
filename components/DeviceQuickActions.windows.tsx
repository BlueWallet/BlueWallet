import React from 'react';

export const DeviceQuickActionsStorageKey = 'DeviceQuickActionsEnabled';

interface DeviceQuickActionsFunctions {
  popInitialAction: () => void;
}

export const setEnabled = (): void => {};

export const getEnabled = async (): Promise<boolean> => {
  return false;
};

const DeviceQuickActions: React.FC & DeviceQuickActionsFunctions = () => {
  return null;
};

DeviceQuickActions.popInitialAction = (): void => {};

export default DeviceQuickActions;
