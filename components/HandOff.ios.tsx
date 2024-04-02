import React, { useCallback, useContext, useEffect } from 'react';
// @ts-ignore: react-native-handoff is not in the type definition
import { Handoff as RNHandoff } from 'react-native-handoff';
import { BlueStorageContext } from '../blue_modules/storage-context';
import { NativeModules } from 'react-native';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';

// Define the activityTypes object
const activityTypes = {
  ReceiveOnchain: 'io.bluewallet.bluewallet.receiveonchain',
  Xpub: 'io.bluewallet.bluewallet.xpub',
  ViewInBlockExplorer: 'io.bluewallet.bluewallet.blockexplorer',
};

type ActivityType = keyof typeof activityTypes;

interface UserActivityData {
  activityType: ActivityType;
  userInfo: {
    address?: string;
    xpub?: string;
  };
}

interface HandOffComponentProps {
  url?: string;
  title?: string;
  type: ActivityType;
  userInfo?: object;
}

const { EventEmitter } = NativeModules;

const HandOff: React.FC<HandOffComponentProps> & { activityTypes: typeof activityTypes } = props => {
  const { isHandOffUseEnabled } = useContext(BlueStorageContext);
  const { navigate } = useExtendedNavigation();

  const onUserActivityOpen = useCallback(
    (data: UserActivityData) => {
      switch (data.activityType) {
        case activityTypes.ReceiveOnchain:
          navigate('ReceiveDetails', { address: data.userInfo.address });
          break;
        case activityTypes.Xpub:
          navigate('WalletXpub', { xpub: data.userInfo.xpub });
          break;
        // Handle other cases as needed
        default:
          console.warn('Unknown activity type:', data.activityType);
          break;
      }
    },
    [navigate],
  );

  useEffect(() => {
    const handleNewUserActivity = (event: any) => {
      onUserActivityOpen(event);
    };

    if (isHandOffUseEnabled) {
      const subscription = EventEmitter.addListener('onUserActivityOpen', handleNewUserActivity);

      return () => {
        subscription.remove();
      };
    }
  }, [isHandOffUseEnabled, onUserActivityOpen]);

  if (isHandOffUseEnabled) {
    return <RNHandoff {...props} />;
  }
  return null;
};

// Assign activityTypes to Handoff component
HandOff.activityTypes = activityTypes;

export default HandOff;
