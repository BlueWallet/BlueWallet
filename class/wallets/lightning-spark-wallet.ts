import { ReactNativeSparkSigner, SparkWallet as NativeSDK } from '@buildonspark/spark-sdk/native';
// import { SparkWallet as NativeSDK } from '@buildonspark/spark-sdk';
// class ReactNativeSparkSigner {}
import { LightningCustodianWallet } from './lightning-custodian-wallet.ts';
import { randomBytes } from '../rng.ts';
import * as bip39 from 'bip39';
import { WalletTransfer } from '@buildonspark/spark-sdk/types';
import { LightningTransaction } from './types.ts';

export class LightningSparkWallet extends LightningCustodianWallet {
  static readonly type = 'lightningSparkWallet';
  static readonly typeReadable = 'Lightning Spark';
  static readonly subtitleReadable = 'Spark';
  // @ts-ignore: override
  public readonly type = LightningSparkWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = LightningSparkWallet.typeReadable;

  private _sdk: NativeSDK | /* SDK | */ undefined;
  private _transfers: WalletTransfer[] = [];
  private _userInvoices: Record<string, LightningTransaction & { id?: string }> = {}; // LightningReceiveRequest id => LightningTransaction object; also transfer id (to be used for cross-referencing)

  async init() {
    const { wallet } = await NativeSDK.initialize({
      signer: new ReactNativeSparkSigner(),
      mnemonicOrSeed: this.secret.replace('spark://', ''),
      options: {
        network: 'MAINNET',
      },
    });
    this._sdk = wallet;
  }

  async generate(): Promise<void> {
    const buf = await randomBytes(16);
    this.secret = 'spark://' + bip39.entropyToMnemonic(buf.toString('hex'));

    await this.init();
  }

  getSecret() {
    return this.secret;
  }

  getTransactions(): LightningTransaction[] {
    const ret: LightningTransaction[] = [];

    for (const sparkTransfer of this._transfers) {
      const tx: LightningTransaction = {
        payment_hash: '',
        timestamp: Math.floor(+Date.parse(String(sparkTransfer.updatedTime)) / 1000),
        ispaid: true, // fixme
        walletID: this.getID(),
        value: sparkTransfer.transferDirection === 'INCOMING' ? sparkTransfer.totalValue : -1 * sparkTransfer.totalValue,
        memo: '',
        payment_preimage: '',
        type: sparkTransfer.transferDirection === 'INCOMING' ? 'user_invoice' : 'paid_invoice',
      };

      tx.amt = tx.value;

      if (sparkTransfer.id) {
        // cross-reference with user invoices:
        const foundLnInvoice = Object.values(this._userInvoices).find(invoice => invoice.id === sparkTransfer.id);
        if (foundLnInvoice) {
          tx.memo = foundLnInvoice.memo;
          tx.payment_preimage = foundLnInvoice.payment_preimage;
          tx.payment_hash = foundLnInvoice.payment_hash;
          tx.payment_request = foundLnInvoice.payment_request;
          tx.expire_time = foundLnInvoice.expire_time;
          tx.ispaid = foundLnInvoice.ispaid;
        }
      }

      ret.push(tx);
    }

    return ret;
  }

  async fetchUserInvoices() {
    // nop
  }

  async fetchTransactions() {
    if (!this._sdk) throw new Error('not initialized');
    while (!this._sdk.getTransfers) {
      // waiting till lib initializes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const transfers = await this._sdk.getTransfers(999, 0);
    // todo: optimize: use offset and fetch only new txs

    console.log('transfers=', transfers);

    if (transfers?.transfers && transfers.transfers.length >= this._transfers.length) {
      this._transfers = transfers.transfers;
      this._lastTxFetch = +new Date();
    }
  }

  async fetchBalance(noRetry?: boolean): Promise<void> {
    if (!this._sdk) throw new Error('not initialized');
    while (!this._sdk.getBalance) {
      // waiting till lib initializes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const balance = await this._sdk.getBalance();
    console.log(balance);
    if (balance.balance) {
      this.balance = Number(balance.balance);
      this._lastBalanceFetch = +new Date();
    }
  }

  getBalance() {
    if (!this.balance) {
      return this._transfers.reduce(
        (sum, transfer) => sum + (transfer.transferDirection === 'INCOMING' ? transfer.totalValue : -1 * transfer.totalValue),
        0,
      );
    }

    return this.balance;
  }

  async payInvoice(invoice: string, freeAmount: number = 0) {
    if (!this._sdk) throw new Error('not initialized');
    if (!this._sdk.payLightningInvoice) throw new Error('Spark wallet is not done initializing, please wait');

    // todo: decode invoice and throw if its a zero amt invoice since spark doesnt support those yet

    const payment_response = await this._sdk.payLightningInvoice({
      invoice,
      maxFeeSats: 1000, // fixme: decode bolt11 and set a percentage
    });
    console.log('Payment Response:', payment_response);
  }

  async getUserInvoices(limit: number | false = false): Promise<LightningTransaction[]> {
    if (!this._sdk) throw new Error('not initialized');
    if (!this._sdk.getLightningReceiveRequest) return []; // nop, need to wait till its finished

    const ret: LightningTransaction[] = [];

    for (const LightningReceiveRequestId of Object.keys(this._userInvoices)) {
      const unfinalizedLnTx = this._userInvoices[LightningReceiveRequestId];

      if (unfinalizedLnTx.ispaid) {
        // already paid, skip
        ret.push(unfinalizedLnTx);
        continue;
      }

      if ((unfinalizedLnTx.timestamp ?? 0) + (unfinalizedLnTx.expire_time ?? 0) < Date.now() / 1000) {
        // expired, skip
        ret.push(unfinalizedLnTx);
        continue;
      }

      // not skipped means we are fetching its status from the server:
      const request = await this._sdk.getLightningReceiveRequest(LightningReceiveRequestId);
      unfinalizedLnTx.id = request?.transfer?.sparkId;

      switch (request?.status) {
        case 'LIGHTNING_PAYMENT_RECEIVED':
        case 'TRANSFER_COMPLETED':
          unfinalizedLnTx.ispaid = true;
          if (request.updatedAt) {
            unfinalizedLnTx.timestamp = Math.floor(+Date.parse(request.updatedAt) / 1000);
          }
          unfinalizedLnTx.payment_preimage = request?.paymentPreimage;
          break;
      }

      this._userInvoices[LightningReceiveRequestId] = unfinalizedLnTx; // saving back
      ret.push(unfinalizedLnTx);
    }

    return ret;
  }

  async addInvoice(amt: number, memo: string) {
    if (!this._sdk) throw new Error('not initialized');
    if (!this._sdk.createLightningInvoice) throw new Error('Spark wallet is not done initializing, please wait');

    const receiveRequest = await this._sdk.createLightningInvoice({
      amountSats: amt, // amount in satoshis
      memo, // optional description
    });

    console.log('ADD receiveRequest:', receiveRequest);

    const decoded = this.decodeInvoice(receiveRequest.invoice.encodedInvoice);

    const tx: LightningTransaction = decoded;
    tx.payment_request = receiveRequest.invoice.encodedInvoice;
    tx.memo = decoded.description;
    tx.ispaid = false;
    tx.expire_time = decoded.expiry;
    tx.type = 'user_invoice';

    this._userInvoices[receiveRequest.id] = tx;

    return receiveRequest.invoice.encodedInvoice;
  }

  async getSparkAddress(): Promise<string> {
    if (!this._sdk) throw new Error('not initialized');

    return await this._sdk.getSparkAddress();
  }

  async fetchInfo() {
    throw new Error('not imple');
  }

  async fetchPendingTransactions() {
    // nop
  }

  // @ts-ignore meh
  weOwnTransaction(txid: string) {
    throw new Error('weOwnTransaction not implemented');
  }

  async decodeInvoiceRemote(invoice: string) {
    throw new Error('decodeInvoiceRemote not implemented');
  }

  async allowOnchainAddress() {
    return false;
  }

  // @ts-ignore meh
  async getAddressAsync() {
    throw new Error('getAddressAsync not implemented');
  }

  async fetchBtcAddress() {
    throw new Error('fetchBtcAddress not implemented');
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
