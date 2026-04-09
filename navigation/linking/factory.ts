import {
  getActionFromState,
  getPathFromState as getPathFromStateFromNavigation,
  getStateFromPath as getStateFromPathFromNavigation,
  LinkingOptions,
  NavigationState,
  ParamListBase,
  PartialState,
} from '@react-navigation/native';
import { AppState, AppStateStatus, DeviceEventEmitter, Linking } from 'react-native';
import { consumePendingOpenedNotification, NOTIFICATION_OPENED_EVENT } from '../../blue_modules/notifications';
import QuickActions from 'react-native-quick-actions';
import { navigationRef } from '../../NavigationService';

import type { TDeepLinkContext, TNotificationPayload } from './types';
import { defaultContext, RECENT_DEEP_LINK_WINDOW_MS } from './types';
import { linkingDebugLog, linkingDebugWarn } from './debug';
import { hasSchema } from './url';
import { getDeepLinkUrlFromNotification, getInternalRouteFromPath, linkingConfig, resolveDeepLinkUrl, routeToState } from './routes';

// ── Stateful helpers ─────────────────────────────────────────────────────────

let lastDeepLinkAt = 0;
let lastResolvedUrl: string | null = null;
let lastInitialUrl: string | null = null;
let appState: AppStateStatus = AppState.currentState;

let pendingDeferredResolvedUrl: string | null = null;

const waitForNavigationReady = async (timeoutMs: number = 3_000): Promise<boolean> => {
  if (navigationRef.isReady()) {
    return true;
  }

  const startedAt = Date.now();
  while (!navigationRef.isReady() && Date.now() - startedAt < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return navigationRef.isReady();
};

const getActiveRouteName = (state?: PartialState<NavigationState> | NavigationState): string | undefined => {
  if (!state?.routes?.length) {
    return undefined;
  }

  const activeRoute = state.routes[state.index ?? state.routes.length - 1] as any;
  if (activeRoute?.state) {
    return getActiveRouteName(activeRoute.state) ?? activeRoute.name;
  }

  return activeRoute?.params?.screen ?? activeRoute?.name;
};

const isUnlockScreenActive = (): boolean => {
  return getActiveRouteName(navigationRef.getRootState()) === 'UnlockWithScreen';
};

const recordDeepLinkActivity = (resolvedUrl?: string | null): void => {
  if (!resolvedUrl) {
    return;
  }

  lastDeepLinkAt = Date.now();
  lastResolvedUrl = resolvedUrl;
};

export const hasRecentDeepLinkActivity = (windowMs: number = RECENT_DEEP_LINK_WINDOW_MS): boolean => {
  return Date.now() - lastDeepLinkAt < windowMs;
};

const emitResolvedUrl = (listener: (url: string) => void, resolvedUrl: string | null): void => {
  if (!resolvedUrl) {
    return;
  }

  if (resolvedUrl === lastResolvedUrl && hasRecentDeepLinkActivity()) {
    return;
  }

  recordDeepLinkActivity(resolvedUrl);
  listener(resolvedUrl);
};

const emitResolvedUrlWhenNavigationSettles = (listener: (url: string) => void, resolvedUrl: string | null): void => {
  if (!resolvedUrl) {
    return;
  }

  if (!navigationRef.isReady() || isUnlockScreenActive()) {
    pendingDeferredResolvedUrl = resolvedUrl;
    linkingDebugLog('[linking] deferring deep link until unlock/navigation settles:', resolvedUrl);

    (async () => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < 5_000) {
        if (navigationRef.isReady() && !isUnlockScreenActive()) {
          const deferredUrl = pendingDeferredResolvedUrl;
          pendingDeferredResolvedUrl = null;
          if (deferredUrl) {
            emitResolvedUrl(listener, deferredUrl);
          }
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    })().catch(error => linkingDebugWarn('[linking] deferred deep link error:', error));
    return;
  }

  emitResolvedUrl(listener, resolvedUrl);
};

const getQuickActionUrl = (data: { userInfo?: { url?: string } } | null | undefined): string | null => {
  return typeof data?.userInfo?.url === 'string' ? data.userInfo.url : null;
};

// ── Public API ───────────────────────────────────────────────────────────────

export const navigateFromDeepLink = async (url: string, context: TDeepLinkContext = defaultContext): Promise<boolean> => {
  linkingDebugLog('[linking] navigateFromDeepLink called with:', url);
  const resolvedUrl = await resolveDeepLinkUrl(url, context);
  linkingDebugLog('[linking] resolvedUrl:', resolvedUrl);
  if (!resolvedUrl) {
    console.warn('[linking] navigateFromDeepLink: could not resolve URL, aborting');
    return false;
  }

  const navigationReady = await waitForNavigationReady();
  if (!navigationReady) {
    console.warn('[linking] navigateFromDeepLink: navigation not ready, aborting');
    return false;
  }

  recordDeepLinkActivity(resolvedUrl);

  const route = getInternalRouteFromPath(resolvedUrl.replace(/^bluewallet:\/\//, ''));
  linkingDebugLog('[linking] resolved route:', route);
  if (!route) {
    console.warn('[linking] navigateFromDeepLink: no route for resolved URL, aborting');
    return false;
  }

  const state = routeToState(route);
  linkingDebugLog('[linking] routeToState result:', state);
  const action = getActionFromState(state);
  linkingDebugLog('[linking] getActionFromState result:', action);

  if (action) {
    navigationRef.dispatch(action);
    return true;
  }

  console.warn('[linking] no action from state, falling back to navigate()');
  navigationRef.navigate(route[0], route[1]);
  return true;
};

const linkingConfigTyped = linkingConfig as NonNullable<LinkingOptions<ParamListBase>['config']>;

export const createBlueWalletLinking = (
  contextRef: { readonly current: TDeepLinkContext } = { current: defaultContext },
): LinkingOptions<ParamListBase> => {
  return {
    prefixes: [
      'bluewallet://',
      'bluewallet:',
      'blue:',
      'lapp:',
      'bitcoin:',
      'bitcoin://',
      'lightning:',
      'lightning://',
      'https://azte.co',
      'https://lnbits.com',
    ],
    async getInitialURL() {
      try {
        const url = await Linking.getInitialURL();
        linkingDebugLog('[linking] getInitialURL raw:', url);
        if (url) {
          lastInitialUrl = url;
          const resolvedUrl = await resolveDeepLinkUrl(url, contextRef.current);
          linkingDebugLog('[linking] getInitialURL resolved to:', resolvedUrl);
          recordDeepLinkActivity(resolvedUrl);
          return resolvedUrl;
        }

        // Cold-boot push notifications are NOT handled here because wallets are not yet
        // loaded when getInitialURL fires. They are handled by configureNotifications() in
        // notifications.ts once walletsInitialized is true, via NOTIFICATION_OPENED_EVENT.

        const quickActionUrl = getQuickActionUrl(await QuickActions.popInitialAction());
        if (quickActionUrl) {
          const resolvedUrl = await resolveDeepLinkUrl(quickActionUrl, contextRef.current);
          recordDeepLinkActivity(resolvedUrl);
          return resolvedUrl;
        }

        return null;
      } catch (error) {
        linkingDebugWarn('[linking] getInitialURL error:', error);
        return null;
      }
    },
    subscribe(listener) {
      const processIncomingUrl = (url: string | null | undefined) => {
        if (!url) {
          return;
        }
        linkingDebugLog('[linking] subscribe: processIncomingUrl raw:', url);

        resolveDeepLinkUrl(url, contextRef.current)
          .then(resolvedUrl => {
            linkingDebugLog('[linking] subscribe: resolved to:', resolvedUrl);
            emitResolvedUrlWhenNavigationSettles(listener, resolvedUrl);
          })
          .catch(error => linkingDebugWarn('[linking] subscribe: resolve error:', error));
      };

      const linkingSubscription = Linking.addEventListener('url', event => {
        processIncomingUrl(event.url);
      });

      const quickActionSubscription = DeviceEventEmitter.addListener('quickActionShortcut', event => {
        processIncomingUrl(getQuickActionUrl(event));
      });

      const handleNotificationPayload = (payload: TNotificationPayload) => {
        consumePendingOpenedNotification();

        const url = getDeepLinkUrlFromNotification(payload, contextRef.current);
        if (url) {
          emitResolvedUrlWhenNavigationSettles(listener, url);
        } else if (payload.userInteraction) {
          // Cold-boot race: wallets may not be in React state yet when this fires.
          // Poll contextRef until wallets become available (ref is updated by App.tsx).
          // This avoids relying on subscribe() being re-called by React Navigation.
          linkingDebugLog('[linking] cold-boot notification: wallets not available yet, polling contextRef');
          (async () => {
            const startedAt = Date.now();
            while (Date.now() - startedAt < 10_000) {
              const retryUrl = getDeepLinkUrlFromNotification(payload, contextRef.current);
              if (retryUrl) {
                linkingDebugLog('[linking] cold-boot notification: wallets became available, navigating');
                emitResolvedUrlWhenNavigationSettles(listener, retryUrl);
                return;
              }
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            linkingDebugWarn('[linking] cold-boot notification: wallet context never became available within timeout');
          })().catch(e => linkingDebugWarn('[linking] cold-boot notification poll error:', e));
        }
      };

      // Subscribe to notification opens so React Navigation handles navigation via
      // getStateFromPath rather than imperative navigateFromDeepLink.
      const notificationOpenedSubscription = DeviceEventEmitter.addListener(NOTIFICATION_OPENED_EVENT, handleNotificationPayload);

      const pendingOpenedPayload = consumePendingOpenedNotification();
      if (pendingOpenedPayload) {
        handleNotificationPayload(pendingOpenedPayload);
      }

      if (pendingDeferredResolvedUrl) {
        const deferredUrl = pendingDeferredResolvedUrl;
        pendingDeferredResolvedUrl = null;
        emitResolvedUrlWhenNavigationSettles(listener, deferredUrl);
      }

      const appStateSubscription = AppState.addEventListener('change', nextAppState => {
        const wasInactive = appState === 'background' || appState === 'inactive';
        appState = nextAppState;

        if (!wasInactive || nextAppState !== 'active') {
          return;
        }

        Linking.getInitialURL()
          .then(url => {
            if (!url || url === lastInitialUrl) {
              return null;
            }

            lastInitialUrl = url;
            return resolveDeepLinkUrl(url, contextRef.current);
          })
          .then(resolvedUrl => emitResolvedUrlWhenNavigationSettles(listener, resolvedUrl))
          .catch(error => linkingDebugWarn('[linking] appState deep link refresh error:', error));
      });

      return () => {
        linkingSubscription.remove();
        quickActionSubscription.remove();
        notificationOpenedSubscription.remove();
        appStateSubscription.remove();
      };
    },
    config: linkingConfigTyped,
    getPathFromState(state, options) {
      const path = getPathFromStateFromNavigation(state, options ?? linkingConfigTyped);
      linkingDebugLog('[linking] getPathFromState result:', path);
      return path;
    },
    getStateFromPath(path, options) {
      linkingDebugLog('[linking] getStateFromPath called with path:', path);
      if (hasSchema(path)) {
        linkingDebugLog('[linking] getStateFromPath: has schema, returning undefined (handled via resolveDeepLinkUrl)');
        return undefined;
      }

      const navigationState = getStateFromPathFromNavigation(path, options ?? linkingConfigTyped);
      linkingDebugLog('[linking] getStateFromPath navigation state:', navigationState);

      const route = getInternalRouteFromPath(path);
      linkingDebugLog('[linking] getStateFromPath route:', route);
      if (route) {
        const state = routeToState(route);
        linkingDebugLog('[linking] getStateFromPath state:', state);
        return state;
      }

      return navigationState;
    },
  };
};
