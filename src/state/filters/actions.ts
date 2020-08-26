export enum FiltersAction {
  ActivateFilters = 'ActivateFilters',
  UpdateAddress = 'UpdateAddress',
  UpdateDateKey = 'UpdateDateKey',
  UpdateFromDate = 'UpdateFromDate',
  UpdateToDate = 'UpdateToDate',
  UpdateFromAmount = 'UpdateFromAmount',
  UpdateToAmount = 'UpdateToAmount',
  UpdateTransactionType = 'UpdateTransactionType',
  UpdateTransactionStatus = 'UpdateTransactionStatus',
  ClearFilters = 'ClearFilters',
}

export interface ActivateFiltersAction {
  type: FiltersAction.ActivateFilters;
}

export interface UpdateAddressAction {
  type: FiltersAction.UpdateAddress;
  value: string;
}

export interface UpdateDateKeyAction {
  type: FiltersAction.UpdateDateKey;
  value: number;
}

export interface UpdateFromDateAction {
  type: FiltersAction.UpdateFromDate;
  value: string;
}

export interface UpdateToDateAction {
  type: FiltersAction.UpdateToDate;
  value: string;
}

export interface UpdateFromAmountAction {
  type: FiltersAction.UpdateFromAmount;
  value: string;
}

export interface UpdateToAmountAction {
  type: FiltersAction.UpdateToAmount;
  value: string;
}

export interface UpdateTransactionTypeAction {
  type: FiltersAction.UpdateTransactionType;
  value: string;
}
export interface UpdateTransactionStatusAction {
  type: FiltersAction.UpdateTransactionStatus;
  value: string;
}
export interface ClearFiltersAction {
  type: FiltersAction.ClearFilters;
}

export type FiltersActionType =
  | ActivateFiltersAction
  | ClearFiltersAction
  | UpdateAddressAction
  | UpdateDateKeyAction
  | UpdateFromDateAction
  | UpdateToDateAction
  | UpdateFromAmountAction
  | UpdateToAmountAction
  | UpdateTransactionTypeAction
  | UpdateTransactionStatusAction;

export const activateFilters = (): ActivateFiltersAction => ({
  type: FiltersAction.ActivateFilters,
});
export const updateAddress = (value: string): UpdateAddressAction => ({
  type: FiltersAction.UpdateAddress,
  value,
});
export const updateDateKey = (value: number): UpdateDateKeyAction => ({
  type: FiltersAction.UpdateDateKey,
  value,
});
export const updateFromDate = (value: string): UpdateFromDateAction => ({
  type: FiltersAction.UpdateFromDate,
  value,
});
export const updateToDate = (value: string): UpdateToDateAction => ({
  type: FiltersAction.UpdateToDate,
  value,
});
export const updateFromAmount = (value: string): UpdateFromAmountAction => ({
  type: FiltersAction.UpdateFromAmount,
  value,
});
export const updateToAmount = (value: string): UpdateToAmountAction => ({
  type: FiltersAction.UpdateToAmount,
  value,
});
export const updateTransactionType = (value: string): UpdateTransactionTypeAction => ({
  type: FiltersAction.UpdateTransactionType,
  value,
});
export const updateTransactionStatus = (value: string): UpdateTransactionStatusAction => ({
  type: FiltersAction.UpdateTransactionStatus,
  value,
});

export const clearFilters = (): ClearFiltersAction => ({
  type: FiltersAction.ClearFilters,
});
