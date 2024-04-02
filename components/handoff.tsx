import React, { useContext, useEffect } from 'react';
// @ts-ignore: react-native-handoff is not in the type definition
import { Handoff as RNHandoff } from 'react-native-handoff';
import { BlueStorageContext } from '../blue_modules/storage-context';
import { NativeEventEmitter, NativeModules } from 'react-native';

interface HandoffComponentProps {
  url?: string;
  title?: string;
  type: (typeof Handoff.activityTypes)[keyof typeof Handoff.activityTypes];
  userInfo?: object;
}

interface HandoffComponentWithActivityTypes extends React.FC<HandoffComponentProps> {
  activityTypes: {
    ReceiveOnchain: string;
    Xpub: string;
    ViewInBlockExplorer: string;
  };
}


const eventEmitter = new NativeEventEmitter(NativeModules.EventEmitter)
const { EventEmitter, SplashScreen } = NativeModules;

const Handoff: HandoffComponentWithActivityTypes = props => {
  const { isHandOffUseEnabled } = useContext(BlueStorageContext);

  useEffect(() => {
    if (isHandOffUseEnabled) {
      // Assuming EventEmitter.getMostRecentUserActivity exists and is relevant here
      const fetchRecentActivity = async () => {
        try {
          const activity = await EventEmitter?.getMostRecentUserActivity();
          // Assuming a function that handles the activity, you may need to implement it
          onUserActivityOpen(activity);
        } catch (error) {
          console.log('No userActivity object sent', error);
        }
      };

      // Call the function to fetch and handle the most recent user activity
      fetchRecentActivity();

    })

  if (isHandOffUseEnabled) {
    return <RNHandoff {...props} />;
  }
  return null;
};

const activityTypes = {
  ReceiveOnchain: 'io.bluewallet.bluewallet.receiveonchain',
  Xpub: 'io.bluewallet.bluewallet.xpub',
  ViewInBlockExplorer: 'io.bluewallet.bluewallet.blockexplorer',
};

Handoff.activityTypes = activityTypes;

export default Handoff;
