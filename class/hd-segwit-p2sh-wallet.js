import { cloneDeep } from 'lodash';

import config from '../config';
import signer from '../models/signer';
import { AbstractHDSegwitP2SHWallet } from './abstract-hd-segwit-p2sh-wallet';

const bitcoin = require('bitcoinjs-lib');

export class HDSegwitP2SHWallet extends AbstractHDSegwitP2SHWallet {
  static type = 'HDsegwitP2SH';
  static typeReadable = 'HD P2SH';
  constructor() {
    super("m/49'/440'/0'");
  }

  nodeToAddress(hdNode) {
    const { address } = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({ pubkey: hdNode.publicKey, network: config.network }),
      network: config.network,
    });
    return address;
  }

  /**
   *
   * @param utxos
   * @param amount Float (BTC)
   * @param fee
   * @param address
   * @returns {string}
   */
  createTx(utxos, amount, fee, address) {
    const newUtxos = cloneDeep(utxos);
    for (const utxo of newUtxos) {
      utxo.wif = this._getWifForAddress(utxo.address);
    }

    const amountPlusFee = this.calculateTotalAmount({ newUtxos, amount, fee });

    return signer.createHDSegwitTransaction(newUtxos, address, amountPlusFee, fee, this.getAddressForTransaction());
  }
}
