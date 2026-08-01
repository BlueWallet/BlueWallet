import { requestPendingTransactionsLiveActivityPreview, requestPendingTransactionsLiveActivityShowcase } from './NativeWidgetHelper';

export const previewPendingTransactionsLiveActivity = (pendingTransactionCount: number, totalPendingSats: number): void => {
  requestPendingTransactionsLiveActivityPreview(pendingTransactionCount, totalPendingSats);
};

export const showcasePendingTransactionsLiveActivity = (): void => {
  requestPendingTransactionsLiveActivityShowcase();
};
