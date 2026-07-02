export type ReceiveDetailsStackParamList = {
  ReceiveDetails: {
    walletID?: string;
    address?: string;
    allowBIP47?: boolean;
    isBIP47Enabled?: boolean;
    toggleBIP47RequestedAt?: number;
    customLabel?: string;
    customAmount?: string;
    customUnit?: import('../models/bitcoinUnits').BitcoinUnit;
    bip21encoded?: string;
    isCustom?: boolean;
  };
  ReceiveCustomAmount: {
    address: string;
    currentLabel?: string;
    currentAmount?: string;
    currentUnit?: import('../models/bitcoinUnits').BitcoinUnit;
    preferredUnit?: import('../models/bitcoinUnits').BitcoinUnit;
  };
};
