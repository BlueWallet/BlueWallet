import { CONST } from 'app/consts';

import { AppSettingsAction, AppSettingsActionType } from './actions';

export interface AppSettingsState {
  isBiometricsEnabled: boolean;
  isAdvancedOptionsEnabled: boolean;
  language: string;
}

const initialState: AppSettingsState = {
  isBiometricsEnabled: false,
  isAdvancedOptionsEnabled: false,
  language: CONST.defaultLanguage,
};

export const appSettingsReducer = (state = initialState, action: AppSettingsActionType): AppSettingsState => {
  switch (action.type) {
    case AppSettingsAction.UpdateBiometricSetting:
      return {
        ...state,
        isBiometricsEnabled: action.value,
      };
    case AppSettingsAction.UpdateAdvancedOptions:
      return {
        ...state,
        isAdvancedOptionsEnabled: action.value,
      };
    case AppSettingsAction.UpdateSelectedLanguage:
      return {
        ...state,
        language: action.value,
      };
    default:
      return state;
  }
};
