import { DetailViewStackParamList, ScanQRCodeParamList } from './DetailViewStackParamList';
import { SelectWalletParams, SuccessParams } from './SendDetailsStackParamList';

export type LNDStackParamsList = {
  ScanLNDInvoice: {
    walletID?: string;
    uri?: string;
    onBarScanned?: string;
    openScanner?: boolean;
  };
  LnurlPay: DetailViewStackParamList['LnurlPay'];
  LnurlPaySuccess: DetailViewStackParamList['LnurlPaySuccess'];
  ScanQRCode: ScanQRCodeParamList;
  SelectWallet: SelectWalletParams;
  Success: SuccessParams;
  LNDCreateInvoice: { walletID?: string; uri?: string };
  LNDViewInvoice: DetailViewStackParamList['LNDViewInvoice'];
  LNDViewAdditionalInvoicePreImage: DetailViewStackParamList['LNDViewAdditionalInvoicePreImage'];
};

export type ScanLNDInvoiceStackParamList = Pick<
  LNDStackParamsList,
  'ScanLNDInvoice' | 'SelectWallet' | 'Success' | 'LnurlPay' | 'LnurlPaySuccess' | 'ScanQRCode'
>;

export type LNDCreateInvoiceStackParamList = Pick<
  LNDStackParamsList,
  'LNDCreateInvoice' | 'SelectWallet' | 'LNDViewInvoice' | 'LNDViewAdditionalInvoicePreImage' | 'ScanQRCode'
>;
