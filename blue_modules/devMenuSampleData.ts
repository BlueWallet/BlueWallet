import { EventEmitter } from 'events';

type SampleDataListener = (enabled: boolean) => void;

const emitter = new EventEmitter();
const COIN_CONTROL_EVENT = 'coinControlSampleData';
const PAYMENT_CODES_EVENT = 'paymentCodesSampleData';
const WALLETS_LIST_EVENT = 'walletsListSampleData';
const WALLET_TRANSACTIONS_EVENT = 'walletTransactionsSampleData';
const SEND_DETAILS_EVENT = 'sendDetailsSampleData';

let coinControlSampleDataEnabled = false;
let paymentCodesSampleDataEnabled = false;
let walletsListSampleDataEnabled = false;
let walletTransactionsSampleDataEnabled = false;
let sendDetailsSampleDataEnabled = false;

export const setCoinControlSampleDataEnabled = (enabled: boolean) => {
  if (coinControlSampleDataEnabled === enabled) return;
  coinControlSampleDataEnabled = enabled;
  emitter.emit(COIN_CONTROL_EVENT, enabled);
};

export const getCoinControlSampleDataEnabled = () => coinControlSampleDataEnabled;

export const onCoinControlSampleDataChange = (listener: SampleDataListener) => {
  emitter.addListener(COIN_CONTROL_EVENT, listener);
  return () => emitter.removeListener(COIN_CONTROL_EVENT, listener);
};

export const setPaymentCodesSampleDataEnabled = (enabled: boolean) => {
  if (paymentCodesSampleDataEnabled === enabled) return;
  paymentCodesSampleDataEnabled = enabled;
  emitter.emit(PAYMENT_CODES_EVENT, enabled);
};

export const getPaymentCodesSampleDataEnabled = () => paymentCodesSampleDataEnabled;

export const onPaymentCodesSampleDataChange = (listener: SampleDataListener) => {
  emitter.addListener(PAYMENT_CODES_EVENT, listener);
  return () => emitter.removeListener(PAYMENT_CODES_EVENT, listener);
};

export const setWalletsListSampleDataEnabled = (enabled: boolean) => {
  if (walletsListSampleDataEnabled === enabled) return;
  walletsListSampleDataEnabled = enabled;
  emitter.emit(WALLETS_LIST_EVENT, enabled);
};

export const getWalletsListSampleDataEnabled = () => walletsListSampleDataEnabled;

export const onWalletsListSampleDataChange = (listener: SampleDataListener) => {
  emitter.addListener(WALLETS_LIST_EVENT, listener);
  return () => emitter.removeListener(WALLETS_LIST_EVENT, listener);
};

export const setWalletTransactionsSampleDataEnabled = (enabled: boolean) => {
  if (walletTransactionsSampleDataEnabled === enabled) return;
  walletTransactionsSampleDataEnabled = enabled;
  emitter.emit(WALLET_TRANSACTIONS_EVENT, enabled);
};

export const getWalletTransactionsSampleDataEnabled = () => walletTransactionsSampleDataEnabled;

export const onWalletTransactionsSampleDataChange = (listener: SampleDataListener) => {
  emitter.addListener(WALLET_TRANSACTIONS_EVENT, listener);
  return () => emitter.removeListener(WALLET_TRANSACTIONS_EVENT, listener);
};

export const setSendDetailsSampleDataEnabled = (enabled: boolean) => {
  if (sendDetailsSampleDataEnabled === enabled) return;
  sendDetailsSampleDataEnabled = enabled;
  emitter.emit(SEND_DETAILS_EVENT, enabled);
};

export const getSendDetailsSampleDataEnabled = () => sendDetailsSampleDataEnabled;

export const onSendDetailsSampleDataChange = (listener: SampleDataListener) => {
  emitter.addListener(SEND_DETAILS_EVENT, listener);
  return () => emitter.removeListener(SEND_DETAILS_EVENT, listener);
};
