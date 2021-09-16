/* global alert */
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { LightningCustodianWallet } from './lightning-custodian-wallet';
import SyncedAsyncStorage from '../synced-async-storage';
import { randomBytes } from '../rng';
import * as bip39 from 'bip39';
import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';
import bolt11 from 'bolt11';
import { SegwitBech32Wallet } from './segwit-bech32-wallet';
const bitcoin = require('bitcoinjs-lib');

export class LightningLdkWallet extends LightningCustodianWallet {
  static type = 'lightningLdk';
  static typeReadable = 'Lightning LDK';
  private _listChannels: any[] = [];
  private _listPayments: any[] = [];
  private _listInvoices: any[] = [];
  private _nodeConnectionDetailsCache: any = {}; // pubkey -> {pubkey, host, port, ts}
  private _refundAddressScriptHex: string = '';
  private _lastTimeBlockchainCheckedTs: number = 0;
  private _unwrapFirstExternalAddressFromMnemonicsCache: string = '';
  private static _predefinedNodes: any = {
    'lnd2.bluewallet.io': '037cc5f9f1da20ac0d60e83989729a204a33cc2d8e80438969fadf35c1c5f1233b@165.227.103.83:9735',
    ACINQ: '03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f@34.239.230.56:9735',
    Bitrefill: '030c3f19d742ca294a55c00376b3b355c3c90d61c6b6b39554dbc7ac19b141c14f@52.50.244.44:9735',
    'OpenNode.com': '03abf6f44c355dec0d5aa155bdbdd6e0c8fefe318eff402de65c6eb2e1be55dc3e@18.221.23.28:9735',
    'Moon (paywithmoon.com)': '025f1456582e70c4c06b61d5c8ed3ce229e6d0db538be337a2dc6d163b0ebc05a5@52.86.210.65:9735',
    Fold: '02816caed43171d3c9854e3b0ab2cf0c42be086ff1bd4005acc2a5f7db70d83774@35.238.153.25:9735',
    'Blockstream Store': '02df5ffe895c778e10f7742a6c5b8a0cefbe9465df58b92fadeb883752c8107c8f@35.232.170.67:9735',
    'coingate.com': '0242a4ae0c5bef18048fbecf995094b74bfb0f7391418d71ed394784373f41e4f3@3.124.63.44:9735',
  };

  static getPredefinedNodes() {
    return LightningLdkWallet._predefinedNodes;
  }

  static pubkeyToAlias(pubkeyHex: string) {
    for (const key of Object.keys(LightningLdkWallet._predefinedNodes)) {
      const val = LightningLdkWallet._predefinedNodes[key];
      if (val.startsWith(pubkeyHex)) return key;
    }

    return pubkeyHex;
  }

  constructor(props: any) {
    super(props);
    this.preferredBalanceUnit = BitcoinUnit.SATS;
    this.chain = Chain.OFFCHAIN;
    this.user_invoices_raw = []; // compatibility with other lightning wallet class
  }

  valid() {
    try {
      const entropy = bip39.mnemonicToEntropy(this.secret.replace('ldk://', ''));
      return entropy.length === 64 || entropy.length === 32;
    } catch (_) {}

    return false;
  }

 
}
