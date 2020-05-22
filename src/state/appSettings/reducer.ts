import { AppSettingsAction, AppSettingsActionType } from './actions';

export interface AppSettingsState {
  isBiometricsEnabled: boolean;
  isAdvancedOptionsEnabled: boolean;
}

const initialState: AppSettingsState = {
  isBiometricsEnabled: false,
  isAdvancedOptionsEnabled: false,
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
    default:
      return state;
  }
};
