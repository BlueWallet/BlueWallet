import { cloneDeep } from 'lodash';

import config from '../config';
import signer from '../models/signer';
import { mnemonicToKeyPair } from '../utils/crypto';
import { AbstractHDSegwitP2SHWallet } from './abstract-hd-segwit-p2sh-wallet';

const { payments, ECPair } = require('bitcoinjs-lib');

const i18n = require('../loc');

const network = config.network;
const BUFFER_ENCODING = 'hex';

export class AbstractHDSegwitP2SHVaultWallet extends AbstractHDSegwitP2SHWallet {
  static type = 'abstract';
  static typeReadable = 'abstract';

  constructor(pubKeysHex = []) {
    super("m/0'");
    let pubKeys;
    try {
      pubKeys = pubKeysHex.map(
        p =>
          ECPair.fromPublicKey(Buffer.from(p, BUFFER_ENCODING), {
            network: config.network,
          }).publicKey,
      );
    } catch (_) {
      throw new Error(i18n.wallets.errors.invalidPublicKey);
    }

    if (this.hasAlreadyPubKeys(pubKeys)) {
      throw new Error(i18n.wallets.errors.duplicatedPublicKey);
    }

    this.pubKeys = [...(this.pubKeys || []), ...pubKeys];
  }

  static fromJson(json) {
    const data = JSON.parse(json);
    const { pubKeys } = data;
    const parsedPubKeysBuffors = pubKeys.map(pk => Buffer.from(pk.data));
    const wallet = new this();
    for (const key of Object.keys(data)) {
      wallet[key] = data[key];
    }

    wallet.pubKeys = parsedPubKeysBuffors;

    return wallet;
  }

  hasAlreadyPubKeys = publicKeys => {
    if (!this.pubKeys) {
      return false;
    }
    const newPubKeysHex = publicKeys.map(p => p.toString(BUFFER_ENCODING));
    const pubKeysHex = this.pubKeys.map(p => p.toString(BUFFER_ENCODING));
    return pubKeysHex.some(p => newPubKeysHex.includes(p));
  };

  addPublicKey(publicKeyHex) {
    let publicKey;
    try {
      publicKey = ECPair.fromPublicKey(Buffer.from(publicKeyHex, BUFFER_ENCODING), {
        network: config.network,
      }).publicKey;
    } catch (error) {
      throw new Error(i18n.wallets.errors.invalidPublicKey);
    }
    if (this.hasAlreadyPubKeys([publicKey])) {
      throw new Error(i18n.wallets.errors.duplicatedPublicKey);
    }
    this.pubKeys = [...this.pubKeys, publicKey];
  }

  clearPublickKeys() {
    this.pubKeys = [];
  }

  nodeToAddress(hdNode, paymentMethod) {
    const { address } = payments.p2sh({
      redeem: payments.p2wsh({
        redeem: paymentMethod({
          pubkeys: [hdNode.publicKey, ...this.pubKeys],
          network,
        }),
        network,
      }),
      network,
    });

    return address;
  }

  async createTx({
    utxos,
    amount,
    fee,
    address,
    mnemonics = [],
    privateKeys = [],
    keyPairs = [],
    vaultTxType,
    paymentMethod,
  }) {
    const newUtxos = cloneDeep(utxos);
    for (const utxo of newUtxos) {
      utxo.wif = this._getWifForAddress(utxo.address);
    }

    const keyPairsFromMnemonics = await Promise.all(mnemonics.map(m => mnemonicToKeyPair(m)));

    let keyPairsFromPrivateKeys = [];
    try {
      keyPairsFromPrivateKeys = privateKeys.map(p =>
        ECPair.fromPrivateKey(Buffer.from(p, BUFFER_ENCODING), {
          network: config.network,
        }),
      );
    } catch (_) {
      throw new Error(i18n.wallets.errors.invalidPrivateKey);
    }

    const amountPlusFee = this.calculateTotalAmount({ utxos: newUtxos, amount, fee });

    return signer.createHDSegwitVaultTransaction({
      utxos: newUtxos,
      address,
      amount: amountPlusFee,
      fixedFee: fee,
      changeAddresses: this.getAddressesSortedByAmount(),
      pubKeys: this.pubKeys,
      keyPairs: [...keyPairs, ...keyPairsFromMnemonics, ...keyPairsFromPrivateKeys],
      vaultTxType,
      paymentMethod,
    });
  }
}
