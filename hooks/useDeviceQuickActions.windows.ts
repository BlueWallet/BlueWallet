const useDeviceQuickActions = () => {
  // Windows platform does not support Device Quick Actions.
};

export async function setEnabled(enabled: boolean = true): Promise<void> {
  console.warn('QuickActions are not supported on Windows.');
}

export async function getEnabled(): Promise<boolean> {
  return false;
}

export default useDeviceQuickActions;
