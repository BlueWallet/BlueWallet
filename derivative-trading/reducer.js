import { createContext } from 'react';

export const initialState = {
  availableProducts: [],
  hasLoadedProducts: false,
  productMap: {},
  tickers: {},
  isAuthenticated: false,
  isWsConnected: false,
  apiKey: null,
  isLoadingInitialData: true,
  selectedSymbol: 'XBTUSD.CFD',
  userData: {},
  stagedOrder: {},
  orderInvoice: '',
  settlementRequest: {},
  isSettling: false,
  showOrderInvoicePage: false,
  showSettlementPage: false,
  hasOpenPosition: false,
  btcPric: 0,
  positions: {},
  currentPositions: {},
  openOrders: [],
  webLnProvider: null,
  productCharts: {},
  fairPrices: {},
  isTermsModalOpen: false,
  isLoadingCharts: true,
  serviceStatus: {
    status: 'Running',
    msg: 'Under Maintenance',
  },
}

export const TradingDispatch = createContext(null);

export function reducer(state, action) {
  switch (action.type) {
    case 'setIsTermsModalOpen':
      return { ...state, isTermsModalOpen: action.payload };
    case 'setProductMap':
      return { ...state, productMap: action.payload };
    case 'setServiceStatus':
      return { ...state, serviceStatus: action.payload };
    case 'setIsSettling':
      return { ...state, isSettling: action.payload };
    case 'setOpenOrders':
      return { ...state, openOrders: action.payload };
    case 'setAvailableProducts':
      return { ...state, availableProducts: action.payload };
    case 'setHasLoadedProducts':
      return { ...state, hasLoadedProducts: action.payload };
    case 'setApiKey':
      return { ...state, apiKey: action.payload };
    case 'setTickers':
      return { ...state, tickers: { ...state.tickers, [action.payload.symbol]: action.payload } };
    case 'setFairPrice':
      return { ...state, fairPrices: { ...state.fairPrices, [action.payload.symbol]: action.payload } };
    case 'setIsWsAuthenticated':
      return { ...state, isWsAuthenticated: action.payload };
    case 'setIsWsConnected':
      return { ...state, isWsConnected: action.payload };
    case 'setIsAuthenticated':
      return { ...state, isAuthenticated: action.payload };
    case 'setIsLoadingInitialData':
      return { ...state, isLoadingInitialData: action.payload };
    case 'setUserData':
      return { ...state, userData: action.payload };
    case 'setSelectedSymbol':
      return { ...state, selectedSymbol: action.payload };
    case 'setStagedOrder':
      return { ...state, stagedOrder: action.payload };
    case 'setOrderInvoice':
      return { ...state, orderInvoice: action.payload };
    case 'setShowOrderInvoicePage':
      return { ...state, showOrderInvoicePage: action.payload };
    case 'setShowSettlementPage':
      return { ...state, showSettlementPage: action.payload };
    case 'setHasOpenPosition':
      return { ...state, hasOpenPosition: action.payload };
    case 'setSettlementRequest':
      return { ...state, settlementRequest: action.payload };
    case 'setWithdrawalSuccess':
      return { ...state, showSettlementPage: false };
    case 'setPosition':
      return { ...state, position: action.payload };
    case 'setWebLnProvider':
      return { ...state, webLnProvider: action.payload };
    case 'setProductCharts':
      return { ...state, productCharts: action.payload };
    case 'setBtcPrice':
      return { ...state, btcPrice: action.payload };
    case 'setIsLoadingCharts':
      return { ...state, isLoadingCharts: action.payload };
    case 'setPositionState':
      if (action.payload.quantity === 0) {
        return { ...state, currentPositions: { ...state.currentPositions, [action.payload.symbol]: {} } };
      } else {
        return { ...state, currentPositions: { ...state.currentPositions, [action.payload.symbol]: action.payload } };
      }
    case 'setPositionStates':
      return { ...state, currentPositions: action.payload};
    case 'removePositionState':
      return delete state.currentPositions[action.payload];
    default:
      throw new Error();
  }
}