import { requestPendingTransactionsLiveActivityPreview, requestPendingTransactionsLiveActivityShowcase } from './NativeWidgetHelper';
import type { PendingTransactionDirection } from './pendingTransactions';

export const previewPendingTransactionsLiveActivity = (
  pendingTransactionCount: number,
  totalPendingSats: number,
  direction: PendingTransactionDirection,
): void => {
  requestPendingTransactionsLiveActivityPreview(pendingTransactionCount, totalPendingSats, direction);
};

export const showcasePendingTransactionsLiveActivity = (): void => {
  requestPendingTransactionsLiveActivityShowcase();
};
