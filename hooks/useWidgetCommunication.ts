export const isBalanceDisplayAllowed = (): Promise<boolean> => {
  return new Promise(resolve => {
    resolve(true);
  });
};

export const setBalanceDisplayAllowed = async (value: boolean): Promise<void> => {};

const useWidgetCommunication = () => {};

export default useWidgetCommunication;
