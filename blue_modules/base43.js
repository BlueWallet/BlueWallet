const base = require('base-x');

const Base43 = {
  encode: function () {
    throw new Error('not implemented');
  },

  decode: function (input) {
    const x = base('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:');
    return x.decode(input).toString('hex');
  },
};

module.exports = Base43;
