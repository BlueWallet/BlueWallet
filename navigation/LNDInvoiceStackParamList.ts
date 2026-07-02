import { NavigatorScreenParams } from '@react-navigation/native';
import { LightningTransaction } from '../class/wallets/types';
import { BitcoinUnit } from '../models/bitcoinUnits';

export type LNDInvoiceStackParamList = {
  LNDReceiveInvoice: { invoice: LightningTransaction | string; walletID: string };
  LNDViewInvoice: { invoice: LightningTransaction | string; walletID: string };
  Success: {
    amount?: number;
    fee?: number;
    invoiceDescription?: string;
    amountUnit?: BitcoinUnit;
    txid?: string;
  };
};

export type LNDInvoiceRootParams = NavigatorScreenParams<LNDInvoiceStackParamList>;

export const LND_INVOICE_MODAL_ROOT = 'LNDInvoiceRoot';

export const LND_INVOICE_MODAL_PARENTS = [LND_INVOICE_MODAL_ROOT, 'LNDCreateInvoiceRoot'] as const;
