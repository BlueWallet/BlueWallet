export enum AppSettingsAction {
  UpdateBiometricSetting = 'UpdateBiometricSetting',
  UpdateAdvancedOptions = 'UpdateAdvancedOptions',
}

export interface UpdateBiometricSettingAction {
  type: AppSettingsAction.UpdateBiometricSetting;
  value: boolean;
}

export interface UpdateAdvancedOptionsAction {
  type: AppSettingsAction.UpdateAdvancedOptions;
  value: boolean;
}

export type AppSettingsActionType = UpdateBiometricSettingAction | UpdateAdvancedOptionsAction;

export const updateBiometricSetting = (value: boolean): UpdateBiometricSettingAction => ({
  type: AppSettingsAction.UpdateBiometricSetting,
  value,
});

export const updateAdvancedOptions = (value: boolean): UpdateAdvancedOptionsAction => ({
  type: AppSettingsAction.UpdateAdvancedOptions,
  value,
});
