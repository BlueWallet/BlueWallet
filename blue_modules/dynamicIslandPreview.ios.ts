import { requestPendingTransactionsLiveActivityPreview } from './NativeWidgetHelper';

export const previewPendingTransactionsLiveActivity = (pendingTransactionCount: number, totalPendingSats: number): void => {
  requestPendingTransactionsLiveActivityPreview(pendingTransactionCount, totalPendingSats);
};
