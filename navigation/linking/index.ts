// Types
export type { TCompletionHandlerParams, TBothBitcoinAndLightning, TDeepLinkContext, TNotificationPayload } from './types';
export { defaultContext, INTERNAL_ROUTE_PREFIX, RECENT_DEEP_LINK_WINDOW_MS } from './types';

// Debug
export { redactSensitiveString, redactSensitiveValue, linkingDebugLog, linkingDebugWarn } from './debug';

// URL utilities
export {
  isBitcoinAddress,
  hasSchema,
  normalizeUrl,
  isWidgetAction,
  isPossiblyCosignerFile,
  isImageFilePath,
  isLightningInvoice,
  isLnUrl,
  hasNeededJsonKeysForMultiSigSharing,
  getServerFromSetElectrumServerAction,
  getUrlFromSetLndhubUrlAction,
  isBothBitcoinAndLightning,
  isBothBitcoinAndLightningOnWalletSelect,
  buildQueryString,
  buildInternalUrl,
  compactParams,
  parseInternalPath,
  getWalletQuickActionUrl,
  getWidgetActionUrl,
} from './url';

// Route resolution
export {
  linkingConfig,
  isDrawerManagedRoute,
  routeToState,
  getInternalRouteFromPath,
  buildInternalUrlFromRoute,
  resolveDeepLinkRoute,
  resolveDeepLinkUrl,
  getDeepLinkUrlFromNotification,
} from './routes';

// Factory & navigation
export { hasRecentDeepLinkActivity, navigateFromDeepLink, createBlueWalletLinking } from './factory';
