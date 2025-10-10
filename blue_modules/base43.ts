import base from 'base-x';
import { uint8ArrayToHex } from './uint8array-extras/index';

const Base43 = {
  encode: function () {
    throw new Error('not implemented');
  },

  decode: function (input: string): string {
    const x = base('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:');
    const uint8 = x.decode(input);
    return uint8ArrayToHex(uint8);
  },
};

export default Base43;
