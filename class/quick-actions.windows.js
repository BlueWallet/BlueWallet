export const DeviceQuickActionsStorageKey = 'DeviceQuickActionsEnabled';

function DeviceQuickActions() {
  DeviceQuickActions.setEnabled = () => {};

  DeviceQuickActions.getEnabled = async () => {
    return false;
  };

  DeviceQuickActions.popInitialAction = () => {};

  return null;
}

export default DeviceQuickActions;
