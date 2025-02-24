import { BitcoinUnit } from '../models/bitcoinUnits';

export type ReceiveStackParamList = {
  ReceiveDetails: {
    walletID?: string;
    address?: string;
    customLabel?: string;
    customAmount?: number;
    customUnit?: BitcoinUnit;
    bip21encoded?: string;
  };
  ReceiveCustomAmount: {
    address: string;
    customLabel?: string;
    customAmount?: number;
    customUnit?: BitcoinUnit;
    walletID: string;
  };
};
