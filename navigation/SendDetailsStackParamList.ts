import { Psbt } from 'bitcoinjs-lib';
import { CreateTransactionTarget, CreateTransactionUtxo, TWallet } from '../class/wallets/types';
import { BitcoinUnit, Chain } from '../models/bitcoinUnits';

export type SendDetailsParams = {
  transactionMemo?: string;
  isTransactionReplaceable?: boolean;
  payjoinUrl?: string;
  feeUnit?: BitcoinUnit;
  frozenBalance?: number;
  amountUnit?: BitcoinUnit;
  address?: string;
  amount?: number;
  amountSats?: number;
  unit?: BitcoinUnit;
  noRbf?: boolean;
  walletID: string;
  launchedBy?: string;
  utxos?: CreateTransactionUtxo[] | null;
  isEditable?: boolean;
  uri?: string;
  addRecipientParams?: {
    address: string;
    amount?: number;
    memo?: string;
  };
};

export type PsbtMultisigParams = {
  receivedPSBTBase64: string;
};

export type SendDetailsStackParamList = {
  SendDetails: SendDetailsParams;
  Confirm: {
    fee: number;
    memo?: string;
    walletID: string;
    tx: string;
    targets?: CreateTransactionTarget[]; // needed to know if there were paymentCodes, which turned into addresses in `recipients`
    recipients: CreateTransactionTarget[];
    satoshiPerByte: number;
    payjoinUrl?: string | null;
    psbt: Psbt;
  };
  PsbtWithHardwareWallet: {
    memo?: string;
    walletID: string;
    launchedBy?: string;
    psbt?: Psbt;
    txhex?: string;
  };
  CreateTransaction: {
    wallet: TWallet;
    memo?: string;
    psbt?: Psbt;
    txhex?: string;
    tx: string;
    fee: number;
    showAnimatedQr?: boolean;
    recipients: CreateTransactionTarget[];
    satoshiPerByte: number;
    feeSatoshi?: number;
  };
  PsbtMultisig: {
    psbtBase64?: string;
    launchedBy?: string;
    walletID?: string;
    memo: string;
  };
  PSBTMultisigQRCode: {
    psbtBase64: string;
    isShowOpenScanner?: boolean;
  };
  Success: {
    fee: number;
    amount: number;
    txid?: string;
  };
  SelectWallet: {
    chainType: Chain;
  };
  CoinControl: {
    walletID: string;
  };
  PaymentCodeList: {
    walletID: string;
  };
};
