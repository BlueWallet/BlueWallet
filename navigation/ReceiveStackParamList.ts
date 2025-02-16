export type ReceiveStackParamList = {
  ReceiveDetails: { address: string; customLabel?: string; customAmount?: number; customUnit?: string; bip21encoded?: string };
  ReceiveCustomAmount: { address: string };
};
