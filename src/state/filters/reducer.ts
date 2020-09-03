import { CONST, Filters } from 'app/consts';

import { FiltersAction, FiltersActionType } from './actions';

const initialState: Filters = {
  isFilteringOn: false,
  address: '',
  dateKey: 0,
  isCalendarVisible: false,
  fromDate: '',
  toDate: '',
  fromAmount: '',
  toAmount: '',
  transactionType: CONST.receive,
  transactionStatus: '',
};

export const filtersReducer = (state = initialState, action: FiltersActionType): Filters => {
  switch (action.type) {
    case FiltersAction.ActivateFilters:
      return {
        ...state,
        isFilteringOn: true,
      };
    case FiltersAction.UpdateAddress:
      return {
        ...state,
        address: action.value,
      };
    case FiltersAction.UpdateDateKey:
      return {
        ...state,
        dateKey: action.value,
      };
    case FiltersAction.UpdateFromDate:
      return {
        ...state,
        fromDate: action.value,
      };
    case FiltersAction.UpdateToDate:
      return {
        ...state,
        toDate: action.value,
      };
    case FiltersAction.UpdateFromAmount:
      return {
        ...state,
        fromAmount: action.value,
      };
    case FiltersAction.UpdateToAmount:
      return {
        ...state,
        toAmount: action.value,
      };
    case FiltersAction.UpdateTransactionType:
      return {
        ...state,
        transactionType: action.value,
      };
    case FiltersAction.UpdateTransactionStatus:
      return {
        ...state,
        transactionStatus: action.value,
      };
    case FiltersAction.ClearFilters:
      return {
        ...initialState,
      };
    default:
      return state;
  }
};
