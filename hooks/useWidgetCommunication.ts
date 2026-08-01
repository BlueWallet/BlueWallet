const useWidgetCommunication = (): void => {};

export const isBalanceDisplayAllowed = async (): Promise<boolean> => {
  return true;
};

export const setBalanceDisplayAllowed = async (_allowed: boolean): Promise<void> => {};

export const isPendingTransactionsLiveActivityEnabled = async (): Promise<boolean> => {
  return true;
};

export const setPendingTransactionsLiveActivityEnabled = async (_enabled: boolean): Promise<void> => {};

export default useWidgetCommunication;
