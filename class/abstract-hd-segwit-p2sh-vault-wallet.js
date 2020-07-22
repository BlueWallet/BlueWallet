import * as bip39 from 'bip39';
import { pbkdf2 } from 'pbkdf2';
import { promisify } from 'util';

import config from '../config';
import signer from '../models/signer';
import { bitsToBytes } from '../utils/buffer';
import { mnemonicToBits } from '../utils/crypto';
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

  // convert mnemonic generated in https://keygenerator.cloudbestenv.com/
  static async mnemonicToKeyPair(mnemonic) {
    const SALT_LENGHT = 4;
    const WORDS_LENGTH = 12;

    const words = mnemonic.split(' ');

    const wordsLength = words.length;

    if (wordsLength !== WORDS_LENGTH) {
      throw new Error(
        i18n.formatString(i18n.wallets.errors.invalidMnemonicWordsNumber, {
          receivedWordsNumber: wordsLength,
          expectedWordsNumber: WORDS_LENGTH,
        }),
      );
    }

    const bits128 = mnemonicToBits(mnemonic).slice(SALT_LENGHT);

    const generatedBytes = bitsToBytes(bits128);
    const privateKey = await promisify(pbkdf2)(generatedBytes, generatedBytes, 100000, 32, 'sha256');

    return ECPair.fromPrivateKey(privateKey, {
      network: config.network,
    });
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

    const keyPairsFromMnemonics = await Promise.all(
      mnemonics.map(m => AbstractHDSegwitP2SHVaultWallet.mnemonicToKeyPair(m)),
    );

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
