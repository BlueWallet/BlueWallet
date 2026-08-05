import {
  formatDisplayAmount,
  initialState,
  receiveDetailsActionTypes,
  receiveDetailsReducer,
} from '../../screen/receive/receiveDetailsReducer';
import { BitcoinUnit } from '../../models/bitcoinUnits';

jest.mock('../../class/deeplink-schema-match', () => ({
  __esModule: true,
  default: {
    bip21encode: (address: string) => `bitcoin:${address}`,
  },
}));

jest.mock('../../blue_modules/currency', () => ({
  satoshiToBTC: (value: number) => `sat:${value}`,
  fiatToBTC: (value: number) => `fiat:${value}`,
}));

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    wallets: { details_address: 'Address' },
    bip47: { payment_code: 'Payment code' },
    transactions: {
      eta_10m: '10 minutes',
      eta_3h: '3 hours',
      eta_1d: '1 day',
      pending_with_amount: '{amt1}/{amt2}',
      received_with_amount: '{amt1}/{amt2}',
    },
    formatString: (template: string, params?: Record<string, string>) =>
      Object.entries(params ?? {}).reduce((result, [key, value]) => result.replace(`{${key}}`, value), template),
  },
  formatBalance: (value: number) => String(value),
}));

describe('receiveDetailsReducer', () => {
  it('sets address + bip21 and stays idempotent for duplicate SET_ADDRESS', () => {
    const first = receiveDetailsReducer(initialState, {
      type: receiveDetailsActionTypes.SET_ADDRESS,
      address: 'bc1qabc',
    });

    expect(first.address).toBe('bc1qabc');
    expect(first.bip21encoded).toBe('bitcoin:bc1qabc');
    expect(first.showAddress).toBe(true);

    const second = receiveDetailsReducer(first, {
      type: receiveDetailsActionTypes.SET_ADDRESS,
      address: 'bc1qabc',
    });

    expect(second).toBe(first);
  });

  it('switches tabs for valid index and ignores invalid tab index', () => {
    const switched = receiveDetailsReducer(initialState, {
      type: receiveDetailsActionTypes.SELECT_TAB,
      index: 1,
    });
    expect(switched.currentTab).toBe('Payment code');

    const unchanged = receiveDetailsReducer(switched, {
      type: receiveDetailsActionTypes.SELECT_TAB,
      index: 99,
    });
    expect(unchanged).toBe(switched);
  });

  it('moves to pending state on first unconfirmed balance and slows polling', () => {
    const state = receiveDetailsReducer(initialState, {
      type: receiveDetailsActionTypes.UPDATE_BALANCE,
      confirmed: 100,
      unconfirmed: 50,
    });

    expect(state.initialConfirmed).toBe(100);
    expect(state.initialUnconfirmed).toBe(50);
    expect(state.intervalMs).toBe(25000);
    expect(state.showPendingBalance).toBe(true);
    expect(state.showAddress).toBe(false);
    expect(state.displayBalance).toBe('50/50');
  });

  it('moves from pending to confirmed after unconfirmed clears and received amount is positive', () => {
    const pending = receiveDetailsReducer(initialState, {
      type: receiveDetailsActionTypes.UPDATE_BALANCE,
      confirmed: 100,
      unconfirmed: 50,
    });

    const confirmed = receiveDetailsReducer(pending, {
      type: receiveDetailsActionTypes.UPDATE_BALANCE,
      confirmed: 150,
      unconfirmed: 0,
    });

    expect(confirmed.showConfirmedBalance).toBe(true);
    expect(confirmed.showPendingBalance).toBe(false);
    expect(confirmed.showAddress).toBe(false);
    expect(confirmed.displayBalance).toBe('50/50');
  });

  it('returns to address state after pending clears without a positive received delta', () => {
    const pending = receiveDetailsReducer(initialState, {
      type: receiveDetailsActionTypes.UPDATE_BALANCE,
      confirmed: 100,
      unconfirmed: 50,
    });

    const backToAddress = receiveDetailsReducer(pending, {
      type: receiveDetailsActionTypes.UPDATE_BALANCE,
      confirmed: 100,
      unconfirmed: 0,
    });

    expect(backToAddress.showAddress).toBe(true);
    expect(backToAddress.showPendingBalance).toBe(false);
    expect(backToAddress.showConfirmedBalance).toBe(false);
  });

  it('computes ETA buckets based on sat/vbyte thresholds', () => {
    const fast = receiveDetailsReducer(initialState, {
      type: receiveDetailsActionTypes.UPDATE_ETA,
      fee: 1000,
      vsize: 100,
      fastFee: 10,
      mediumFee: 5,
    });
    expect(fast.eta).toBe('10 minutes');

    const medium = receiveDetailsReducer(initialState, {
      type: receiveDetailsActionTypes.UPDATE_ETA,
      fee: 700,
      vsize: 100,
      fastFee: 10,
      mediumFee: 5,
    });
    expect(medium.eta).toBe('3 hours');

    const slow = receiveDetailsReducer(initialState, {
      type: receiveDetailsActionTypes.UPDATE_ETA,
      fee: 300,
      vsize: 100,
      fastFee: 10,
      mediumFee: 5,
    });
    expect(slow.eta).toBe('1 day');
  });

  it('clamps QR size and ignores non-positive layout dimensions', () => {
    const noChange = receiveDetailsReducer(initialState, {
      type: receiveDetailsActionTypes.UPDATE_QR_CODE_SIZE,
      width: 0,
      height: 100,
    });
    expect(noChange).toBe(initialState);

    const updated = receiveDetailsReducer(initialState, {
      type: receiveDetailsActionTypes.UPDATE_QR_CODE_SIZE,
      width: 400,
      height: 800,
    });
    expect(updated.qrCodeSize).toBe(301);
  });

  it('applies custom params and supports reset to fallback unit when not custom', () => {
    const custom = receiveDetailsReducer(initialState, {
      type: receiveDetailsActionTypes.APPLY_CUSTOM_PARAMS,
      params: {
        customLabel: 'Coffee',
        customAmount: '2',
        customUnit: BitcoinUnit.BTC,
        bip21encoded: 'bitcoin:bc1qabc?amount=2',
        isCustom: true,
      },
      fallbackUnit: BitcoinUnit.SATS,
    });

    expect(custom.isCustom).toBe(true);
    expect(custom.customLabel).toBe('Coffee');
    expect(custom.customAmount).toBe('2');
    expect(custom.customUnit).toBe(BitcoinUnit.BTC);
    expect(custom.displayAmount).toBe('2 BTC');

    const reset = receiveDetailsReducer(custom, {
      type: receiveDetailsActionTypes.APPLY_CUSTOM_PARAMS,
      params: {
        isCustom: false,
      },
      fallbackUnit: BitcoinUnit.SATS,
    });

    expect(reset.isCustom).toBe(false);
    expect(reset.customLabel).toBe('');
    expect(reset.customAmount).toBe('');
    expect(reset.customUnit).toBe(BitcoinUnit.SATS);
    expect(reset.displayAmount).toBeNull();
  });
});

describe('formatDisplayAmount', () => {
  it('returns null for non-positive values and formats supported units', () => {
    expect(formatDisplayAmount('0', BitcoinUnit.BTC)).toBeNull();
    expect(formatDisplayAmount('-1', BitcoinUnit.BTC)).toBeNull();
    expect(formatDisplayAmount('2', BitcoinUnit.BTC)).toBe('2 BTC');
    expect(formatDisplayAmount('3', BitcoinUnit.SATS)).toBe('sat:3 BTC');
    expect(formatDisplayAmount('4', BitcoinUnit.LOCAL_CURRENCY)).toBe('fiat:4 BTC');
  });

  it('falls back to a generic format for unknown units', () => {
    const customStateUnit = 'CUSTOM_UNIT' as BitcoinUnit;
    expect(formatDisplayAmount('5', customStateUnit)).toBe('5 CUSTOM_UNIT');
  });

  it('formats invalid numeric input as a BTC string (current behavior)', () => {
    expect(formatDisplayAmount('not-a-number', BitcoinUnit.BTC)).toBe('not-a-number BTC');
  });
});
