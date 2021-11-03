import * as bitcoin from 'bitcoinjs-lib';

// const network = bitcoin.networks.testnet;
const network = bitcoin.networks.bitcoin;

// for xpub it is available at bitcoin.networks.bitcoin.bip32
// but bitcoinjs doesn't support zpub/ypub so we keep them here
// https://github.com/satoshilabs/slips/blob/master/slip-0132.md
const bip32Versions =
  network === bitcoin.networks.bitcoin
    ? {
        ypub: {
          public: 0x049d7cb2,
          private: 0x049d7878,
        },
        Ypub: {
          public: 0x0295b43f,
          private: 0x0295b005,
        },
        zpub: {
          public: 0x04b24746,
          private: 0x04b2430c,
        },
        Zpub: {
          public: 0x02aa7ed3,
          private: 0x02aa7a99,
        },
      }
    : {
        // upub in testnet
        ypub: {
          public: 0x044a5262,
          private: 0x044a4e28,
        },
        // Upub in testnet
        Ypub: {
          public: 0x024289ef,
          private: 0x024285b5,
        },
        // vpub in testnet
        zpub: {
          public: 0x045f1cf6,
          private: 0x045f18bc,
        },
        // Vpub in testnet
        Zpub: {
          public: 0x02575483,
          private: 0x02575048,
        },
      };

export default network;
export { bip32Versions };
