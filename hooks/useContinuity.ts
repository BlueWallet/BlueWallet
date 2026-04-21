import { useEffect, useRef } from 'react';
import { useSettings } from './context/useSettings';
import { ContinuityActivityType } from '../components/types';
import NativeReactNativeContinuity from '../codegen/NativeReactNativeContinuity';

let nextActivityId = 0;

type ContinuityLogLevel = 'debug' | 'info' | 'warn' | 'error';

interface UseContinuityParams {
  title?: string;
  type: ContinuityActivityType;
  url?: string;
  userInfo?: object;
}

const logContinuity = (level: ContinuityLogLevel, message: string, details?: Record<string, unknown>, error?: unknown): void => {
  const logger = console[level] ?? console.log;

  if (details && error) {
    logger(`[Continuity] ${message}`, details, error);
  } else if (details) {
    logger(`[Continuity] ${message}`, details);
  } else if (error) {
    logger(`[Continuity] ${message}`, error);
  } else {
    logger(`[Continuity] ${message}`);
  }
};

const isMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) {
    return value.some(item => isMeaningfulValue(item));
  }
  if (typeof value === 'object') {
    return Object.values(value).some(v => isMeaningfulValue(v));
  }
  return true;
};

const useContinuity = ({ title, type, url, userInfo }: UseContinuityParams): void => {
  const { isContinuityEnabled } = useSettings();
  const activityIdRef = useRef<number | null>(null);
  const serializedUserInfo = userInfo ? JSON.stringify(userInfo) : undefined;

  useEffect(() => {
    if (!type) {
      logContinuity('warn', 'Skipping activity registration because no continuity type was provided');
      return;
    }

    const continuityModule = NativeReactNativeContinuity;
    if (!continuityModule) {
      logContinuity('warn', 'Native continuity module unavailable; skipping activity registration', {
        type,
        title: title ?? '',
      });
      return;
    }

    if (activityIdRef.current !== null) {
      const existingId = activityIdRef.current;
      try {
        continuityModule.invalidate(existingId);
        logContinuity('info', 'Invalidated activity', { id: existingId, type });
      } catch (error) {
        logContinuity('error', 'Failed to invalidate activity', { id: existingId, type }, error);
      } finally {
        activityIdRef.current = null;
      }
    }

    let parsedUserInfo: Record<string, unknown> | undefined;
    try {
      parsedUserInfo = serializedUserInfo ? JSON.parse(serializedUserInfo) : undefined;
    } catch (error) {
      logContinuity('error', 'Failed to parse continuity userInfo', { type, title: title ?? '' }, error);
      return;
    }

    const hasUserInfo = Boolean(parsedUserInfo && Object.values(parsedUserInfo).some(isMeaningfulValue));
    const hasUrl = typeof url === 'string' && url.trim().length > 0;

    if (!hasUserInfo && !hasUrl) {
      logContinuity('debug', 'Skipping activity registration because no meaningful payload was provided', {
        type,
        title: title ?? '',
      });
      return;
    }

    if (!isContinuityEnabled) {
      logContinuity('warn', 'Skipping activity registration because continuity is disabled', {
        type,
        title: title ?? '',
      });
      return;
    }

    const id = ++nextActivityId;
    activityIdRef.current = id;

    try {
      continuityModule.becomeCurrent(id, type, title ?? '', parsedUserInfo ?? null, url ?? null);
      logContinuity('info', 'Registered activity', {
        id,
        type,
        title: title ?? '',
        hasUrl,
        hasUserInfo,
      });
    } catch (error) {
      activityIdRef.current = null;
      logContinuity('error', 'Failed to register activity', { id, type, title: title ?? '', hasUrl, hasUserInfo }, error);
      return;
    }

    return () => {
      if (activityIdRef.current !== null) {
        const idToInvalidate = activityIdRef.current;
        try {
          continuityModule.invalidate(idToInvalidate);
          logContinuity('info', 'Invalidated activity', { id: idToInvalidate, type });
        } catch (error) {
          logContinuity('error', 'Failed to invalidate activity', { id: idToInvalidate, type }, error);
        } finally {
          activityIdRef.current = null;
        }
      }
    };
  }, [isContinuityEnabled, type, title, serializedUserInfo, url]);
};

export default useContinuity;
