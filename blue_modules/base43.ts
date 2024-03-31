import base from 'base-x';

const Base43 = {
  encode: function () {
    throw new Error('not implemented');
  },

  decode: function (input: string): string {
    const x = base('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:');
    const uint8 = x.decode(input);
    return Buffer.from(uint8).toString('hex');
  },
};

export default Base43;
