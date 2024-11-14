
export const DeviceQuickActionsStorageKey = 'DeviceQuickActionsEnabled';

export const setEnabled = (): void => {};

export const getEnabled = async (): Promise<boolean> => {
  return false;
};

const useDeviceQuickActions = () => {

  const popInitialAction = (): void => {};
  return { popInitialAction };
};


export default useDeviceQuickActions;
