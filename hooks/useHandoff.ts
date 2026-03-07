import { useEffect, useRef } from 'react';
import { NativeModules } from 'react-native';
import { useSettings } from './context/useSettings';
import { HandOffActivityType } from '../components/types';

let nextActivityId = 0;

interface UseHandoffParams {
  title?: string;
  type: HandOffActivityType;
  url?: string;
  userInfo?: object;
}

const useHandoff = ({ title, type, url, userInfo }: UseHandoffParams): void => {
  const { isHandOffUseEnabled } = useSettings();
  const activityIdRef = useRef<number | null>(null);
  const serializedUserInfo = userInfo ? JSON.stringify(userInfo) : undefined;

  useEffect(() => {
    if (!NativeModules.BWHandoff) {
      return;
    }

    // Invalidate previous activity when deps change
    if (activityIdRef.current !== null) {
      NativeModules.BWHandoff?.invalidate(activityIdRef.current);
      activityIdRef.current = null;
    }

    if (!isHandOffUseEnabled || !type) {
      return;
    }

    const parsedUserInfo = serializedUserInfo ? JSON.parse(serializedUserInfo) : undefined;
    const hasUserInfo = parsedUserInfo && Object.keys(parsedUserInfo).length > 0;
    const hasUrl = url && url.trim().length > 0;

    if (!hasUserInfo && !hasUrl) {
      return;
    }

    const id = ++nextActivityId;
    activityIdRef.current = id;
    NativeModules.BWHandoff?.becomeCurrent(id, type, title ?? '', parsedUserInfo ?? null, url ?? null);

    return () => {
      if (activityIdRef.current !== null) {
        NativeModules.BWHandoff?.invalidate(activityIdRef.current);
        activityIdRef.current = null;
      }
    };
  }, [isHandOffUseEnabled, type, title, serializedUserInfo, url]);
};

export default useHandoff;
