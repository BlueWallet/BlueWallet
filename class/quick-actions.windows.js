function DeviceQuickActions() {
  DeviceQuickActions.STORAGE_KEY = 'DeviceQuickActionsEnabled';

  DeviceQuickActions.setEnabled = () => {};

  DeviceQuickActions.getEnabled = async () => {
    return false;
  };

  DeviceQuickActions.popInitialAction = () => {};

  return null;
}

export default DeviceQuickActions;
