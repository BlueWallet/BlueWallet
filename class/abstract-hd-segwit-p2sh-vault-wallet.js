import * as bip39 from 'bip39';

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
    super();
    try {
      this.pubKeys = [
        ...(this.pubKeys || []),
        ...pubKeysHex.map(
          p =>
            ECPair.fromPublicKey(Buffer.from(p, BUFFER_ENCODING), {
              network: config.network,
            }).publicKey,
        ),
      ];
    } catch (_) {
      throw new Error(i18n.wallets.errors.invalidPublicKey);
    }
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

  setMnemonic(walletMnemonic) {
    if (!bip39.validateMnemonic(walletMnemonic)) {
      throw new Error(i18n.wallets.errors.invalidMnemonic);
    }

    this.secret = walletMnemonic
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  addPublicKey(publicKeyHex) {
    try {
      const publicKey = ECPair.fromPublicKey(Buffer.from(publicKeyHex, BUFFER_ENCODING), {
        network: config.network,
      }).publicKey;
      this.pubKeys = [...this.pubKeys, publicKey];
    } catch (error) {
      throw new Error(i18n.wallets.errors.invalidPublicKey);
    }
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
    for (const utxo of utxos) {
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

    const amountPlusFee = this.calculateTotalAmount({ utxos, amount, fee });

    return signer.createHDSegwitVaultTransaction({
      utxos,
      address,
      amount: amountPlusFee,
      fixedFee: fee,
      changeAddress: this.getAddressForTransaction(),
      pubKeys: this.pubKeys,
      keyPairs: [...keyPairs, ...keyPairsFromMnemonics, ...keyPairsFromPrivateKeys],
      vaultTxType,
      paymentMethod,
    });
  }
}
