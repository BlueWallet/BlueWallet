import * as bitcoin from 'bitcoinjs-lib';

import { SegwitBech32Wallet } from './segwit-bech32-wallet';

export class TaprootWallet extends SegwitBech32Wallet {
  static readonly type = 'taproot';
  static readonly typeReadable = 'P2 TR';
  // @ts-ignore: override
  public readonly type = TaprootWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = TaprootWallet.typeReadable;
  public readonly segwitType = 'p2wpkh';

  /**
   * Converts script pub key to a Taproot address if it can. Returns FALSE if it cant.
   *
   * @param scriptPubKey
   * @returns {boolean|string} Either bech32 address or false
   */
  static scriptPubKeyToAddress(scriptPubKey: string): string | false {
    try {
      const publicKey = Buffer.from(scriptPubKey, 'hex');
      return bitcoin.address.fromOutputScript(publicKey, bitcoin.networks.bitcoin);
    } catch (_) {
      return false;
    }
  }
}
