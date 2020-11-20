import * as bitcoin from 'bitcoinjs-lib';
import { round } from 'lodash';

import config from '../config';
import { CONST } from '../src/consts';

const BigNumber = require('bignumber.js');
const reverse = require('buffer-reverse');

export const btcToSatoshi = (btc: number, precision: number | null = null): number => {
  const satoshis = new BigNumber(btc).multipliedBy(CONST.satoshiInBtc).toNumber();
  if (precision === null) {
    return satoshis;
  }

  return round(satoshis, precision);
};

export const satoshiToBtc = (satoshi: number) => new BigNumber(satoshi).dividedBy(CONST.satoshiInBtc);

export const roundBtcToSatoshis = (btc: number) => round(btc, Math.log10(CONST.satoshiInBtc));

export const addressToScriptHash = (address: string) => {
  const script = bitcoin.address.toOutputScript(address, config.network);
  const hash = bitcoin.crypto.sha256(script);
  const scriptHash = Buffer.from(reverse(hash)).toString('hex');
  return scriptHash;
};

export const addMissingZerosToSatoshis = (value: number): string => {
  const [integer, decimal] = value.toString().split('.');
  const decimallWithMissingZeros = (decimal || '').padEnd(Math.log10(CONST.satoshiInBtc), '0');

  return [integer, decimallWithMissingZeros].join('.');
};

export const formatToBtcv = (value: number): string =>
  `${value >= 0 ? '+' : ''}${addMissingZerosToSatoshis(value)} ${CONST.preferredBalanceUnit}`;

export const formatToBtcvWithoutUnit = (value: number): string =>
  `${value >= 0 ? '+' : ''}${addMissingZerosToSatoshis(value)}`;

export const checkAddressNetworkName = (address: string): string => {
  for (const networkName in bitcoin.alt_networks) {
    try {
      const altNetwork = bitcoin.alt_networks[networkName];
      bitcoin.address.toOutputScript(address, altNetwork);
      return networkName;
    } catch (_) {}
  }
  throw new Error('Didn`t much any known network');
};
