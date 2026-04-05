import useDeepLinkListeners from './useDeepLinkListeners';
import useDeviceQuickActions from './useDeviceQuickActions';
import useHandoffListener from './useHandoffListener';
import useMenuElements from './useMenuElements';
import useWatchConnectivity from './useWatchConnectivity';
import useWidgetCommunication from './useWidgetCommunication';

/**
 * Hook that initializes companion-related listeners and feature hooks.
 */
const useCompanionListeners = () => {
  useWatchConnectivity();
  useWidgetCommunication();
  useMenuElements();
  useDeviceQuickActions();
  useHandoffListener();
  useDeepLinkListeners();
};

export default useCompanionListeners;
