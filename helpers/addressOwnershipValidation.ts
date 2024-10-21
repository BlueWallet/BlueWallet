// helpers/addressOwnershipValidation.ts

import { TWallet } from '../class/wallets/types';
import * as bitcoin from 'bitcoinjs-lib';

/**
 * Validates a Bitcoin address.
 *
 * @param {string} address - The Bitcoin address to validate.
 * @returns {boolean} - True if the address is valid, false otherwise.
 */
export const validateBitcoinAddress = (address: string): boolean => {
  try {
    bitcoin.address.toOutputScript(address);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Determines which wallets own the given Bitcoin address.
 *
 * @param {string} address - The Bitcoin address to check.
 * @param {TWallet[]} wallets - The list of wallets to search.
 * @returns {TWallet[]} - Array of wallets that own the address.
 */
export const getWalletsByAddress = (address: string, wallets: TWallet[]): TWallet[] => {
  return wallets.filter(wallet => wallet.weOwnAddress(address));
};