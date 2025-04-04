import { TWallet } from '../class/wallets/types';
import { BitcoinUnit, Chain } from '../models/bitcoinUnits';
import { ScanQRCodeParamList } from './DetailViewStackParamList';
import { TNavigationWrapper } from './SendDetailsStackParamList';

export type LNDStackParamsList = {
  ScanLNDInvoice: {
    walletID: string | undefined;
    uri: string | undefined;
    invoice: string | undefined;
    onBarScanned: string | undefined;
  };
  LnurlPay: {
    lnurl: string;
    walletID: string;
  };
  LnurlPaySuccess: undefined;
  ScanQRCode: ScanQRCodeParamList;
  SelectWallet: {
    chainType?: Chain;
    onWalletSelect?: (wallet: TWallet, navigationWrapper: TNavigationWrapper) => void;
    availableWallets?: TWallet[];
    noWalletExplanationText?: string;
    onChainRequireSend?: boolean;
  };
  Success: {
    amount?: number;
    fee?: number;
    invoiceDescription?: string;
    amountUnit: BitcoinUnit;
    txid?: string;
  };
};
