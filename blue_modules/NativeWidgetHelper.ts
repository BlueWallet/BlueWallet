import NativeWidgetHelper, { type Spec } from '../codegen/NativeWidgetHelper';

/**
 * App Group data is the source of truth for the Live Activity. This call only
 * nudges native iOS to consume it immediately, so a stale installed binary
 * must not make the wallet-to-App-Group sync fail.
 */
export const requestPendingTransactionsLiveActivityRefresh = (): boolean => {
  if (typeof NativeWidgetHelper.refreshPendingTransactionsLiveActivity !== 'function') {
    console.warn('[PendingLiveActivity] Native refresh is unavailable; rebuild the iOS app to enable immediate updates.');
    return false;
  }

  try {
    NativeWidgetHelper.refreshPendingTransactionsLiveActivity();
    return true;
  } catch (error) {
    console.warn('[PendingLiveActivity] Native refresh failed; shared App Group state was still saved.', error);
    return false;
  }
};

export const requestPendingTransactionsLiveActivityPreview = (pendingTransactionCount: number, totalPendingSats: number): boolean => {
  if (typeof NativeWidgetHelper.previewPendingTransactionsLiveActivity !== 'function') {
    console.warn('[PendingLiveActivity] Native preview is unavailable; rebuild the iOS app to install the debug bridge.');
    return false;
  }

  try {
    NativeWidgetHelper.previewPendingTransactionsLiveActivity(pendingTransactionCount, totalPendingSats);
    return true;
  } catch (error) {
    console.warn('[PendingLiveActivity] Native preview failed.', error);
    return false;
  }
};

export const requestPendingTransactionsLiveActivityShowcase = (): boolean => {
  if (typeof NativeWidgetHelper.showcasePendingTransactionsLiveActivity !== 'function') {
    console.warn('[PendingLiveActivity] Native showcase is unavailable; rebuild the iOS app to install the debug bridge.');
    return false;
  }

  try {
    NativeWidgetHelper.showcasePendingTransactionsLiveActivity();
    return true;
  } catch (error) {
    console.warn('[PendingLiveActivity] Native showcase failed.', error);
    return false;
  }
};

export { type Spec };
export default NativeWidgetHelper;
