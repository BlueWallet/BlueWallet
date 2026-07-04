import assert from 'assert';

import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import {
  getLightningInvoiceModalNavigation,
  isLightningDetailRow,
  isLightningInvoiceExpired,
  navigateToLightningInvoice,
  resolveLightningInvoiceRow,
  shouldOpenLightningReceiveScreen,
} from '../../blue_modules/lightningInvoiceNavigation';
import { LND_INVOICE_MODAL_ROOT } from '../../navigation/LNDInvoiceStackParamList';

describe('lightningInvoiceNavigation', () => {
  it('routes unpaid user invoices to the receive screen', () => {
    assert.strictEqual(
      shouldOpenLightningReceiveScreen({
        type: 'user_invoice',
        payment_request: 'lnbc1...',
        timestamp: Math.floor(Date.now() / 1000),
        expire_time: 3600,
      }),
      true,
    );
  });

  it('routes paid, send-side, in-flight, and expired rows to the status screen', () => {
    const now = Math.floor(Date.now() / 1000);
    assert.strictEqual(
      shouldOpenLightningReceiveScreen({
        type: 'user_invoice',
        ispaid: true,
        payment_request: 'lnbc1...',
        timestamp: now,
        expire_time: 3600,
      }),
      false,
    );
    assert.strictEqual(
      shouldOpenLightningReceiveScreen({
        type: 'payment_request',
        payment_request: 'lnbc1...',
        timestamp: now,
        expire_time: 3600,
      }),
      false,
    );
    assert.strictEqual(
      shouldOpenLightningReceiveScreen({
        type: 'user_invoice',
        txid: 'swap-abc',
        payment_request: 'lnbc1...',
        timestamp: now,
        expire_time: 3600,
        fundsInFlight: true,
      }),
      false,
    );
    assert.strictEqual(
      shouldOpenLightningReceiveScreen({
        type: 'user_invoice',
        payment_request: 'lnbc1...',
        timestamp: now - 7200,
        expire_time: 3600,
      }),
      false,
    );
  });

  it('routes open unpaid swap rows to the receive screen', () => {
    const now = Math.floor(Date.now() / 1000);
    assert.strictEqual(
      shouldOpenLightningReceiveScreen({
        type: 'user_invoice',
        txid: 'swap-open',
        payment_request: 'lnbc1...',
        timestamp: now,
        expire_time: 3600,
        fundsInFlight: false,
      }),
      true,
    );
  });

  it('builds modal navigation for unpaid receive invoices only', () => {
    const now = Math.floor(Date.now() / 1000);
    const walletID = 'wallet-id';
    const openInvoice = {
      type: 'user_invoice' as const,
      payment_request: 'lnbc1-open',
      timestamp: now,
      expire_time: 3600,
    };
    const paidInvoice = {
      type: 'user_invoice' as const,
      ispaid: true,
      payment_request: 'lnbc1-paid',
      timestamp: now,
      expire_time: 3600,
    };

    assert.deepStrictEqual(getLightningInvoiceModalNavigation(openInvoice, walletID), {
      screen: 'LNDReceiveInvoice',
      params: { invoice: openInvoice, walletID },
    });
    assert.deepStrictEqual(getLightningInvoiceModalNavigation(paidInvoice, walletID), {
      screen: 'LNDReceiveInvoice',
      params: { invoice: paidInvoice, walletID },
    });
    assert.strictEqual(LND_INVOICE_MODAL_ROOT, 'LNDInvoiceRoot');

    const pushed: Array<{ name: string; params?: unknown }> = [];
    const navigate = (name: string, params?: unknown) => {
      pushed.push({ name, params });
    };

    navigateToLightningInvoice(navigate, openInvoice, walletID);
    assert.strictEqual(pushed.length, 1);
    assert.strictEqual(pushed[0].name, LND_INVOICE_MODAL_ROOT);

    pushed.length = 0;
    navigateToLightningInvoice(navigate, paidInvoice, walletID);
    assert.strictEqual(pushed.length, 1);
    assert.strictEqual(pushed[0].name, 'LNDViewInvoice');
    assert.deepStrictEqual(pushed[0].params, { invoice: paidInvoice, walletID });
  });

  it('detects expired invoices', () => {
    const now = Math.floor(Date.now() / 1000);
    assert.strictEqual(
      isLightningInvoiceExpired({
        timestamp: now - 7200,
        expire_time: 3600,
      }),
      true,
    );
    assert.strictEqual(
      isLightningInvoiceExpired({
        timestamp: now,
        expire_time: 3600,
      }),
      false,
    );
  });

  it('resolves Ark legs to their swap row for Lightning detail routing', () => {
    const now = Math.floor(Date.now() / 1000);
    const arkLeg = {
      txid: 'ark-native',
      type: 'bitcoind_tx' as const,
      value: 500,
      timestamp: now,
    };
    const wallet = new LightningArkWallet();
    (wallet as any).decodeInvoice = () => ({
      num_satoshis: 500,
      description: 'Received via Arkade',
      payment_hash: 'bb'.repeat(32),
      expiry: 3600,
    });
    (wallet as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'native' },
        type: 'RECEIVED',
        settled: true,
        amount: 500,
        createdAt: now * 1000,
      },
    ];
    (wallet as any)._swapHistory = [
      {
        id: 'rev2',
        type: 'reverse',
        status: 'invoice.settled',
        createdAt: now,
        preimage: 'ff'.repeat(32),
        request: { invoice: 'lnbc...rev2' },
        response: { invoice: 'lnbc...rev2', onchainAmount: 500 },
      },
    ];

    assert.ok(resolveLightningInvoiceRow(arkLeg, wallet)?.payment_request);
    assert.strictEqual(isLightningDetailRow(arkLeg, wallet), true);
  });

  it('does not treat native Ark transfers as Lightning detail rows', () => {
    const now = Math.floor(Date.now() / 1000);
    const arkLeg = {
      txid: 'ark-native',
      type: 'bitcoind_tx' as const,
      value: 500,
      timestamp: now,
    };
    const wallet = new LightningArkWallet();
    (wallet as any)._transactionsHistory = [
      {
        key: { boardingTxid: '', commitmentTxid: '', arkTxid: 'native' },
        type: 'RECEIVED',
        settled: true,
        amount: 500,
        createdAt: now * 1000,
      },
    ];
    (wallet as any)._swapHistory = [];

    assert.strictEqual(resolveLightningInvoiceRow(arkLeg, wallet), undefined);
    assert.strictEqual(isLightningDetailRow(arkLeg, wallet), false);
  });
});
