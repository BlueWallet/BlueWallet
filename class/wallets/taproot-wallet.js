import { SegwitBech32Wallet } from './segwit-bech32-wallet';
const bitcoin = require('bitcoinjs-lib');

export class TaprootWallet extends SegwitBech32Wallet {
  static type = 'taproot';
  static typeReadable = 'P2 TR';
  static segwitType = 'p2wpkh';

  /**
   * Converts script pub key to a Taproot address if it can. Returns FALSE if it cant.
   *
   * @param scriptPubKey
   * @returns {boolean|string} Either bech32 address or false
   */
  static scriptPubKeyToAddress(scriptPubKey) {
    try {
      const publicKey = Buffer.from(scriptPubKey, 'hex');
      return bitcoin.address.fromOutputScript(publicKey, bitcoin.networks.bitcoin);
    } catch (_) {
      return false;
    }
  }
}
