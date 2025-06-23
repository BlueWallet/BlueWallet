import { ReactNativeSparkSigner, SparkWallet as NativeSDK } from '@buildonspark/spark-sdk/native';
// import { SparkWallet as NativeSDK } from '@buildonspark/spark-sdk';
// class ReactNativeSparkSigner {}
import { LightningCustodianWallet } from './lightning-custodian-wallet.ts';
import { randomBytes } from '../rng.ts';
import * as bip39 from 'bip39';
import { WalletTransfer } from '@buildonspark/spark-sdk/types';
import { LightningTransaction } from './types.ts';
import bolt11 from 'bolt11';

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
  private _userInvoices: Record<string, string> = {}; // LightningReceiveRequest id => bolt11 string

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
        timestamp: Math.floor(+Date.parse(String(sparkTransfer.updatedTime)) / 1),
        ispaid: true, // fixme
        walletID: this.getID(),
        value: sparkTransfer.transferDirection === 'INCOMING' ? sparkTransfer.totalValue : -1 * sparkTransfer.totalValue,
        memo: '',
        payment_preimage: '',
        type: sparkTransfer.transferDirection === 'INCOMING' ? 'user_invoice' : 'paid_invoice',
      };

      tx.amt = tx.value;

      // cross-reference with user invoices we created and fill the data thats missing in `transfers` from our invoices:
      /*       const invoice = this._userInvoices[sparkTransfer.id];
      if (invoice) {
        const { tags } = bolt11.decode(invoice);
        for (let i = 0; i < tags.length; i++) {
          const { tagName, data } = tags[i];
          switch (tagName) {
            case 'payment_hash':
              tx.payment_hash = data.toString();
              break;
            case 'expire_time':
              tx.expire_time = parseInt(data.toString());
              break;
            case 'description':
              tx.memo = data.toString();
              break;
          }
        }
      } */

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

    for (const id of Object.keys(this._userInvoices)) {
      const payment_request = this._userInvoices[id];
      const request = await this._sdk.getLightningReceiveRequest(id);

      let ispaid = false;
      switch (request?.status) {
        case 'LIGHTNING_PAYMENT_RECEIVED':
        case 'TRANSFER_COMPLETED':
          ispaid = true;
          break;
      }

      ispaid && console.log(request);

      const decoded = this.decodeInvoice(payment_request);

      const lnTx: LightningTransaction = {
        payment_request,
        ispaid,
        type: 'user_invoice',
        amt: +decoded.num_satoshis,
        value: +decoded.num_satoshis,
        memo: decoded.description,
        description: decoded.description,
        timestamp: request?.updatedAt ? Math.floor(+Date.parse(request?.updatedAt) / 1000) : undefined,
        payment_preimage: request?.paymentPreimage,
      };

      ret.push(lnTx);
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

    this._userInvoices[receiveRequest.id] = receiveRequest.invoice.encodedInvoice;

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
    return Object.values(this._userInvoices).includes(paymentRequest);
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
