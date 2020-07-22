import { AbstractHDSegwitP2SHVaultWallet } from './abstract-hd-segwit-p2sh-vault-wallet';

const { payments } = require('bitcoinjs-lib');

export class HDSegwitP2SHAirWallet extends AbstractHDSegwitP2SHVaultWallet {
  static type = 'HDsegwitP2SHair';
  static typeReadable = 'AIR';

  nodeToAddress(hdNode) {
    return super.nodeToAddress(hdNode, payments.p2air);
  }

  createTx(args) {
    return super.createTx({ ...args, paymentMethod: payments.p2air });
  }
}
