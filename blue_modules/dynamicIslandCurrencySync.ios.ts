import { requestPendingTransactionsLiveActivityRefresh } from './NativeWidgetHelper';

export const notifyPendingTransactionsLiveActivityCurrencyChanged = (): void => {
  requestPendingTransactionsLiveActivityRefresh();
};
