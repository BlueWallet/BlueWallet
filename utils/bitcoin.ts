import { round } from 'lodash';

import { CONST } from 'app/consts';

const BigNumber = require('bignumber.js');

export const btcToSatoshi = (btc: number) => new BigNumber(btc).multipliedBy(CONST.satoshiInBtc);

export const satoshiToBtc = (satoshi: number) => new BigNumber(satoshi).dividedBy(CONST.satoshiInBtc);

export const roundBtcToSatoshis = (btc: number) => round(btc, Math.log10(CONST.satoshiInBtc));
