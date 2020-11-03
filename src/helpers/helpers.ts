import { CONST, Wallet, TxType } from 'app/consts';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const isAllWallets = (wallet: Wallet): boolean => wallet.label === CONST.allWallets;

export const noop = () => null;

export const getConfirmationsText = (txType: TxType, confirmations: number): string => {
  const maxConfirmations = [TxType.ALERT_PENDING, TxType.ALERT_CONFIRMED].includes(txType)
    ? CONST.alertBlocks
    : CONST.confirmationsBlocks;
  const confs = confirmations > maxConfirmations ? maxConfirmations : confirmations;
  return `${confs}/${maxConfirmations}`;
};

export const isCodeChunked = (code: string): boolean => {
  const reg = new RegExp(/\d;\d;/g);
  return reg.test(code);
};
