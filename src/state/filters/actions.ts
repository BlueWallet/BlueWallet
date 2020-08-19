import { Filters } from 'app/consts';

export enum FiltersAction {
  UpdateFilters = 'UpdateFilters',
  ClearFilters = 'ClearFilters',
}

export interface UpdateFiltersAction {
  type: FiltersAction.UpdateFilters;
  value: Filters;
}

export interface ClearFiltersAction {
  type: FiltersAction.ClearFilters;
}

export type FiltersActionType = UpdateFiltersAction | ClearFiltersAction;

export const updateFilters = (value: Filters): UpdateFiltersAction => ({
  type: FiltersAction.UpdateFilters,
  value,
});

export const clearFilters = (): ClearFiltersAction => ({
  type: FiltersAction.ClearFilters,
});
