import { CONST, Wallet } from 'app/consts';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const isAllWallets = (wallet: Wallet): boolean => wallet.label === CONST.allWallets;

export const noop = () => null;
