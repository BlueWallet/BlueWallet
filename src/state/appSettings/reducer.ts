import { AppSettingsAction, AppSettingsActionType } from './actions';

export interface AppSettingsState {
  isPinSet: boolean;
  isBiometricsEnabled: boolean;
}

const initialState: AppSettingsState = {
  isPinSet: false,
  isBiometricsEnabled: false,
};

export const appSettingsReducer = (state = initialState, action: AppSettingsActionType): AppSettingsState => {
  switch (action.type) {
    case AppSettingsAction.UpdateBiometricSetting:
      return {
        ...state,
        isBiometricsEnabled: action.value,
      };
    default:
      return state;
  }
};
