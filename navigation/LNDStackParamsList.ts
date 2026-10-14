import { ScanQRCodeParamList } from './DetailViewStackParamList';
import { SelectWalletParams, SuccessParams } from './SendDetailsStackParamList';

export type LNDStackParamsList = {
  ScanLNDInvoice: {
    walletID: string | undefined;
    uri: string | undefined;
    onBarScanned: string | undefined;
  };
  LnurlPay: {
    lnurl: string;
    walletID: string;
  };
  LnurlPaySuccess: undefined;
  ScanQRCode: ScanQRCodeParamList;
  SelectWallet: SelectWalletParams;
  Success: SuccessParams;
};
