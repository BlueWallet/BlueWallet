import { SparkWallet as NativeSDK, isValidSparkAddress } from '@buildonspark/spark-sdk';
import * as bip39 from 'bip39';

import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras/index';
import { randomBytes } from '../rng.ts';
import { LightningCustodianWallet } from './lightning-custodian-wallet.ts';
import { LightningTransaction, Transaction } from './types.ts';

type SparkInvoiceRecord = LightningTransaction & {
  requestId: string;
  id?: string;
};

type SparkTransfer = Awaited<ReturnType<NativeSDK['getTransfers']>>['transfers'][number];
type SparkReceiveRequest = NonNullable<Awaited<ReturnType<NativeSDK['getLightningReceiveRequest']>>>;

const INCOMING_TRANSFER_STATUSES_PAID = new Set(['LIGHTNING_PAYMENT_RECEIVED', 'TRANSFER_COMPLETED']);
const OUTGOING_TRANSFER_STATUSES_PAID = new Set(['LIGHTNING_PAYMENT_SUCCEEDED', 'TRANSFER_COMPLETED']);
const SPARK_TRANSFER_STATUS_COMPLETED = 'TRANSFER_STATUS_COMPLETED';
const SPARK_TRANSFERS_PAGE_SIZE = 100;
const SPARK_TRANSFERS_MAX_TO_LOAD = 500;

export class LightningSparkWallet extends LightningCustodianWallet {
  static readonly type = 'lightningSparkWallet';
  static readonly typeReadable = 'Lightning Spark';
  static readonly subtitleReadable = 'Spark';
  // @ts-ignore: override
  public readonly type = LightningSparkWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = LightningSparkWallet.typeReadable;

  private _sdk: NativeSDK | undefined;
  private _initPromise: Promise<void> | undefined;
  private _transfers: SparkTransfer[] = [];
  private _userInvoices: Record<string, SparkInvoiceRecord> = {};

  prepareForSerialization() {
    this._sdk = undefined;
    this._initPromise = undefined;
  }

  private toUnixTimestamp(date: Date | string | undefined): number {
    if (!date) return Math.floor(Date.now() / 1000);
    const ms = date instanceof Date ? date.getTime() : Date.parse(date);
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : Math.floor(Date.now() / 1000);
  }

  private normalizeSecret(): string {
    if (!this.secret) throw new Error('secret is not set');
    return this.secret.replace('spark://', '').trim();
  }

  private async ensureSdk(): Promise<NativeSDK> {
    if (!this._sdk) {
      await this.init();
    }

    if (!this._sdk) {
      throw new Error('Spark wallet not initialized');
    }

    return this._sdk;
  }

  private syncUserInvoicesRaw() {
    this.user_invoices_raw = Object.values(this._userInvoices)
      .map(invoice => ({ ...invoice }))
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }

  private mapReceiveRequestToInvoice(request: SparkReceiveRequest, existing?: SparkInvoiceRecord): SparkInvoiceRecord {
    const encodedInvoice = request.invoice.encodedInvoice;
    const isPaid = INCOMING_TRANSFER_STATUSES_PAID.has(request.status);

    let decoded:
      | {
          num_satoshis: number;
          payment_hash: string;
          description: string;
          expiry: number;
        }
      | undefined;

    try {
      decoded = this.decodeInvoice(encodedInvoice);
    } catch (error: any) {
      console.log(`Spark could not decode receive invoice ${request.id}:`, error?.message ?? error);
    }

    const amountFromTransfer = request.transfer?.totalAmount?.originalValue;
    const amount = amountFromTransfer ?? decoded?.num_satoshis ?? existing?.value ?? 0;

    return {
      ...(existing ?? {}),
      requestId: request.id,
      id: request.transfer?.sparkId ?? existing?.id,
      walletID: this.getID(),
      type: 'user_invoice',
      payment_hash: request.invoice.paymentHash || decoded?.payment_hash || existing?.payment_hash || '',
      payment_request: encodedInvoice,
      payment_preimage: request.paymentPreimage ?? existing?.payment_preimage,
      memo: request.invoice.memo || decoded?.description || existing?.memo || '',
      timestamp: this.toUnixTimestamp(isPaid ? request.updatedAt : request.createdAt),
      expire_time: decoded?.expiry ?? existing?.expire_time,
      ispaid: isPaid,
      value: amount,
      amt: amount,
    };
  }

  async init() {
    if (this._sdk) return;
    if (this._initPromise) return this._initPromise;

    this._initPromise = NativeSDK.initialize({
      mnemonicOrSeed: this.normalizeSecret(),
      options: {
        network: 'MAINNET',
      },
    })
      .then(({ wallet }) => {
        this._sdk = wallet;
      })
      .finally(() => {
        this._initPromise = undefined;
      });

    await this._initPromise;
  }

  async generate(): Promise<void> {
    const buf = await randomBytes(16);
    this.secret = 'spark://' + bip39.entropyToMnemonic(uint8ArrayToHex(buf));

    await this.init();
  }

  getSecret() {
    return this.secret;
  }

  getTransactions(): (Transaction & LightningTransaction)[] {
    const walletID = this.getID();
    const txs: LightningTransaction[] = [];
    const transferIds = new Set<string>();

    const invoicesByTransferId: Record<string, SparkInvoiceRecord> = {};
    for (const invoice of Object.values(this._userInvoices)) {
      if (invoice.id) {
        invoicesByTransferId[invoice.id] = invoice;
      }
    }

    for (const sparkTransfer of this._transfers) {
      transferIds.add(sparkTransfer.id);

      const isIncoming = sparkTransfer.transferDirection === 'INCOMING';
      const linkedInvoice = invoicesByTransferId[sparkTransfer.id];
      const request: any = sparkTransfer.userRequest;

      const tx: LightningTransaction = {
        walletID,
        type: isIncoming ? 'user_invoice' : 'paid_invoice',
        timestamp: this.toUnixTimestamp(sparkTransfer.updatedTime ?? sparkTransfer.createdTime),
        ispaid: sparkTransfer.status === SPARK_TRANSFER_STATUS_COMPLETED,
        value: isIncoming ? sparkTransfer.totalValue : -sparkTransfer.totalValue,
        amt: isIncoming ? sparkTransfer.totalValue : -sparkTransfer.totalValue,
        memo: isIncoming ? 'Lightning invoice' : 'Lightning payment',
        payment_hash: '',
        payment_preimage: '',
      };

      if (linkedInvoice) {
        tx.memo = linkedInvoice.memo;
        tx.payment_preimage = linkedInvoice.payment_preimage;
        tx.payment_hash = linkedInvoice.payment_hash;
        tx.payment_request = linkedInvoice.payment_request;
        tx.expire_time = linkedInvoice.expire_time;
        tx.ispaid = linkedInvoice.ispaid;
      } else if (request) {
        if ('invoice' in request) {
          const invoiceTx = this.mapReceiveRequestToInvoice(request, this._userInvoices[request.id]);
          this._userInvoices[request.id] = invoiceTx;

          tx.memo = invoiceTx.memo;
          tx.payment_preimage = invoiceTx.payment_preimage;
          tx.payment_hash = invoiceTx.payment_hash;
          tx.payment_request = invoiceTx.payment_request;
          tx.expire_time = invoiceTx.expire_time;
          tx.ispaid = invoiceTx.ispaid;
        } else if ('encodedInvoice' in request) {
          tx.payment_request = request.encodedInvoice;

          try {
            const decoded = this.decodeInvoice(request.encodedInvoice);
            tx.payment_hash = decoded.payment_hash;
            tx.memo = decoded.description || tx.memo;
            tx.expire_time = decoded.expiry;
          } catch (error: any) {
            console.log(`Spark could not decode outgoing invoice ${sparkTransfer.id}:`, error?.message ?? error);
          }

          tx.ispaid = OUTGOING_TRANSFER_STATUSES_PAID.has(request.status);
          tx.payment_preimage = request.paymentPreimage;
        }
      }

      txs.push(tx);
    }

    for (const invoice of Object.values(this._userInvoices)) {
      if (!invoice.id || !transferIds.has(invoice.id)) {
        txs.push({ ...invoice, walletID });
      }
    }

    this.syncUserInvoicesRaw();

    txs.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    return txs as unknown as (Transaction & LightningTransaction)[];
  }

  async fetchUserInvoices() {
    await this.getUserInvoices();
  }

  async fetchTransactions() {
    const sdk = await this.ensureSdk();
    const transfers: SparkTransfer[] = [];
    const seenTransferIds = new Set<string>();
    const seenOffsets = new Set<number>();
    let offset = 0;

    while (offset >= 0 && transfers.length < SPARK_TRANSFERS_MAX_TO_LOAD) {
      if (seenOffsets.has(offset)) {
        console.warn(`Spark returned a repeated transfer offset (${offset}), stopping pagination.`);
        break;
      }
      seenOffsets.add(offset);

      const remaining = SPARK_TRANSFERS_MAX_TO_LOAD - transfers.length;
      const pageSize = Math.min(SPARK_TRANSFERS_PAGE_SIZE, remaining);
      const page = await sdk.getTransfers(pageSize, offset);
      const pageTransfers = page?.transfers ?? [];

      for (const transfer of pageTransfers) {
        if (seenTransferIds.has(transfer.id)) continue;
        seenTransferIds.add(transfer.id);
        transfers.push(transfer);
        if (transfers.length >= SPARK_TRANSFERS_MAX_TO_LOAD) break;
      }

      if (pageTransfers.length === 0) {
        break;
      }

      const nextOffset = page?.offset;
      if (typeof nextOffset !== 'number' || nextOffset < 0 || nextOffset === offset) {
        break;
      }

      offset = nextOffset;
    }

    this._transfers = transfers;
    this._lastTxFetch = +new Date();
  }

  async fetchBalance(noRetry?: boolean): Promise<void> {
    const sdk = await this.ensureSdk();
    const balanceData = await sdk.getBalance();

    this.balance = Number(balanceData.balance);
    this._lastBalanceFetch = +new Date();
  }

  getBalance() {
    if (this._lastBalanceFetch === 0) {
      return this._transfers.reduce(
        (sum, transfer) => sum + (transfer.transferDirection === 'INCOMING' ? transfer.totalValue : -transfer.totalValue),
        0,
      );
    }

    return this.balance;
  }

  isAddressValid(address: string): boolean {
    const trimmedAddress = address.trim();
    if (!trimmedAddress.toLowerCase().startsWith('spark1')) {
      return false;
    }

    try {
      return isValidSparkAddress(trimmedAddress);
    } catch (_) {
      return false;
    }
  }

  async payInvoice(invoice: string, freeAmount: number = 0) {
    const sdk = await this.ensureSdk();
    const destination = invoice.trim();

    if (this.isAddressValid(destination)) {
      if (freeAmount <= 0) {
        throw new Error('Amount must be provided for Spark address transfers');
      }

      const transferResponse = await sdk.transfer({
        receiverSparkAddress: destination,
        amountSats: freeAmount,
      });

      this.last_paid_invoice_result = {
        response: transferResponse,
      };
      return;
    }

    const decoded = this.decodeInvoice(destination);
    const amountSatsToSend = decoded.num_satoshis > 0 ? decoded.num_satoshis : freeAmount;
    if (amountSatsToSend <= 0) {
      throw new Error('Amount must be provided for zero-amount invoices');
    }

    const maxFeeSats = Math.max(1, Math.ceil(amountSatsToSend * 0.01));

    const paymentResponse = await sdk.payLightningInvoice({
      invoice: destination,
      amountSatsToSend: decoded.num_satoshis > 0 ? undefined : amountSatsToSend,
      maxFeeSats,
    });

    this.last_paid_invoice_result = {
      payment_hash: decoded.payment_hash,
      payment_preimage: 'paymentPreimage' in paymentResponse ? paymentResponse.paymentPreimage : undefined,
      response: paymentResponse,
    };
  }

  async getUserInvoices(limit: number | false = false): Promise<LightningTransaction[]> {
    const sdk = await this.ensureSdk();

    for (const requestId of Object.keys(this._userInvoices)) {
      const existing = this._userInvoices[requestId];
      if (existing.ispaid) continue;

      if ((existing.timestamp ?? 0) + (existing.expire_time ?? 0) < Date.now() / 1000) {
        continue;
      }

      const request = await sdk.getLightningReceiveRequest(requestId);
      if (!request) continue;

      this._userInvoices[requestId] = this.mapReceiveRequestToInvoice(request, existing);
    }

    this.syncUserInvoicesRaw();

    if (!limit) {
      return this.user_invoices_raw as LightningTransaction[];
    }

    return (this.user_invoices_raw as LightningTransaction[]).slice(-Math.abs(limit));
  }

  async addInvoice(amt: number, memo: string, receiverIdentityPubkey?: string) {
    const sdk = await this.ensureSdk();

    const receiveRequest = await sdk.createLightningInvoice({
      amountSats: amt,
      memo,
      receiverIdentityPubkey,
    });

    this._userInvoices[receiveRequest.id] = this.mapReceiveRequestToInvoice(receiveRequest);
    this.syncUserInvoicesRaw();

    return receiveRequest.invoice.encodedInvoice;
  }

  async getReceiveRequestStatus(requestId: string): Promise<LightningTransaction> {
    const sdk = await this.ensureSdk();

    const request = await sdk.getLightningReceiveRequest(requestId);
    if (!request) {
      throw new Error('Receive request not found');
    }

    const tx = this.mapReceiveRequestToInvoice(request, this._userInvoices[requestId]);
    this._userInvoices[requestId] = tx;
    this.syncUserInvoicesRaw();

    return tx;
  }

  async getSendRequestStatus(requestId: string) {
    const sdk = await this.ensureSdk();
    return sdk.getLightningSendRequest(requestId);
  }

  async signMessageWithIdentityKey(message: string) {
    const sdk = await this.ensureSdk();
    return sdk.signMessageWithIdentityKey(message);
  }

  async validateMessageWithIdentityKey(message: string, signature: string): Promise<boolean> {
    const sdk = await this.ensureSdk();
    return sdk.validateMessageWithIdentityKey(message, signature);
  }

  async getSparkAddress(): Promise<string> {
    const sdk = await this.ensureSdk();
    return sdk.getSparkAddress();
  }

  async getSparkIdentityPubkey(): Promise<string> {
    const sdk = await this.ensureSdk();
    return sdk.getIdentityPublicKey();
  }

  async fetchInfo() {
    const sdk = await this.ensureSdk();
    return {
      identityPubkey: await sdk.getIdentityPublicKey(),
      sparkAddress: await sdk.getSparkAddress(),
    };
  }

  async fetchPendingTransactions() {
    // nop
  }

  weOwnTransaction(txid: string) {
    if (this._transfers.some(transfer => transfer.id === txid)) return true;

    for (const tx of this.getTransactions()) {
      if (tx && tx.payment_hash && tx.payment_hash === txid) return true;
    }

    return false;
  }

  async decodeInvoiceRemote(invoice: string) {
    return this.decodeInvoice(invoice);
  }

  async allowOnchainAddress() {
    return false;
  }

  async getAddressAsync(): Promise<string | false> {
    return false;
  }

  async fetchBtcAddress() {
    this.refill_addressess = [];
  }

  async refreshAcessToken() {
    // nop
  }

  async checkLogin() {
    // nop
  }

  async authorize() {
    // nop
  }

  weOwnAddress(address: string) {
    return false;
  }

  isInvoiceGeneratedByWallet(paymentRequest: string) {
    return Object.values(this._userInvoices).some(tx => tx.payment_request === paymentRequest);
  }

  async createAccount(isTest: boolean = false) {
    // nop
  }

  accessTokenExpired() {
    return false;
  }

  refreshTokenExpired() {
    return false;
  }

  getAddress(): string | false {
    return false;
  }
}
