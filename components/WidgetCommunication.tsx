import React from 'react';
import { TWallet } from '../class/wallets/types';

export const isBalanceDisplayAllowed = async (): Promise<boolean> => {
  return true;
};

export const setBalanceDisplayAllowed = async (value: boolean): Promise<void> => {};

export const reloadAllTimelines = (): void => {};

export const syncWidgetBalanceWithWallets = async (_wallets: TWallet[], _walletsInitialized: boolean): Promise<void> => {};

const WidgetCommunication: React.FC = () => {
  return null; // This component does not render anything.
};

export default WidgetCommunication;
