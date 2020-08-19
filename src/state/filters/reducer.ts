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
    case FiltersAction.UpdateFilters:
      return {
        ...action.value,
        isFilteringOn: true,
      };
    case FiltersAction.ClearFilters:
      return {
        ...initialState,
      };
    default:
      return state;
  }
};
