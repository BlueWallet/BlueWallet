import { useEffect, useRef } from 'react';
import { useSettings } from './context/useSettings';
import { ContinuityActivityType } from '../components/types';
import NativeReactNativeContinuity from '../codegen/NativeReactNativeContinuity';

let nextActivityId = 0;

interface UseContinuityParams {
  title?: string;
  type: ContinuityActivityType;
  url?: string;
  userInfo?: object;
}

const useContinuity = ({ title, type, url, userInfo }: UseContinuityParams): void => {
  const { isContinuityEnabled } = useSettings();
  const activityIdRef = useRef<number | null>(null);
  const serializedUserInfo = userInfo ? JSON.stringify(userInfo) : undefined;

  useEffect(() => {
    if (!NativeReactNativeContinuity) {
      return;
    }

    if (activityIdRef.current !== null) {
      NativeReactNativeContinuity?.invalidate(activityIdRef.current);
      activityIdRef.current = null;
    }

    if (!isContinuityEnabled || !type) {
      return;
    }

    const parsedUserInfo = serializedUserInfo ? JSON.parse(serializedUserInfo) : undefined;
    const isMeaningfulValue = (value: unknown): boolean => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) {
        return value.some(item => {
          if (typeof item === 'object' && item !== null) {
            return Object.values(item).some(v => isMeaningfulValue(v));
          }
          return isMeaningfulValue(item);
        });
      }
      return true;
    };
    const hasUserInfo = parsedUserInfo && Object.values(parsedUserInfo).some(isMeaningfulValue);
    const hasUrl = url && url.trim().length > 0;

    if (!hasUserInfo && !hasUrl) {
      return;
    }

    const id = ++nextActivityId;
    activityIdRef.current = id;
    NativeReactNativeContinuity?.becomeCurrent(id, type, title ?? '', parsedUserInfo ?? null, url ?? null);

    return () => {
      if (activityIdRef.current !== null) {
        NativeReactNativeContinuity?.invalidate(activityIdRef.current);
        activityIdRef.current = null;
      }
    };
  }, [isContinuityEnabled, type, title, serializedUserInfo, url]);
};

export default useContinuity;
