import { round } from 'lodash';

import { CONST } from '../src/consts';

const BigNumber = require('bignumber.js');

export const btcToSatoshi = (btc: number, precision: number | null = null) => {
  const satoshis = new BigNumber(btc).multipliedBy(CONST.satoshiInBtc);
  if (precision === null) {
    return satoshis;
  }

  return round(satoshis.toNumber(), precision);
};

export const satoshiToBtc = (satoshi: number) => new BigNumber(satoshi).dividedBy(CONST.satoshiInBtc);

export const roundBtcToSatoshis = (btc: number) => round(btc, Math.log10(CONST.satoshiInBtc));
