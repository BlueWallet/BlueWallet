import React from 'react';

export const isBalanceDisplayAllowed = async (): Promise<boolean> => {
  return true;
};

export const setBalanceDisplayAllowed = async (value: boolean): Promise<void> => {};

const WidgetCommunication: React.FC = () => {
  return null; // This component does not render anything.
};

export default WidgetCommunication;
