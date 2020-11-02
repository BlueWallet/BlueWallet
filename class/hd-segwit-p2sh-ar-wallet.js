import { AbstractHDSegwitP2SHVaultWallet } from './abstract-hd-segwit-p2sh-vault-wallet';

const { payments } = require('bitcoinjs-lib');

export class HDSegwitP2SHArWallet extends AbstractHDSegwitP2SHVaultWallet {
  static type = 'HDsegwitP2SHar';
  static typeReadable = '2-Key Vault';

  nodeToAddress(hdNode) {
    return super.nodeToAddress(hdNode, payments.p2ar);
  }

  createTx(args) {
    return super.createTx({ ...args, paymentMethod: payments.p2ar });
  }
}
