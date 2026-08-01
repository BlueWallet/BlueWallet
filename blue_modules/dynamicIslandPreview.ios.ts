import NativeWidgetHelper from './NativeWidgetHelper';

export const previewPendingTransactionsLiveActivity = (pendingTransactionCount: number, totalPendingSats: number): void => {
  NativeWidgetHelper.previewPendingTransactionsLiveActivity(pendingTransactionCount, totalPendingSats);
};
