/**
 * Common storage shape for every wallet that NeuraiWallet persists. Concrete
 * subclasses (`NeuraiHDWallet`, `NeuraiPQWallet`) extend this base via
 * `AbstractNeuraiWallet`.
 *
 * The serialization round-trip relies on `JSON.stringify(wallet)` walking the
 * enumerable instance properties; `fromJson` then copies them back. Anything
 * runtime-only must be marked non-enumerable in subclass constructors (we do
 * that in `AbstractNeuraiWallet` for `_engine`/`_backend`/etc).
 */

import { decodeWalletAmounts, encodeWalletAmounts } from '../../blue_modules/neurai/walletAmountsCodec';

import { sha256 } from '@noble/hashes/sha256';

import { XnaUnit, Chain } from '../../models/xnaUnits';
import { Transaction, Utxo } from './types';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';

type WalletWithPassphrase = AbstractWallet & { getPassphrase: () => string };
type UtxoMetadata = {
  frozen?: boolean;
  memo?: string;
};

export class AbstractWallet {
  static readonly type = 'abstract';
  static readonly typeReadable = 'abstract';
  // @ts-ignore: override
  public readonly type = AbstractWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = AbstractWallet.typeReadable;

  static fromJson(obj: string): AbstractWallet {
    const obj2 = decodeWalletAmounts(JSON.parse(obj));
    const temp = new this();
    for (const key2 of Object.keys(obj2)) {
      // @ts-ignore: dynamic property copy is intentional
      temp[key2] = obj2[key2];
    }
    return temp;
  }

  amountsStale = false;
  amountsVersion = 1;

  toJSON(): object {
    return encodeWalletAmounts(this);
  }

  _derivationPath?: string;
  label: string;
  secret: string;
  balance: bigint;
  unconfirmed_balance: bigint;
  _address: string | false;
  _utxo: Utxo[];
  _lastTxFetch: number;
  _lastBalanceFetch: number;
  preferredBalanceUnit: XnaUnit;
  chain: Chain;
  hideBalance: boolean;
  userHasSavedExport: boolean;
  _hideTransactionsInWalletsList: boolean;
  _utxoMetadata: Record<string, UtxoMetadata>;
  use_with_hardware_wallet: boolean;
  masterFingerprint: number;

  constructor() {
    this.label = '';
    this.secret = '';
    this.balance = 0n;
    this.unconfirmed_balance = 0n;
    this._address = false;
    this._utxo = [];
    this._lastTxFetch = 0;
    this._lastBalanceFetch = 0;
    this.preferredBalanceUnit = XnaUnit.XNA;
    this.chain = Chain.ONCHAIN;
    this.hideBalance = false;
    this.userHasSavedExport = false;
    this._hideTransactionsInWalletsList = false;
    this._utxoMetadata = {};
    this.use_with_hardware_wallet = false;
    this.masterFingerprint = 0;
  }

  getLastTxFetch(): number {
    return this._lastTxFetch;
  }

  /**
   * Local identity of the wallet: navigation params, per-wallet caches and
   * duplicate detection. It never feeds key derivation, addresses or signing.
   * Subclasses refine it (see `AbstractNeuraiWallet.getID`).
   */
  getID(): string {
    return this.getLegacyID();
  }

  /**
   * The original identity formula (type + secret + passphrase + path). It is
   * still the ID of every mainnet software wallet, and the key under which
   * older versions stored per-wallet references (see `walletIdMigration`).
   */
  getLegacyID(): string {
    const thisWithPassphrase = this as unknown as WalletWithPassphrase;
    const passphrase = thisWithPassphrase.getPassphrase ? thisWithPassphrase.getPassphrase() : '';
    const path = this._derivationPath ?? '';
    return uint8ArrayToHex(sha256(this.type + this.getSecret() + passphrase + path));
  }

  getTransactions(): Transaction[] {
    throw new Error('not implemented');
  }

  getUserHasSavedExport(): boolean {
    return this.userHasSavedExport;
  }

  setUserHasSavedExport(value: boolean): void {
    this.userHasSavedExport = value;
  }

  getHideTransactionsInWalletsList(): boolean {
    return this._hideTransactionsInWalletsList;
  }

  setHideTransactionsInWalletsList(value: boolean): void {
    this._hideTransactionsInWalletsList = value;
  }

  getLabel(): string {
    if (this.label.trim().length === 0) return 'Wallet';
    return this.label;
  }

  setLabel(newLabel: string): this {
    this.label = newLabel;
    return this;
  }

  getSecret(): string {
    return this.secret;
  }

  setSecret(newSecret: string): this {
    this.secret = newSecret.trim();
    return this;
  }

  getXpub(): string | false {
    return this._address;
  }

  /** @returns available balance (in sats) accounting for negative unconfirmed deltas */
  getBalance(): bigint {
    return this.balance + (this.getUnconfirmedBalance() < 0 ? this.getUnconfirmedBalance() : 0n);
  }

  getPreferredBalanceUnit(): XnaUnit {
    if (Object.values(XnaUnit).includes(this.preferredBalanceUnit)) return this.preferredBalanceUnit;
    return XnaUnit.XNA;
  }

  setPreferredBalanceUnit(unit: XnaUnit): void {
    this.preferredBalanceUnit = Object.values(XnaUnit).includes(unit) ? unit : XnaUnit.XNA;
  }

  getUnconfirmedBalance(): bigint {
    return this.unconfirmed_balance;
  }

  // --- capability flags. Subclasses override to opt in. ---

  async allowOnchainAddress(): Promise<boolean> {
    return true;
  }

  allowReceive(): boolean {
    return true;
  }

  allowSend(): boolean {
    return true;
  }

  allowSignVerifyMessage(): boolean {
    return false;
  }

  allowMasterFingerprint(): boolean {
    return false;
  }

  allowXpub(): boolean {
    return false;
  }

  weOwnAddress(_address: string): boolean {
    throw new Error('not implemented');
  }

  weOwnTransaction(_txid: string): boolean {
    throw new Error('not implemented');
  }

  isAddressValid(_address: string): boolean {
    return false;
  }

  getAddress(): string | false | undefined {
    throw new Error('not implemented');
  }

  getAddressAsync(): Promise<string | false | undefined> {
    return Promise.resolve(this.getAddress());
  }

  useWithHardwareWalletEnabled(): boolean {
    return this.use_with_hardware_wallet;
  }

  getAllExternalAddresses(): string[] {
    return [];
  }

  prepareForSerialization(): void {}

  /** Get metadata (frozen, memo) for a specific UTXO. */
  getUTXOMetadata(txid: string, vout: number): UtxoMetadata {
    return this._utxoMetadata[`${txid}:${vout}`] || {};
  }

  /** Set metadata (frozen, memo) for a specific UTXO. */
  setUTXOMetadata(txid: string, vout: number, opts: UtxoMetadata): void {
    const meta = this._utxoMetadata[`${txid}:${vout}`] || {};
    if ('memo' in opts) meta.memo = opts.memo;
    if ('frozen' in opts) meta.frozen = opts.frozen;
    this._utxoMetadata[`${txid}:${vout}`] = meta;
  }
}
