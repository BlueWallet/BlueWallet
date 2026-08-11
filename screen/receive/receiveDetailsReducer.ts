import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { fiatToBTC, satoshiToBTC } from '../../blue_modules/currency';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';

export const segmentControlValues = [loc.wallets.details_address, loc.bip47.payment_code];

export const CARD_HORIZONTAL_MARGIN = 24;
export const CARD_INTERNAL_PADDING = 6;
export const QR_CARD_PADDING = 6;
export const MAX_QR_SIZE = 500;
export const MIN_QR_SIZE = 120;
export const QR_SCROLL_RESERVED_WIDTH = (CARD_HORIZONTAL_MARGIN + CARD_INTERNAL_PADDING + QR_CARD_PADDING) * 2;
export const QR_PORTRAIT_HEIGHT_FRACTION = 0.44;
export const QR_LANDSCAPE_HEIGHT_FRACTION = 0.52;
export const QR_WIDTH_USE_FRACTION = 0.92;

export const receiveDetailsActionTypes = {
  SET_ADDRESS: 'SET_ADDRESS',
  SELECT_TAB: 'SELECT_TAB',
  UPDATE_BALANCE: 'UPDATE_BALANCE',
  UPDATE_ETA: 'UPDATE_ETA',
  UPDATE_QR_CODE_SIZE: 'UPDATE_QR_CODE_SIZE',
  APPLY_CUSTOM_PARAMS: 'APPLY_CUSTOM_PARAMS',
} as const;

const { SET_ADDRESS, SELECT_TAB, UPDATE_BALANCE, UPDATE_ETA, UPDATE_QR_CODE_SIZE, APPLY_CUSTOM_PARAMS } = receiveDetailsActionTypes;

export type ReceiveDetailsState = {
  address: string;
  customLabel: string;
  customAmount: string;
  customUnit: BitcoinUnit;
  bip21encoded: string;
  isCustom: boolean;
  showPendingBalance: boolean;
  showConfirmedBalance: boolean;
  showAddress: boolean;
  currentTab: string;
  intervalMs: number;
  eta: string;
  initialConfirmed: number;
  initialUnconfirmed: number;
  displayBalance: string;
  displayAmount: string | null;
  qrCodeSize: number;
};

type ReceiveCustomParams = {
  customLabel?: string;
  customAmount?: string;
  customUnit?: BitcoinUnit;
  bip21encoded?: string;
  isCustom?: boolean;
};

export type ReceiveDetailsAction =
  | { type: typeof SET_ADDRESS; address: string }
  | { type: typeof SELECT_TAB; index: number }
  | {
      type: typeof UPDATE_BALANCE;
      confirmed: number;
      unconfirmed: number;
    }
  | { type: typeof UPDATE_ETA; fee: number; vsize: number; fastFee: number; mediumFee: number }
  | { type: typeof UPDATE_QR_CODE_SIZE; width: number; height: number }
  | {
      type: typeof APPLY_CUSTOM_PARAMS;
      params: ReceiveCustomParams;
      fallbackUnit: BitcoinUnit;
    };

export const initialState: ReceiveDetailsState = {
  address: '',
  customLabel: '',
  customAmount: '',
  customUnit: BitcoinUnit.BTC,
  bip21encoded: '',
  isCustom: false,
  showPendingBalance: false,
  showConfirmedBalance: false,
  showAddress: false,
  currentTab: segmentControlValues[0],
  intervalMs: 5000,
  eta: '',
  initialConfirmed: 0,
  initialUnconfirmed: 0,
  displayBalance: '',
  displayAmount: null,
  qrCodeSize: 90,
};

export const formatDisplayAmount = (amount: string, unit: BitcoinUnit): string | null => {
  const number = Number(amount);
  if (!Number.isFinite(number) || number <= 0) return null;

  switch (unit) {
    case BitcoinUnit.BTC:
      return `${amount} BTC`;
    case BitcoinUnit.SATS:
      return `${satoshiToBTC(number)} BTC`;
    case BitcoinUnit.LOCAL_CURRENCY:
      return `${fiatToBTC(number)} BTC`;
    default:
      return `${amount} ${unit}`;
  }
};

export const receiveDetailsReducer = (state: ReceiveDetailsState, action: ReceiveDetailsAction): ReceiveDetailsState => {
  switch (action.type) {
    case SET_ADDRESS: {
      const bip21encoded = DeeplinkSchemaMatch.bip21encode(action.address);
      if (state.address === action.address && state.bip21encoded === bip21encoded && state.showAddress) return state;
      return { ...state, address: action.address, bip21encoded, showAddress: true };
    }
    case SELECT_TAB: {
      const currentTab = segmentControlValues[action.index];
      if (!currentTab || state.currentTab === currentTab) return state;
      return { ...state, currentTab };
    }
    case UPDATE_BALANCE: {
      if (action.unconfirmed > 0) {
        const isInitialPendingBalance = state.initialConfirmed === 0 && state.initialUnconfirmed === 0;
        const displayBalance = loc.formatString(loc.transactions.pending_with_amount, {
          amt1: formatBalance(action.unconfirmed, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
          amt2: formatBalance(action.unconfirmed, BitcoinUnit.BTC, true).toString(),
        });
        if (
          !isInitialPendingBalance &&
          state.displayBalance === displayBalance &&
          state.showPendingBalance &&
          !state.showConfirmedBalance &&
          !state.showAddress
        ) {
          return state;
        }
        return {
          ...state,
          initialConfirmed: isInitialPendingBalance ? action.confirmed : state.initialConfirmed,
          initialUnconfirmed: isInitialPendingBalance ? action.unconfirmed : state.initialUnconfirmed,
          intervalMs: isInitialPendingBalance ? 25000 : state.intervalMs,
          displayBalance,
          showPendingBalance: true,
          showConfirmedBalance: false,
          showAddress: false,
        };
      }

      if (action.unconfirmed !== 0 || state.initialUnconfirmed === 0) return state;

      const receivedBalance = action.confirmed - state.initialConfirmed;
      if (receivedBalance <= 0) {
        if (!state.showConfirmedBalance && !state.showPendingBalance && state.showAddress) return state;
        return {
          ...state,
          showConfirmedBalance: false,
          showPendingBalance: false,
          showAddress: true,
        };
      }

      const displayBalance = loc.formatString(loc.transactions.received_with_amount, {
        amt1: formatBalance(receivedBalance, BitcoinUnit.LOCAL_CURRENCY, true).toString(),
        amt2: formatBalance(receivedBalance, BitcoinUnit.BTC, true).toString(),
      });
      if (state.displayBalance === displayBalance && state.showConfirmedBalance && !state.showPendingBalance && !state.showAddress) {
        return state;
      }
      return {
        ...state,
        displayBalance,
        showConfirmedBalance: true,
        showPendingBalance: false,
        showAddress: false,
      };
    }
    case UPDATE_ETA: {
      const satPerVbyte = Math.round(action.fee / action.vsize);
      const eta =
        satPerVbyte >= action.fastFee
          ? loc.formatString(loc.transactions.eta_10m)
          : satPerVbyte >= action.mediumFee
            ? loc.formatString(loc.transactions.eta_3h)
            : loc.formatString(loc.transactions.eta_1d);
      if (state.eta === eta) return state;
      return { ...state, eta };
    }
    case UPDATE_QR_CODE_SIZE: {
      if (action.width <= 0 || action.height <= 0) return state;
      const isPortrait = action.height > action.width;
      const heightCap = Math.min(
        isPortrait ? action.height * QR_PORTRAIT_HEIGHT_FRACTION : action.height * QR_LANDSCAPE_HEIGHT_FRACTION,
        MAX_QR_SIZE,
      );
      const widthBudget = action.width - QR_SCROLL_RESERVED_WIDTH;
      const innerWidthCap = Math.max(MIN_QR_SIZE, Math.floor(widthBudget * QR_WIDTH_USE_FRACTION));
      const qrCodeSize = Math.round(Math.max(MIN_QR_SIZE, Math.min(innerWidthCap, heightCap, MAX_QR_SIZE)));
      if (state.qrCodeSize === qrCodeSize) return state;
      return { ...state, qrCodeSize };
    }
    case APPLY_CUSTOM_PARAMS: {
      const isCustom = Boolean(action.params.isCustom);
      const customLabel = isCustom ? (action.params.customLabel ?? '') : '';
      const customAmount = isCustom ? (action.params.customAmount ?? '') : '';
      const customUnit = isCustom ? (action.params.customUnit ?? BitcoinUnit.BTC) : action.fallbackUnit;
      return {
        ...state,
        customLabel,
        customAmount,
        customUnit,
        bip21encoded: action.params.bip21encoded || state.bip21encoded,
        isCustom,
        showAddress: true,
        showPendingBalance: false,
        showConfirmedBalance: false,
        displayAmount: formatDisplayAmount(customAmount, customUnit),
      };
    }
  }
};
